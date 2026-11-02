import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { isLocalPersistentDev } from '@/lib/runtime-env';
import { checkRateLimit, getClientIp, hasValidAdminSecret } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await container.bootstrap();
    await container.syncEdgeState(false);
    const sources = await container.sourceRepo.listAll();
    return NextResponse.json(
      { sources },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to list sources', { error: error?.message });
    return NextResponse.json({ error: 'Failed to retrieve feed sources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Security: Prevent unauthenticated internet clients from disabling global RSS feeds
  if (!isLocalPersistentDev() && !hasValidAdminSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rl = checkRateLimit('sources_mutate', ip, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    );
  }

  try {
    await container.bootstrap();
    const body = await request.json().catch(() => null);

    if (
      body &&
      body.action === 'toggle' &&
      typeof body.id === 'string' &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(body.id)
    ) {
      const source = await container.sourceRepo.findById(body.id);
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      const nextEnabled = !source.enabled;
      await container.sourceRepo.toggleSource(body.id, nextEnabled);
      container.cache.clear();
      return NextResponse.json({ success: true, enabled: nextEnabled });
    }

    return NextResponse.json({ error: 'Invalid action or source ID' }, { status: 400 });
  } catch (error: any) {
    logger.error('Failed to mutate source', { error: error?.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
