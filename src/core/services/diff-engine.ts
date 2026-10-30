import { DomainArticle, DiffResult } from '../domain/entities';

export class IngestionDiffEngine {
  /**
   * Computes mutations between current repository state and incoming feed snapshot.
   * Protects against out-of-order updates by checking timestamps.
   */
  public computeDiff(
    existingArticles: Map<string, DomainArticle>,
    incomingArticles: DomainArticle[]
  ): DiffResult {
    const added: DomainArticle[] = [];
    const modified: DomainArticle[] = [];
    let unchangedCount = 0;

    for (const incoming of incomingArticles) {
      const existing = existingArticles.get(incoming.id);

      if (!existing) {
        // Completely new article
        added.push(incoming);
        continue;
      }

      // Out-of-order check: if incoming is older than existing, skip to prevent race conditions
      const existingTimestamp = new Date(existing.publishedAt).getTime();
      const incomingTimestamp = new Date(incoming.publishedAt).getTime();

      if (incomingTimestamp < existingTimestamp) {
        // Stale snapshot skipped
        unchangedCount++;
        continue;
      }

      // Check if content was modified
      if (existing.contentHash !== incoming.contentHash || existing.title !== incoming.title) {
        modified.push(incoming);
      } else {
        unchangedCount++;
      }
    }

    return {
      added,
      modified,
      unchangedCount,
    };
  }
}

