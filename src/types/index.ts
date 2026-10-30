export type Category = 
  | 'LLMs & GenAI'
  | 'Robotics & Hardware'
  | 'Open Source & Research'
  | 'Business & Big Tech'
  | 'Ethics & Policy';

export type ImpactLevel = 'Breakthrough' | 'High' | 'Medium' | 'Notable';

export interface AISummary {
  tldr: string;
  takeaways: string[];
  impact: ImpactLevel;
  readTimeMinutes: number;
  generatedWith: 'gemini' | 'heuristic';
}

export interface ArticleSource {
  id: string;
  name: string;
  url: string;
  websiteUrl?: string;
  color: string;
}

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

