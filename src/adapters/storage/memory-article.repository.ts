import fs from 'fs/promises';
import path from 'path';
import { ArticleFilter, ArticleQueryResult, ArticleRepositoryPort } from '@/core/ports/repository.port';
import { DomainArticle } from '@/core/domain/entities';
import { decodeHtmlEntities } from '@/lib/sanitize';
import { detectFrontierLab, generateDeepIntelligenceSummary, detectEntryType } from '@/lib/intelligence-analyzer';
import { isServerlessOrEdge } from '@/lib/runtime-env';
import staticArticlesData from '../../../data/articles.json';

const MAX_STORED_ARTICLES = 400;
const EDGE_ARTICLES_STORE_URL = 'https://internal.latentspace/articles-store';
const EDGE_SYNC_CHECK_TTL_MS = 10_000;

interface IndexedArticle {
  article: DomainArticle;
  publishedAtMs: number;
  fetchedAtMs: number;
  searchBlob: string;
}

export class MemoryArticleRepository implements ArticleRepositoryPort {
  private articles = new Map<string, IndexedArticle>();
  private sortedCache: IndexedArticle[] | null = null;
  private latestFetchedAtMs = 0;
  private lastEdgeSyncCheckMs = 0;
  private lastKnownEdgeVersion = 0;
  private readonly storageFilePath: string;

  constructor(customStoragePath?: string) {
    this.storageFilePath = customStoragePath || path.join(process.cwd(), 'data', 'articles.json');
  }

  private indexArticle(art: DomainArticle): IndexedArticle {
    const parsedPub = Date.parse(art.publishedAt);
    const publishedAtMs = Number.isNaN(parsedPub) ? 0 : parsedPub;
    const parsedFetch = Date.parse(art.fetchedAt);
    const fetchedAtMs = Number.isNaN(parsedFetch) ? publishedAtMs : parsedFetch;
    if (fetchedAtMs > this.latestFetchedAtMs) {
      this.latestFetchedAtMs = fetchedAtMs;
    }
    const searchBlob = `${art.title} ${art.contentSnippet} ${art.summary?.tldr || ''} ${art.sourceName} ${art.lab || ''}`.toLowerCase();
    return { article: art, publishedAtMs, fetchedAtMs, searchBlob };
  }

  private getSortedEntries(): IndexedArticle[] {
    if (!this.sortedCache) {
      this.sortedCache = Array.from(this.articles.values()).sort(
        (a, b) => b.publishedAtMs - a.publishedAtMs
      );
    }
    return this.sortedCache;
  }

  public getLatestFetchedAtMs(): number {
    return this.latestFetchedAtMs;
  }

  private normalizeRawItem(item: any): DomainArticle | null {
    if (!item?.id) return null;
    const title = decodeHtmlEntities(item.title || '');
    const contentSnippet = decodeHtmlEntities(item.contentSnippet || item.fullContent || '');
    const sourceName = item.sourceName || item.source?.name || 'Feed';
    const canonicalUrl = item.canonicalUrl || item.link || '';
    const lab = item.lab || detectFrontierLab(title, contentSnippet, sourceName);

    let entryType = item.entryType;
    let arxivId = item.arxivId;
    let pdfUrl = item.pdfUrl;
    if (!entryType || (entryType === 'RESEARCH_PAPER' && !pdfUrl)) {
      const typeInfo = detectEntryType(title, contentSnippet, canonicalUrl, sourceName);
      entryType = entryType || typeInfo.entryType;
      arxivId = arxivId || typeInfo.arxivId;
      pdfUrl = pdfUrl || typeInfo.pdfUrl;
    }

    let summary = item.summary || item.aiSummary;
    if (!summary || !summary.technicalAnalysis || (summary.takeaways?.length || 0) < 3) {
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
        generatedWith: summary.generatedWith,
      };
    }

    return {
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
  }

  /**
   * Synchronizes warm Cloudflare Worker isolates with shared `caches.default` storage.
   * Uses `X-Latent-Version` header check first so unchanged states cost ~0ms CPU (no JSON parse).
   */
  public async syncFromEdge(force = false): Promise<boolean> {
    if (!isServerlessOrEdge()) return false;
    const now = Date.now();
    if (!force && now - this.lastEdgeSyncCheckMs < EDGE_SYNC_CHECK_TTL_MS) {
      return false;
    }
    this.lastEdgeSyncCheckMs = now;

    try {
      const cache = typeof caches !== 'undefined' && 'default' in caches ? (caches as any).default : null;
      if (!cache) return false;

      const match = await cache.match(new Request(EDGE_ARTICLES_STORE_URL, { method: 'GET' }));
      if (!match) return false;

      const remoteVer = Number(match.headers.get('X-Latent-Version') || 0);
      if (this.lastKnownEdgeVersion > 0 && remoteVer > 0 && remoteVer <= this.lastKnownEdgeVersion) {
        return false;
      }

      const cached = await match.json();
      if (!Array.isArray(cached) || cached.length === 0) return false;

      let changed = false;
      for (const raw of cached) {
        if (!raw?.id) continue;
        const existing = this.articles.get(raw.id);
        if (!existing || (raw.contentHash && existing.article.contentHash !== raw.contentHash)) {
          const normalized = this.normalizeRawItem(raw);
          if (normalized) {
            this.articles.set(normalized.id, this.indexArticle(normalized));
            changed = true;
          }
        }
      }

      if (changed) {
        this.sortedCache = null;
        this.trimToMax();
      }
      this.lastKnownEdgeVersion = remoteVer || now;
      return changed;
    } catch {
      return false;
    }
  }

  private trimToMax(): void {
    if (this.articles.size > MAX_STORED_ARTICLES) {
      const sorted = this.getSortedEntries();
      const trimmed = sorted.slice(0, MAX_STORED_ARTICLES);
      this.articles.clear();
      for (const entry of trimmed) {
        this.articles.set(entry.article.id, entry);
      }
      this.sortedCache = trimmed;
    }
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
          loaded = staticArticlesData as any[];
        }
      }

      if (!loaded || loaded.length === 0) {
        loaded = staticArticlesData as any[];
      }

      for (const item of loaded) {
        const normalized = this.normalizeRawItem(item);
        if (normalized) {
          this.articles.set(normalized.id, this.indexArticle(normalized));
        }
      }
      this.sortedCache = null;
      this.trimToMax();

      // Overlay any newer edge-persisted articles from caches.default
      if (isServerlessOrEdge()) {
        await this.syncFromEdge(true);
      }
    } catch {
      // Empty or not existing yet
    }
  }

  public async saveMany(incoming: DomainArticle[]): Promise<{ savedCount: number }> {
    for (const art of incoming) {
      this.articles.set(art.id, this.indexArticle(art));
    }
    this.sortedCache = null;
    this.trimToMax();

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
    // Cloudflare Workers and serverless edge runtimes use Cloudflare Cache API for persistent storage
    if (isServerlessOrEdge()) {
      try {
        const cache = typeof caches !== 'undefined' && 'default' in caches ? (caches as any).default : null;
        if (cache) {
          const version = Date.now();
          const all = this.getSortedEntries().map(e => e.article).slice(0, MAX_STORED_ARTICLES);
          const res = new Response(JSON.stringify(all), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=604800, s-maxage=604800',
              'X-Latent-Version': String(version),
            },
          });
          await cache.put(new Request(EDGE_ARTICLES_STORE_URL, { method: 'GET' }), res);
          this.lastKnownEdgeVersion = version;
          this.lastEdgeSyncCheckMs = version;
        }
      } catch {
        // Gracefully ignore edge cache write errors
      }
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
