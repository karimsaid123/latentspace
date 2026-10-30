import { CachePort } from '@/core/ports/cache.port';
import { SingleFlight } from '@/core/services/single-flight';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCacheAdapter implements CachePort {
  private store = new Map<string, CacheEntry<unknown>>();
  private singleFlight = new SingleFlight();

  public async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  public async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 1. Check if warm cache entry exists
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 2. Coalesce concurrent requests through single-flight
    return this.singleFlight.execute(key, async () => {
      // Re-check cache in case another caller populated it while waiting
      const doubleCheck = await this.get<T>(key);
      if (doubleCheck !== null) {
        return doubleCheck;
      }
      return await fn();
    });
  }

  public clear(): void {
    this.store.clear();
  }
}
