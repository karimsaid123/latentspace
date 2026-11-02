import fs from 'fs/promises';
import path from 'path';
import { ArticleFilter, ArticleQueryResult, ArticleRepositoryPort } from '@/core/ports/repository.port';
import { DomainArticle } from '@/core/domain/entities';
import { decodeHtmlEntities } from '@/lib/sanitize';
import { safeJsonParse } from '@/lib/request-security';
import { detectFrontierLab, generateDeepIntelligenceSummary, detectEntryType } from '@/lib/intelligence-analyzer';
import { computeVectorPulseFromEntries, detectVectorIds } from '@/lib/vector-pulse';
import { isServerlessOrEdge } from '@/lib/runtime-env';
import type { VectorPulseSnapshot } from '@/types';
import staticArticlesData from '../../../data/articles.json';

const MAX_STORED_ARTICLES = 400;
const EDGE_ARTICLES_STORE_URL = 'https://internal.latentspace/articles-store';
const EDGE_SYNC_CHECK_TTL_MS = 10_000;

function sanitizeSafeHttpUrl(raw?: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

interface IndexedArticle {
  article: DomainArticle;
  publishedAtMs: number;
  fetchedAtMs: number;
  searchBlob: string;
  vectorIds: Set<string>;
}

export class MemoryArticleRepository implements ArticleRepositoryPort {
  private articles = new Map<string, IndexedArticle>();
  private sortedCache: IndexedArticle[] | null = null;
  private vectorPulseCache: VectorPulseSnapshot | null = null;
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
    const vectorIds = detectVectorIds(searchBlob);
    return { article: art, publishedAtMs, fetchedAtMs, searchBlob, vectorIds };
  }

  private getSortedEntries(): IndexedArticle[] {
    if (!this.sortedCache) {
      this.sortedCache = Array.from(this.articles.values()).sort(
        (a, b) => b.publishedAtMs - a.publishedAtMs
      );
    }
    return this.sortedCache;
  }

  public getVectorPulse(): VectorPulseSnapshot {
    if (!this.vectorPulseCache) {
      this.vectorPulseCache = computeVectorPulseFromEntries(this.getSortedEntries());
    }
    return this.vectorPulseCache;
  }

  public getLatestFetchedAtMs(): number {
    return this.latestFetchedAtMs;
  }

  private normalizeRawItem(item: any): DomainArticle | null {
    if (!item?.id || typeof item.id !== 'string') return null;
    const title = decodeHtmlEntities(item.title || '');
    const contentSnippet = decodeHtmlEntities(item.contentSnippet || item.fullContent || '');
    const sourceName = item.sourceName || item.source?.name || 'Feed';
    const canonicalUrl = sanitizeSafeHttpUrl(item.canonicalUrl || item.link) || '';
    const lab = detectFrontierLab(title, contentSnippet, sourceName);

    let entryType = item.entryType;
    let arxivId = item.arxivId;
    let pdfUrl = sanitizeSafeHttpUrl(item.pdfUrl);
    if (!entryType || (entryType === 'RESEARCH_PAPER' && !pdfUrl)) {
      const typeInfo = detectEntryType(title, contentSnippet, canonicalUrl, sourceName);
      entryType = entryType || typeInfo.entryType;
      arxivId = arxivId || typeInfo.arxivId;
      pdfUrl = pdfUrl || sanitizeSafeHttpUrl(typeInfo.pdfUrl);
    }

    const rawSummary = item.summary || item.aiSummary;
    let summary;
    if (rawSummary?.generatedWith === 'gemini' && typeof rawSummary.tldr === 'string' && rawSummary.tldr.trim()) {
      const rawImpact = rawSummary.impact;
      const normalizedImpact =
        rawImpact === 'Breakthrough' || rawImpact === 'High' || rawImpact === 'Medium' || rawImpact === 'Notable'
          ? rawImpact
          : rawImpact === 'High Impact'
          ? 'High'
          : 'Notable';

      summary = {
        tldr: decodeHtmlEntities(rawSummary.tldr),
        takeaways: Array.isArray(rawSummary.takeaways)
          ? rawSummary.takeaways.map((t: string) => decodeHtmlEntities(t))
          : [],
        impact: normalizedImpact,
        readTimeMinutes: rawSummary.readTimeMinutes || 3,
        generatedWith: 'gemini' as const,
        summaryVersion: rawSummary.summaryVersion,
      };
    } else {
      summary = generateDeepIntelligenceSummary(title, contentSnippet, sourceName);
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
        const rawSummaryObj = raw.summary || raw.aiSummary;
        const rawSummaryGen = rawSummaryObj?.generatedWith;
        const rawSummaryVer = Number(rawSummaryObj?.summaryVersion || 0);
        const existingSummaryVer = Number(existing?.article.summary?.summaryVersion || 0);
        const upgradedToGemini =
          (rawSummaryGen === 'gemini' && existing?.article.summary?.generatedWith !== 'gemini') ||
          (rawSummaryGen === 'gemini' && rawSummaryVer > existingSummaryVer);
        const contentOrTitleChanged =
          Boolean(raw.contentHash && existing && existing.article.contentHash !== raw.contentHash) ||
          Boolean(raw.title && existing && existing.article.title !== raw.title);

        if (!existing || contentOrTitleChanged || upgradedToGemini) {
          const normalized = this.normalizeRawItem(raw);
          if (normalized) {
            this.articles.set(normalized.id, this.indexArticle(normalized));
            changed = true;
          }
        }
      }

      if (changed) {
        this.sortedCache = null;
        this.vectorPulseCache = null;
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
      this.vectorPulseCache = null;
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
          loaded = safeJsonParse<any[]>(raw);
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
      this.vectorPulseCache = null;
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
    this.vectorPulseCache = null;
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
    if (filter?.vectorId && !entry.vectorIds.has(filter.vectorId)) {
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
      if (Object.hasOwn(categoryCounts, cat)) {
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
    let tmpPath = '';
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      tmpPath = `${this.storageFilePath}.${Date.now()}_${Math.random().toString(36).slice(2, 7)}.tmp`;
      const all = this.getSortedEntries().map(e => e.article);
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch {
      if (tmpPath) {
        await fs.unlink(tmpPath).catch(() => {});
      }
    }
  }
}
