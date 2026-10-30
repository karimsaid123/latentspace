import fs from 'fs/promises';
import path from 'path';
import { SourceRepositoryPort } from '@/core/ports/repository.port';
import { DomainSource } from '@/core/domain/entities';

const DEFAULT_SOURCES: DomainSource[] = [
  {
    id: 'openai',
    name: 'OpenAI News',
    feedUrl: 'https://openai.com/news/rss.xml',
    websiteUrl: 'https://openai.com/news',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'deepmind',
    name: 'Google DeepMind',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    websiteUrl: 'https://deepmind.google/discover/blog',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-ai',
    name: 'TechCrunch AI',
    feedUrl: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    websiteUrl: 'https://techcrunch.com/category/artificial-intelligence/',
    category: 'Business & Big Tech',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'verge-ai',
    name: 'The Verge AI',
    feedUrl: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
    websiteUrl: 'https://www.theverge.com/ai-artificial-intelligence',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Blog',
    feedUrl: 'https://huggingface.co/blog/feed.xml',
    websiteUrl: 'https://huggingface.co/blog',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'mit-tech-ai',
    name: 'MIT Technology Review',
    feedUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
    websiteUrl: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    category: 'Ethics & Policy',
    enabled: true,
    consecutiveFailures: 0,
  },
];

export class MemorySourceRepository implements SourceRepositoryPort {
  private sources = new Map<string, DomainSource>();
  private readonly storageFilePath: string;

  constructor(customStoragePath?: string) {
    this.storageFilePath = customStoragePath || path.join(process.cwd(), 'data', 'sources.json');
  }

  public async initialize(): Promise<void> {
    try {
      const raw = await fs.readFile(this.storageFilePath, 'utf8');
      const loaded: DomainSource[] = JSON.parse(raw);
      for (const s of loaded) {
        this.sources.set(s.id, s);
      }
    } catch {
      // Seed default sources
      for (const s of DEFAULT_SOURCES) {
        this.sources.set(s.id, s);
      }
      await this.persist();
    }
  }

  public async listAll(): Promise<DomainSource[]> {
    if (this.sources.size === 0) await this.initialize();
    return Array.from(this.sources.values());
  }

  public async listEnabled(): Promise<DomainSource[]> {
    const all = await this.listAll();
    return all.filter(s => s.enabled);
  }

  public async findById(id: string): Promise<DomainSource | null> {
    if (this.sources.size === 0) await this.initialize();
    return this.sources.get(id) || null;
  }

  public async updateStatus(id: string, fetchedAt: string, failureCount: number): Promise<void> {
    const source = this.sources.get(id);
    if (!source) return;

    source.lastFetchedAt = fetchedAt;
    source.consecutiveFailures = failureCount;
    await this.persist();
  }

  public async toggleSource(id: string, enabled: boolean): Promise<void> {
    const source = this.sources.get(id);
    if (!source) return;

    source.enabled = enabled;
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      const tmpPath = `${this.storageFilePath}.${Date.now()}.tmp`;
      const all = Array.from(this.sources.values());
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch (err) {
      console.warn('Failed to persist sources to disk:', err);
    }
  }
}
