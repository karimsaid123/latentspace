import Parser from 'rss-parser';
import crypto from 'crypto';
import { FeedProviderPort } from '@/core/ports/feed-provider.port';
import { DomainSource, FeedSnapshot, DomainArticle, Category } from '@/core/domain/entities';
import { ProviderUnavailableError, RateLimitError } from '@/core/domain/errors';
import { decodeHtmlEntities } from '@/lib/sanitize';
import { detectFrontierLab, generateDeepIntelligenceSummary, detectEntryType } from '@/lib/intelligence-analyzer';

const MAX_FEED_BYTES = 5 * 1024 * 1024; // 5 MB safety ceiling for Edge Worker RAM
const MAX_REDIRECT_HOPS = 3;

const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.home.arpa',
  '.lan',
  '.corp',
  '.intranet',
];

function isReservedIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  const d = Number(m[4]);
  if (a > 255 || b > 255 || c > 255 || d > 255) return true;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 Loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 Cloud Metadata / Link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 RFC1918
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 RFC1918
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; // Multicast & Reserved
  return false;
}

function isReservedIpv6(bareHost: string): boolean {
  const lower = bareHost.toLowerCase();
  if (
    lower === '::' ||
    lower === '::1' ||
    lower === '0:0:0:0:0:0:0:0' ||
    lower === '0:0:0:0:0:0:0:1'
  ) {
    return true;
  }
  // IPv4-mapped / IPv4-translated / NAT64 prefixes
  if (
    lower.startsWith('::ffff:') ||
    lower.startsWith('0:0:0:0:0:ffff:') ||
    lower.startsWith('64:ff9b:')
  ) {
    return true;
  }
  // Unique Local (fc00::/7), Link-Local (fe80::/10), Multicast (ff00::/8), Documentation (2001:db8::/32)
  if (
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe8') ||
    lower.startsWith('fe9') ||
    lower.startsWith('fea') ||
    lower.startsWith('feb') ||
    lower.startsWith('ff') ||
    lower.startsWith('2001:db8:') ||
    lower.startsWith('100::')
  ) {
    return true;
  }
  return false;
}

/**
 * Validates that an outbound feed or redirect URL strictly targets a public HTTPS endpoint
 * on standard port 443 with no credentials and no RFC 6890 / loopback / cloud-metadata hostnames.
 */
