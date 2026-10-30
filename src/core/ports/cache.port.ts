export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  
  /**
   * Single-flight request coalescing (anti-stampede).
   * If 50 concurrent calls request key 'X', execute fn() exactly ONCE.
   */
  coalesce<T>(key: string, fn: () => Promise<T>): Promise<T>;
}
