import { FeedProviderPort } from '../ports/feed-provider.port';
import { ArticleRepositoryPort, SourceRepositoryPort } from '../ports/repository.port';
import { IngestionDiffEngine } from './diff-engine';
import { CircuitBreaker } from './circuit-breaker';
import { SingleFlight } from './single-flight';
import { IngestionReport, DomainArticle } from '../domain/entities';
import { logger } from '@/lib/logger';

export class IngestionService {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private singleFlight = new SingleFlight();
  private diffEngine = new IngestionDiffEngine();

  constructor(
    private readonly feedProvider: FeedProviderPort,
    private readonly articleRepo: ArticleRepositoryPort,
    private readonly sourceRepo: SourceRepositoryPort
  ) {}

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

  public async runIngestion(requestId = `sync_${Date.now()}`): Promise<IngestionReport> {
    // Single-Flight Coalescing: If another process/request is currently running sync, share it!
    return this.singleFlight.execute('GLOBAL_FEED_INGESTION', async () => {
      const startTime = Date.now();
      const sources = await this.sourceRepo.listEnabled();
      const existingMap = await this.articleRepo.getAllAsMap();

      let articlesAdded = 0;
      let articlesModified = 0;
      let sourcesProcessed = 0;
      const triggeredBreakers: string[] = [];

      for (const source of sources) {
        const breaker = this.getCircuitBreaker(source.id, source.name);

        if (breaker.getState() === 'OPEN') {
          triggeredBreakers.push(source.name);
          logger.warn('Circuit breaker OPEN, skipping feed', {
            requestId,
            provider: source.name,
            status: 'CIRCUIT_OPEN',
          });
          continue;
        }

        try {
          const snapshot = await breaker.execute(async () => {
            return await this.feedProvider.fetchFeed(source);
          });

          sourcesProcessed++;

          // Compute diff against current state
          const diff = this.diffEngine.computeDiff(existingMap, snapshot.articles);

          const toSave: DomainArticle[] = [...diff.added, ...diff.modified];
          if (toSave.length > 0) {
            await this.articleRepo.saveMany(toSave);
            // Update in-memory map for subsequent sources in the same run
            for (const item of toSave) {
              existingMap.set(item.id, item);
            }
          }

          articlesAdded += diff.added.length;
          articlesModified += diff.modified.length;

          await this.sourceRepo.updateStatus(source.id, snapshot.fetchedAt, 0);

          logger.info('Feed ingestion success', {
            requestId,
            provider: source.name,
            added: diff.added.length,
            modified: diff.modified.length,
            unchanged: diff.unchangedCount,
          });
        } catch (err: any) {
          logger.error('Feed ingestion failed', {
            requestId,
            provider: source.name,
            error: err.message,
            circuitState: breaker.getState(),
          });
          await this.sourceRepo.updateStatus(source.id, new Date().toISOString(), (source.consecutiveFailures || 0) + 1);
        }
      }

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

