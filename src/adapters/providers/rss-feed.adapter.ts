import Parser from 'rss-parser';
import crypto from 'crypto';
import { FeedProviderPort } from '@/core/ports/feed-provider.port';
import { DomainSource, FeedSnapshot, DomainArticle, Category } from '@/core/domain/entities';
import { ProviderUnavailableError, RateLimitError } from '@/core/domain/errors';
import { decodeHtmlEntities } from '@/lib/sanitize';
import { detectFrontierLab, generateDeepIntelligenceSummary, detectEntryType } from '@/lib/intelligence-analyzer';

export class RssFeedAdapter implements FeedProviderPort {
  private parser: Parser;
  private readonly timeoutMs: number;

  constructor(timeoutMs = 7000) {
    this.timeoutMs = timeoutMs;
    this.parser = new Parser({
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LatentSpace/2.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
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

  public async fetchFeed(source: DomainSource): Promise<FeedSnapshot> {
    const fetchedAt = new Date().toISOString();

    try {
      const response = await fetch(source.feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) LatentSpace/2.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (response.status === 429) {
        throw new RateLimitError(source.name, 60);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xmlText = await response.text();
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
        const rawLink = item.link || item.guid || '';
        const title = decodeHtmlEntities((item.title || '').trim());
        if (!rawLink || !title) continue;

        const canonicalUrl = this.normalizeCanonicalUrl(rawLink);
        const id = crypto.createHash('sha256').update(canonicalUrl).digest('hex').slice(0, 16);

        const rawContent = (item as any).contentEncoded || item.content || item.contentSnippet || item.summary || '';
        const cleanContent = this.stripHtml(rawContent);
        const contentHash = crypto.createHash('sha256').update(cleanContent || title).digest('hex').slice(0, 16);

        const publishedAt = this.safeParseDate(item.isoDate || item.pubDate, fetchedAt);
        const author = decodeHtmlEntities((item as any).creator || (item as any).author || source.name);
        const imageUrl = this.extractImageUrl(item);
        const category = this.categorizeText(title, cleanContent, source.category);
        const lab = detectFrontierLab(title, cleanContent, source.name);
        const { entryType, arxivId, pdfUrl } = detectEntryType(title, cleanContent, canonicalUrl, source.name);
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
    const itemCutoff = lowerItem !== -1 ? lowerItem : this.findNthTagBoundary(xml, '<ITEM', maxItems + 1);

    if (itemCutoff > 0) {
      const head = xml.slice(0, 1200);
      if (/<rdf:rdf\b/i.test(head)) {
        return `${xml.slice(0, itemCutoff)}\n</rdf:RDF>`;
      }
      return `${xml.slice(0, itemCutoff)}\n</channel></rss>`;
    }

    const lowerEntry = this.findNthTagBoundary(xml, '<entry', maxItems + 1);
    const entryCutoff = lowerEntry !== -1 ? lowerEntry : this.findNthTagBoundary(xml, '<ENTRY', maxItems + 1);

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
      if (nextChar === '>' || nextChar === ' ' || nextChar === '\t' || nextChar === '\n' || nextChar === '\r') {
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

  private normalizeCanonicalUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('utm_term');
      parsed.searchParams.delete('utm_content');
      parsed.searchParams.delete('ref');
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return url.split('?')[0].split('#')[0];
    }
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    const withoutTags = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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

  private extractImageUrl(item: any): string | undefined {
    let candidate: string | undefined;

    if (item.enclosure?.url && (item.enclosure.type?.includes('image') || /\.(jpg|jpeg|png|webp)/i.test(item.enclosure.url))) {
      candidate = item.enclosure.url;
    } else if (item.mediaContent?.$?.url) {
      candidate = item.mediaContent.$.url;
    } else if (item.mediaThumbnail?.$?.url) {
      candidate = item.mediaThumbnail.$.url;
    } else {
      const content = item.contentEncoded || item.content || item.summary || '';
      const match = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
      if (match && match[1]) {
        candidate = match[1];
      }
    }

    if (candidate && !this.isAuthorOrAvatar(candidate)) {
      return candidate;
    }
    return undefined;
  }

  private categorizeText(title: string, text: string, fallback: Category): Category {
    const combined = `${title} ${text}`.toLowerCase();
    if (combined.includes('robot') || combined.includes('humanoid') || combined.includes('hardware') || combined.includes('nvidia') || combined.includes('gpu')) {
      return 'Robotics & Hardware';
    }
    if (combined.includes('open source') || combined.includes('weights') || combined.includes('paper') || combined.includes('arxiv') || combined.includes('hugging face')) {
      return 'Open Source & Research';
    }
    if (combined.includes('funding') || combined.includes('valuation') || combined.includes('startup') || combined.includes('acquisition') || combined.includes('billion')) {
      return 'Business & Big Tech';
    }
    if (combined.includes('regulation') || combined.includes('policy') || combined.includes('copyright') || combined.includes('safety') || combined.includes('alignment')) {
      return 'Ethics & Policy';
    }
    return fallback;
  }
}
