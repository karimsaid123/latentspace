import { NextRequest, NextResponse } from 'next/server';
import { getArticles } from '@/lib/storage';
import { syncFeeds } from '@/lib/rss-fetcher';
import { Article, Category } from '@/types';

export async function GET(request: NextRequest) {
  try {
    let articles = await getArticles();

    // Auto-sync if database is empty on first visit
    if (articles.length === 0) {
      await syncFeeds();
      articles = await getArticles();
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase().trim();
    const sort = searchParams.get('sort') || 'latest';
    const bookmarkedOnly = searchParams.get('bookmarked') === 'true';

    // Calculate category counts across all articles
    const categoryCounts: Record<string, number> = {
      All: articles.length,
      'LLMs & GenAI': 0,
      'Robotics & Hardware': 0,
      'Open Source & Research': 0,
      'Business & Big Tech': 0,
      'Ethics & Policy': 0,
      Bookmarks: 0,
    };

    articles.forEach(article => {
      if (categoryCounts[article.category] !== undefined) {
        categoryCounts[article.category]++;
      }
      if (article.bookmarked) {
        categoryCounts.Bookmarks++;
      }
    });

    // Apply filtering
    let filtered = [...articles];

    if (bookmarkedOnly) {
      filtered = filtered.filter(a => a.bookmarked);
    } else if (category && category !== 'All') {
      filtered = filtered.filter(a => a.category === category);
    }

    if (search) {
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(search) ||
        a.contentSnippet?.toLowerCase().includes(search) ||
        a.aiSummary.tldr.toLowerCase().includes(search) ||
        a.aiSummary.takeaways.some(t => t.toLowerCase().includes(search)) ||
        a.source.name.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    if (sort === 'latest') {
      filtered.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    } else if (sort === 'impact') {
      const impactWeights: Record<string, number> = {
        Breakthrough: 4,
        High: 3,
        Medium: 2,
        Notable: 1,
      };
      filtered.sort((a, b) => (impactWeights[b.aiSummary.impact] || 0) - (impactWeights[a.aiSummary.impact] || 0));
    } else if (sort === 'readTime') {
      filtered.sort((a, b) => a.aiSummary.readTimeMinutes - b.aiSummary.readTimeMinutes);
    }

    return NextResponse.json({
      articles: filtered,
      total: filtered.length,
      categoryCounts,
    });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch news' }, { status: 500 });
  }
}
