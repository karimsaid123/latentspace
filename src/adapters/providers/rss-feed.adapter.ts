import Parser from 'rss-parser';
import crypto from 'crypto';
import { FeedProviderPort } from '@/core/ports/feed-provider.port';
import { DomainSource, FeedSnapshot, DomainArticle, Category, ImpactLevel } from '@/core/domain/entities';
import { ProviderUnavailableError, RateLimitError } from '@/core/domain/errors';
import { decodeHtmlEntities } from '@/lib/sanitize';

export class RssFeedAdapter implements FeedProviderPort {
  private parser: Parser;

  constructor(timeoutMs = 8000) {
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
      const feed = await this.parser.parseURL(source.feedUrl);
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

        const publishedAt = item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : fetchedAt);
        const author = (item as any).creator || (item as any).author || source.name;
        const imageUrl = this.extractImageUrl(item);
        const category = this.categorizeText(title, cleanContent, source.category);
        const summary = this.generateZeroCostSummary(title, cleanContent);

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
          contentSnippet: cleanContent.slice(0, 280),
          imageUrl,
          category,
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
      const message = err.message || 'Unknown network error';
      if (message.includes('429') || message.includes('Rate limit')) {
        throw new RateLimitError(source.name, 60);
      }
      throw new ProviderUnavailableError(source.name, message);
    }
  }

  private normalizeCanonicalUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Strip tracking query params
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

  private generateZeroCostSummary(title: string, content: string) {
    const words = content.split(/\s+/).filter(Boolean);
    const readTimeMinutes = Math.max(1, Math.ceil(words.length / 180));
    
    // Impact determination
    const lower = `${title} ${content}`.toLowerCase();
    let impact: ImpactLevel = 'Notable';
    if (lower.includes('breakthrough') || lower.includes('frontier model') || lower.includes('superintelligence')) {
      impact = 'Breakthrough';
    } else if (lower.includes('billion') || lower.includes('major update') || lower.includes('raises') || lower.includes('launches')) {
      impact = 'High';
    } else if (lower.includes('announces') || lower.includes('releases')) {
      impact = 'Medium';
    }

    // High signal sentence extraction for TL;DR
    const sentences = content
      .split(/(?<=[.?!])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 25 && !s.toLowerCase().includes('click here') && !s.toLowerCase().includes('read more'));

    const tldr = sentences[0] || `${title}: Key intelligence update.`;
    const takeaways: string[] = [];
    if (sentences[1]) takeaways.push(sentences[1]);
    if (sentences[2]) takeaways.push(sentences[2]);
    if (sentences[3]) takeaways.push(sentences[3]);

    if (takeaways.length === 0) {
      takeaways.push('Core architectural advancement documented in report.');
      takeaways.push('Implications for distributed model deployment and research.');
    }

    return {
      tldr: tldr.length > 220 ? tldr.slice(0, 217) + '...' : tldr,
      takeaways,
      impact,
      readTimeMinutes,
    };
  }
}

