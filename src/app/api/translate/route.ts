import { NextRequest, NextResponse } from 'next/server';
import { isValidLocale, Locale } from '@/lib/i18n';
import { translateFeedItemsBatch } from '@/lib/translator';
import { checkEdgeRateLimit, getClientIp, hasValidAdminSecret } from '@/lib/rate-limit';
import { readBoundedJson, verifyBrowserMutationRequest } from '@/lib/request-security';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };
const VALID_ID = /^[a-zA-Z0-9_-]{4,64}$/;

interface RawTranslateItem {
  id?: unknown;
  title?: unknown;
  tldr?: unknown;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    if (!hasValidAdminSecret(request)) {
      const csrf = verifyBrowserMutationRequest(request);
      if (!csrf.ok) {
        return NextResponse.json(
          { error: csrf.reason },
          { status: csrf.status, headers: NO_STORE_HEADERS }
        );
      }
    }

    const parsedBody = await readBoundedJson<{
      locale?: unknown;
      items?: unknown;
    }>(request, 32_768);

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status, headers: NO_STORE_HEADERS }
      );
    }

    const locale: Locale = isValidLocale(parsedBody.data.locale) ? parsedBody.data.locale : 'en';
    const rawItems = Array.isArray(parsedBody.data.items) ? parsedBody.data.items : [];

    if (locale === 'en' || rawItems.length === 0) {
      return NextResponse.json(
        { success: true, locale, translations: {}, durationMs: 0 },
        { headers: NO_STORE_HEADERS }
      );
    }

    const ip = getClientIp(request);
    const rl = await checkEdgeRateLimit('translate', ip, 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(rl.retryAfterSeconds),
          },
        }
      );
    }

    const sanitizedItems: Array<{ id: string; title: string; tldr: string }> = [];
    for (const raw of rawItems.slice(0, 36) as RawTranslateItem[]) {
      if (!raw || typeof raw !== 'object') continue;
      const id = typeof raw.id === 'string' ? raw.id.trim() : '';
      if (!VALID_ID.test(id)) continue;
      const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 360) : '';
      const tldr = typeof raw.tldr === 'string' ? raw.tldr.trim().slice(0, 650) : '';
      if (!title) continue;
      sanitizedItems.push({ id, title, tldr });
    }

    const translations = await translateFeedItemsBatch(sanitizedItems, locale);

    return NextResponse.json(
      {
        success: true,
        locale,
        translations,
        durationMs: Date.now() - startTime,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    logger.error('Translate POST error', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Internal translation error' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
