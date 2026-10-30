import fs from 'fs/promises';
import path from 'path';
import { ArticleFilter, ArticleRepositoryPort } from '@/core/ports/repository.port';
import { DomainArticle } from '@/core/domain/entities';
import { decodeHtmlEntities } from '@/lib/sanitize';

export class MemoryArticleRepository implements ArticleRepositoryPort {
  private articles = new Map<string, DomainArticle>();
  private readonly storageFilePath: string;

  constructor(customStoragePath?: string) {
    this.storageFilePath = customStoragePath || path.join(process.cwd(), 'data', 'articles.json');
  }

  public async initialize(): Promise<void> {
    try {
      const raw = await fs.readFile(this.storageFilePath, 'utf8');
      const loaded: any[] = JSON.parse(raw);
      for (const item of loaded) {
        // Robust adapter normalization: handles both legacy and domain formats
        const rawSummary = item.summary || item.aiSummary || {
          tldr: item.contentSnippet || item.title || '',
          takeaways: [],
          impact: item.aiSummary?.impact || 'Notable',
          readTimeMinutes: item.aiSummary?.readTimeMinutes || 2,
        };

        const summary = {
          tldr: decodeHtmlEntities(rawSummary.tldr || ''),
          takeaways: (rawSummary.takeaways || []).map((t: string) => decodeHtmlEntities(t)),
          impact: rawSummary.impact || 'Notable',
          readTimeMinutes: rawSummary.readTimeMinutes || 2,
        };

        const normalized: DomainArticle = {
          id: item.id,
          canonicalUrl: item.canonicalUrl || item.link || '',
          title: decodeHtmlEntities(item.title || ''),
          publishedAt: item.publishedAt || item.pubDate || new Date().toISOString(),
          fetchedAt: item.fetchedAt || item.pubDate || new Date().toISOString(),
          contentHash: item.contentHash || item.id,
          sourceId: item.sourceId || item.source?.id || 'source',
          sourceName: item.sourceName || item.source?.name || 'Feed',
          author: decodeHtmlEntities(item.author || ''),
          contentSnippet: decodeHtmlEntities(item.contentSnippet || ''),
          imageUrl: item.imageUrl,
          category: item.category || 'LLMs & GenAI',
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
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      const tmpPath = `${this.storageFilePath}.${Date.now()}.tmp`;
      const all = Array.from(this.articles.values());
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch (err) {
      console.warn('Failed to persist articles to disk:', err);
    }
  }
}
