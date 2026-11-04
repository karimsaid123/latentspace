import fs from 'fs/promises';
import path from 'path';
import { SourceRepositoryPort } from '@/core/ports/repository.port';
import { DomainSource } from '@/core/domain/entities';
import { isServerlessOrEdge } from '@/lib/runtime-env';
import staticSourcesData from '../../../data/sources.json';

const DEFAULT_SOURCES: DomainSource[] = (staticSourcesData as DomainSource[]) || [];

const BANNED_SOURCE_IDS = new Set([
  'techmeme',
  'xai-radar',
  'teslarati-spacex',
  'techcrunch-xai',
  'techcrunch-spacex',
  'techcrunch-anthropic',
  'techcrunch-mistral',
  'techcrunch-moonshot',
  'techcrunch-deepseek',
  'techcrunch-nvidia',
  'techcrunch-meta',
]);

const EDGE_SOURCES_STORE_URL = 'https://internal.latentspace/sources-store-v2';
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
        if (!remote?.id || BANNED_SOURCE_IDS.has(remote.id)) continue;
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
        if (!BANNED_SOURCE_IDS.has(s.id)) {
          this.sources.set(s.id, { ...s });
        }
      }
      for (const banned of BANNED_SOURCE_IDS) {
        this.sources.delete(banned);
      }

      let addedNew = false;
      for (const s of DEFAULT_SOURCES) {
        if (!BANNED_SOURCE_IDS.has(s.id) && !this.sources.has(s.id)) {
          this.sources.set(s.id, { ...s });
          addedNew = true;
        }
      }

      if (isServerlessOrEdge()) {
        try {
          const cache = typeof caches !== 'undefined' && 'default' in caches ? (caches as any).default : null;
          if (cache) {
            await cache.delete(new Request('https://internal.latentspace/sources-store', { method: 'GET' }));
          }
        } catch {}
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
    let tmpPath = '';
    try {
      const dir = path.dirname(this.storageFilePath);
      await fs.mkdir(dir, { recursive: true });
      tmpPath = `${this.storageFilePath}.${Date.now()}_${Math.random().toString(36).slice(2, 7)}.tmp`;
      const all = Array.from(this.sources.values());
      await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), 'utf8');
      await fs.rename(tmpPath, this.storageFilePath);
    } catch {
      if (tmpPath) {
        await fs.unlink(tmpPath).catch(() => {});
      }
    }
  }
}
