export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  requestId?: string;
  provider?: string;
  durationMs?: number;
  status?: string | number;
  outcome?: string;
  [key: string]: unknown;
}

export class StructuredLogger {
  constructor(private readonly serviceName: string = 'latent-space-core') {}

  private log(level: LogLevel, event: string, context?: LogContext): void {
    const payload = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level,
      event,
      ...context,
    };

    const serialized = JSON.stringify(payload);
    if (level === 'ERROR') {
      console.error(serialized);
    } else if (level === 'WARN') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  public info(event: string, context?: LogContext): void {
    this.log('INFO', event, context);
  }

  public warn(event: string, context?: LogContext): void {
    this.log('WARN', event, context);
  }

  public error(event: string, context?: LogContext): void {
    this.log('ERROR', event, context);
  }

  public debug(event: string, context?: LogContext): void {
    this.log('DEBUG', event, context);
  }
}

export const logger = new StructuredLogger('latent-space-backend');
