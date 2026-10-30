import { RssFeedAdapter } from '@/adapters/providers/rss-feed.adapter';
import { MemoryArticleRepository } from '@/adapters/storage/memory-article.repository';
import { MemorySourceRepository } from '@/adapters/storage/memory-source.repository';
import { MemoryCacheAdapter } from '@/adapters/storage/memory-cache.adapter';
import { IngestionService } from './services/ingestion.service';

class BackendContainer {
  private static instance: BackendContainer;

  public readonly feedProvider: RssFeedAdapter;
  public readonly articleRepo: MemoryArticleRepository;
  public readonly sourceRepo: MemorySourceRepository;
  public readonly cache: MemoryCacheAdapter;
  public readonly ingestionService: IngestionService;

  private isInitialized = false;

  private constructor() {
    this.feedProvider = new RssFeedAdapter(9000);
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
    await Promise.all([
      this.articleRepo.initialize(),
      this.sourceRepo.initialize(),
    ]);
    this.isInitialized = true;
  }
}

export const container = BackendContainer.getInstance();
