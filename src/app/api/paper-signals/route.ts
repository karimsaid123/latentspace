import { NextRequest, NextResponse } from 'next/server';
import { getPaperSignals, normalizeArxivId } from '@/lib/paper-signals';
import { checkEdgeRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/paper-signals?arxivId=2611.05345
 * Returns community + citation signals for an arXiv paper (HF Papers, OpenAlex, optional Semantic Scholar).
 */
export async function GET(request: NextRequest) {
  const arxivId = normalizeArxivId(request.nextUrl.searchParams.get('arxivId'));
  if (!arxivId) {
    return NextResponse.json({ error: 'Invalid arxivId' }, { status: 400 });
  }

  const rl = await checkEdgeRateLimit('paper_signals', getClientIp(request), 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const signals = await getPaperSignals(arxivId);
    return NextResponse.json(signals, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=21600, stale-while-revalidate=86400',
      },
    });
  } catch (err: unknown) {
    logger.error('Paper signals error', {
      arxivId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Signals unavailable' }, { status: 502 });
  }
}

