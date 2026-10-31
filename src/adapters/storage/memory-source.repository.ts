import fs from 'fs/promises';
import path from 'path';
import { SourceRepositoryPort } from '@/core/ports/repository.port';
import { DomainSource } from '@/core/domain/entities';
import { isServerlessOrEdge } from '@/lib/runtime-env';
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
  {
    id: 'nvidia-blog',
    name: 'NVIDIA AI News',
    feedUrl: 'https://blogs.nvidia.com/feed/',
    websiteUrl: 'https://blogs.nvidia.com/',
    category: 'Robotics & Hardware',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-nvidia',
    name: 'TechCrunch NVIDIA & GPUs',
    feedUrl: 'https://techcrunch.com/tag/nvidia/feed/',
    websiteUrl: 'https://techcrunch.com/tag/nvidia/',
    category: 'Robotics & Hardware',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'techcrunch-meta',
    name: 'TechCrunch Meta AI',
    feedUrl: 'https://techcrunch.com/tag/meta/feed/',
    websiteUrl: 'https://techcrunch.com/tag/meta/',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'arxiv-meta',
    name: 'arXiv Meta AI & FAIR Research',
    feedUrl: 'https://export.arxiv.org/api/query?search_query=all:Meta+AND+all:LLaMA&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending',
    websiteUrl: 'https://arxiv.org',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'google-research',
    name: 'Google AI Research Blog',
    feedUrl: 'https://research.google/blog/rss/',
    websiteUrl: 'https://research.google/blog/',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'aws-ml',
    name: 'AWS Machine Learning',
    feedUrl: 'https://aws.amazon.com/blogs/machine-learning/feed/',
    websiteUrl: 'https://aws.amazon.com/blogs/machine-learning/',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'bair-blog',
    name: 'Berkeley AI Research (BAIR)',
    feedUrl: 'https://bair.berkeley.edu/blog/feed.xml',
    websiteUrl: 'https://bair.berkeley.edu/blog/',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'arxiv-lg',
    name: 'arXiv cs.LG (Machine Learning)',
    feedUrl: 'https://rss.arxiv.org/rss/cs.LG',
    websiteUrl: 'https://arxiv.org/list/cs.LG/recent',
    category: 'Open Source & Research',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'xai-radar',
    name: 'xAI & Grok Radar',
    feedUrl: 'https://news.google.com/rss/search?q=xAI+OR+%22Elon+Musk%22+AI+OR+Grok&hl=en-US&gl=US&ceid=US:en',
    websiteUrl: 'https://x.ai',
    category: 'LLMs & GenAI',
    enabled: true,
    consecutiveFailures: 0,
  },
  {
    id: 'teslarati-spacex',
    name: 'Teslarati SpaceX',
    feedUrl: 'https://www.teslarati.com/category/spacex/feed/',
    websiteUrl: 'https://www.teslarati.com',
    category: 'Robotics & Hardware',
    enabled: true,
    consecutiveFailures: 0,
  },
];

const EDGE_SOURCES_STORE_URL = 'https://internal.latentspace/sources-store';
const EDGE_SYNC_CHECK_TTL_MS = 10_000;

export class MemorySourceRepository implements SourceRepositoryPort {
  private sources = new Map<string, DomainSource>();
  private dirty = false;
  private lastEdgeSyncCheckMs = 0;
  private lastKnownEdgeVersion = 0;
  private readonly storageFilePath: string;

  constructor(customStoragePath?: string) {
    this.storageFilePath = customStoragePath || path.join(process.cwd(), 'data', 'sources.json');
  }

  public getLatestFetchedAtMs(): number {
    let maxMs = 0;
    for (const s of this.sources.values()) {
      if (s.lastFetchedAt) {
        const ms = Date.parse(s.lastFetchedAt);
        if (!Number.isNaN(ms) && ms > maxMs) {
          maxMs = ms;
        }
      }
    }
    return maxMs;
  }

