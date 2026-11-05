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

  try {
    const data = await getMarketOverview();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    logger.error('Failed to retrieve market telemetry', { error: err?.message });
    return NextResponse.json(
      { error: 'Failed to retrieve market telemetry' },
      { status: 500 }
    );
  }
}

