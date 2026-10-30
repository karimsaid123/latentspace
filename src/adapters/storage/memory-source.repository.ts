import fs from 'fs/promises';
import path from 'path';
import { SourceRepositoryPort } from '@/core/ports/repository.port';
import { DomainSource } from '@/core/domain/entities';
import staticSourcesData from '../../../data/sources.json';

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
  {
    id: 'arxiv-ai',
    name: 'arXiv cs.AI (Artificial Intelligence)',
    feedUrl: 'https://rss.arxiv.org/rss/cs.AI',
    websiteUrl: 'https://arxiv.org/list/cs.AI/recent',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'arxiv-cl',
    name: 'arXiv cs.CL (Language & LLMs)',
    feedUrl: 'https://rss.arxiv.org/rss/cs.CL',
    websiteUrl: 'https://arxiv.org/list/cs.CL/recent',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-xai',
    name: 'TechCrunch xAI & Grok',
    feedUrl: 'https://techcrunch.com/tag/xai/feed/',
    websiteUrl: 'https://techcrunch.com/tag/xai/',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-spacex',
    name: 'TechCrunch SpaceX & Starlink',
    feedUrl: 'https://techcrunch.com/tag/spacex/feed/',
    websiteUrl: 'https://techcrunch.com/tag/spacex/',
    category: 'Robotics & Hardware',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'arxiv-xai',
    name: 'arXiv xAI & Autonomous Systems',
    feedUrl: 'https://export.arxiv.org/api/query?search_query=ti:Grok+OR+abs:%22Grok-1%22+OR+abs:%22Colossus%22+OR+ti:%22autonomous+spacecraft%22+OR+abs:%22Starlink%22&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending',
    websiteUrl: 'https://arxiv.org/',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-anthropic',
    name: 'TechCrunch Anthropic & Claude',
    feedUrl: 'https://techcrunch.com/tag/anthropic/feed/',
    websiteUrl: 'https://techcrunch.com/tag/anthropic/',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'arxiv-deepmind',
    name: 'arXiv Google DeepMind Research',
    feedUrl: 'https://export.arxiv.org/api/query?search_query=ti:DeepMind+OR+ti:Gemini+OR+abs:%22Google+DeepMind%22+OR+ti:AlphaFold&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending',
    websiteUrl: 'https://arxiv.org/',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-mistral',
    name: 'TechCrunch Mistral AI',
    feedUrl: 'https://techcrunch.com/tag/mistral-ai/feed/',
    websiteUrl: 'https://techcrunch.com/tag/mistral-ai/',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'arxiv-mistral',
    name: 'arXiv Mistral & Mixtral Research',
    feedUrl: 'https://export.arxiv.org/api/query?search_query=ti:Mistral+OR+ti:Mixtral+OR+abs:%22Mistral+AI%22+OR+abs:Codestral&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending',
    websiteUrl: 'https://arxiv.org/',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-moonshot',
    name: 'TechCrunch Moonshot AI & Kimi',
    feedUrl: 'https://techcrunch.com/tag/moonshot-ai/feed/',
    websiteUrl: 'https://techcrunch.com/tag/moonshot-ai/',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'arxiv-moonshot',
    name: 'arXiv Moonshot & Kimi Research',
    feedUrl: 'https://export.arxiv.org/api/query?search_query=ti:Kimi+OR+abs:%22Moonshot+AI%22+OR+abs:%22Kimi%22+OR+ti:%22Moonshot%22&start=0&max_results=15&sortBy=submittedDate&sortOrder=descending',
    websiteUrl: 'https://arxiv.org/',
    category: 'LLMs & GenAI',
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
      let loaded: DomainSource[] = [];
      const isServerlessEdge =
        typeof process === 'undefined' ||
        !!process.env.CF_PAGES ||
        !!process.env.WORKERS ||
        !!process.env.CLOUDFLARE ||
        process.env.NEXT_RUNTIME === 'edge';

      if (isServerlessEdge) {
        loaded = (staticSourcesData as DomainSource[]) || DEFAULT_SOURCES;
      } else {
        try {
          const raw = await fs.readFile(this.storageFilePath, 'utf8');
          loaded = JSON.parse(raw);
        } catch {
          // Fallback to statically bundled sources
          loaded = (staticSourcesData as DomainSource[]) || DEFAULT_SOURCES;
        }
      }

      for (const s of loaded) {
        this.sources.set(s.id, s);
      }
      let addedNew = false;
      for (const s of DEFAULT_SOURCES) {
        if (!this.sources.has(s.id)) {
          this.sources.set(s.id, s);
          addedNew = true;
        }
      }
      if (addedNew) {
        await this.persist();
      }
    } catch {
      // Seed default sources
      const seed = (staticSourcesData as DomainSource[]) || DEFAULT_SOURCES;
      for (const s of seed) {
        this.sources.set(s.id, s);
      }
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
    // Cloudflare Workers and serverless edge runtimes have no writable filesystem
    if (typeof process === 'undefined' || process.env.CF_PAGES || process.env.WORKERS) {
      return;
    }
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      const tmpPath = `${this.storageFilePath}.${Date.now()}_${Math.random().toString(36).slice(2, 7)}.tmp`;
      const all = Array.from(this.sources.values());
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch (err) {
      // Gracefully ignore on read-only environments
    }
  }
}

