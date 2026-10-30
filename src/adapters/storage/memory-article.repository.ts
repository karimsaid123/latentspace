import fs from 'fs/promises';
import path from 'path';
import { ArticleFilter, ArticleQueryResult, ArticleRepositoryPort } from '@/core/ports/repository.port';
import { DomainArticle } from '@/core/domain/entities';
import { decodeHtmlEntities } from '@/lib/sanitize';
import { detectFrontierLab, generateDeepIntelligenceSummary, detectEntryType } from '@/lib/intelligence-analyzer';
import { isServerlessOrEdge } from '@/lib/runtime-env';
import staticArticlesData from '../../../data/articles.json';

const MAX_STORED_ARTICLES = 400;

interface IndexedArticle {
  article: DomainArticle;
  publishedAtMs: number;
  searchBlob: string;
}

export class MemoryArticleRepository implements ArticleRepositoryPort {
  private articles = new Map<string, IndexedArticle>();
  private sortedCache: IndexedArticle[] | null = null;
  private readonly storageFilePath: string;

  constructor(customStoragePath?: string) {
    this.storageFilePath = customStoragePath || path.join(process.cwd(), 'data', 'articles.json');
  }

  private indexArticle(art: DomainArticle): IndexedArticle {
    const parsedMs = Date.parse(art.publishedAt);
    const publishedAtMs = Number.isNaN(parsedMs) ? 0 : parsedMs;
    const searchBlob = `${art.title} ${art.contentSnippet} ${art.summary?.tldr || ''} ${art.sourceName} ${art.lab || ''}`.toLowerCase();
    return { article: art, publishedAtMs, searchBlob };
  }

  private getSortedEntries(): IndexedArticle[] {
    if (!this.sortedCache) {
      this.sortedCache = Array.from(this.articles.values()).sort(
        (a, b) => b.publishedAtMs - a.publishedAtMs
      );
    }
    return this.sortedCache;
  }

  public async initialize(): Promise<void> {
    try {
      let loaded: any[] = [];

      if (isServerlessOrEdge()) {
        loaded = staticArticlesData as any[];
      } else {
        try {
          const raw = await fs.readFile(this.storageFilePath, 'utf8');
          loaded = JSON.parse(raw);
        } catch {
          // Fallback to statically bundled articles
          loaded = staticArticlesData as any[];
        }
      }

      if (!loaded || loaded.length === 0) {
        loaded = staticArticlesData as any[];
      }

      for (const item of loaded) {
        if (!item?.id) continue;
        const title = decodeHtmlEntities(item.title || '');
        const contentSnippet = decodeHtmlEntities(item.contentSnippet || item.fullContent || '');
        const sourceName = item.sourceName || item.source?.name || 'Feed';
        const canonicalUrl = item.canonicalUrl || item.link || '';
        const lab = item.lab || detectFrontierLab(title, contentSnippet, sourceName);
        const typeInfo = detectEntryType(title, contentSnippet, canonicalUrl, sourceName);
        const entryType = item.entryType || typeInfo.entryType;
        const arxivId = item.arxivId || typeInfo.arxivId;
        const pdfUrl = item.pdfUrl || typeInfo.pdfUrl;

        // Generate deep intelligence summary if existing one is too basic
        let summary = item.summary || item.aiSummary;
        if (!summary || !summary.technicalAnalysis || summary.takeaways?.length < 3) {
          summary = generateDeepIntelligenceSummary(title, contentSnippet, sourceName);
        } else {
          summary = {
            tldr: decodeHtmlEntities(summary.tldr || ''),
            takeaways: (summary.takeaways || []).map((t: string) => decodeHtmlEntities(t)),
            technicalAnalysis: summary.technicalAnalysis ? decodeHtmlEntities(summary.technicalAnalysis) : undefined,
            strategicImplications: summary.strategicImplications ? decodeHtmlEntities(summary.strategicImplications) : undefined,
            primaryThesis: summary.primaryThesis ? decodeHtmlEntities(summary.primaryThesis) : undefined,
            impact: summary.impact || 'Notable',
            readTimeMinutes: summary.readTimeMinutes || 3,
          };
        }

        const normalized: DomainArticle = {
          id: item.id,
          canonicalUrl,
          title,
          publishedAt: item.publishedAt || item.pubDate || new Date().toISOString(),
          fetchedAt: item.fetchedAt || item.pubDate || new Date().toISOString(),
          contentHash: item.contentHash || item.id,
          sourceId: item.sourceId || item.source?.id || 'source',
          sourceName,
          author: decodeHtmlEntities(item.author || ''),
          contentSnippet,
          imageUrl: item.imageUrl,
          category: item.category || 'LLMs & GenAI',
          lab,
          entryType,
          arxivId,
          pdfUrl,
          summary,
        };

        this.articles.set(normalized.id, this.indexArticle(normalized));
      }
      this.sortedCache = null;
    } catch {
      // Empty or not existing yet
    }
  }

