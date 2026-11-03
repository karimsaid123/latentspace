import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { decodeHtmlEntities } from '../src/lib/sanitize';
import {
  RssFeedAdapter,
  assertSafePublicHttpsUrl,
  sanitizeXmlForParsing,
} from '../src/adapters/providers/rss-feed.adapter';
import { IngestionDiffEngine } from '../src/core/services/diff-engine';
import {
  detectFrontierLab,
  generateDeepIntelligenceSummary,
} from '../src/lib/intelligence-analyzer';
import { checkRateLimit, hasValidAdminSecret } from '../src/lib/rate-limit';
import {
  readBoundedJson,
  safeJsonParse,
  verifyBrowserMutationRequest,
} from '../src/lib/request-security';
import { MemoryCacheAdapter } from '../src/adapters/storage/memory-cache.adapter';
import {
  articleMatchesVector,
  computeVectorPulseFromRawRecords,
  isValidVectorId,
} from '../src/lib/vector-pulse';
import {
  LOCALES,
  DEFAULT_LOCALE,
  isRTL,
  isValidLocale,
  getDictionary,
  DICTIONARY,
  type Locale,
} from '../src/lib/i18n';
import type { DomainArticle } from '../src/core/domain/entities';

describe('Security & Domain Hardening Suite', () => {
  it('prevents HTML entity double-unescaping AND Object.prototype property leakage', () => {
    assert.equal(decodeHtmlEntities('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
    assert.equal(
      decodeHtmlEntities('&euro;34.13M &mdash; AI &amp; ML &#8217; &#x2019;'),
      '€34.13M — AI & ML ’ ’'
    );
    // Lone surrogate code points should not decode into malformed characters
    assert.equal(decodeHtmlEntities('&#xD800;'), '&#xD800;');

    // Prototype keys must NEVER resolve to Object.prototype functions
    const protoProbe = '&constructor; &toString; &valueOf; &hasOwnProperty; &__proto__; &CONSTRUCTOR;';
    assert.equal(decodeHtmlEntities(protoProbe), protoProbe);
  });

  it('rejects dangerous URL protocols (javascript:, data:, file:, credentials) and strips tracking params', () => {
    const adapter = new RssFeedAdapter();
    assert.equal(adapter.normalizeCanonicalUrl('javascript:alert(1)'), '');
    assert.equal(adapter.normalizeCanonicalUrl('JAVASCRIPT:alert(document.cookie)'), '');
    assert.equal(adapter.normalizeCanonicalUrl('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(adapter.normalizeCanonicalUrl('file:///etc/passwd'), '');
    assert.equal(adapter.normalizeCanonicalUrl('https://admin:secret@example.com/news'), '');

    const clean = adapter.normalizeCanonicalUrl(
      'https://openai.com/index/new-model?utm_source=twitter&utm_medium=social&fbclid=abc123&id=42#section',
      'https://openai.com'
    );
    assert.equal(clean, 'https://openai.com/index/new-model?id=42');

    const relative = adapter.normalizeCanonicalUrl('/blog/deepseek-v4', 'https://deepseek.com');
    assert.equal(relative, 'https://deepseek.com/blog/deepseek-v4');
  });

  it('blocks outbound SSRF targets (HTTP downgrade, metadata IPs, RFC1918, loopback, IPv6 local, non-443 ports)', () => {
    // Allowed public HTTPS feed endpoints
    assert.equal(
      assertSafePublicHttpsUrl('https://openai.com/news/rss.xml').hostname,
      'openai.com'
    );
    assert.equal(
      assertSafePublicHttpsUrl('https://rss.arxiv.org:443/rss/cs.AI').hostname,
      'rss.arxiv.org'
    );

    // Blocked targets
    const blockedUrls = [
      'http://openai.com/news/rss.xml', // Cleartext HTTP blocked
      'https://user:pass@openai.com/rss.xml', // Credentials blocked
      'https://openai.com:8443/rss.xml', // Non-443 port blocked
      'https://localhost/rss.xml',
      'https://sub.localhost/rss.xml',
      'https://printer.local/rss.xml',
      'https://metadata.google.internal/computeMetadata/v1/',
      'https://internal.latentspace/articles-store',
      'https://127.0.0.1/rss.xml',
      'https://0x7f000001/rss.xml', // Hex-encoded loopback
      'https://169.254.169.254/latest/meta-data/', // Cloud metadata IPv4
      'https://10.0.0.12/rss.xml', // RFC1918 10/8
      'https://172.16.5.4/rss.xml', // RFC1918 172.16/12
      'https://192.168.1.1/rss.xml', // RFC1918 192.168/16
      'https://100.64.0.1/rss.xml', // CGNAT 100.64/10
      'https://0.0.0.0/rss.xml',
      'https://[::1]/rss.xml', // IPv6 loopback
      'https://[::ffff:127.0.0.1]/rss.xml', // IPv4-mapped IPv6 loopback
      'https://[fe80::1]/rss.xml', // IPv6 link-local
      'https://[fd00::1234]/rss.xml', // IPv6 ULA
    ];

    for (const bad of blockedUrls) {
      assert.throws(() => assertSafePublicHttpsUrl(bad), `Expected SSRF guard to block: ${bad}`);
    }
  });

  it('neutralizes XML ENTITY expansion bombs and strips DOCTYPE declarations before XML parsing', () => {
    const entityXml = `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY custom "expanded">]><rss><channel></channel></rss>`;
    assert.throws(() => sanitizeXmlForParsing(entityXml), /Blocked unsafe XML ENTITY/);

    const benignDoctypeXml = `<?xml version="1.0"?>\n<!DOCTYPE rss PUBLIC "-//Netscape//DTD RSS//EN" "http://my.netscape.com/publish/formats/rss-0.91.dtd">\n<rss version="2.0"><channel><title>Safe</title></channel></rss>`;
    const sanitized = sanitizeXmlForParsing(benignDoctypeXml);
    assert.ok(!sanitized.includes('<!DOCTYPE'));
    assert.ok(sanitized.includes('<title>Safe</title>'));
  });

  it('enforces CSRF Origin, Sec-Fetch-Site, and custom client header checks on browser mutations', () => {
    const validReq = new NextRequest('https://latentspace.science/api/summarize', {
      method: 'POST',
      headers: {
        host: 'latentspace.science',
        origin: 'https://latentspace.science',
        'sec-fetch-site': 'same-origin',
        'x-latentspace-client': '1',
      },
    });
    assert.equal(verifyBrowserMutationRequest(validReq).ok, true);

    const crossSiteReq = new NextRequest('https://latentspace.science/api/summarize', {
      method: 'POST',
      headers: {
        host: 'latentspace.science',
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site',
        'x-latentspace-client': '1',
      },
    });
    assert.equal(verifyBrowserMutationRequest(crossSiteReq).ok, false);

    const mismatchedOriginReq = new NextRequest('https://latentspace.science/api/sync', {
      method: 'POST',
      headers: {
        host: 'latentspace.science',
        origin: 'https://attacker.example',
        'x-latentspace-client': '1',
      },
    });
    assert.equal(verifyBrowserMutationRequest(mismatchedOriginReq).ok, false);

    const missingHeaderReq = new NextRequest('https://latentspace.science/api/sync', {
      method: 'POST',
      headers: {
        host: 'latentspace.science',
        origin: 'https://latentspace.science',
        'sec-fetch-site': 'same-origin',
      },
    });
    assert.equal(verifyBrowserMutationRequest(missingHeaderReq).ok, false);
  });

  it('bounds JSON request body size (413/415) and strips __proto__/constructor pollution keys', async () => {
    const polluted = safeJsonParse<Record<string, any>>(
      '{"articleId":"abc_1234","__proto__":{"polluted":true},"constructor":{"prototype":{"bad":1}}}'
    );
    assert.equal(polluted.articleId, 'abc_1234');
    assert.equal(({} as any).polluted, undefined);
    assert.equal(Object.hasOwn(polluted, '__proto__'), false);
    assert.equal(Object.hasOwn(polluted, 'constructor'), false);

    const wrongTypeReq = new NextRequest('https://latentspace.science/api/summarize', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{"articleId":"abc_1234"}',
    });
    const wrongTypeRes = await readBoundedJson(wrongTypeReq, 256);
    assert.equal(wrongTypeRes.ok, false);
    if (!wrongTypeRes.ok) assert.equal(wrongTypeRes.status, 415);

    const oversizedReq = new NextRequest('https://latentspace.science/api/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ articleId: 'a'.repeat(500) }),
    });
    const oversizedRes = await readBoundedJson(oversizedReq, 128);
    assert.equal(oversizedRes.ok, false);
    if (!oversizedRes.ok) assert.equal(oversizedRes.status, 413);
  });

  it('verifies ADMIN_SYNC_SECRET in constant time with SHA-256 digest comparison', () => {
    const prev = process.env.ADMIN_SYNC_SECRET;
    process.env.ADMIN_SYNC_SECRET = 'super_secure_admin_sync_secret_2026';
    try {
      const badReq = new NextRequest('https://latentspace.science/api/sync', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong_secret' },
      });
      assert.equal(hasValidAdminSecret(badReq), false);

      const goodReq = new NextRequest('https://latentspace.science/api/sync', {
        method: 'POST',
        headers: { authorization: 'Bearer super_secure_admin_sync_secret_2026' },
      });
      assert.equal(hasValidAdminSecret(goodReq), true);
    } finally {
      if (prev === undefined) {
        delete process.env.ADMIN_SYNC_SECRET;
      } else {
        process.env.ADMIN_SYNC_SECRET = prev;
      }
    }
  });

  it('preserves existing Gemini intelligence summaries across minor RSS snippet hash changes', () => {
    const engine = new IngestionDiffEngine();
    const existingArticle: DomainArticle = {
      id: 'art_1',
      canonicalUrl: 'https://example.com/1',
      title: 'Frontier Architecture Breakthrough',
      publishedAt: '2026-11-01T10:00:00.000Z',
      fetchedAt: '2026-11-01T10:05:00.000Z',
      contentHash: 'hash_v1',
      sourceId: 'openai',
      sourceName: 'OpenAI News',
      author: 'OpenAI',
      contentSnippet: 'Initial snippet',
      category: 'LLMs & GenAI',
      lab: 'OpenAI',
      entryType: 'DISPATCH',
      summary: {
        tldr: 'Synthesized Gemini executive summary.',
        takeaways: ['Point 1', 'Point 2', 'Point 3'],
        impact: 'Breakthrough',
        readTimeMinutes: 4,
        generatedWith: 'gemini',
      },
    };

    const incomingHeuristic: DomainArticle = {
      ...existingArticle,
      fetchedAt: '2026-11-01T10:25:00.000Z',
      contentHash: 'hash_v2_minor_edit',
      contentSnippet: 'Initial snippet with updated footer',
      summary: {
        tldr: 'Generic heuristic template summary.',
        takeaways: ['Generic 1'],
        impact: 'Notable',
        readTimeMinutes: 2,
        generatedWith: 'heuristic',
      },
    };

    const map = new Map<string, DomainArticle>([['art_1', existingArticle]]);
    const diff = engine.computeDiff(map, [incomingHeuristic]);

    assert.equal(diff.modified.length, 1);
    assert.equal(diff.modified[0].summary.generatedWith, 'gemini');
    assert.equal(diff.modified[0].summary.tldr, 'Synthesized Gemini executive summary.');
  });

  it('avoids false-positive Frontier Lab detection on substrings like Octopus Ventures or mobile operator', () => {
    assert.equal(
      detectFrontierLab(
        'Braid raised $38M Series A led by Octopus Ventures',
        'Empowering any enterprise to function as a virtual mobile network operator via API.',
        'Techmeme'
      ),
      'Independent'
    );

    assert.equal(
      detectFrontierLab(
        'SemiAnalysis launches GDPx benchmark; Opus 5.5 tops leaderboard',
        'Evaluation across 11 agentic domains.',
        'Techmeme'
      ),
      'Anthropic'
    );

    assert.equal(
      detectFrontierLab(
        'DeepSeek releases new sparse attention kernel for R1',
        'Open-source CUDA kernels.',
        'MarkTechPost AI'
      ),
      'DeepSeek'
    );
  });

  it('never injects canned buzzword filler into heuristic summaries when RSS snippets are short', () => {
    const shortSummary = generateDeepIntelligenceSummary(
      'Mistral releases weights for its trillion-parameter AI model, targeting cybersecurity',
      "Mistral says its new model can afford organizations a kind of control over its cyber defenses that closed models can't.",
      'TechCrunch AI'
    );
    assert.equal(
      shortSummary.tldr,
      "Mistral says its new model can afford organizations a kind of control over its cyber defenses that closed models can't."
    );
    assert.deepEqual(shortSummary.takeaways, []);
    assert.ok(!shortSummary.tldr.includes('capability horizons'));
  });

  it('enforces per-IP sliding window rate limits and bounded cache eviction', async () => {
    const id = `test_ip_${Date.now()}`;
    assert.equal(checkRateLimit('unit_test', id, 2, 60_000).allowed, true);
    assert.equal(checkRateLimit('unit_test', id, 2, 60_000).allowed, true);
    const blocked = checkRateLimit('unit_test', id, 2, 60_000);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0);

    const cache = new MemoryCacheAdapter();
    for (let i = 0; i < 150; i++) {
      await cache.set(`key_${i}`, i, 60);
    }
    // Oldest keys evicted once 128-entry ceiling is exceeded
    assert.equal(await cache.get('key_0'), null);
    assert.equal(await cache.get('key_149'), 149);
  });

  it('computes normalized Research Vector Pulse momentum and strictly validates vector IDs', () => {
    assert.equal(isValidVectorId('test-time-reasoning'), true);
    assert.equal(isValidVectorId('__proto__'), false);
    assert.equal(isValidVectorId('unknown-injected-vector'), false);

    const now = Date.parse('2026-11-02T12:00:00.000Z');
    const records: Array<Record<string, unknown>> = [];

    // 20 recent articles heavily featuring test-time compute & chain-of-thought
    for (let i = 0; i < 20; i++) {
      records.push({
        publishedAt: new Date(now - i * 3_600_000).toISOString(),
        title: i < 12 ? `Test-time scaling and chain-of-thought verification #${i}` : `General software news #${i}`,
        contentSnippet: '',
      });
    }

    // 40 older baseline articles mostly featuring retrieval / RAG
    for (let i = 0; i < 40; i++) {
      records.push({
        publishedAt: new Date(now - (48 + i * 3) * 3_600_000).toISOString(),
        title: i < 20 ? `Long-context retrieval and RAG reranker #${i}` : `Baseline news #${i}`,
        contentSnippet: '',
      });
    }

    const pulse = computeVectorPulseFromRawRecords(records);
    assert.equal(pulse.corpusSize, 60);
    assert.equal(pulse.vectors[0].id, 'test-time-reasoning');
    assert.equal(pulse.vectors[0].status, 'SURGING');
    assert.ok(pulse.vectors[0].deltaPct > 100);

    const ragVec = pulse.vectors.find((v) => v.id === 'rag-memory-context');
    assert.ok(ragVec && ragVec.deltaPct < 0);

    assert.equal(
      articleMatchesVector(
        { title: 'Agentic World Modeling for Agent Test-time Scaling', contentSnippet: '' },
        'test-time-reasoning'
      ),
      true
    );
  });

  it('validates multilingual i18n locales, RTL detection, and dictionary parity across all 4 languages', () => {
    // 1. Validate locale whitelist
    const expectedLocales: Locale[] = ['en', 'es', 'ar', 'zh'];
    for (const loc of expectedLocales) {
      assert.equal(isValidLocale(loc), true, `Locale ${loc} should be valid`);
    }

    // Invalid / adversarial inputs
    assert.equal(isValidLocale('fr'), false);
    assert.equal(isValidLocale('de'), false);
    assert.equal(isValidLocale(''), false);
    assert.equal(isValidLocale(null), false);
    assert.equal(isValidLocale(undefined), false);
    assert.equal(isValidLocale('__proto__'), false);
    assert.equal(isValidLocale('constructor'), false);
    assert.equal(isValidLocale('toString'), false);

    // 2. Validate RTL detection
    assert.equal(isRTL('ar'), true);
    assert.equal(isRTL('en'), false);
    assert.equal(isRTL('es'), false);
    assert.equal(isRTL('zh'), false);

    // 3. Fallback resilience
    assert.equal(DEFAULT_LOCALE, 'en');
    assert.equal(getDictionary('en'), DICTIONARY.en);
    // @ts-expect-error test runtime fallback on bad input
    assert.equal(getDictionary('unknown_locale'), DICTIONARY.en);

    // 4. Parity check across dictionaries
    const sections = ['nav', 'modal', 'feed', 'pulse', 'footer', 'savedPage'] as const;
    for (const loc of expectedLocales) {
      const dict = DICTIONARY[loc];
      assert.ok(dict, `Dictionary must exist for locale ${loc}`);

      for (const sec of sections) {
        assert.ok(dict[sec], `Section ${sec} must exist in dictionary for locale ${loc}`);
        const baseKeys = Object.keys(DICTIONARY.en[sec]);
        for (const key of baseKeys) {
          const val = (dict[sec] as Record<string, unknown>)[key];
          if (typeof DICTIONARY.en[sec][key as keyof (typeof DICTIONARY.en)[typeof sec]] === 'object') {
            assert.equal(typeof val, 'object', `Key ${sec}.${key} must be an object in locale ${loc}`);
            const nestedBaseKeys = Object.keys(
              DICTIONARY.en[sec][key as keyof (typeof DICTIONARY.en)[typeof sec]] as Record<string, string>
            );
            for (const nKey of nestedBaseKeys) {
              const nVal = (val as Record<string, string>)[nKey];
              assert.equal(typeof nVal, 'string', `Key ${sec}.${key}.${nKey} must be a string in locale ${loc}`);
              assert.ok(nVal.length > 0, `Key ${sec}.${key}.${nKey} must not be empty in locale ${loc}`);
            }
          } else {
            assert.equal(
              typeof val,
              'string',
              `Key ${sec}.${key} must be a string in locale ${loc}`
            );
            assert.ok(
              (val as string).length > 0,
              `Key ${sec}.${key} must not be empty in locale ${loc}`
            );
          }
        }
      }
    }
  });
});
