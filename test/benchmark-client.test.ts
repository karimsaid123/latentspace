import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  VERIFIED_BENCHMARK_SNAPSHOT,
  VERIFIED_SNAPSHOT_UPDATED_AT,
  assignBenchmarkRanks,
  fetchArtificialAnalysisBenchmarks,
  getTopBenchmarkForLab,
  normalizeLiveBenchmarkModels,
  resetBenchmarkCache,
} from '../src/lib/benchmark-client';

describe('Artificial Analysis Benchmark Client', () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
  const originalAltKey = process.env.AA_API_KEY;

  beforeEach(() => {
    resetBenchmarkCache();
    delete process.env.ARTIFICIAL_ANALYSIS_API_KEY;
    delete process.env.AA_API_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey !== undefined) {
      process.env.ARTIFICIAL_ANALYSIS_API_KEY = originalApiKey;
    } else {
      delete process.env.ARTIFICIAL_ANALYSIS_API_KEY;
    }
    if (originalAltKey !== undefined) {
      process.env.AA_API_KEY = originalAltKey;
    } else {
      delete process.env.AA_API_KEY;
    }
    resetBenchmarkCache();
  });

  it('maintains sorted, self-consistent ranks across VERIFIED_BENCHMARK_SNAPSHOT', () => {
    assert.ok(VERIFIED_BENCHMARK_SNAPSHOT.length >= 15);
    assert.equal(VERIFIED_BENCHMARK_SNAPSHOT[0].id, 'claude-fable-5-2');
    assert.equal(VERIFIED_BENCHMARK_SNAPSHOT[0].metrics.rank, 1);

    const n = VERIFIED_BENCHMARK_SNAPSHOT.length;
    const ranks = new Set(VERIFIED_BENCHMARK_SNAPSHOT.map((m) => m.metrics.rank));
    const speedRanks = new Set(VERIFIED_BENCHMARK_SNAPSHOT.map((m) => m.metrics.speedRank));
    const costRanks = new Set(VERIFIED_BENCHMARK_SNAPSHOT.map((m) => m.metrics.costRank));

    assert.equal(ranks.size, n);
    assert.equal(speedRanks.size, n);
    assert.equal(costRanks.size, n);

    for (let i = 1; i < n; i++) {
      assert.ok(
        VERIFIED_BENCHMARK_SNAPSHOT[i - 1].evaluations.intelligenceIndex >=
          VERIFIED_BENCHMARK_SNAPSHOT[i].evaluations.intelligenceIndex,
        'Snapshot must be sorted by intelligenceIndex descending'
      );
      assert.equal(VERIFIED_BENCHMARK_SNAPSHOT[i].metrics.rank, i + 1);
    }

    const fastest = VERIFIED_BENCHMARK_SNAPSHOT.find((m) => m.metrics.speedRank === 1);
    assert.equal(fastest?.id, 'muse-ember');
  });

  it('drops live API entries missing intelligenceIndex and computes true sorted ranks', () => {
    const normalized = normalizeLiveBenchmarkModels([
      {
        id: 'missing-iq',
        name: 'Unscored Model',
        slug: 'missing-iq',
        model_creator: { id: 'acme', name: 'Acme' },
        performance: { median_output_tokens_per_second: 200 },
        pricing: { price_1m_blended_tokens: 1.0 },
      },
      {
        id: 'fast-cheap',
        name: 'Fast Cheap',
        slug: 'fast-cheap',
        is_open_weights: true,
        model_creator: { id: 'deepseek', name: 'DeepSeek' },
        evaluations: { artificial_analysis_intelligence_index: 41.2 },
        performance: { median_output_tokens_per_second: 180 },
        pricing: { price_1m_blended_tokens: 0.5 },
      },
      {
        id: 'smart-slow',
        name: 'Smart Slow',
        slug: 'smart-slow',
        model_creator: { id: 'openai', name: 'OpenAI' },
        evaluations: { artificial_analysis_intelligence_index: 63.4 },
        performance: { median_output_tokens_per_second: 50 },
        pricing: { price_1m_blended_tokens: 12.0 },
      },
    ]);

    assert.equal(normalized.length, 2);
    assert.equal(normalized[0].id, 'smart-slow');
    assert.equal(normalized[0].metrics.rank, 1);
    assert.equal(normalized[0].metrics.speedRank, 2);
    assert.equal(normalized[0].metrics.costRank, 2);
    assert.equal(normalized[0].category, 'Frontier');

    assert.equal(normalized[1].id, 'fast-cheap');
    assert.equal(normalized[1].metrics.rank, 2);
    assert.equal(normalized[1].metrics.speedRank, 1);
    assert.equal(normalized[1].metrics.costRank, 1);
    assert.equal(normalized[1].category, 'Open Weights');
  });

  it('returns fixed snapshot timestamp on fallback and uses live cache in getTopBenchmarkForLab', async () => {
    const snap = await fetchArtificialAnalysisBenchmarks();
    assert.equal(snap.source, 'verified_telemetry_snapshot');
    assert.equal(snap.lastUpdated, VERIFIED_SNAPSHOT_UPDATED_AT);
    assert.equal(getTopBenchmarkForLab('OpenAI')?.id, 'gpt-6-2-astra');

    // Now simulate a live API fetch overriding the cache
    resetBenchmarkCache();
    process.env.ARTIFICIAL_ANALYSIS_API_KEY = 'test-key';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'gpt-7-preview',
              name: 'GPT-7 Preview',
              slug: 'gpt-7-preview',
              model_creator: { id: 'openai', name: 'OpenAI' },
              evaluations: { artificial_analysis_intelligence_index: 70 },
              performance: { median_output_tokens_per_second: 95 },
              pricing: { price_1m_blended_tokens: 15.0 },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const live = await fetchArtificialAnalysisBenchmarks();
    assert.equal(live.source, 'live_api');
    assert.equal(live.models.length, 1);
    assert.equal(getTopBenchmarkForLab('OpenAI')?.id, 'gpt-7-preview');
  });

  it('assignBenchmarkRanks handles missing prices by sorting them last', () => {
    const ranked = assignBenchmarkRanks([
      {
        id: 'no-price',
        name: 'No Price',
        slug: 'no-price',
        creator: { id: 'meta', name: 'Meta AI', lab: 'Meta AI' },
        evaluations: { intelligenceIndex: 50, speedTokensPerSecond: 100 },
        category: 'Frontier',
      },
      {
        id: 'has-price',
        name: 'Has Price',
        slug: 'has-price',
        creator: { id: 'openai', name: 'OpenAI', lab: 'OpenAI' },
        evaluations: { intelligenceIndex: 45, speedTokensPerSecond: 80, blendedPricePer1M: 5.0 },
        category: 'Frontier',
      },
    ]);

    assert.equal(ranked[0].id, 'no-price');
    assert.equal(ranked[0].metrics.costRank, 2);
    assert.equal(ranked[1].id, 'has-price');
    assert.equal(ranked[1].metrics.costRank, 1);
  });
});
