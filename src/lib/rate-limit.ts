import crypto from 'crypto';
import type { NextRequest } from 'next/server';

interface RateBucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 2048;
const buckets = new Map<string, RateBucket>();

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

/**
 * Bounded in-memory rate limiter safe for Cloudflare Workers and Node.js runtimes.
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
    if (buckets.size >= MAX_BUCKETS) {
      // 1. Evict expired buckets first
      for (const [k, b] of buckets.entries()) {
        if (now >= b.resetAt) {
          buckets.delete(k);
        }
      }
      // 2. Evict oldest entry if still at capacity
      if (buckets.size >= MAX_BUCKETS) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) {
          buckets.delete(oldestKey);
        }
      }
    }

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
 * Constant-time bearer secret check against `ADMIN_SYNC_SECRET` when configured.
 */
export function hasValidAdminSecret(request: NextRequest): boolean {
  const configured = process.env.ADMIN_SYNC_SECRET?.trim();
  if (!configured || configured.length < 16) return false;

  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return false;

  const provided = authHeader.slice(7).trim();
  const bufA = Buffer.from(configured, 'utf8');
  const bufB = Buffer.from(provided, 'utf8');
  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}
