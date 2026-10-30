export abstract class DomainError extends Error {
  public readonly timestamp: string;

  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RateLimitError extends DomainError {
  constructor(provider: string, retryAfterSeconds?: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded for provider: ${provider}`,
      { provider, retryAfterSeconds }
    );
  }
}

export class ProviderUnavailableError extends DomainError {
  constructor(provider: string, reason: string) {
    super(
      'PROVIDER_UNAVAILABLE',
      `Provider ${provider} is currently unavailable: ${reason}`,
      { provider, reason }
    );
  }
}

export class CircuitBreakerOpenError extends DomainError {
  constructor(service: string, resetInMs: number) {
    super(
      'CIRCUIT_BREAKER_OPEN',
      `Circuit breaker is OPEN for ${service}. Request fast-failed without network call.`,
      { service, resetInMs }
    );
  }
}

export class StaleSnapshotError extends DomainError {
  constructor(entityId: string, incomingTimestamp: string, currentTimestamp: string) {
    super(
      'STALE_SNAPSHOT_SKIPPED',
      `Incoming snapshot (${incomingTimestamp}) is older than current state (${currentTimestamp}) for ${entityId}`,
      { entityId, incomingTimestamp, currentTimestamp }
    );
  }
}

export class QuotaExhaustedError extends DomainError {
  constructor(resource: string) {
    super(
      'QUOTA_EXHAUSTED',
      `Free-tier budget/quota exhausted for resource: ${resource}`,
      { resource }
    );
  }
}
