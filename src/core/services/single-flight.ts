/**
 * SingleFlight / Request Coalescing (Anti-Stampede)
 * 
 * Ensures that if multiple concurrent requests ask for the same resource
 * (e.g. 50 parallel requests syncing or fetching feeds), exactly ONE underlying
 * promise executes, and all callers await and share that identical promise.
 */
export class SingleFlight {
  private inFlight = new Map<string, Promise<unknown>>();

  public async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise as Promise<unknown>);
    return promise;
  }

  public isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  public activeCount(): number {
    return this.inFlight.size;
  }
}

