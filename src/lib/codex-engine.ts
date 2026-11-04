import codexData from '../../data/codex.json';
import { CodexEntry, CodexSearchFilter, CodexCategory, CodexLevel } from '@/types/codex';

export interface CodexArticleMention {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  canonicalUrl: string;
}

export interface EnrichedCodexEntry extends CodexEntry {
  mentionsCount: number;
  recentMentions: CodexArticleMention[];
}

// In-memory cache of enriched entries with news connections
let enrichedCache: EnrichedCodexEntry[] | null = null;

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Calculates a relevance score for a given entry against search tokens.
 */
function computeRelevance(entry: CodexEntry, tokens: string[]): number {
  if (tokens.length === 0) return 1;

  const titleNorm = normalize(entry.title);
  const acronymNorm = entry.acronym ? normalize(entry.acronym) : '';
  const summaryNorm = normalize(entry.summary);
  const deepDiveNorm = normalize(entry.technicalDeepDive);
  const keywordsNorm = entry.searchKeywords.map(normalize);

  let score = 0;

  for (const token of tokens) {
    if (!token) continue;

    // Exact ID / Slug match
    if (entry.id === token || entry.slug === token) {
      score += 120;
    } else if (entry.id.startsWith(token + '-') || entry.id.endsWith('-' + token)) {
      score += 30;
    }

    // Acronym match (exact vs substring)
    if (acronymNorm === token) {
      score += 100;
    } else if (acronymNorm.split(' ').includes(token)) {
      score += 60;
    } else if (acronymNorm.includes(token)) {
      score += 35;
    }

    // Title match
    if (titleNorm === token) {
      score += 80;
    } else if (titleNorm.startsWith(token + ' ')) {
      score += 50;
    } else if (titleNorm.includes(token)) {
      score += 25;
    }

    // Keywords match
    if (keywordsNorm.some(k => k === token)) {
      score += 35;
    } else if (keywordsNorm.some(k => k.includes(token))) {
      score += 15;
    }

    // Summary & Deep dive match
    if (summaryNorm.includes(token)) {
      score += 10;
    }
    if (deepDiveNorm.includes(token)) {
      score += 5;
    }
  }

  return score;
}

/**
 * Loads and enriches codex entries with mentions from articles.json.
 */
export function getAllCodexEntries(articles: any[] = []): EnrichedCodexEntry[] {
  if (enrichedCache && articles.length === 0) {
    return enrichedCache;
  }

  const entries: CodexEntry[] = codexData as CodexEntry[];

  const enriched: EnrichedCodexEntry[] = entries.map((entry) => {
    const terms = [
      entry.title.toLowerCase(),
      entry.id.toLowerCase(),
      entry.acronym?.toLowerCase(),
      ...entry.searchKeywords.map(k => k.toLowerCase())
    ].filter(Boolean) as string[];

    const matchedArticles: CodexArticleMention[] = [];

    if (Array.isArray(articles) && articles.length > 0) {
      for (const art of articles) {
        const titleLower = String(art.title || '').toLowerCase();
        const snippetLower = String(art.contentSnippet || '').toLowerCase();

        const hit = terms.some((term) => {
          if (term.length <= 2) return false;
          // Word boundary match for short acronyms like MoE, DPO, RLHF
          if (term.length <= 4) {
            const regex = new RegExp(`\\b${term}\\b`, 'i');
            return regex.test(titleLower) || regex.test(snippetLower);
          }
          return titleLower.includes(term) || snippetLower.includes(term);
        });

        if (hit) {
          matchedArticles.push({
            id: art.id,
            title: art.title,
            sourceName: art.sourceName || 'Dispatch',
            publishedAt: art.publishedAt || '',
            canonicalUrl: art.canonicalUrl || '#'
          });
        }
      }
    }

    return {
      ...entry,
      mentionsCount: matchedArticles.length,
      recentMentions: matchedArticles.slice(0, 5)
    };
  });

  if (articles.length === 0) {
    enrichedCache = enriched;
  }

  return enriched;
}

/**
 * Deterministic, instant, zero-latency search engine over the Codex.
 */
export function searchCodex(
  filter: CodexSearchFilter = {},
  articles: any[] = []
): EnrichedCodexEntry[] {
  const all = getAllCodexEntries(articles);
  const { query, category, level } = filter;

  const rawTokens = query ? normalize(query).split(' ').filter(Boolean) : [];

  return all
    .filter((entry) => {
      // Category filter
      if (category && category !== 'ALL' && entry.category !== category) {
        return false;
      }

      // Level filter
      if (level && level !== 'ALL' && entry.level !== level) {
        return false;
      }

      // Search query filter
      if (rawTokens.length > 0) {
        const score = computeRelevance(entry, rawTokens);
        return score > 0;
      }

      return true;
    })
    .sort((a, b) => {
      if (rawTokens.length > 0) {
        const scoreA = computeRelevance(a, rawTokens);
        const scoreB = computeRelevance(b, rawTokens);
        if (scoreB !== scoreA) return scoreB - scoreA;
      }
      return a.title.localeCompare(b.title);
    });
}

/**
 * Retrieve a single Codex entry by its ID or slug, enriched with related entries.
 */
export function getCodexEntryById(idOrSlug: string, articles: any[] = []): EnrichedCodexEntry | null {
  const all = getAllCodexEntries(articles);
  return all.find(e => e.id === idOrSlug || e.slug === idOrSlug) || null;
}

