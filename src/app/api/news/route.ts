import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  try {
    await container.bootstrap();

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const cacheKey = `articles_list_${category || 'ALL'}_${search || 'NONE'}_${limit}`;

    // Single-Flight Coalesced Query with Cache
    const data = await container.cache.coalesce(cacheKey, async () => {
      const [articles, totalCount, allArticles] = await Promise.all([
        container.articleRepo.list({
          category: category !== 'All' ? category : undefined,
          searchQuery: search,
          limit,
        }),
        container.articleRepo.count({
          category: category !== 'All' ? category : undefined,
          searchQuery: search,
        }),
        container.articleRepo.list({ limit: 1000 }),
      ]);

      // If store is empty, trigger an initial ingestion
      if (allArticles.length === 0) {
        await container.ingestionService.runIngestion(requestId);
        return null; // Will re-evaluate on next call
      }

      // Compute live category counts
      const categoryCounts: Record<string, number> = {
        All: allArticles.length,
        'LLMs & GenAI': 0,
        'Robotics & Hardware': 0,
        'Open Source & Research': 0,
        'Business & Big Tech': 0,
        'Ethics & Policy': 0,
      };

      for (const a of allArticles) {
        if (categoryCounts[a.category] !== undefined) {
          categoryCounts[a.category]++;
        }
      }

      // Map to frontend consumer format with guaranteed summary presence
      const formatted = articles.map(a => {
        const summary = a.summary || (a as any).aiSummary || {
          tldr: a.contentSnippet || a.title || 'No summary available.',
          takeaways: [],
          impact: 'Notable',
          readTimeMinutes: 2,
        };

        return {
          id: a.id,
          title: a.title,
          link: a.canonicalUrl,
          pubDate: a.publishedAt,
          source: {
            id: a.sourceId,
            name: a.sourceName,
            url: a.canonicalUrl,
          },
          author: a.author,
          contentSnippet: a.contentSnippet,
          imageUrl: a.imageUrl,
          category: a.category,
          aiSummary: summary,
        };
      });

      const payload = {
        articles: formatted,
        total: totalCount,
        categoryCounts,
      };

      // Set warm cache for 15 seconds
      await container.cache.set(cacheKey, payload, 15);
      return payload;
    });

    // If cache coalesce returned null because initial sync was triggered
    const finalData = data || {
      articles: [],
      total: 0,
      categoryCounts: { All: 0, 'LLMs & GenAI': 0, 'Robotics & Hardware': 0, 'Open Source & Research': 0, 'Business & Big Tech': 0, 'Ethics & Policy': 0 },
    };

    // Background stale-while-revalidate ingestion if it's been more than 5 minutes
    if (container.ingestionService.shouldRunBackgroundSync(5 * 60 * 1000)) {
      container.ingestionService
        .runIngestion(`swr_${Date.now()}`)
        .then(() => container.cache.clear())
        .catch(() => {});
    }

    logger.info('News query served', {
      requestId,
      durationMs: Date.now() - startTime,
      count: finalData.articles.length,
    });

    return NextResponse.json({
      ...finalData,
      lastSyncedAt: container.ingestionService.getLastRunTimestamp(),
    });
  } catch (error: any) {
    logger.error('Failed to serve news query', {
      requestId,
      durationMs: Date.now() - startTime,
      error: error.message,
    });
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
