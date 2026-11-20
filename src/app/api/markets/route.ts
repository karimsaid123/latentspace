import { NextResponse, NextRequest } from 'next/server';
import { getMarketOverview } from '@/lib/stocks-client';
import { checkEdgeRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/markets
 * Returns real-time AI & semiconductor stock quotes, news catalyst correlations,
 * and XGBoost trajectory predictions.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await checkEdgeRateLimit('markets_api', ip, 60, 60_000);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  const isFreshRequested = request.nextUrl.searchParams.get('fresh') === '1';

  try {
    const data = await getMarketOverview(isFreshRequested);
    return NextResponse.json(data, {
      headers: {
        'X-Markets-Schema': 'v2',
        'Cache-Control': isFreshRequested
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=30, s-maxage=120, stale-while-revalidate=180',
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to retrieve market telemetry', { error });
    return NextResponse.json(
      { error: 'Failed to retrieve market telemetry' },
      { status: 500 }
    );
  }
}

