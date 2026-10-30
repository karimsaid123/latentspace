import test from 'node:test';
import assert from 'node:assert/strict';
import { IngestionService } from '../src/core/services/ingestion.service';
import { FakeFeedAdapter } from '../src/adapters/providers/fake-feed.adapter';
import { MemoryArticleRepository } from '../src/adapters/storage/memory-article.repository';
import { MemorySourceRepository } from '../src/adapters/storage/memory-source.repository';
import { DomainArticle } from '../src/core/domain/entities';
import fs from 'fs/promises';
import path from 'path';

test('IngestionService integrates with repository and fake provider offline', async () => {
  // Use temporary test paths to avoid touching real data
  const testDir = path.join(process.cwd(), 'data', 'test-data');
  const testArticlesPath = path.join(testDir, 'test-articles.json');
  const testSourcesPath = path.join(testDir, 'test-sources.json');

  await fs.mkdir(testDir, { recursive: true });

  const fakeProvider = new FakeFeedAdapter();
  const articleRepo = new MemoryArticleRepository(testArticlesPath);
  const sourceRepo = new MemorySourceRepository(testSourcesPath);

  await articleRepo.initialize();
  await sourceRepo.initialize();

  const service = new IngestionService(fakeProvider, articleRepo, sourceRepo);

  const mockArticles: DomainArticle[] = [
    {
      id: 'art_101',
      canonicalUrl: 'https://test.ai/101',
      title: 'Autonomous Multi-Agent System Released',
      publishedAt: '2026-10-30T12:00:00Z',
      fetchedAt: '2026-10-30T12:05:00Z',
      contentHash: 'hash_101',
      sourceId: 'openai',
      sourceName: 'OpenAI News',
      author: 'Test Author',
      contentSnippet: 'Test snippet content',
      category: 'LLMs & GenAI',
      summary: {
        tldr: 'Autonomous multi-agent system',
        takeaways: ['Point 1'],
        impact: 'High',
        readTimeMinutes: 2,
      },
    },
  ];

  fakeProvider.setMockArticles(mockArticles);

  // Run Ingestion
  const report1 = await service.runIngestion('test_run_1');

  assert.equal(report1.success, true);
  assert.equal(report1.articlesAdded, 1);
  assert.equal(report1.articlesModified, 0);

  // Verify article is saved in repository
  const saved = await articleRepo.findById('art_101');
  assert.notEqual(saved, null);
  assert.equal(saved?.title, 'Autonomous Multi-Agent System Released');

  // Second run with same articles -> should add 0
  const report2 = await service.runIngestion('test_run_2');
  assert.equal(report2.articlesAdded, 0);

  // Clean up test directory
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch {}
});

