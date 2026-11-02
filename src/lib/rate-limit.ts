import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getServerSecret } from './runtime-env';

interface RateBucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 2048;
const buckets = new Map<string, RateBucket>();
const EDGE_RL_BASE_URL = 'https://internal.latentspace/ratelimit';

function getEdgeCache(): Cache | null {
  if (typeof caches !== 'undefined' && 'default' in caches) {
    return (caches as unknown as { default: Cache }).default;
  }
  return null;
}

/**
 * Extracts client IP safely, prioritizing Cloudflare's verified `cf-connecting-ip` header.
 */
export function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);

  return 'anonymous';
}

function evictBucketsIfNeeded(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, b] of buckets.entries()) {
    if (now >= b.resetAt) {
      buckets.delete(k);
    }
  }
  if (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) {
      buckets.delete(oldestKey);
    }
  }
}

/**
 * Synchronous bounded in-memory rate limiter for fast-path checks and Node.js runtimes.
 */
export function checkRateLimit(
  namespace: string,
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const key = `${namespace}:${identifier}`;
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    evictBucketsIfNeeded(now);
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Multi-isolate rate limiter backed by both isolate memory AND Cloudflare `caches.default`
 * so sibling Workers in the same edge datacenter share rate-limit state.
 */
export async function checkEdgeRateLimit(
  namespace: string,
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const now = Date.now();
  const key = `${namespace}:${identifier}`;
  const cache = getEdgeCache();

  if (cache) {
    try {
      const hashedId = crypto.createHash('sha256').update(key).digest('hex').slice(0, 24);
      const cacheReq = new Request(`${EDGE_RL_BASE_URL}/${namespace}/${hashedId}`, {
        method: 'GET',
      });
      const match = await cache.match(cacheReq);
      if (match) {
        const remote = (await match.json()) as Partial<RateBucket>;
        if (
          typeof remote.count === 'number' &&
          typeof remote.resetAt === 'number' &&
          remote.resetAt > now
        ) {
          const local = buckets.get(key);
          if (!local || local.resetAt < now || remote.count > local.count) {
            evictBucketsIfNeeded(now);
            buckets.set(key, { count: remote.count, resetAt: remote.resetAt });
          }
        }
      }

      const decision = checkRateLimit(namespace, identifier, maxRequests, windowMs);
      const updated = buckets.get(key);
      if (updated) {
        const ttlSeconds = Math.max(1, Math.ceil((updated.resetAt - now) / 1000));
        await cache.put(
          cacheReq,
          new Response(JSON.stringify(updated), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
            },
          })
        );
      }
      return decision;
    } catch {
      return checkRateLimit(namespace, identifier, maxRequests, windowMs);
    }
  }

  return checkRateLimit(namespace, identifier, maxRequests, windowMs);
}

/**
 * Global Denial-of-Wallet circuit breaker across ALL client IPs combined.
 * Caps total paid on-demand Gemini syntheses per window so distributed IP-rotating
 * botnets can never exhaust API billing quotas.
 */
export async function checkGlobalGeminiBudget(
  maxSynthesesPerWindow = 40,
  windowMs = 10 * 60_000
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const res = await checkEdgeRateLimit(
    'global_gemini_budget',
    'deployment_wide',
    maxSynthesesPerWindow,
    windowMs
  );
  return {
    allowed: res.allowed,
    retryAfterSeconds: res.retryAfterSeconds,
  };
}

/**
 * Length-hiding constant-time bearer secret check against `ADMIN_SYNC_SECRET`.
 * Hashes both values with SHA-256 before `timingSafeEqual` so neither secret bytes
 * nor secret length can leak through timing side channels.
 */
export function hasValidAdminSecret(request: NextRequest): boolean {
  const configured = getServerSecret('ADMIN_SYNC_SECRET');
  if (!configured || configured.length < 16) return false;

  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;

  const provided = authHeader.slice(7).trim();
  if (!provided) return false;

  const digestConfigured = crypto.createHash('sha256').update(configured, 'utf8').digest();
  const digestProvided = crypto.createHash('sha256').update(provided, 'utf8').digest();

  return crypto.timingSafeEqual(digestConfigured, digestProvided);
}