  public async saveMany(incoming: DomainArticle[]): Promise<{ savedCount: number }> {
    for (const art of incoming) {
      this.articles.set(art.id, this.indexArticle(art));
    }
    this.sortedCache = null;

    // Bound memory & disk footprint to latest MAX_STORED_ARTICLES
    if (this.articles.size > MAX_STORED_ARTICLES) {
      const sorted = this.getSortedEntries();
      const trimmed = sorted.slice(0, MAX_STORED_ARTICLES);
      this.articles.clear();
      for (const entry of trimmed) {
        this.articles.set(entry.article.id, entry);
      }
      this.sortedCache = trimmed;
    }

    await this.persist();
    return { savedCount: incoming.length };
  }

  public async findById(id: string): Promise<DomainArticle | null> {
    return this.articles.get(id)?.article || null;
  }

  public async getAllAsMap(): Promise<Map<string, DomainArticle>> {
    const map = new Map<string, DomainArticle>();
    for (const [id, entry] of this.articles.entries()) {
      map.set(id, entry.article);
    }
    return map;
  }

  private matchesFilter(entry: IndexedArticle, filter?: ArticleFilter, normalizedQuery?: string): boolean {
    const a = entry.article;
    if (filter?.category && filter.category !== 'All' && a.category !== filter.category) {
      return false;
    }
    if (filter?.lab && filter.lab !== 'All' && a.lab !== filter.lab) {
      return false;
    }
    if (filter?.entryType && filter.entryType !== 'ALL' && a.entryType !== filter.entryType) {
      return false;
    }
    if (filter?.sourceId && a.sourceId !== filter.sourceId) {
      return false;
    }
    if (normalizedQuery && !entry.searchBlob.includes(normalizedQuery)) {
      return false;
    }
    return true;
  }

  public async list(filter?: ArticleFilter): Promise<DomainArticle[]> {
    const sorted = this.getSortedEntries();
    const q = filter?.searchQuery?.toLowerCase().trim() || undefined;

    const matched: DomainArticle[] = [];
    const offset = filter?.offset || 0;
    const limit = filter?.limit;
    let seen = 0;

    for (const entry of sorted) {
      if (!this.matchesFilter(entry, filter, q)) continue;
      if (seen >= offset) {
        matched.push(entry.article);
        if (limit !== undefined && matched.length >= limit) {
          break;
        }
      }
      seen++;
    }

    return matched;
  }

  public async count(filter?: ArticleFilter): Promise<number> {
    const sorted = this.getSortedEntries();
    const q = filter?.searchQuery?.toLowerCase().trim() || undefined;
    let total = 0;
    for (const entry of sorted) {
      if (this.matchesFilter(entry, filter, q)) total++;
    }
    return total;
  }

  /**
   * Single-pass query returning filtered articles, total matched count,
   * and global category counts in O(N) with zero Date allocations.
   */
  public async queryWithStats(filter?: ArticleFilter): Promise<ArticleQueryResult> {
    const sorted = this.getSortedEntries();
    const q = filter?.searchQuery?.toLowerCase().trim() || undefined;
    const offset = filter?.offset || 0;
    const limit = filter?.limit;

    const categoryCounts: Record<string, number> = {
      All: sorted.length,
      'LLMs & GenAI': 0,
      'Robotics & Hardware': 0,
      'Open Source & Research': 0,
      'Business & Big Tech': 0,
      'Ethics & Policy': 0,
    };

    const articles: DomainArticle[] = [];
    let total = 0;

    for (const entry of sorted) {
      const cat = entry.article.category;
      if (categoryCounts[cat] !== undefined) {
        categoryCounts[cat]++;
      }

      if (this.matchesFilter(entry, filter, q)) {
        if (total >= offset && (limit === undefined || articles.length < limit)) {
          articles.push(entry.article);
        }
        total++;
      }
    }

    return { articles, total, categoryCounts };
  }

  private async persist(): Promise<void> {
    // Cloudflare Workers and serverless edge runtimes have no writable filesystem
    if (isServerlessOrEdge()) {
      return;
    }
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      const tmpPath = `${this.storageFilePath}.${Date.now()}_${Math.random().toString(36).slice(2, 7)}.tmp`;
      const all = this.getSortedEntries().map(e => e.article);
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch {
      // Gracefully ignore on read-only environments
    }
  }
}
