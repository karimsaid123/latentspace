import fs from 'fs/promises';
import path from 'path';
import { ArticleFilter, ArticleRepositoryPort } from '@/core/ports/repository.port';
import { DomainArticle } from '@/core/domain/entities';
import { decodeHtmlEntities } from '@/lib/sanitize';
import { detectFrontierLab, generateDeepIntelligenceSummary, detectEntryType } from '@/lib/intelligence-analyzer';
import staticArticlesData from '../../../data/articles.json';

export class MemoryArticleRepository implements ArticleRepositoryPort {
  private articles = new Map<string, DomainArticle>();
  private readonly storageFilePath: string;

  constructor(customStoragePath?: string) {
    this.storageFilePath = customStoragePath || path.join(process.cwd(), 'data', 'articles.json');
  }

  public async initialize(): Promise<void> {
    try {
      let loaded: any[] = [];
      try {
        const raw = await fs.readFile(this.storageFilePath, 'utf8');
        loaded = JSON.parse(raw);
      } catch {
        // Fallback to statically bundled articles for Cloudflare Workers / Edge / Serverless
        loaded = staticArticlesData as any[];
      }

      if (!loaded || loaded.length === 0) {
        loaded = staticArticlesData as any[];
      }

      for (const item of loaded) {
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

        this.articles.set(normalized.id, normalized);
      }
    } catch {
      // Empty or not existing yet
    }
  }

  public async saveMany(incoming: DomainArticle[]): Promise<{ savedCount: number }> {
    for (const art of incoming) {
      this.articles.set(art.id, art);
    }
    await this.persist();
    return { savedCount: incoming.length };
  }

  public async findById(id: string): Promise<DomainArticle | null> {
    return this.articles.get(id) || null;
  }

  public async getAllAsMap(): Promise<Map<string, DomainArticle>> {
    return new Map(this.articles);
  }

  public async list(filter?: ArticleFilter): Promise<DomainArticle[]> {
    let result = Array.from(this.articles.values());

    if (filter?.category && filter.category !== 'All') {
      result = result.filter(a => a.category === filter.category);
    }

    if (filter?.lab && filter.lab !== 'All') {
      result = result.filter(a => a.lab === filter.lab);
    }

    if (filter?.entryType && filter.entryType !== 'ALL') {
      result = result.filter(a => a.entryType === filter.entryType);
    }

    if (filter?.sourceId) {
      result = result.filter(a => a.sourceId === filter.sourceId);
    }

    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.contentSnippet.toLowerCase().includes(q) ||
        (a.summary?.tldr && a.summary.tldr.toLowerCase().includes(q)) ||
        a.sourceName.toLowerCase().includes(q)
      );
    }

    // Sort descending by publishedAt
    result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    if (filter?.offset) {
      result = result.slice(filter.offset);
    }

    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  public async count(filter?: ArticleFilter): Promise<number> {
    const list = await this.list({ ...filter, limit: undefined, offset: undefined });
    return list.length;
  }

  private async persist(): Promise<void> {
    // Cloudflare Workers and serverless edge runtimes have no writable filesystem
    if (typeof process === 'undefined' || process.env.CF_PAGES || process.env.WORKERS) {
      return;
    }
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      const tmpPath = `${this.storageFilePath}.${Date.now()}_${Math.random().toString(36).slice(2, 7)}.tmp`;
      const all = Array.from(this.articles.values());
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch (err) {
      // Gracefully ignore on read-only environments
    }
  }
}
