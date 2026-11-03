export * from './benchmark';

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
  tldr: string;
  takeaways: string[];
  impact: ImpactLevel;
  readTimeMinutes: number;
  generatedWith?: 'gemini' | 'heuristic';
  summaryVersion?: number;
}

export interface ArticleSource {
  id: string;
  name: string;
  url: string;
  websiteUrl?: string;
  color: string;
}

export type EntryType = 'DISPATCH' | 'RESEARCH_PAPER';

export interface Article {
  id: string;
  title: string;
  link: string;
  pubDate: string; // ISO string
  source: ArticleSource;
  author?: string;
  contentSnippet: string;
  fullContent?: string;
  imageUrl?: string;
  category: Category;
  lab?: FrontierLab;
  entryType?: EntryType;
  arxivId?: string;
  pdfUrl?: string;
  aiSummary: AISummary;
  isFeatured?: boolean;
  bookmarked?: boolean;
}

export interface RSSFeedSource {
  id: string;
  name: string;
  feedUrl: string;
  websiteUrl: string;
  category: Category;
  color: string;
  enabled: boolean;
  lastSynced?: string;
  articleCount?: number;
}

export interface SyncResult {
  success: boolean;
  articlesAdded: number;
  totalArticles: number;
  sourcesProcessed: number;
  errors?: string[];
}

export type VectorMomentumStatus = 'SURGING' | 'HIGH' | 'ACTIVE' | 'STABLE' | 'COOLING';

export interface VectorPulseItem {
  id: string;
  label: string;
  recentCount: number;
  baselineCount: number;
  totalCount: number;
  deltaPct: number;
  barBlocks: number;
  status: VectorMomentumStatus;
}

export interface VectorPulseSnapshot {
  vectors: VectorPulseItem[];
  corpusSize: number;
  windowDays: number;
  recentWindowHours: number;
}

