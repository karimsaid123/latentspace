export interface LockPort {
  /**
   * Executes an action under a mutual exclusion lock to prevent concurrent worker execution.
   */
  withLock<T>(resource: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}
