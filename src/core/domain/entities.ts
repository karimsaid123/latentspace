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
  | 'Meta AI'
  | 'NVIDIA'
  | 'Independent';

export interface AISummary {
  tldr: string;
  takeaways: string[];
  impact: ImpactLevel;
  readTimeMinutes: number;
  technicalAnalysis?: string;
  strategicImplications?: string;
  primaryThesis?: string;
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

