import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const requestId = `sync_${Date.now()}`;
  const startTime = Date.now();

  try {
    await container.bootstrap();
    const report = await container.ingestionService.runIngestion(requestId);

    // Invalidate list caches so new articles appear immediately
    await container.cache.clear();

    logger.info('Sync route executed', {
      requestId,
      durationMs: Date.now() - startTime,
      articlesAdded: report.articlesAdded,
      articlesModified: report.articlesModified,
    });

    return NextResponse.json(report);
  } catch (error: any) {
    logger.error('Sync route failed', {
      requestId,
      durationMs: Date.now() - startTime,
      error: error.message,
    });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