export function assertSafePublicHttpsUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Malformed feed URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`Blocked non-HTTPS feed protocol: ${parsed.protocol}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('Blocked credentials in feed URL');
  }

  if (parsed.port !== '' && parsed.port !== '443') {
    throw new Error(`Blocked non-standard feed port: ${parsed.port}`);
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host) {
    throw new Error('Empty feed hostname');
  }

  const bareHost = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  if (bareHost.includes(':')) {
    if (isReservedIpv6(bareHost)) {
      throw new Error('Blocked private or reserved IPv6 feed target');
    }
    return parsed;
  }

  if (
    bareHost === 'localhost' ||
    bareHost === 'metadata' ||
    bareHost === 'internal.latentspace' ||
    bareHost === 'metadata.google.internal' ||
    !bareHost.includes('.') ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => bareHost.endsWith(suffix))
  ) {
    throw new Error(`Blocked internal or non-public feed host: ${bareHost}`);
  }

  if (/^\d+$/.test(bareHost) || /^0x[0-9a-f]+$/i.test(bareHost) || isReservedIpv4(bareHost)) {
    throw new Error(`Blocked private or reserved IPv4 feed target: ${bareHost}`);
  }

  return parsed;
}

/**
 * Neutralizes XML Entity Expansion ("Billion Laughs") / XXE vectors and strips DOCTYPE
 * headers in linear O(N) time before handing XML text to `xml2js` / `rss-parser`.
 */
export function sanitizeXmlForParsing(xml: string): string {
  if (/<!ENTITY\b/i.test(xml)) {
    throw new Error('Blocked unsafe XML ENTITY declaration');
  }

  // Strip invalid XML 1.0 control bytes (preserves \t, \n, \r)
  let cleaned = xml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Linear-time DOCTYPE stripper supporting optional `[...]` internal subsets without regex backtracking
  let searchPos = 0;
  while (searchPos < cleaned.length) {
    const upperSlice = cleaned.indexOf('<!DOCTYPE', searchPos);
    const lowerSlice = cleaned.indexOf('<!doctype', searchPos);
    const idx =
      upperSlice === -1
        ? lowerSlice
        : lowerSlice === -1
        ? upperSlice
        : Math.min(upperSlice, lowerSlice);

    if (idx === -1) break;

    let cursor = idx + 9;
    let inBracket = false;
    while (cursor < cleaned.length) {
      const ch = cleaned[cursor];
      if (ch === '[') {
        inBracket = true;
      } else if (ch === ']' && inBracket) {
        inBracket = false;
      } else if (ch === '>' && !inBracket) {
        cursor++;
        break;
      }
      cursor++;
    }

    cleaned = cleaned.slice(0, idx) + ' ' + cleaned.slice(cursor);
    searchPos = idx + 1;
  }

  return cleaned;
}

export class RssFeedAdapter implements FeedProviderPort {
  private parser: Parser;
  private readonly timeoutMs: number;

  constructor(timeoutMs = 7000) {
    this.timeoutMs = timeoutMs;
    this.parser = new Parser({
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LatentSpace/2.0',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      customFields: {
        item: [
          ['media:content', 'mediaContent', { keepArray: false }],
          ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
          ['content:encoded', 'contentEncoded'],
          ['dc:creator', 'creator'],
        ],
      },
    });
  }

  private async fetchWithSafeRedirects(initialUrl: string): Promise<Response> {
    let currentUrl = assertSafePublicHttpsUrl(initialUrl).toString();

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LatentSpace/2.0',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308
      ) {
        if (hop === MAX_REDIRECT_HOPS) {
          throw new Error('Exceeded maximum safe RSS redirect hops');
        }
        const location = response.headers.get('location')?.trim();
        if (!location) {
          throw new Error(`Redirect HTTP ${response.status} missing Location header`);
        }
        const resolvedNext = new URL(location, currentUrl).toString();
        currentUrl = assertSafePublicHttpsUrl(resolvedNext).toString();
        continue;
      }

      return response;
    }

    throw new Error('Exceeded maximum safe RSS redirect hops');
  }

  public async fetchFeed(source: DomainSource): Promise<FeedSnapshot> {
    const fetchedAt = new Date().toISOString();

    try {
      const response = await this.fetchWithSafeRedirects(source.feedUrl);

      if (response.status === 429) {
        throw new RateLimitError(source.name, 60);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const rawXmlText = await this.readBoundedText(response, MAX_FEED_BYTES);
      const xmlText = sanitizeXmlForParsing(rawXmlText);

      let feed;
      if (xmlText.length > 100_000) {
        const truncated = this.truncateLargeFeedXml(xmlText, 22);
        try {
          feed = await this.parser.parseString(truncated);
        } catch {
          feed = await this.parser.parseString(xmlText);
        }
      } else {
        feed = await this.parser.parseString(xmlText);
      }
      const rawItems = feed.items || [];
      const articles: DomainArticle[] = [];

      for (const item of rawItems.slice(0, 20)) {
        const rawLink = (item.link || item.guid || '').trim();
        const title = decodeHtmlEntities((item.title || '').trim());
        if (!rawLink || !title) continue;

        const canonicalUrl = this.normalizeCanonicalUrl(rawLink, source.websiteUrl);
        if (!canonicalUrl) continue;

        const id = crypto.createHash('sha256').update(canonicalUrl).digest('hex').slice(0, 16);

        const rawContent =
          (item as any).contentEncoded ||
          item.content ||
          item.contentSnippet ||
          item.summary ||
          '';
        const cleanContent = this.stripHtml(rawContent);
        const contentHash = crypto
          .createHash('sha256')
          .update(cleanContent || title)
          .digest('hex')
          .slice(0, 16);

        const publishedAt = this.safeParseDate(item.isoDate || item.pubDate, fetchedAt);
        const author = decodeHtmlEntities(
          (item as any).creator || (item as any).author || source.name
        );
        const imageUrl = this.extractImageUrl(item, canonicalUrl);
        const category = this.categorizeText(title, cleanContent, source.category);
        const lab = detectFrontierLab(title, cleanContent, source.name);
        const { entryType, arxivId, pdfUrl } = detectEntryType(
          title,
          cleanContent,
          canonicalUrl,
          source.name
        );
        const summary = generateDeepIntelligenceSummary(title, cleanContent, source.name);

        articles.push({
          id,
          canonicalUrl,
          title,
          publishedAt,
          fetchedAt,
          contentHash,
          sourceId: source.id,
          sourceName: source.name,
          author,
          contentSnippet: cleanContent.slice(0, 320),
          imageUrl,
          category,
          lab,
          entryType,
          arxivId,
          pdfUrl,
          summary,
        });
      }

      return {
        sourceId: source.id,
        sourceName: source.name,
        fetchedAt,
        rawItemCount: rawItems.length,
        articles,
      };
    } catch (err: any) {
      if (err instanceof RateLimitError) throw err;
      const message = err?.message || 'Unknown network error';
      if (message.includes('429') || message.includes('Rate limit')) {
        throw new RateLimitError(source.name, 60);
      }
      throw new ProviderUnavailableError(source.name, message);
    }
  }

  /**
   * Pre-slices multi-megabyte XML feeds (e.g. arXiv cs.AI/cs.CL/cs.LG) to the first `maxItems`
   * entries before xml2js parsing so Cloudflare Workers stay well below the 10ms CPU limit.
   */
  private truncateLargeFeedXml(xml: string, maxItems = 22): string {
    const lowerItem = this.findNthTagBoundary(xml, '<item', maxItems + 1);
    const itemCutoff =
      lowerItem !== -1 ? lowerItem : this.findNthTagBoundary(xml, '<ITEM', maxItems + 1);

    if (itemCutoff > 0) {
      const head = xml.slice(0, 1200);
      if (/<rdf:rdf\b/i.test(head)) {
        return `${xml.slice(0, itemCutoff)}\n</rdf:RDF>`;
      }
      return `${xml.slice(0, itemCutoff)}\n</channel></rss>`;
    }

    const lowerEntry = this.findNthTagBoundary(xml, '<entry', maxItems + 1);
    const entryCutoff =
      lowerEntry !== -1 ? lowerEntry : this.findNthTagBoundary(xml, '<ENTRY', maxItems + 1);

    if (entryCutoff > 0) {
      return `${xml.slice(0, entryCutoff)}\n</feed>`;
    }

    return xml;
  }

  private findNthTagBoundary(xml: string, tagPrefix: string, n: number): number {
    let count = 0;
    let pos = 0;
    const tagLen = tagPrefix.length;
    while (pos < xml.length) {
      const idx = xml.indexOf(tagPrefix, pos);
      if (idx === -1) return -1;
      const nextChar = xml[idx + tagLen];
      if (
        nextChar === '>' ||
        nextChar === ' ' ||
        nextChar === '\t' ||
        nextChar === '\n' ||
        nextChar === '\r'
      ) {
        count++;
        if (count === n) return idx;
      }
      pos = idx + tagLen;
    }
    return -1;
  }

  private safeParseDate(rawDate: string | undefined, fallbackIso: string): string {
    if (!rawDate) return fallbackIso;
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? fallbackIso : parsed.toISOString();
  }

  private async readBoundedText(response: Response, maxBytes: number): Promise<string> {
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxBytes) {
      throw new Error(`Feed payload exceeds ${maxBytes} bytes (${contentLength})`);
    }
    if (!response.body) {
      const text = await response.text();
      return text.length > maxBytes ? text.slice(0, maxBytes) : text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const chunks: string[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel().catch(() => {});
            chunks.push(
              decoder.decode(
                value.subarray(0, Math.max(0, value.byteLength - (totalBytes - maxBytes))),
                { stream: false }
              )
            );
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

  public normalizeCanonicalUrl(url: string, baseUrl?: string): string {
    const trimmed = decodeHtmlEntities(url || '').trim();
    if (!trimmed) return '';
    try {
      const parsed = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '';
      }
      if (parsed.username || parsed.password) {
        return '';
      }
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('utm_term');
      parsed.searchParams.delete('utm_content');
      parsed.searchParams.delete('ref');
      parsed.searchParams.delete('fbclid');
      parsed.searchParams.delete('gclid');
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return '';
    }
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    const withoutTags = html
      .replace(/<[^>]{0,2048}>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return decodeHtmlEntities(withoutTags);
  }

  private isAuthorOrAvatar(url: string): boolean {
    const u = url.toLowerCase();
    return (
      u.includes('avatar') ||
      u.includes('gravatar') ||
      u.includes('/author/') ||
      u.includes('headshot') ||
      u.includes('profile') ||
      u.includes('bio-') ||
      u.includes('icon') ||
      u.includes('feedburner') ||
      u.includes('doubleclick') ||
      u.includes('tracking') ||
      /\b(1x1|100x100|150x150|80x80|50x50)\b/.test(u)
    );
  }

  private extractImageUrl(item: any, baseUrl?: string): string | undefined {
    let candidate: string | undefined;

    if (
      item.enclosure?.url &&
      (item.enclosure.type?.includes('image') || /\.(jpg|jpeg|png|webp)/i.test(item.enclosure.url))
    ) {
      candidate = item.enclosure.url;
    } else if (item.mediaContent?.$?.url) {
      candidate = item.mediaContent.$.url;
    } else if (item.mediaThumbnail?.$?.url) {
      candidate = item.mediaThumbnail.$.url;
    } else {
      const content = String(item.contentEncoded || item.content || item.summary || '').slice(
        0,
        16_384
      );
      const match = content.match(/<img[^>]{0,512}src=["']([^"'>]{1,1024})["']/i);
      if (match && match[1]) {
        candidate = match[1];
      }
    }

    if (candidate) {
      const safeUrl = this.normalizeCanonicalUrl(candidate, baseUrl);
      if (safeUrl && !this.isAuthorOrAvatar(safeUrl)) {
        return safeUrl;
      }
    }
    return undefined;
  }

  private categorizeText(title: string, text: string, fallback: Category): Category {
    const combined = `${title} ${text}`.toLowerCase();
    if (
      combined.includes('robot') ||
      combined.includes('humanoid') ||
      combined.includes('hardware') ||
      combined.includes('nvidia') ||
      combined.includes('gpu')
    ) {
      return 'Robotics & Hardware';
    }
    if (
      combined.includes('open source') ||
      combined.includes('weights') ||
      combined.includes('paper') ||
      combined.includes('arxiv') ||
      combined.includes('hugging face')
    ) {
      return 'Open Source & Research';
    }
    if (
      combined.includes('funding') ||
      combined.includes('valuation') ||
      combined.includes('startup') ||
      combined.includes('acquisition') ||
      combined.includes('billion')
    ) {
      return 'Business & Big Tech';
    }
    if (
      combined.includes('regulation') ||
      combined.includes('policy') ||
      combined.includes('copyright') ||
      combined.includes('safety') ||
      combined.includes('alignment')
    ) {
      return 'Ethics & Policy';
    }
    return fallback;
  }
}
