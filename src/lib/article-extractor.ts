import { assertSafePublicHttpsUrl } from '@/adapters/providers/rss-feed.adapter';
import { decodeHtmlEntities } from './sanitize';
import { safeJsonParse } from './request-security';

const MAX_HTML_BYTES = 512 * 1024; // 512 KB cap for Edge Worker RAM safety
const MAX_REDIRECT_HOPS = 3;
const EXTRACT_TIMEOUT_MS = 5500;
const MAX_EXTRACTED_CHARS = 9000;

const BOILERPLATE_LINE_PATTERNS = [
  /\b(register now|register here|buy one .* ticket|get your pass)\b/i,
  /\b(subscribe to our newsletter|sign up for our|daily newsletter)\b/i,
  /\b(all rights reserved|privacy policy|terms of service|cookie policy)\b/i,
  /\b(toggle mega menu|submit site search|skip to content)\b/i,
  /^image credits?:/i,
  /^read more:/i,
];

function isBoilerplateParagraph(text: string): boolean {
  if (text.length < 35) return true;
  for (const rx of BOILERPLATE_LINE_PATTERNS) {
    if (rx.test(text)) return true;
  }
  return false;
}

async function readBoundedHtml(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const t = await response.text();
    return t.slice(0, maxBytes);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const chunks: string[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          const keep = Math.max(0, value.byteLength - (total - maxBytes));
          if (keep > 0) {
            chunks.push(decoder.decode(value.subarray(0, keep), { stream: false }));
          }
          break;
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
    }
    chunks.push(decoder.decode());
  } finally {
    reader.releaseLock();
  }

  return chunks.join('');
}

async function fetchSafeArticleHtml(rawUrl: string): Promise<string | null> {
  const upgraded = rawUrl.trim().replace(/^http:\/\//i, 'https://');
  let currentUrl: string;
  try {
    currentUrl = assertSafePublicHttpsUrl(upgraded).toString();
  } catch {
    return null;
  }

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const res = await fetch(currentUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) LatentSpace/2.0',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
    });

    if (
      res.status === 301 ||
      res.status === 302 ||
      res.status === 303 ||
      res.status === 307 ||
      res.status === 308
    ) {
      if (hop === MAX_REDIRECT_HOPS) return null;
      const loc = res.headers.get('location')?.trim();
      if (!loc) return null;
      try {
        const nextUrl = new URL(loc, currentUrl).toString().replace(/^http:\/\//i, 'https://');
        currentUrl = assertSafePublicHttpsUrl(nextUrl).toString();
        continue;
      } catch {
        return null;
      }
    }

    if (!res.ok) return null;

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.includes('text/html') && !ct.includes('xhtml') && !ct.includes('text/plain')) {
      return null;
    }

    return await readBoundedHtml(res, MAX_HTML_BYTES);
  }

  return null;
}

function cleanTextFragment(rawHtml: string): string {
  return decodeHtmlEntities(rawHtml.replace(/<[^>]{0,2048}>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function tryExtractJsonLdArticleBody(html: string): string | null {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]{10,120000}?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = safeJsonParse<unknown>(match[1].trim());
      const candidates: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>)['@graph'])
        ? ((parsed as Record<string, unknown>)['@graph'] as unknown[])
        : [parsed];

      for (const node of candidates) {
        if (node && typeof node === 'object') {
          const body = (node as Record<string, unknown>).articleBody;
          if (typeof body === 'string' && body.trim().length > 350) {
            return decodeHtmlEntities(body).replace(/\s+/g, ' ').trim();
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }
  return null;
}

function tryExtractArxivDetails(html: string): string | null {
  const abstractMatch = html.match(/<blockquote[^>]*class=["'][^"']*abstract[^"']*["'][^>]*>([\s\S]{40,12000}?)<\/blockquote>/i);
  if (!abstractMatch) return null;

  const parts: string[] = [];
  const authorsMatch = html.match(/<div[^>]*class=["'][^"']*authors[^"']*["'][^>]*>([\s\S]{10,4000}?)<\/div>/i);
  if (authorsMatch) {
    parts.push(cleanTextFragment(authorsMatch[1]));
  }

  const abstractClean = cleanTextFragment(abstractMatch[1]).replace(/^Abstract:\s*/i, '');
  parts.push(`Abstract: ${abstractClean}`);

  const commentsMatch = html.match(/<td[^>]*class=["'][^"']*comments[^"']*["'][^>]*>([\s\S]{5,1500}?)<\/td>/i);
  if (commentsMatch) {
    parts.push(`Notes: ${cleanTextFragment(commentsMatch[1])}`);
  }

  return parts.join('\n\n');
}

/**
 * Fetches and extracts clean full-article prose from a canonical source URL under
 * strict SSRF, timeout, and byte-ceiling protections.
 */
export async function fetchCleanArticleBody(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    const html = await fetchSafeArticleHtml(url);
    if (!html || html.length < 200) return null;

    if (/arxiv\.org\/abs\//i.test(url)) {
      const arxivText = tryExtractArxivDetails(html);
      if (arxivText && arxivText.length > 200) {
        return arxivText.slice(0, MAX_EXTRACTED_CHARS);
      }
    }

    const jsonLdBody = tryExtractJsonLdArticleBody(html);
    if (jsonLdBody && jsonLdBody.length > 500) {
      return jsonLdBody.slice(0, MAX_EXTRACTED_CHARS);
    }

    // Strip non-content blocks before scanning paragraphs
    const stripped = html
      .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');

    const articleRegionMatch =
      stripped.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
      stripped.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);

    const scope = articleRegionMatch ? articleRegionMatch[1] : stripped;

    const blocks: string[] = [];
    const seen = new Set<string>();
    const blockRegex = /<(p|h2|h3|li)\b[^>]*>([\s\S]{20,4000}?)<\/\1>/gi;
    let m: RegExpExecArray | null;
    let totalLen = 0;

    while ((m = blockRegex.exec(scope)) !== null) {
      const tag = m[1].toLowerCase();
      const text = cleanTextFragment(m[2]);
      if (!text) continue;

      if (tag === 'p' || tag === 'li') {
        if (isBoilerplateParagraph(text)) continue;
      } else if (text.length < 12 || text.length > 200) {
        continue;
      }

      const normKey = text.toLowerCase().slice(0, 120);
      if (seen.has(normKey)) continue;
      seen.add(normKey);

      blocks.push(text);
      totalLen += text.length + 2;
      if (totalLen >= MAX_EXTRACTED_CHARS) break;
    }

    const combined = blocks.join('\n\n').slice(0, MAX_EXTRACTED_CHARS).trim();
    return combined.length >= 250 ? combined : null;
  } catch {
    return null;
  }
}
