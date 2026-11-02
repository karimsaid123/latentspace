import { NextResponse } from 'next/server';
import { fetchArtificialAnalysisBenchmarks } from '@/lib/benchmark-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchArtificialAnalysisBenchmarks();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    logger.error('Failed to retrieve benchmark telemetry', { error: err?.message });
    return NextResponse.json(
      { error: 'Failed to retrieve benchmark telemetry' },
      { status: 500 }
    );
  }
}
