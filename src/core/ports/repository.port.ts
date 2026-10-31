import { DomainArticle, DomainSource } from '../domain/entities';

export interface ArticleFilter {
  category?: string;
  lab?: string;
  entryType?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
  sourceId?: string;
}

export interface ArticleQueryResult {
  articles: DomainArticle[];
  total: number;
  categoryCounts: Record<string, number>;
}

export interface ArticleRepositoryPort {
  saveMany(articles: DomainArticle[]): Promise<{ savedCount: number }>;
  findById(id: string): Promise<DomainArticle | null>;
  list(filter?: ArticleFilter): Promise<DomainArticle[]>;
  getAllAsMap(): Promise<Map<string, DomainArticle>>;
  count(filter?: ArticleFilter): Promise<number>;
  queryWithStats?(filter?: ArticleFilter): Promise<ArticleQueryResult>;
  syncFromEdge?(force?: boolean): Promise<boolean>;
  getLatestFetchedAtMs?(): number;
}

export interface SourceRepositoryPort {
  listAll(): Promise<DomainSource[]>;
  listEnabled(): Promise<DomainSource[]>;
  findById(id: string): Promise<DomainSource | null>;
  updateStatus(id: string, fetchedAt: string, failureCount: number, deferPersist?: boolean): Promise<void>;
  toggleSource(id: string, enabled: boolean): Promise<void>;
  flush?(): Promise<void>;
  syncFromEdge?(force?: boolean): Promise<boolean>;
  getLatestFetchedAtMs?(): number;
}
