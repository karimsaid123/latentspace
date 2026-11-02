import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { isLocalPersistentDev } from '@/lib/runtime-env';
import { checkEdgeRateLimit, getClientIp, hasValidAdminSecret } from '@/lib/rate-limit';
import { readBoundedJson, verifyBrowserMutationRequest } from '@/lib/request-security';
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
  const hasBearerAdmin = hasValidAdminSecret(request);

  // Security: Prevent unauthenticated internet clients from disabling global RSS feeds
  if (!isLocalPersistentDev() && !hasBearerAdmin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  // Protect local developer workstation (`next dev`) against cross-site CSRF
  if (!hasBearerAdmin) {
    const csrf = verifyBrowserMutationRequest(request);
    if (!csrf.ok) {
      return NextResponse.json(
        { error: csrf.reason },
        { status: csrf.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  const ip = getClientIp(request);
  const rl = await checkEdgeRateLimit('sources_mutate', ip, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(rl.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const parsedBody = await readBoundedJson<{ action?: unknown; id?: unknown }>(request, 2048);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = parsedBody.data;
    if (
      body.action === 'toggle' &&
      typeof body.id === 'string' &&
      /^[a-zA-Z0-9_-]{1,64}$/.test(body.id)
    ) {
      await container.bootstrap();
      const source = await container.sourceRepo.findById(body.id);
      if (!source) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      const nextEnabled = !source.enabled;
      await container.sourceRepo.toggleSource(body.id, nextEnabled);
      container.cache.clear();
      return NextResponse.json(
        { success: true, enabled: nextEnabled },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action or source ID' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    logger.error('Failed to mutate source', { error: error?.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
