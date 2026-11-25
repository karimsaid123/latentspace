import { BenchmarkResponse, ModelBenchmark } from '@/types/benchmark';
import { FrontierLab } from '@/core/domain/entities';
import { safeJsonParse } from '@/lib/request-security';
import { logger } from '@/lib/logger';

export const VERIFIED_SNAPSHOT_UPDATED_AT = '2026-11-25T00:00:00.000Z';

type UnrankedModelBenchmark = Omit<ModelBenchmark, 'metrics'>;

/**
 * Computes accurate 1-based rank (intelligence desc), speedRank (speed desc),
 * and costRank (blendedPricePer1M asc) and returns models ordered by rank.
 * Relies on JS stable sort so explicit input order breaks exact integer ties.
 */
export function assignBenchmarkRanks(models: readonly UnrankedModelBenchmark[]): ModelBenchmark[] {
  if (models.length === 0) return [];

  const byIntelligence = [...models].sort(
    (a, b) => b.evaluations.intelligenceIndex - a.evaluations.intelligenceIndex
  );
  const rankMap = new Map<string, number>();
  byIntelligence.forEach((m, i) => rankMap.set(m.id, i + 1));

  const bySpeed = [...models].sort(
    (a, b) => b.evaluations.speedTokensPerSecond - a.evaluations.speedTokensPerSecond
  );
  const speedRankMap = new Map<string, number>();
  bySpeed.forEach((m, i) => speedRankMap.set(m.id, i + 1));

  const byCost = [...models].sort((a, b) => {
    const aCost =
      typeof a.evaluations.blendedPricePer1M === 'number' &&
      Number.isFinite(a.evaluations.blendedPricePer1M)
        ? a.evaluations.blendedPricePer1M
        : Number.POSITIVE_INFINITY;
    const bCost =
      typeof b.evaluations.blendedPricePer1M === 'number' &&
      Number.isFinite(b.evaluations.blendedPricePer1M)
        ? b.evaluations.blendedPricePer1M
        : Number.POSITIVE_INFINITY;
    return aCost - bCost;
  });
  const costRankMap = new Map<string, number>();
  byCost.forEach((m, i) => costRankMap.set(m.id, i + 1));

  return byIntelligence.map((m) => ({
    ...m,
    metrics: {
      rank: rankMap.get(m.id) ?? models.length,
      speedRank: speedRankMap.get(m.id) ?? models.length,
      costRank: costRankMap.get(m.id) ?? models.length,
    },
  }));
}

