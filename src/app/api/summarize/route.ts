import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { SingleFlight } from '@/core/services/single-flight';
import { SUMMARY_SCHEMA_VERSION, summarizeWithGemini } from '@/lib/ai-summarizer';
import { fetchCleanArticleBody } from '@/lib/article-extractor';
import { generateDeepIntelligenceSummary } from '@/lib/intelligence-analyzer';
import { isValidLocale, Locale } from '@/lib/i18n';
import {
  getCachedLocalizedSummary,
  setCachedLocalizedSummary,
  translateArticleSummary,
} from '@/lib/translator';
import {
  checkEdgeRateLimit,
  checkGlobalGeminiBudget,
  getClientIp,
  hasValidAdminSecret,
} from '@/lib/rate-limit';
import { readBoundedJson, verifyBrowserMutationRequest } from '@/lib/request-security';
import { getServerSecret } from '@/lib/runtime-env';
import { logger } from '@/lib/logger';
import type { AISummary } from '@/core/domain/entities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_ARTICLE_ID = /^[a-zA-Z0-9_-]{4,64}$/;
const summarizeFlight = new SingleFlight();
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

function parseValidArticleId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return VALID_ARTICLE_ID.test(trimmed) ? trimmed : null;
}

/**
 * GET /api/summarize?id=...
 * Read-only lookup: returns cached Gemini intelligence or deterministic heuristic briefing.
 * Never triggers paid LLM calls on idempotent GET requests (protects against crawlers/prefetchers).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const articleId = parseValidArticleId(request.nextUrl.searchParams.get('id'));
  if (!articleId) {
    return NextResponse.json({ error: 'Invalid or missing articleId' }, { status: 400 });
  }

  try {
    await container.bootstrap();
    await container.syncEdgeState(false);

    const article = await container.articleRepo.findById(articleId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        summary: article.summary,
        source: article.summary?.generatedWith === 'gemini' ? 'cache' : 'heuristic',
        durationMs: Date.now() - startTime,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=120, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: unknown) {
    logger.error('Summarize GET error', {
      articleId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal summarization error' }, { status: 500 });
  }
}

/**
 * POST /api/summarize
 * On-demand Gemini synthesis & localization protected by:
 * 1. Zero-trust CSRF + Origin + custom header guard
 * 2. Bounded 2 KB JSON body reader with prototype-pollution stripping
 * 3. Multi-isolate edge IP rate-limiting
 * 4. Global deployment-wide Gemini budget circuit breaker (Denial-of-Wallet shield)
 * 5. SingleFlight request coalescing
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let articleId: string | null = null;

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
      articleId?: unknown;
      id?: unknown;
      locale?: unknown;
    }>(request, 2048);
    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: parsedBody.error },
        { status: parsedBody.status, headers: NO_STORE_HEADERS }
      );
    }

    articleId = parseValidArticleId(parsedBody.data.articleId ?? parsedBody.data.id);
    if (!articleId) {
      return NextResponse.json(
        { error: 'Invalid or missing articleId' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const requestedLocale: Locale = isValidLocale(parsedBody.data.locale)
      ? parsedBody.data.locale
      : 'en';

    await container.bootstrap();
    await container.syncEdgeState(false);

    const article = await container.articleRepo.findById(articleId);
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const hasVerifiedEnglishSummary =
      article.summary?.generatedWith === 'gemini' &&
      (article.summary?.summaryVersion || 0) >= SUMMARY_SCHEMA_VERSION &&
      (!article.summary?.locale || article.summary.locale === 'en');

    // Fast path 1: English summary already synthesized
    if (requestedLocale === 'en' && hasVerifiedEnglishSummary) {
      return NextResponse.json(
        {
          success: true,
          summary: { ...article.summary, title: article.title, locale: 'en' },
          source: 'cache',
          durationMs: Date.now() - startTime,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // Fast path 2: Localized summary already cached
    if (requestedLocale !== 'en') {
      const cachedLocaleSummary = getCachedLocalizedSummary(articleId, requestedLocale);
      if (cachedLocaleSummary) {
        return NextResponse.json(
          {
            success: true,
            summary: cachedLocaleSummary,
            source: 'cache',
            durationMs: Date.now() - startTime,
          },
          { headers: NO_STORE_HEADERS }
        );
      }
    }

    const ip = getClientIp(request);
    const rl = await checkEdgeRateLimit('summarize', ip, 24, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: true,
          summary: article.summary,
          source: 'rate_limited_fallback',
          durationMs: Date.now() - startTime,
        },
        {
          status: 429,
          headers: {
            ...NO_STORE_HEADERS,
            'Retry-After': String(rl.retryAfterSeconds),
          },
        }
      );
    }

    // Fast path 3: If a verified v2 English summary already exists and user requested ES/AR/ZH,
    // translate the verified summary + title + keypoints directly (~250ms, 0 Gemini quota cost)
    if (requestedLocale !== 'en' && hasVerifiedEnglishSummary && article.summary) {
      const localized = await translateArticleSummary(
        articleId,
        article.title,
        article.summary,
        requestedLocale
      );
      return NextResponse.json(
        {
          success: true,
          summary: localized,
          source: 'translated_verified',
          durationMs: Date.now() - startTime,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const apiKey = getServerSecret('GEMINI_API_KEY');
    const targetId = articleId;
    const localeCacheKey = `gemini_sum_${targetId}_${requestedLocale}`;

    // If Gemini is unavailable or global budget is capped, upgrade legacy truncated snippets
    // from the source page once and translate if non-English was requested
    if (!apiKey || !(await checkGlobalGeminiBudget(40, 10 * 60_000)).allowed) {
      let baseSummary: AISummary =
        article.summary ||
        generateDeepIntelligenceSummary(
          article.title,
          article.contentSnippet || '',
          article.sourceName
        );

      if ((article.contentSnippet?.length || 0) < 700 && article.canonicalUrl) {
        const extracted = await summarizeFlight.execute<AISummary | null>(
          `extract_sum_${targetId}`,
          async () => {
            const fullBody = await fetchCleanArticleBody(article.canonicalUrl);
            if (!fullBody || fullBody.length <= (article.contentSnippet?.length || 0)) {
              return null;
            }
            article.contentSnippet = fullBody.slice(0, 2400);
            const upgraded = generateDeepIntelligenceSummary(
              article.title,
              fullBody,
              article.sourceName
            );
            article.summary = upgraded;
            await container.articleRepo.saveMany([article]);
            container.cache.clear();
            return upgraded;
          }
        );

        if (extracted) {
          baseSummary = extracted;
        }
      }

      const finalSummary =
        requestedLocale !== 'en'
          ? await translateArticleSummary(targetId, article.title, baseSummary, requestedLocale)
          : { ...baseSummary, title: article.title, locale: 'en' as const };

      return NextResponse.json(
        {
          success: true,
          summary: finalSummary,
          source: apiKey ? 'budget_protected_fallback' : 'heuristic',
          durationMs: Date.now() - startTime,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const synthesized = await summarizeFlight.execute<AISummary | null>(
      localeCacheKey,
      async () => {
        if (requestedLocale === 'en') {
          const freshCheck = await container.articleRepo.findById(targetId);
          if (
            freshCheck?.summary?.generatedWith === 'gemini' &&
            (freshCheck.summary?.summaryVersion || 0) >= SUMMARY_SCHEMA_VERSION &&
            (!freshCheck.summary?.locale || freshCheck.summary.locale === 'en')
          ) {
            return { ...freshCheck.summary, title: freshCheck.title, locale: 'en' };
          }
        } else {
          const freshCacheCheck = getCachedLocalizedSummary(targetId, requestedLocale);
          if (freshCacheCheck) {
            return freshCacheCheck;
          }
        }

        // Fetch full source article text when RSS snippet is short so Gemini has complete factual context
        let sourceContent = article.contentSnippet || '';
        if (sourceContent.length < 1800 && article.canonicalUrl) {
          const fullBody = await fetchCleanArticleBody(article.canonicalUrl);
          if (fullBody && fullBody.length > sourceContent.length) {
            sourceContent = fullBody;
            article.contentSnippet = fullBody.slice(0, 2400);
          }
        }

        const result = await summarizeWithGemini(
          article.title,
          sourceContent || article.title,
          apiKey,
          requestedLocale
        );

        if (result) {
          if (requestedLocale === 'en') {
            article.summary = result;
            await container.articleRepo.saveMany([article]);
            container.cache.clear();
          } else {
            setCachedLocalizedSummary(targetId, requestedLocale, result);
          }
          return result;
        }

        // Fallback if Gemini call failed: upgrade heuristic and translate if non-English
        if (sourceContent.length > (article.summary?.tldr?.length || 0)) {
          article.summary = generateDeepIntelligenceSummary(
            article.title,
            sourceContent,
            article.sourceName
          );
          await container.articleRepo.saveMany([article]);
          container.cache.clear();
        }

        if (requestedLocale !== 'en' && article.summary) {
          return translateArticleSummary(targetId, article.title, article.summary, requestedLocale);
        }

        return null;
      }
    );

    if (synthesized) {
      logger.info('On-demand summary generated', {
        articleId,
        locale: requestedLocale,
        durationMs: Date.now() - startTime,
      });

      return NextResponse.json(
        {
          success: true,
          summary: synthesized,
          source: 'gemini',
          durationMs: Date.now() - startTime,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const fallbackSummary =
      requestedLocale !== 'en' && article.summary
        ? await translateArticleSummary(targetId, article.title, article.summary, requestedLocale)
        : article.summary;

    return NextResponse.json(
      {
        success: true,
        summary: fallbackSummary,
        source: 'fallback',
        durationMs: Date.now() - startTime,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    logger.error('Summarize POST error', {
      articleId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal summarization error' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
