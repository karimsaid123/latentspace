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
      const feed = await this.parser.parseString(xmlText);
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

  private extractImageUrl(item: any): string | undefined {
    if (item.enclosure?.url && (item.enclosure.type?.includes('image') || /\.(jpg|jpeg|png|webp)/i.test(item.enclosure.url))) {
      return item.enclosure.url;
    }
    if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
    if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;

    const content = item.contentEncoded || item.content || item.summary || '';
    const match = content.match(/<img[^>]+src=["']([^"'>]+)["']/i);
    if (match && match[1] && !match[1].includes('doubleclick') && !match[1].includes('feedburner')) {
      return match[1];
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