// Verified telemetry snapshot from Artificial Analysis Intelligence Index v5
// Source: https://artificialanalysis.ai/models & https://artificialanalysis.ai/leaderboards/models (verified 2026-11-25)
const RAW_VERIFIED_BENCHMARK_SNAPSHOT: UnrankedModelBenchmark[] = [
  {
    id: 'claude-fable-5-2',
    name: 'Claude Fable 5.2 (max)',
    slug: 'claude-fable-5-2',
    creator: {
      id: 'anthropic',
      name: 'Anthropic',
      lab: 'Anthropic',
    },
    evaluations: {
      intelligenceIndex: 65,
      speedTokensPerSecond: 113,
      blendedPricePer1M: 16.0,
      costPerTask: 26.54,
    },
    category: 'Frontier',
    releaseDate: '2026-11',
  },
  {
    id: 'gpt-6-2-astra',
    name: 'GPT-6.2 Astra (max)',
    slug: 'gpt-6-2-astra',
    creator: {
      id: 'openai',
      name: 'OpenAI',
      lab: 'OpenAI',
    },
    evaluations: {
      intelligenceIndex: 62,
      speedTokensPerSecond: 48,
      blendedPricePer1M: 16.0,
      costPerTask: 4.0,
    },
    category: 'Frontier',
    releaseDate: '2026-11',
  },
  {
    id: 'gemini-4-neon',
    name: 'Gemini 4 Neon (xhigh)',
    slug: 'gemini-4-neon',
    creator: {
      id: 'google',
      name: 'Google DeepMind',
      lab: 'Google DeepMind',
    },
    evaluations: {
      intelligenceIndex: 62,
      speedTokensPerSecond: 92,
      blendedPricePer1M: 6.0,
      costPerTask: 6.44,
    },
    category: 'Frontier',
    releaseDate: '2026-11',
  },
  {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon (high)',
    slug: 'gemini-4-carbon',
    creator: {
      id: 'google',
      name: 'Google DeepMind',
      lab: 'Google DeepMind',
    },
    evaluations: {
      intelligenceIndex: 60,
      speedTokensPerSecond: 54,
      blendedPricePer1M: 8.0,
      costPerTask: 7.76,
    },
    category: 'Frontier',
    releaseDate: '2026-10',
  },
  {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5 (max)',
    slug: 'claude-opus-5-5',
    creator: {
      id: 'anthropic',
      name: 'Anthropic',
      lab: 'Anthropic',
    },
    evaluations: {
      intelligenceIndex: 59,
      speedTokensPerSecond: 117,
      blendedPricePer1M: 8.0,
      costPerTask: 10.04,
    },
    category: 'Frontier',
    releaseDate: '2026-09',
  },
  {
    id: 'gpt-6-2-sol',
    name: 'GPT-6.2 Sol (max)',
    slug: 'gpt-6-2-sol',
    creator: {
      id: 'openai',
      name: 'OpenAI',
      lab: 'OpenAI',
    },
    evaluations: {
      intelligenceIndex: 57,
      speedTokensPerSecond: 67,
      blendedPricePer1M: 4.0,
      costPerTask: 1.01,
    },
    category: 'Frontier',
    releaseDate: '2026-11',
  },
  {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5 (max)',
    slug: 'claude-sonnet-5-5',
    creator: {
      id: 'anthropic',
      name: 'Anthropic',
      lab: 'Anthropic',
    },
    evaluations: {
      intelligenceIndex: 55,
      speedTokensPerSecond: 155,
      blendedPricePer1M: 4.0,
      costPerTask: 10.02,
    },
    category: 'Frontier',
    releaseDate: '2026-09',
  },
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (xhigh)',
    slug: 'gemini-4-hydrogen',
    creator: {
      id: 'google',
      name: 'Google DeepMind',
      lab: 'Google DeepMind',
    },
    evaluations: {
      intelligenceIndex: 54,
      speedTokensPerSecond: 162,
      blendedPricePer1M: 3.0,
      costPerTask: 3.16,
    },
    category: 'Frontier',
    releaseDate: '2026-11',
  },
  {
    id: 'gpt-6-1-terra',
    name: 'GPT-6.1 Terra (max)',
    slug: 'gpt-6-1-terra',
    creator: {
      id: 'openai',
      name: 'OpenAI',
      lab: 'OpenAI',
    },
    evaluations: {
      intelligenceIndex: 51,
      speedTokensPerSecond: 71,
      blendedPricePer1M: 2.0,
      costPerTask: 0.96,
    },
    category: 'Frontier',
    releaseDate: '2026-10',
  },
  {
    id: 'kimi-k3-1-pro',
    name: 'Kimi K3.1 Pro',
    slug: 'kimi-k3-1-pro',
    creator: {
      id: 'moonshot',
      name: 'Moonshot AI',
      lab: 'Moonshot AI',
    },
    evaluations: {
      intelligenceIndex: 47,
      speedTokensPerSecond: 35,
      blendedPricePer1M: 4.0,
      costPerTask: 3.68,
    },
    category: 'Open Weights',
    releaseDate: '2026-10',
  },
  {
    id: 'muse-wonder',
    name: 'Muse Wonder (max)',
    slug: 'muse-wonder',
    creator: {
      id: 'meta',
      name: 'Meta AI',
      lab: 'Meta AI',
    },
    evaluations: {
      intelligenceIndex: 44,
      speedTokensPerSecond: 100,
      blendedPricePer1M: 8.0,
      costPerTask: 6.95,
    },
    category: 'Frontier',
    releaseDate: '2026-10',
  },
  {
    id: 'qwen4-max',
    name: 'Qwen4 Max',
    slug: 'qwen4-max',
    creator: {
      id: 'alibaba',
      name: 'Alibaba',
      lab: 'Independent',
    },
    evaluations: {
      intelligenceIndex: 43,
      speedTokensPerSecond: 93,
      blendedPricePer1M: 2.25,
      costPerTask: 3.27,
    },
    category: 'Frontier',
    releaseDate: '2026-11',
  },
  {
    id: 'claude-haiku-5-5',
    name: 'Claude Haiku 5.5 (max)',
    slug: 'claude-haiku-5-5',
    creator: {
      id: 'anthropic',
      name: 'Anthropic',
      lab: 'Anthropic',
    },
    evaluations: {
      intelligenceIndex: 37,
      speedTokensPerSecond: 259,
      blendedPricePer1M: 0.2,
      costPerTask: 0.41,
    },
    category: 'Specialized',
    releaseDate: '2026-10',
  },
  {
    id: 'muse-ember',
    name: 'Muse Ember (max)',
    slug: 'muse-ember',
    creator: {
      id: 'meta',
      name: 'Meta AI',
      lab: 'Meta AI',
    },
    evaluations: {
      intelligenceIndex: 36,
      speedTokensPerSecond: 413,
      blendedPricePer1M: 0.2,
      costPerTask: 0.14,
    },
    category: 'Specialized',
    releaseDate: '2026-11',
  },
  {
    id: 'grok-4-7',
    name: 'Grok 4.7 (xhigh)',
    slug: 'grok-4-7',
    creator: {
      id: 'xai',
      name: 'SpaceX & xAI',
      lab: 'SpaceX & xAI',
    },
    evaluations: {
      intelligenceIndex: 35,
      speedTokensPerSecond: 77,
      blendedPricePer1M: 3.0,
      costPerTask: 7.77,
    },
    category: 'Frontier',
    releaseDate: '2026-09',
  },
  {
    id: 'tencent-hy4',
    name: 'Tencent Hy4',
    slug: 'tencent-hy4',
    creator: {
      id: 'tencent',
      name: 'Tencent',
      lab: 'Independent',
    },
    evaluations: {
      intelligenceIndex: 35,
      speedTokensPerSecond: 97,
      blendedPricePer1M: 1.25,
      costPerTask: 1.03,
    },
    category: 'Open Weights',
    releaseDate: '2026-11',
  },
  {
    id: 'deepseek-v4-1-flash',
    name: 'DeepSeek V4.1 Flash (max)',
    slug: 'deepseek-v4-1-flash',
    creator: {
      id: 'deepseek',
      name: 'DeepSeek',
      lab: 'DeepSeek',
    },
    evaluations: {
      intelligenceIndex: 32,
      speedTokensPerSecond: 170,
      blendedPricePer1M: 0.52,
      costPerTask: 0.6,
    },
    category: 'Open Weights',
    releaseDate: '2026-10',
  },
  {
    id: 'glm-5-3',
    name: 'GLM-5.3 (max)',
    slug: 'glm-5-3',
    creator: {
      id: 'zhipu',
      name: 'Zhipu AI',
      lab: 'Independent',
    },
    evaluations: {
      intelligenceIndex: 32,
      speedTokensPerSecond: 71,
      blendedPricePer1M: 2.15,
      costPerTask: 5.01,
    },
    category: 'Open Weights',
    releaseDate: '2026-08',
  },
  {
    id: 'mimo-v2-6-pro',
    name: 'MiMo-V2.6-Pro',
    slug: 'mimo-v2-6-pro',
    creator: {
      id: 'xiaomi',
      name: 'Xiaomi',
      lab: 'Independent',
    },
    evaluations: {
      intelligenceIndex: 30,
      speedTokensPerSecond: 41,
      blendedPricePer1M: 0.54,
      costPerTask: 0.26,
    },
    category: 'Open Weights',
    releaseDate: '2026-09',
  },
  {
    id: 'mistral-large-4',
    name: 'Mistral Large 4 (high)',
    slug: 'mistral-large-4',
    creator: {
      id: 'mistral',
      name: 'Mistral AI',
      lab: 'Mistral AI',
    },
    evaluations: {
      intelligenceIndex: 26,
      speedTokensPerSecond: 86,
      blendedPricePer1M: 1.05,
      costPerTask: 2.06,
    },
    category: 'Open Weights',
    releaseDate: '2026-10',
  },
  {
    id: 'nemotron-3-5-super-vl',
    name: 'Nemotron 3.5 Super VL',
    slug: 'nemotron-3-5-super-vl',
    creator: {
      id: 'nvidia',
      name: 'NVIDIA',
      lab: 'NVIDIA',
    },
    evaluations: {
      intelligenceIndex: 14,
      speedTokensPerSecond: 340,
      blendedPricePer1M: 0.24,
      costPerTask: 0.48,
    },
    category: 'Open Weights',
    releaseDate: '2026-10',
  },
];

