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

    // Background stale-while-revalidate ingestion ONLY in persistent local development
    // (Prevents unawaited promises / waitUntil timeouts on Cloudflare Workers & Edge)
    if (isLocalPersistentDev() && container.ingestionService.shouldRunBackgroundSync(5 * 60 * 1000)) {
      container.ingestionService
        .runIngestion(`swr_${Date.now()}`)
        .then(() => container.cache.clear())
        .catch(() => {});
    }

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
          'Cache-Control': 'public, max-age=15, stale-while-revalidate=60',
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
