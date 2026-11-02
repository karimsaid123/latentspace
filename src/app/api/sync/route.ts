import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { logger } from '@/lib/logger';
import { isLocalPersistentDev } from '@/lib/runtime-env';
import { checkEdgeRateLimit, getClientIp, hasValidAdminSecret } from '@/lib/rate-limit';
import { verifyBrowserMutationRequest } from '@/lib/request-security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AUTO_SYNC_COOLDOWN_MS = 45_000;
const PUBLIC_FORCE_COOLDOWN_MS = 15_000;

export async function POST(request: NextRequest) {
  const requestId = `sync_${Date.now()}`;
  const startTime = Date.now();
  const ip = getClientIp(request);
  const hasBearerAdmin = hasValidAdminSecret(request);

  if (!hasBearerAdmin) {
    const csrf = verifyBrowserMutationRequest(request);
    if (!csrf.ok) {
      return NextResponse.json(
        { success: false, error: csrf.reason },
        { status: csrf.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  const isAdmin = isLocalPersistentDev() || hasBearerAdmin;

  if (!isAdmin) {
    const rl = await checkEdgeRateLimit('sync', ip, 4, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, throttled: true, error: 'Sync rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(rl.retryAfterSeconds),
          },
        }
      );
    }
  }

  const requestedForce = request.nextUrl.searchParams.get('force') === '1';

  try {
    await container.bootstrap();
    await container.syncEdgeState(true);

    const lastRunMs = container.ingestionService.getLastRunTimestamp();
    const elapsedMs = Date.now() - lastRunMs;
    const effectiveCooldownMs =
      isAdmin && requestedForce
        ? 0
        : requestedForce
        ? PUBLIC_FORCE_COOLDOWN_MS
        : AUTO_SYNC_COOLDOWN_MS;

    // Multi-tab / multi-visitor protection: skip redundant background batch crawls within cooldown
    if (
      effectiveCooldownMs > 0 &&
      lastRunMs > 0 &&
      elapsedMs >= 0 &&
      elapsedMs < effectiveCooldownMs
    ) {
      return NextResponse.json(
        {
          success: true,
          throttled: true,
          sourcesProcessed: 0,
          articlesAdded: 0,
          articlesModified: 0,
          circuitBreakersTriggered: [],
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          lastSyncedAt: lastRunMs,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const report = await container.ingestionService.runIngestion(requestId);

    // Invalidate list caches so new articles appear immediately
    container.cache.clear();

    logger.info('Sync route executed', {
      requestId,
      durationMs: Date.now() - startTime,
      articlesAdded: report.articlesAdded,
      articlesModified: report.articlesModified,
    });

    return NextResponse.json(
      {
        ...report,
        throttled: false,
        lastSyncedAt: container.ingestionService.getLastRunTimestamp(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    logger.error('Sync route failed', {
      requestId,
      durationMs: Date.now() - startTime,
      error: error?.message,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to synchronize feeds' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
