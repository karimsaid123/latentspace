import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const AUTO_SYNC_COOLDOWN_MS = 45_000;

export async function POST(request: NextRequest) {
  const requestId = `sync_${Date.now()}`;
  const startTime = Date.now();
  const force = request.nextUrl.searchParams.get('force') === '1';

  try {
    await container.bootstrap();
    await container.syncEdgeState(true);

    const lastRunMs = container.ingestionService.getLastRunTimestamp();
    const elapsedMs = Date.now() - lastRunMs;

    // Multi-tab / multi-visitor protection: skip redundant background batch crawls within 45s cooldown
    if (!force && lastRunMs > 0 && elapsedMs >= 0 && elapsedMs < AUTO_SYNC_COOLDOWN_MS) {
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
      error: error.message,
    });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
