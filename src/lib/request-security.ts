import type { NextRequest } from 'next/server';

export const CLIENT_CSRF_HEADER = 'x-latentspace-client';
export const CLIENT_CSRF_HEADER_VALUE = '1';

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Parses JSON while stripping prototype-polluting keys (`__proto__`, `constructor`, `prototype`)
 * at every nesting depth.
 */
export function safeJsonParse<T = unknown>(raw: string): T {
  return JSON.parse(raw, (key, value) => {
    if (DANGEROUS_OBJECT_KEYS.has(key)) {
      return undefined;
    }
    return value;
  }) as T;
}

export type CsrfCheckResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

/**
 * Zero-trust CSRF & cross-origin botnet guard for state-mutating or paid API routes.
 * 1. Rejects requests with `Sec-Fetch-Site: cross-site`.
 * 2. Validates `Origin` host against the target `Host` / `X-Forwarded-Host` header.
 * 3. Requires the custom `x-latentspace-client: 1` header, which browsers refuse to attach
 *    on cross-origin requests without a preflight `Access-Control-Allow-Headers` grant.
 */
export function verifyBrowserMutationRequest(request: NextRequest): CsrfCheckResult {
  const secFetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return { ok: false, status: 403, reason: 'Cross-site request blocked' };
  }

  const expectedHost = (
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.trim() ||
    request.nextUrl?.host ||
    ''
  ).toLowerCase();

  const originHeader = request.headers.get('origin')?.trim();
  if (originHeader) {
    if (originHeader === 'null') {
      return { ok: false, status: 403, reason: 'Opaque null origin blocked' };
    }
    try {
      const originHost = new URL(originHeader).host.toLowerCase();
      if (expectedHost && originHost !== expectedHost) {
        return { ok: false, status: 403, reason: 'Origin host mismatch' };
      }
    } catch {
      return { ok: false, status: 403, reason: 'Malformed Origin header' };
    }
  }

  const customHeader = request.headers.get(CLIENT_CSRF_HEADER)?.trim();
  if (customHeader !== CLIENT_CSRF_HEADER_VALUE) {
    return { ok: false, status: 403, reason: 'Missing required client security header' };
  }

  return { ok: true };
}

export type BoundedJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

/**
 * Streams and parses a JSON request body with strict Content-Type enforcement,
 * hard byte-size ceiling (protects 128 MB Edge Workers against memory bombs),
 * and prototype-pollution key stripping.
 */
export async function readBoundedJson<T = Record<string, unknown>>(
  request: NextRequest,
  maxBytes = 4096
): Promise<BoundedJsonResult<T>> {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return {
      ok: false,
      status: 415,
      error: 'Unsupported Media Type: expected application/json',
    };
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Payload Too Large: maximum ${maxBytes} bytes`,
    };
  }

  if (!request.body) {
    return { ok: false, status: 400, error: 'Empty JSON body' };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const chunks: string[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => {});
          return {
            ok: false,
            status: 413,
            error: `Payload Too Large: maximum ${maxBytes} bytes`,
          };
        }
        chunks.push(decoder.decode(value, { stream: true }));
      }
    }
    chunks.push(decoder.decode());
  } catch {
    return { ok: false, status: 400, error: 'Failed to read request body' };
  } finally {
    reader.releaseLock();
  }

  const rawText = chunks.join('').trim();
  if (!rawText) {
    return { ok: false, status: 400, error: 'Empty JSON body' };
  }

  try {
    const parsed = safeJsonParse<T>(rawText);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'Expected JSON object payload' };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false, status: 400, error: 'Malformed JSON payload' };
  }
}