export const VERIFIED_BENCHMARK_SNAPSHOT: ModelBenchmark[] = assignBenchmarkRanks(
  RAW_VERIFIED_BENCHMARK_SNAPSHOT
);

let cachedBenchmarks: BenchmarkResponse | null = null;
let cacheExpiresAt = 0;

export const LIVE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for live API responses
export const FALLBACK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute TTL after an upstream failure

export function resetBenchmarkCache(): void {
  cachedBenchmarks = null;
  cacheExpiresAt = 0;
}

function parseOptionalMetric(raw: unknown, min: number, max: number): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num)) return undefined;
  return Math.min(max, Math.max(min, num));
}

function inferModelCategory(item: any, intelligenceIndex: number): ModelBenchmark['category'] {
  if (
    item?.is_open_weights === true ||
    item?.isOpenWeights === true ||
    item?.open_weights === true
  ) {
    return 'Open Weights';
  }
  if (intelligenceIndex >= 40) {
    return 'Frontier';
  }
  return 'Specialized';
}

/**
 * Normalizes raw Artificial Analysis API entries: drops entries without a valid
 * intelligence index (no fabricated defaults), parses optional speed/pricing honestly,
 * infers category, and computes real sorted rank/speedRank/costRank.
 */
export function normalizeLiveBenchmarkModels(rawData: readonly any[]): ModelBenchmark[] {
  const unranked: UnrankedModelBenchmark[] = [];

  for (let idx = 0; idx < Math.min(rawData.length, 100); idx++) {
    const item = rawData[idx];
    if (!item || typeof item !== 'object') continue;

    const rawIq = parseOptionalMetric(
      item?.evaluations?.artificial_analysis_intelligence_index ??
        item?.evaluations?.intelligence_index ??
        item?.intelligence_index ??
        item?.intelligenceIndex ??
        item?.score,
      0,
      100
    );
    if (rawIq === undefined) continue;

    const intelligenceIndex = Math.round(rawIq);
    const rawCreator =
      item?.model_creator?.name || item?.creator?.name || item?.creator || 'Frontier Lab';
    const creatorName = String(rawCreator).slice(0, 80);
    const creatorLab = mapCreatorToLab(creatorName);

    const rawSpeed = parseOptionalMetric(
      item?.performance?.median_output_tokens_per_second ??
        item?.performance?.output_tokens_per_second ??
        item?.median_output_tokens_per_second ??
        item?.speed,
      0,
      10_000
    );
    const speed = rawSpeed !== undefined ? Math.round(rawSpeed) : 0;

    const rawPrice = parseOptionalMetric(
      item?.pricing?.price_1m_blended_tokens ??
        item?.pricing?.price_1m_blended_3_to_1 ??
        item?.pricing?.price_1m_output_tokens ??
        item?.price,
      0,
      10_000
    );
    const price = rawPrice !== undefined ? Number(rawPrice.toFixed(2)) : undefined;

    const rawCostPerTask = parseOptionalMetric(
      item?.pricing?.cost_per_task ?? item?.evaluations?.cost_per_task,
      0,
      10_000
    );
    const costPerTask =
      rawCostPerTask !== undefined ? Number(rawCostPerTask.toFixed(2)) : price;

    const safeId = String(item?.id || item?.slug || `model-${idx}`).slice(0, 80);
    const safeName = String(item?.name || item?.slug || safeId).slice(0, 120);
    const safeSlug = String(item?.slug || safeId).slice(0, 80);
    const releaseDateRaw = item?.release_date ?? item?.releaseDate;
    const releaseDate =
      typeof releaseDateRaw === 'string' && releaseDateRaw.trim()
        ? releaseDateRaw.trim().slice(0, 10)
        : undefined;

    unranked.push({
      id: safeId,
      name: safeName,
      slug: safeSlug,
      creator: {
        id: String(item?.model_creator?.id || item?.creator?.slug || 'creator').slice(0, 64),
        name: creatorName,
        lab: creatorLab,
      },
      evaluations: {
        intelligenceIndex,
        speedTokensPerSecond: speed,
        ...(price !== undefined ? { blendedPricePer1M: price } : {}),
        ...(costPerTask !== undefined ? { costPerTask } : {}),
      },
      category: inferModelCategory(item, intelligenceIndex),
      ...(releaseDate ? { releaseDate } : {}),
    });
  }

  return assignBenchmarkRanks(unranked);
}

