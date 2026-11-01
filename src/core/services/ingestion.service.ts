import { FeedProviderPort } from '../ports/feed-provider.port';
import { ArticleRepositoryPort, SourceRepositoryPort } from '../ports/repository.port';
import { IngestionDiffEngine } from './diff-engine';
import { CircuitBreaker } from './circuit-breaker';
import { SingleFlight } from './single-flight';
import { IngestionReport, DomainArticle, DomainSource, FeedSnapshot } from '../domain/entities';
import { logger } from '@/lib/logger';
import { isServerlessOrEdge } from '@/lib/runtime-env';
import { summarizeWithGemini } from '@/lib/ai-summarizer';

const CONCURRENCY_LIMIT = 6;
const ROLLING_BATCH_LIMIT = 8;

export class IngestionService {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private singleFlight = new SingleFlight();
  private diffEngine = new IngestionDiffEngine();
  private lastRunTimestamp: number = 0;

  constructor(
    private readonly feedProvider: FeedProviderPort,
    private readonly articleRepo: ArticleRepositoryPort,
    private readonly sourceRepo: SourceRepositoryPort
  ) {}

  public getLastRunTimestamp(): number {
    const sourceLatest = this.sourceRepo.getLatestFetchedAtMs ? this.sourceRepo.getLatestFetchedAtMs() : 0;
    const articleLatest = this.articleRepo.getLatestFetchedAtMs ? this.articleRepo.getLatestFetchedAtMs() : 0;
    return Math.max(this.lastRunTimestamp, sourceLatest, articleLatest);
  }

  public shouldRunBackgroundSync(intervalMs = 5 * 60 * 1000): boolean {
    return Date.now() - this.getLastRunTimestamp() > intervalMs;
  }

  private getCircuitBreaker(sourceId: string, sourceName: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(sourceId);
    if (!breaker) {
      breaker = new CircuitBreaker({
        serviceName: sourceName,
        failureThreshold: 3, // Open circuit after 3 consecutive failures
        cooldownPeriodMs: 60_000, // 60s cooldown before trying HALF_OPEN
        trialSuccessThreshold: 1,
      });
      this.circuitBreakers.set(sourceId, breaker);
    }
    return breaker;
  }

