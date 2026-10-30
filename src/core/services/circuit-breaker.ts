import { CircuitBreakerOpenError } from '../domain/errors';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  serviceName: string;
  failureThreshold: number; // e.g. 3 consecutive failures to open
  cooldownPeriodMs: number; // e.g. 60,000 ms before trying HALF_OPEN
  trialSuccessThreshold: number; // e.g. 1 success in HALF_OPEN to close
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTimestamp = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  public getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  public getServiceName(): string {
    return this.config.serviceName;
  }

  private evaluateState(): void {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTimestamp;
      if (elapsed >= this.config.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
        this.consecutiveSuccesses = 0;
      }
    }
  }

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === 'OPEN') {
      const remainingCooldown = Math.max(0, this.config.cooldownPeriodMs - (Date.now() - this.lastFailureTimestamp));
      throw new CircuitBreakerOpenError(this.config.serviceName, remainingCooldown);
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.config.trialSuccessThreshold) {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.consecutiveFailures = 0;
    }
  }

  public recordFailure(): void {
    this.lastFailureTimestamp = Date.now();
    this.consecutiveFailures++;

    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTimestamp = 0;
  }
}

