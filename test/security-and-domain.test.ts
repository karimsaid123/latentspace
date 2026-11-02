import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeHtmlEntities } from '../src/lib/sanitize';
import { RssFeedAdapter } from '../src/adapters/providers/rss-feed.adapter';
import { IngestionDiffEngine } from '../src/core/services/diff-engine';
import { detectFrontierLab } from '../src/lib/intelligence-analyzer';
import { checkRateLimit } from '../src/lib/rate-limit';
import { MemoryCacheAdapter } from '../src/adapters/storage/memory-cache.adapter';
import type { DomainArticle } from '../src/core/domain/entities';

describe('Security & Domain Hardening Suite', () => {
  it('prevents HTML entity double-unescaping while decoding named, decimal, and hex entities', () => {
    assert.equal(decodeHtmlEntities('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
    assert.equal(decodeHtmlEntities('&euro;34.13M &mdash; AI &amp; ML &#8217; &#x2019;'), '€34.13M — AI & ML ’ ’');
    // Lone surrogate code points should not decode into malformed characters
    assert.equal(decodeHtmlEntities('&#xD800;'), '&#xD800;');
  });

  it('rejects dangerous URL protocols (javascript:, data:, file:) and strips tracking params', () => {
    const adapter = new RssFeedAdapter();
    assert.equal(adapter.normalizeCanonicalUrl('javascript:alert(1)'), '');
    assert.equal(adapter.normalizeCanonicalUrl('JAVASCRIPT:alert(document.cookie)'), '');
    assert.equal(adapter.normalizeCanonicalUrl('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(adapter.normalizeCanonicalUrl('file:///etc/passwd'), '');

    const clean = adapter.normalizeCanonicalUrl(
      'https://openai.com/index/new-model?utm_source=twitter&utm_medium=social&fbclid=abc123&id=42#section',
      'https://openai.com'
    );
    assert.equal(clean, 'https://openai.com/index/new-model?id=42');

    const relative = adapter.normalizeCanonicalUrl('/blog/deepseek-v4', 'https://deepseek.com');
    assert.equal(relative, 'https://deepseek.com/blog/deepseek-v4');
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
});