  /**
   * Synchronizes warm Cloudflare Worker isolates with shared `caches.default` source state.
   * Preserves monotonic `lastFetchedAt` progression across concurrent isolates.
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

      const match = await cache.match(new Request(EDGE_SOURCES_STORE_URL, { method: 'GET' }));
      if (!match) return false;

      const remoteVer = Number(match.headers.get('X-Latent-Version') || 0);
      if (this.lastKnownEdgeVersion > 0 && remoteVer > 0 && remoteVer <= this.lastKnownEdgeVersion) {
        return false;
      }

      const cached = await match.json();
      if (!Array.isArray(cached) || cached.length === 0) return false;

      let changed = false;
      for (const remote of cached) {
        if (!remote?.id) continue;
        const local = this.sources.get(remote.id);
        if (!local) {
          this.sources.set(remote.id, remote);
          changed = true;
          continue;
        }
        const localMs = local.lastFetchedAt ? Date.parse(local.lastFetchedAt) || 0 : 0;
        const remoteMs = remote.lastFetchedAt ? Date.parse(remote.lastFetchedAt) || 0 : 0;
        if (remoteMs > localMs) {
          local.lastFetchedAt = remote.lastFetchedAt;
          local.consecutiveFailures = remote.consecutiveFailures ?? local.consecutiveFailures;
          changed = true;
        }
        if (typeof remote.enabled === 'boolean' && remote.enabled !== local.enabled) {
          local.enabled = remote.enabled;
          changed = true;
        }
      }

      this.lastKnownEdgeVersion = remoteVer || now;
      return changed;
    } catch {
      return false;
    }
  }

  public async initialize(): Promise<void> {
    try {
      let loaded: DomainSource[] = [];

      if (isServerlessOrEdge()) {
        loaded = [...((staticSourcesData as DomainSource[]) || DEFAULT_SOURCES)];
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
        this.sources.set(s.id, { ...s });
      }
      let addedNew = false;
      for (const s of DEFAULT_SOURCES) {
        if (!this.sources.has(s.id)) {
          this.sources.set(s.id, { ...s });
          addedNew = true;
        }
      }

      if (isServerlessOrEdge()) {
        await this.syncFromEdge(true);
      } else if (addedNew) {
        await this.persist();
      }
    } catch {
      // Seed default sources
      const seed = (staticSourcesData as DomainSource[]) || DEFAULT_SOURCES;
      for (const s of seed) {
        this.sources.set(s.id, { ...s });
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

  public async updateStatus(
    id: string,
    fetchedAt: string,
    failureCount: number,
    deferPersist = false
  ): Promise<void> {
    const source = this.sources.get(id);
    if (!source) return;

    source.lastFetchedAt = fetchedAt;
    source.consecutiveFailures = failureCount;
    if (deferPersist) {
      this.dirty = true;
    } else {
      await this.persist();
    }
  }

  public async flush(): Promise<void> {
    if (!this.dirty) return;
    this.dirty = false;
    await this.persist();
  }

  public async toggleSource(id: string, enabled: boolean): Promise<void> {
    const source = this.sources.get(id);
    if (!source) return;

    source.enabled = enabled;
    await this.persist();
  }

  private async persist(): Promise<void> {
    // Cloudflare Workers and serverless edge runtimes use Cloudflare Cache API for persistent source state
    if (isServerlessOrEdge()) {
      try {
        const cache = typeof caches !== 'undefined' && 'default' in caches ? (caches as any).default : null;
        if (cache) {
          const version = Date.now();
          const all = Array.from(this.sources.values());
          const res = new Response(JSON.stringify(all), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=604800, s-maxage=604800',
              'X-Latent-Version': String(version),
            },
          });
          await cache.put(new Request(EDGE_SOURCES_STORE_URL, { method: 'GET' }), res);
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
      const all = Array.from(this.sources.values());
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch {
      // Gracefully ignore on read-only environments
    }
  }
}