  public async runIngestion(
    requestId = `sync_${Date.now()}`,
    options?: { maxSources?: number }
  ): Promise<IngestionReport> {
    // Single-Flight Coalescing: If another process/request is currently running sync, share it!
    return this.singleFlight.execute('GLOBAL_FEED_INGESTION', async () => {
      const startTime = Date.now();

      // Hydrate latest cross-isolate state from Cloudflare Edge Cache before picking oldest batch
      await Promise.all([
        this.sourceRepo.syncFromEdge?.(true),
        this.articleRepo.syncFromEdge?.(true),
      ]);

      const allEnabledSources = await this.sourceRepo.listEnabled();
      const existingMap = await this.articleRepo.getAllAsMap();

      // Sort sources by lastFetchedAt ascending (oldest-synced or never fetched first)
      const sortedSources = [...allEnabledSources].sort((a, b) => {
        const timeA = a.lastFetchedAt ? Date.parse(a.lastFetchedAt) || 0 : 0;
        const timeB = b.lastFetchedAt ? Date.parse(b.lastFetchedAt) || 0 : 0;
        return timeA - timeB;
      });

      // On Edge / Cloudflare Workers, process rolling batches of up to 8 sources to remain safe within subrequest/CPU quotas
      const batchLimit = options?.maxSources ?? (isServerlessOrEdge() ? ROLLING_BATCH_LIMIT : sortedSources.length);
      const sourcesToProcess = sortedSources.slice(0, batchLimit);

      let articlesAdded = 0;
      let articlesModified = 0;
      let sourcesProcessed = 0;
      const triggeredBreakers: string[] = [];
      const batchedToSave = new Map<string, DomainArticle>();

      // Filter active sources vs open circuit breakers upfront
      const activeSources: DomainSource[] = [];
      for (const source of sourcesToProcess) {
        const breaker = this.getCircuitBreaker(source.id, source.name);
        if (breaker.getState() === 'OPEN') {
          triggeredBreakers.push(source.name);
          logger.warn('Circuit breaker OPEN, skipping feed', {
            requestId,
            provider: source.name,
            status: 'CIRCUIT_OPEN',
          });
        } else {
          activeSources.push(source);
        }
      }

      // Fetch feeds concurrently in bounded batches (6x faster than sequential)
      for (let i = 0; i < activeSources.length; i += CONCURRENCY_LIMIT) {
        const batch = activeSources.slice(i, i + CONCURRENCY_LIMIT);

        const batchResults = await Promise.all(
          batch.map(async (source): Promise<
            | { ok: true; source: DomainSource; snapshot: FeedSnapshot }
            | { ok: false; source: DomainSource; error: Error; circuitState: string }
          > => {
            const breaker = this.getCircuitBreaker(source.id, source.name);
            try {
              const snapshot = await breaker.execute(() => this.feedProvider.fetchFeed(source));
              return { ok: true, source, snapshot };
            } catch (err: any) {
              return {
                ok: false,
                source,
                error: err instanceof Error ? err : new Error(String(err)),
                circuitState: breaker.getState(),
              };
            }
          })
        );

        // Deterministically apply diffs in memory without race conditions
        for (const res of batchResults) {
          if (res.ok) {
            sourcesProcessed++;
            const { source, snapshot } = res;
            const diff = this.diffEngine.computeDiff(existingMap, snapshot.articles);

            for (const item of diff.added) {
              existingMap.set(item.id, item);
              batchedToSave.set(item.id, item);
            }
            for (const item of diff.modified) {
              existingMap.set(item.id, item);
              batchedToSave.set(item.id, item);
            }

            articlesAdded += diff.added.length;
            articlesModified += diff.modified.length;

            await this.sourceRepo.updateStatus(source.id, snapshot.fetchedAt, 0, true);

            logger.info('Feed ingestion success', {
              requestId,
              provider: source.name,
              added: diff.added.length,
              modified: diff.modified.length,
              unchanged: diff.unchangedCount,
            });
          } else {
            const { source, error, circuitState } = res;
            logger.error('Feed ingestion failed', {
              requestId,
              provider: source.name,
              error: error.message,
              circuitState,
            });
            await this.sourceRepo.updateStatus(
              source.id,
              new Date().toISOString(),
              (source.consecutiveFailures || 0) + 1,
              true
            );
          }
        }
      }

      // Single atomic persistence write at the end of the run (instead of 34 writes)
      if (batchedToSave.size > 0) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          let count = 0;
          for (const [id, article] of batchedToSave.entries()) {
            if (count >= 4) break;
            if (article.summary?.generatedWith !== 'gemini') {
              try {
                const geminiSummary = await summarizeWithGemini(
                  article.title,
                  article.contentSnippet || article.title,
                  apiKey
                );
                if (geminiSummary) {
                  article.summary = geminiSummary;
                  existingMap.set(id, article);
                  batchedToSave.set(id, article);
                  count++;
                }
              } catch (err: any) {
                logger.warn('Gemini summarization failed during ingestion', { id, err: err?.message });
              }
            }
          }
        }
        await this.articleRepo.saveMany(Array.from(batchedToSave.values()));
      }
      if (typeof this.sourceRepo.flush === 'function') {
        await this.sourceRepo.flush();
      }

      this.lastRunTimestamp = Date.now();
      const durationMs = Date.now() - startTime;
      const report: IngestionReport = {
        success: true,
        sourcesProcessed,
        articlesAdded,
        articlesModified,
        circuitBreakersTriggered: triggeredBreakers,
        durationMs,
        timestamp: new Date().toISOString(),
      };

      logger.info('Global ingestion run completed', {
        requestId,
        durationMs,
        articlesAdded,
        articlesModified,
      });

      return report;
    });
  }
}