export async function fetchArtificialAnalysisBenchmarks(): Promise<BenchmarkResponse> {
  const now = Date.now();
  if (cachedBenchmarks && now < cacheExpiresAt) {
    return cachedBenchmarks;
  }

  const apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY || process.env.AA_API_KEY;

  if (apiKey) {
    try {
      const endpoints = [
        'https://artificialanalysis.ai/api/v2/data/llms/models',
        'https://artificialanalysis.ai/api/v2/language/models',
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            headers: {
              'x-api-key': apiKey,
              'User-Agent': 'LatentSpace/2.0 (Frontier Intelligence Terminal)',
              Accept: 'application/json',
            },
            redirect: 'error',
            signal: AbortSignal.timeout(6000),
          });

          if (res.ok) {
            const rawText = await res.text();
            if (rawText.length > 1_048_576) {
              continue;
            }
            const json = safeJsonParse<Record<string, any>>(rawText);
            const rawData = json?.data || json?.models || json;

            if (Array.isArray(rawData) && rawData.length > 0) {
              const mapped = normalizeLiveBenchmarkModels(rawData);
              if (mapped.length > 0) {
                cachedBenchmarks = {
                  source: 'live_api',
                  attribution: {
                    provider: 'Artificial Analysis',
                    url: 'https://artificialanalysis.ai',
                    notice:
                      'Independent analysis of AI models and benchmarks via Artificial Analysis API',
                  },
                  models: mapped,
                  lastUpdated: new Date().toISOString(),
                };
                cacheExpiresAt = now + LIVE_CACHE_TTL_MS;
                return cachedBenchmarks;
              }
            }
          }
        } catch (_) {
          // Continue to next endpoint or fallback
        }
      }
    } catch (err: any) {
      logger.warn('Artificial Analysis API query failed; falling back to snapshot', {
        error: err?.message,
      });
    }
  }

  // Return verified telemetry snapshot with honest fixed timestamp and short failure-retry TTL
  cachedBenchmarks = {
    source: 'verified_telemetry_snapshot',
    attribution: {
      provider: 'Artificial Analysis',
      url: 'https://artificialanalysis.ai',
      notice: 'Independent analysis of AI models and benchmarks via Artificial Analysis API',
    },
    models: VERIFIED_BENCHMARK_SNAPSHOT,
    lastUpdated: VERIFIED_SNAPSHOT_UPDATED_AT,
  };
  cacheExpiresAt = now + (apiKey ? FALLBACK_CACHE_TTL_MS : LIVE_CACHE_TTL_MS);
  return cachedBenchmarks;
}

function mapCreatorToLab(name: string): FrontierLab {
  const n = name.toLowerCase();
  if (n.includes('google') || n.includes('deepmind')) return 'Google DeepMind';
  if (n.includes('anthropic')) return 'Anthropic';
  if (n.includes('openai')) return 'OpenAI';
  if (n.includes('deepseek')) return 'DeepSeek';
  if (n.includes('xai') || n.includes('spacex') || n.includes('musk')) return 'SpaceX & xAI';
  if (n.includes('mistral')) return 'Mistral AI';
  if (n.includes('moonshot') || n.includes('kimi')) return 'Moonshot AI';
  if (n.includes('meta')) return 'Meta AI';
  if (n.includes('nvidia')) return 'NVIDIA';
  return 'Independent';
}

export function getTopBenchmarkForLab(lab: FrontierLab): ModelBenchmark | undefined {
  const activeModels =
    cachedBenchmarks && cachedBenchmarks.models.length > 0
      ? cachedBenchmarks.models
      : VERIFIED_BENCHMARK_SNAPSHOT;
  return activeModels.find((m) => m.creator.lab === lab);
}
