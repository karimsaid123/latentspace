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

export interface ArticleRepositoryPort {
  saveMany(articles: DomainArticle[]): Promise<{ savedCount: number }>;
  findById(id: string): Promise<DomainArticle | null>;
  list(filter?: ArticleFilter): Promise<DomainArticle[]>;
  getAllAsMap(): Promise<Map<string, DomainArticle>>;
  count(filter?: ArticleFilter): Promise<number>;
}

export interface SourceRepositoryPort {
  listAll(): Promise<DomainSource[]>;
  listEnabled(): Promise<DomainSource[]>;
  findById(id: string): Promise<DomainSource | null>;
  updateStatus(id: string, fetchedAt: string, failureCount: number): Promise<void>;
  toggleSource(id: string, enabled: boolean): Promise<void>;
}

