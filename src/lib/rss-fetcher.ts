import Parser from 'rss-parser';
import crypto from 'crypto';
import { Article, SyncResult } from '@/types';
import { getArticles, getSources, saveArticles, saveSources } from './storage';
import { categorizeText, heuristicSummarize, summarizeWithGemini } from './ai-summarizer';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 LatentSpace/1.0',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ]
  }
});

function extractImageUrl(item: any): string | undefined {
  if (item.enclosure?.url && (item.enclosure.type?.includes('image') || /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url))) {
    return item.enclosure.url;
  }
  if (item.mediaContent?.$?.url) {
    return item.mediaContent.$.url;
  }
  if (item.mediaThumbnail?.$?.url) {
    return item.mediaThumbnail.$.url;
  }

  const contentToSearch = item.contentEncoded || item.content || item.summary || '';
  const imgMatch = contentToSearch.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  if (imgMatch && imgMatch[1] && !imgMatch[1].includes('feedburner') && !imgMatch[1].includes('doubleclick')) {
    return imgMatch[1];
  }

  return undefined;
}

function generateArticleId(url: string, title: string): string {
  return crypto.createHash('sha256').update(url || title).digest('hex').slice(0, 16);
}

export async function syncFeeds(): Promise<SyncResult> {
  const sources = await getSources();
  const existingArticles = await getArticles();
  const existingIds = new Set(existingArticles.map(a => a.id));
  const existingUrls = new Set(existingArticles.map(a => a.link));

  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const newArticles: Article[] = [];
  const errors: string[] = [];

  let sourcesProcessed = 0;

  for (const source of sources) {
    if (!source.enabled) continue;

    try {
      const feed = await parser.parseURL(source.feedUrl);
      sourcesProcessed++;

      let sourceArticleCount = 0;
      // Process newest 15 items per source
      const itemsToProcess = (feed.items || []).slice(0, 15);

      for (const item of itemsToProcess) {
        const link = item.link || item.guid || '';
        const title = (item.title || '').trim();

        if (!title || !link) continue;

        const id = generateArticleId(link, title);
        if (existingIds.has(id) || existingUrls.has(link)) {
          sourceArticleCount++;
          continue;
        }

        const rawContent = item.contentEncoded || item.content || item.contentSnippet || item.summary || '';
        const pubDate = item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString());
        const author = item.creator || (item as any).author || source.name;
        const imageUrl = extractImageUrl(item);

        const category = categorizeText(title, rawContent, source.category);

        // Summarize: use Gemini if key configured, otherwise intelligent heuristic
        let aiSummary = null;
        if (geminiKey) {
          aiSummary = await summarizeWithGemini(title, rawContent, geminiKey);
        }
        if (!aiSummary) {
          aiSummary = heuristicSummarize(title, rawContent);
        }

        const article: Article = {
          id,
          title,
          link,
          pubDate,
          source: {
            id: source.id,
            name: source.name,
            url: source.feedUrl,
            websiteUrl: source.websiteUrl,
            color: source.color,
          },
          author,
          contentSnippet: item.contentSnippet || rawContent.replace(/<[^>]*>/g, '').slice(0, 300),
          fullContent: rawContent,
          imageUrl,
          category,
          aiSummary,
          bookmarked: false,
        };

        newArticles.push(article);
        existingIds.add(id);
        existingUrls.add(link);
        sourceArticleCount++;
      }

      source.lastSynced = new Date().toISOString();
      source.articleCount = sourceArticleCount;
    } catch (err: any) {
      console.warn(`Error syncing feed ${source.name} (${source.feedUrl}):`, err.message);
      errors.push(`${source.name}: ${err.message}`);
    }
  }

  // Update sources status
  await saveSources(sources);

  // Combine and sort articles
  const allArticles = [...newArticles, ...existingArticles];
  allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Mark top breakthrough or latest high impact as featured
  allArticles.forEach((a, idx) => {
    a.isFeatured = idx === 0;
  });

  // Limit to 300 most recent articles
  const trimmed = allArticles.slice(0, 300);
  await saveArticles(trimmed);

  return {
    success: true,
    articlesAdded: newArticles.length,
    totalArticles: trimmed.length,
    sourcesProcessed,
    errors: errors.length > 0 ? errors : undefined,
  };
}
