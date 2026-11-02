import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { SingleFlight } from '@/core/services/single-flight';
import { SUMMARY_SCHEMA_VERSION, summarizeWithGemini } from '@/lib/ai-summarizer';
import { fetchCleanArticleBody } from '@/lib/article-extractor';
import {
  checkEdgeRateLimit,
  checkGlobalGeminiBudget,
  getClientIp,
  hasValidAdminSecret,
} from '@/lib/rate-limit';
import { readBoundedJson, verifyBrowserMutationRequest } from '@/lib/request-security';
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
  } catch (err: any) {
    logger.error('Summarize GET error', { articleId, error: err?.message });
    return NextResponse.json({ error: 'Internal summarization error' }, { status: 500 });
  }
}

/**
 * POST /api/summarize
 * On-demand Gemini synthesis protected by:
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

    const parsedBody = await readBoundedJson<{ articleId?: unknown; id?: unknown }>(request, 2048);
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

    await container.bootstrap();
    await container.syncEdgeState(false);

    const article = await container.articleRepo.findById(articleId);
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    // Fast path: already synthesized by Gemini v2 (zero rate-limit penalty, zero latency)
    if (
      article.summary?.generatedWith === 'gemini' &&
      (article.summary?.summaryVersion || 0) >= SUMMARY_SCHEMA_VERSION
    ) {
      return NextResponse.json(
        {
          success: true,
          summary: article.summary,
          source: 'cache',
          durationMs: Date.now() - startTime,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const ip = getClientIp(request);
    const rl = await checkEdgeRateLimit('summarize', ip, 12, 60_000);
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: true,
          summary: article.summary,
          source: 'heuristic',
          durationMs: Date.now() - startTime,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // Global Denial-of-Wallet circuit breaker across all IPs combined
    const globalBudget = await checkGlobalGeminiBudget(40, 10 * 60_000);
    if (!globalBudget.allowed) {
      logger.warn('Global Gemini synthesis budget reached; serving heuristic fallback', {
        articleId,
      });
      return NextResponse.json(
        {
          success: true,
          summary: article.summary,
          source: 'budget_protected_fallback',
          durationMs: Date.now() - startTime,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const targetId = articleId;
    const synthesized = await summarizeFlight.execute<AISummary | null>(
      `gemini_sum_${targetId}`,
      async () => {
        const freshCheck = await container.articleRepo.findById(targetId);
        if (
          freshCheck?.summary?.generatedWith === 'gemini' &&
          (freshCheck.summary?.summaryVersion || 0) >= SUMMARY_SCHEMA_VERSION
        ) {
          return freshCheck.summary;
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
          apiKey
        );

        if (result) {
          article.summary = result;
          await container.articleRepo.saveMany([article]);
          container.cache.clear();
        }

        return result;
      }
    );

    if (synthesized) {
      logger.info('On-demand Gemini summary generated', {
        articleId,
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

    return NextResponse.json(
      {
        success: true,
        summary: article.summary,
        source: 'fallback',
        durationMs: Date.now() - startTime,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    logger.error('Summarize POST error', {
      articleId,
      error: err?.message,
    });

    return NextResponse.json(
      { error: 'Internal summarization error' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
