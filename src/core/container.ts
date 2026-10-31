import { RssFeedAdapter } from '@/adapters/providers/rss-feed.adapter';
import { MemoryArticleRepository } from '@/adapters/storage/memory-article.repository';
import { MemorySourceRepository } from '@/adapters/storage/memory-source.repository';
import { MemoryCacheAdapter } from '@/adapters/storage/memory-cache.adapter';
import { isLocalPersistentDev } from '@/lib/runtime-env';
import { IngestionService } from './services/ingestion.service';

class BackendContainer {
  private static instance: BackendContainer;

  public readonly feedProvider: RssFeedAdapter;
  public readonly articleRepo: MemoryArticleRepository;
  public readonly sourceRepo: MemorySourceRepository;
  public readonly cache: MemoryCacheAdapter;
  public readonly ingestionService: IngestionService;

  private isInitialized = false;
  private bootstrapPromise: Promise<void> | null = null;
  private schedulerTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.feedProvider = new RssFeedAdapter(5500);
    this.articleRepo = new MemoryArticleRepository();
    this.sourceRepo = new MemorySourceRepository();
    this.cache = new MemoryCacheAdapter();

    this.ingestionService = new IngestionService(
      this.feedProvider,
      this.articleRepo,
      this.sourceRepo
    );
  }

  public static getInstance(): BackendContainer {
    if (!BackendContainer.instance) {
      BackendContainer.instance = new BackendContainer();
    }
    return BackendContainer.instance;
  }

  public async bootstrap(): Promise<void> {
    if (this.isInitialized) return;
    if (this.bootstrapPromise) return this.bootstrapPromise;

    this.bootstrapPromise = (async () => {
      try {
        await Promise.all([
          this.articleRepo.initialize(),
          this.sourceRepo.initialize(),
        ]);
        this.isInitialized = true;

        // Only run autonomous background scheduler in local Node.js development server
        // In Cloudflare Workers / Edge / Serverless, persistent setInterval timers cause request hangs and 500 cancellations
        if (isLocalPersistentDev()) {
          this.startAutonomousScheduler();
        }
      } finally {
        this.bootstrapPromise = null;
      }
    })();

    return this.bootstrapPromise;
  }

  /**
   * Reconciles warm Worker isolates with `caches.default` (throttled to <=1 header check / 10s unless forced).
   * Automatically invalidates isolate query cache when a sibling isolate persisted newer articles.
   */
  public async syncEdgeState(force = false): Promise<boolean> {
    const [articlesChanged] = await Promise.all([
      this.articleRepo.syncFromEdge(force),
      this.sourceRepo.syncFromEdge(force),
    ]);
    if (articlesChanged) {
      this.cache.clear();
    }
    return articlesChanged;
  }

  public startAutonomousScheduler(intervalMs = 5 * 60 * 1000): void {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(async () => {
      try {
        await this.bootstrap();
        await this.ingestionService.runIngestion('cron_scheduler');
        this.cache.clear();
      } catch {
        // Suppress or log gracefully
      }
    }, intervalMs);
    if (this.schedulerTimer && typeof this.schedulerTimer.unref === 'function') {
      this.schedulerTimer.unref();
    }
  }
}

export const container = BackendContainer.getInstance();
