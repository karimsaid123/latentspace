import type { Locale } from '@/lib/i18n';

export type { Locale };

export type Category = 
  | 'LLMs & GenAI'
  | 'Robotics & Hardware'
  | 'Open Source & Research'
  | 'Business & Big Tech'
  | 'Ethics & Policy';

export type ImpactLevel = 'Breakthrough' | 'High' | 'Medium' | 'Notable';

export type FrontierLab = 
  | 'OpenAI'
  | 'Google DeepMind'
  | 'Anthropic'
  | 'SpaceX & xAI'
  | 'DeepSeek'
  | 'Mistral AI'
  | 'Moonshot AI'
  | 'Meta AI'
  | 'NVIDIA'
  | 'Independent';

export interface AISummary {
  title?: string;
  tldr: string;
  takeaways: string[];
  impact: ImpactLevel;
  readTimeMinutes: number;
  generatedWith?: 'gemini' | 'heuristic';
  summaryVersion?: number;
  locale?: Locale;
}

export interface DomainSource {
  id: string;
  name: string;
  feedUrl: string;
  websiteUrl: string;
  category: Category;
  enabled: boolean;
  lastFetchedAt?: string; // ISO 8601 UTC
  consecutiveFailures: number;
}

export type EntryType = 'DISPATCH' | 'RESEARCH_PAPER';

export interface DomainArticle {
  id: string; // Deterministic sha256 of canonical URL
  canonicalUrl: string;
  title: string;
  publishedAt: string; // ISO 8601 UTC
  fetchedAt: string; // Monotonic ISO 8601 UTC
  contentHash: string; // sha256 of cleaned content for diffing
  sourceId: string;
  sourceName: string;
  author: string;
  contentSnippet: string;
  imageUrl?: string;
  category: Category;
  lab?: FrontierLab;
  entryType?: EntryType;
  arxivId?: string;
  pdfUrl?: string;
  summary: AISummary;
}

export interface FeedSnapshot {
  sourceId: string;
  sourceName: string;
  fetchedAt: string; // ISO 8601 UTC
  rawItemCount: number;
  articles: DomainArticle[];
}

export interface DiffResult {
  added: DomainArticle[];
  modified: DomainArticle[];
  unchangedCount: number;
}

export interface IngestionReport {
  success: boolean;
  sourcesProcessed: number;
  articlesAdded: number;
  articlesModified: number;
  circuitBreakersTriggered: string[];
  durationMs: number;
  timestamp: string;
}

