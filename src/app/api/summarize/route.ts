import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { SingleFlight } from '@/core/services/single-flight';
import { summarizeWithGemini } from '@/lib/ai-summarizer';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import type { AISummary } from '@/core/domain/entities';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_ARTICLE_ID = /^[a-zA-Z0-9_-]{4,64}$/;
const summarizeFlight = new SingleFlight();

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
 * On-demand Gemini synthesis protected by IP rate-limiting and SingleFlight request coalescing.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let articleId: string | null = null;

  try {
    const body = await request.json().catch(() => ({}));
    articleId = parseValidArticleId(body?.articleId ?? body?.id);

    if (!articleId) {
      return NextResponse.json({ error: 'Invalid or missing articleId' }, { status: 400 });
    }

    await container.bootstrap();
    await container.syncEdgeState(false);

    const article = await container.articleRepo.findById(articleId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Fast path: already synthesized by Gemini (zero rate-limit penalty, zero latency)
    if (article.summary?.generatedWith === 'gemini') {
      return NextResponse.json({
        success: true,
        summary: article.summary,
        source: 'cache',
        durationMs: Date.now() - startTime,
      });
    }

    const ip = getClientIp(request);
    const rl = checkRateLimit('summarize', ip, 12, 60_000);
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
          headers: { 'Retry-After': String(rl.retryAfterSeconds) },
        }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        summary: article.summary,
        source: 'heuristic',
        durationMs: Date.now() - startTime,
      });
    }

    const targetId = articleId;
    const synthesized = await summarizeFlight.execute<AISummary | null>(
      `gemini_sum_${targetId}`,
      async () => {
        const freshCheck = await container.articleRepo.findById(targetId);
        if (freshCheck?.summary?.generatedWith === 'gemini') {
          return freshCheck.summary;
        }

        const result = await summarizeWithGemini(
          article.title,
          article.contentSnippet || article.title,
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

      return NextResponse.json({
        success: true,
        summary: synthesized,
        source: 'gemini',
        durationMs: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      success: true,
      summary: article.summary,
      source: 'fallback',
      durationMs: Date.now() - startTime,
    });
  } catch (err: any) {
    logger.error('Summarize POST error', {
      articleId,
      error: err?.message,
    });

    return NextResponse.json(
      { error: 'Internal summarization error' },
      { status: 500 }
    );
  }
}
