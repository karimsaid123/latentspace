import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllCodexEntries,
  searchCodex,
  getCodexEntryById
} from '../src/lib/codex-engine';
import codexData from '../data/codex.json';

describe('Codex Compendium & Search Engine Suite', () => {
  it('validates all codex entries have complete and consistent schema', () => {
    assert.ok(Array.isArray(codexData));
    assert.equal(codexData.length, 25);

    const ids = new Set<string>();
    const validCategories = new Set([
      'FOUNDATIONS',
      'ARCHITECTURES',
      'TRAINING_ALIGNMENT',
      'INFERENCE_SYSTEMS',
      'FRONTIER_REASONING'
    ]);
    const validLevels = new Set(['BEGINNER', 'INTERMEDIATE', 'FRONTIER']);

    for (const entry of codexData) {
      assert.ok(entry.id && typeof entry.id === 'string', `Entry missing id`);
      assert.ok(!ids.has(entry.id), `Duplicate entry ID: ${entry.id}`);
      ids.add(entry.id);

      assert.ok(entry.title && entry.title.length > 3, `${entry.id} invalid title`);
      assert.ok(validCategories.has(entry.category), `${entry.id} invalid category`);
      assert.ok(validLevels.has(entry.level), `${entry.id} invalid level`);
      assert.ok(entry.summary && entry.summary.length > 20, `${entry.id} missing summary`);
      assert.ok(entry.technicalDeepDive && entry.technicalDeepDive.length > 50, `${entry.id} missing deep dive`);
      assert.ok(Array.isArray(entry.keyTakeaways) && entry.keyTakeaways.length >= 2);
      assert.ok(Array.isArray(entry.tradeoffs.advantages) && entry.tradeoffs.advantages.length >= 1);
      assert.ok(Array.isArray(entry.tradeoffs.limitations) && entry.tradeoffs.limitations.length >= 1);

      if (entry.canonicalPaper) {
        assert.ok(entry.canonicalPaper.title && entry.canonicalPaper.title.length > 0);
        assert.ok(entry.canonicalPaper.year >= 1980 && entry.canonicalPaper.year <= 2026);
      }
    }

    // Verify all relatedIds point to real existing entries
    for (const entry of codexData) {
      for (const relId of entry.relatedIds) {
        assert.ok(
          ids.has(relId),
          `Entry ${entry.id} references non-existent relatedId '${relId}'`
        );
      }
    }
  });

  it('ranks exact acronym searches as top results', () => {
    const acronyms = [
      { q: 'moe', expectedId: 'moe' },
      { q: 'dpo', expectedId: 'dpo' },
      { q: 'rlhf', expectedId: 'rlhf' },
      { q: 'grpo', expectedId: 'grpo' },
      { q: 'lora', expectedId: 'lora-peft' },
      { q: 'tot', expectedId: 'tree-of-thought' },
      { q: 'cot', expectedId: 'chain-of-thought' },
      { q: 'vlm', expectedId: 'vision-language-models' }
    ];

    for (const { q, expectedId } of acronyms) {
      const results = searchCodex({ query: q });
      assert.ok(results.length > 0, `Query '${q}' returned no results`);
      assert.equal(
        results[0].id,
        expectedId,
        `Expected query '${q}' to rank ${expectedId} first, got ${results[0].id}`
      );
    }
  });

  it('filters accurately by category and complexity level', () => {
    const foundations = searchCodex({ category: 'FOUNDATIONS' });
    assert.ok(foundations.length >= 4);
    assert.ok(foundations.every(e => e.category === 'FOUNDATIONS'));

    const inference = searchCodex({ category: 'INFERENCE_SYSTEMS' });
    assert.ok(inference.length >= 4);
    assert.ok(inference.every(e => e.category === 'INFERENCE_SYSTEMS'));

    const frontierLevels = searchCodex({ level: 'FRONTIER' });
    assert.ok(frontierLevels.length >= 4);
    assert.ok(frontierLevels.every(e => e.level === 'FRONTIER'));

    const combined = searchCodex({
      category: 'INFERENCE_SYSTEMS',
      level: 'FRONTIER'
    });
    assert.ok(combined.length >= 1);
    assert.ok(combined.every(e => e.category === 'INFERENCE_SYSTEMS' && e.level === 'FRONTIER'));
  });

  it('retrieves entries by slug or id and enriches with live article mentions', () => {
    const mockArticles = [
      {
        id: 'art-1',
        title: 'DeepSeek releases FlashAttention optimizations for MoE models',
        contentSnippet: 'Exploration of KV-cache compression and Mixture of Experts routing.',
        sourceName: 'arXiv',
        publishedAt: '2026-11-04T12:00:00Z',
        canonicalUrl: 'https://example.com/1'
      },
      {
        id: 'art-2',
        title: 'OpenAI o1 scaling laws in test-time compute',
        contentSnippet: 'Tree search and step-by-step reasoning verification.',
        sourceName: 'Latent Space',
        publishedAt: '2026-11-04T13:00:00Z',
        canonicalUrl: 'https://example.com/2'
      }
    ];

    const moe = getCodexEntryById('moe', mockArticles);
    assert.ok(moe);
    assert.equal(moe.id, 'moe');
    assert.ok(moe.mentionsCount >= 1);
    assert.equal(moe.recentMentions[0].id, 'art-1');

    const flashAttn = getCodexEntryById('flash-attention', mockArticles);
    assert.ok(flashAttn);
    assert.ok(flashAttn.mentionsCount >= 1);
  });
});
