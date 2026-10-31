import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { logger } from '@/lib/logger';
import { isLocalPersistentDev } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  try {
    await container.bootstrap();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const lab = searchParams.get('lab') || undefined;
    const entryType = searchParams.get('entryType') || undefined;
    const search = searchParams.get('search') || undefined;
    const rawLimit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 400;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 600) : 400;

    const syncRequested = searchParams.get('sync') === '1' || searchParams.get('refresh') === '1';

    // Synchronize telemetry when requested or when data is older than 10 minutes
    // Runs cleanly across Edge, Serverless and Cloudflare Workers with bounded concurrency
    if (syncRequested || container.ingestionService.shouldRunBackgroundSync(10 * 60 * 1000)) {
      try {
        await container.ingestionService.runIngestion(`sync_${Date.now()}`);
        await container.cache.clear();
      } catch (err: any) {
        logger.warn('Dynamic telemetry ingestion skipped on error', { error: err?.message });
      }
    }

    const cacheKey = `articles_list_${category || 'ALL'}_${lab || 'ALL'}_${entryType || 'ALL'}_${search || 'NONE'}_${limit}`;

    // Single-Flight Coalesced Query with Cache
    const data = await container.cache.coalesce(cacheKey, async () => {
      const { articles, total, categoryCounts } = await container.articleRepo.queryWithStats({
        category: category !== 'All' ? category : undefined,
        lab: lab !== 'All' ? lab : undefined,
        entryType: entryType !== 'ALL' ? entryType : undefined,
        searchQuery: search,
        limit,
      });

      // Map already-decoded repository entities to frontend consumer format
      const formatted = articles.map(a => ({
        id: a.id,
        title: a.title,
        link: a.canonicalUrl,
        pubDate: a.publishedAt,
        source: {
          id: a.sourceId,
          name: a.sourceName,
          url: a.canonicalUrl,
        },
        author: a.author || a.sourceName,
        contentSnippet: a.contentSnippet || '',
        imageUrl: a.imageUrl,
        category: a.category,
        lab: a.lab || 'Independent',
        entryType: a.entryType || 'DISPATCH',
        arxivId: a.arxivId,
        pdfUrl: a.pdfUrl,
        aiSummary: a.summary || {
          tldr: a.contentSnippet || a.title || 'No summary available.',
          takeaways: [],
          impact: 'Notable',
          readTimeMinutes: 2,
        },
      }));

      const payload = {
        articles: formatted,
        total,
        categoryCounts,
      };

      // Set warm cache for 30 seconds
      await container.cache.set(cacheKey, payload, 30);
      return payload;
    });

    logger.info('News query served', {
      requestId,
      durationMs: Date.now() - startTime,
      count: data.articles.length,
    });

    return NextResponse.json(
      {
        ...data,
        lastSyncedAt: container.ingestionService.getLastRunTimestamp(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=180, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    logger.error('Failed to serve news query', {
      requestId,
      durationMs: Date.now() - startTime,
      error: error.message,
    });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
