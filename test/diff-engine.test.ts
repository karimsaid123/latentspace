import test from 'node:test';
import assert from 'node:assert/strict';
import { IngestionDiffEngine } from '../src/core/services/diff-engine';
import { DomainArticle } from '../src/core/domain/entities';

test('IngestionDiffEngine detects added, modified, and protects against out-of-order stale updates', () => {
  const engine = new IngestionDiffEngine();
  const existingMap = new Map<string, DomainArticle>();

  const baseArticle: DomainArticle = {
    id: 'art_1',
    canonicalUrl: 'https://news.ai/item-1',
    title: 'GPT-5 Architecture Unveiled',
    publishedAt: '2026-10-30T10:00:00Z',
    fetchedAt: '2026-10-30T10:05:00Z',
    contentHash: 'hash_v1',
    sourceId: 'openai',
    sourceName: 'OpenAI News',
    author: 'OpenAI',
    contentSnippet: 'Details about GPT-5',
    category: 'LLMs & GenAI',
    summary: {
      tldr: 'GPT-5 architecture introduced',
      takeaways: ['Major milestone'],
      impact: 'Breakthrough',
      readTimeMinutes: 3,
    },
  };

  existingMap.set(baseArticle.id, baseArticle);

  // Incoming batch:
  // 1. New article (art_2) -> should be 'added'
  // 2. Modified article (art_1 with new contentHash) -> should be 'modified'
  // 3. Stale article (art_1 with older publishedAt timestamp) -> should be skipped!

  const incomingNew: DomainArticle = {
    ...baseArticle,
    id: 'art_2',
    canonicalUrl: 'https://news.ai/item-2',
    title: 'Robotics Breakthrough in Manipulation',
    publishedAt: '2026-10-30T11:00:00Z',
    contentHash: 'hash_art2',
    category: 'Robotics & Hardware',
  };

  const incomingModified: DomainArticle = {
    ...baseArticle,
    title: 'GPT-5 Architecture Unveiled (Updated)',
    contentHash: 'hash_v2', // Changed hash!
    publishedAt: '2026-10-30T10:30:00Z', // Newer timestamp
  };

  const diff1 = engine.computeDiff(existingMap, [incomingNew, incomingModified]);

  assert.equal(diff1.added.length, 1);
  assert.equal(diff1.added[0].id, 'art_2');

  assert.equal(diff1.modified.length, 1);
  assert.equal(diff1.modified[0].id, 'art_1');
  assert.equal(diff1.modified[0].title, 'GPT-5 Architecture Unveiled (Updated)');

  // Now test OUT-OF-ORDER PROTECTION:
  // Incoming snapshot has an OLDER timestamp than existing record
  const staleIncoming: DomainArticle = {
    ...baseArticle,
    title: 'GPT-5 Old Draft',
    contentHash: 'hash_v0',
    publishedAt: '2026-10-29T00:00:00Z', // Older than 2026-10-30T10:00:00Z!
  };

  const diff2 = engine.computeDiff(existingMap, [staleIncoming]);
  assert.equal(diff2.added.length, 0);
  assert.equal(diff2.modified.length, 0);
  assert.equal(diff2.unchangedCount, 1, 'Stale snapshot must be safely skipped');
});

