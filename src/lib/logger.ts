export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  requestId?: string;
  provider?: string;
  durationMs?: number;
  status?: string | number;
  outcome?: string;
  [key: string]: unknown;
}

const SENSITIVE_KEY_PATTERN = /secret|token|password|apikey|api_key|authorization|cookie/i;
const SECRET_VALUE_PATTERN =
  /\b(AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z._-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]{8,}|sk-[A-Za-z0-9_-]{16,})\b/g;

function sanitizeLogString(val: string): string {
  return val
    .replace(SECRET_VALUE_PATTERN, '[REDACTED]')
    .replace(/[\x00-\x1f\x7f]+/g, ' ')
    .slice(0, 1000);
}

function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeLogString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth >= 3) return '[Truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeLogValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitizeLogValue(v, depth + 1);
      }
    }
    return out;
  }

  return String(value).slice(0, 200);
}

export class StructuredLogger {
  constructor(private readonly serviceName: string = 'latent-space-core') {}

  private log(level: LogLevel, event: string, context?: LogContext): void {
    const sanitizedContext = context
      ? (sanitizeLogValue(context) as Record<string, unknown>)
      : undefined;

    const payload = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      level,
      event: sanitizeLogString(event),
      ...sanitizedContext,
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

