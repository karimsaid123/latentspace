import { NextResponse } from 'next/server';
import { fetchArtificialAnalysisBenchmarks } from '@/lib/benchmark-client';

export async function GET() {
  try {
    const data = await fetchArtificialAnalysisBenchmarks();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve benchmark telemetry', details: err.message },
      { status: 500 }
    );
  }
}
