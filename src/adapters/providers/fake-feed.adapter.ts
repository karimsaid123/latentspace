import { FeedProviderPort } from '@/core/ports/feed-provider.port';
import { DomainSource, FeedSnapshot, DomainArticle } from '@/core/domain/entities';
import { ProviderUnavailableError, RateLimitError } from '@/core/domain/errors';

export class FakeFeedAdapter implements FeedProviderPort {
  private shouldFailWithRateLimit = false;
  private shouldFailWithUnavailable = false;
  private mockArticles: DomainArticle[] = [];

  public setMockArticles(articles: DomainArticle[]): void {
    this.mockArticles = articles;
  }

  public simulateRateLimit(enable: boolean): void {
    this.shouldFailWithRateLimit = enable;
  }

  public simulateUnavailable(enable: boolean): void {
    this.shouldFailWithUnavailable = enable;
  }

  public async fetchFeed(source: DomainSource): Promise<FeedSnapshot> {
    if (this.shouldFailWithRateLimit) {
      throw new RateLimitError(source.name, 60);
    }

    if (this.shouldFailWithUnavailable) {
      throw new ProviderUnavailableError(source.name, 'Simulated network drop');
    }

    const fetchedAt = new Date().toISOString();
    return {
      sourceId: source.id,
      sourceName: source.name,
      fetchedAt,
      rawItemCount: this.mockArticles.length,
      articles: this.mockArticles.map(a => ({
        ...a,
        sourceId: source.id,
        sourceName: source.name,
        fetchedAt,
      })),
    };
  }
}

