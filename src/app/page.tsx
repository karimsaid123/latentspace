import React from 'react';
import FeedClient from '@/components/FeedClient';
import { Article, ImpactLevel } from '@/types';
import { decodeHtmlEntities } from '@/lib/sanitize';
import {
  detectFrontierLab,
  detectEntryType,
  generateDeepIntelligenceSummary,
} from '@/lib/intelligence-analyzer';
import { computeVectorPulseFromRawRecords } from '@/lib/vector-pulse';
import rawArticlesData from '../../data/articles.json';

function normalizeImpact(raw: unknown): ImpactLevel {
  if (raw === 'Breakthrough' || raw === 'High' || raw === 'Medium' || raw === 'Notable') {
    return raw;
  }
  if (raw === 'High Impact') {
    return 'High';
  }
  return 'Notable';
}

function getInitialSeedArticles(limit = 30): Article[] {
  const rawList = Array.isArray(rawArticlesData) ? (rawArticlesData as Record<string, any>[]) : [];
  const sorted = [...rawList].sort((a, b) => {
    const tA = Date.parse(a?.publishedAt || a?.pubDate || '') || 0;
    const tB = Date.parse(b?.publishedAt || b?.pubDate || '') || 0;
    return tB - tA;
  });

  return sorted.slice(0, limit).map((item) => {
    const title = decodeHtmlEntities(item.title || '');
    const contentSnippet = decodeHtmlEntities(item.contentSnippet || '');
    const sourceName = item.sourceName || item.source?.name || 'Feed';
    const canonicalUrl = item.canonicalUrl || item.link || '';
    const lab = detectFrontierLab(title, contentSnippet, sourceName);
    const typeInfo = detectEntryType(title, contentSnippet, canonicalUrl, sourceName);
    const rawSummary = item.summary || item.aiSummary;

    const aiSummary =
      rawSummary?.generatedWith === 'gemini' && typeof rawSummary.tldr === 'string'
        ? {
            tldr: decodeHtmlEntities(rawSummary.tldr),
            takeaways: Array.isArray(rawSummary.takeaways)
              ? rawSummary.takeaways.map((t: string) => decodeHtmlEntities(t))
              : [],
            impact: normalizeImpact(rawSummary.impact),
            readTimeMinutes: Number(rawSummary.readTimeMinutes) || 3,
            generatedWith: 'gemini' as const,
            summaryVersion: rawSummary.summaryVersion,
          }
        : generateDeepIntelligenceSummary(title, contentSnippet, sourceName);

    return {
      id: item.id,
      title,
      link: canonicalUrl,
      pubDate: item.publishedAt || item.pubDate || '2026-11-01T00:00:00.000Z',
      source: {
        id: item.sourceId || item.source?.id || 'source',
        name: sourceName,
        url: canonicalUrl,
        color: '#000000',
      },
      author: decodeHtmlEntities(item.author || sourceName),
      contentSnippet,
      category: item.category || 'LLMs & GenAI',
      lab,
      entryType: item.entryType || typeInfo.entryType,
      arxivId: item.arxivId || typeInfo.arxivId,
      pdfUrl: item.pdfUrl || typeInfo.pdfUrl,
      aiSummary,
    };
  });
}

const INITIAL_ARTICLES = getInitialSeedArticles(30);
const INITIAL_VECTOR_PULSE = computeVectorPulseFromRawRecords(
  Array.isArray(rawArticlesData) ? (rawArticlesData as Record<string, any>[]) : []
);

export default function HomePage() {
  return <FeedClient initialArticles={INITIAL_ARTICLES} initialVectorPulse={INITIAL_VECTOR_PULSE} />;
}
