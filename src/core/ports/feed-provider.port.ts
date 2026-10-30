import { DomainSource, FeedSnapshot } from '../domain/entities';

export interface FeedProviderPort {
  /**
   * Fetches an external RSS/Atom feed and normalizes it to a clean FeedSnapshot.
   * Throws typed domain errors: RateLimitError, ProviderUnavailableError.
   */
  fetchFeed(source: DomainSource): Promise<FeedSnapshot>;
}

