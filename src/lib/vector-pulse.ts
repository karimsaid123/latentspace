import type {
  VectorMomentumStatus,
  VectorPulseItem,
  VectorPulseSnapshot,
} from '@/types';

export interface ResearchVectorDefinition {
  id: string;
  label: string;
  pattern: RegExp;
}

/**
 * Curated AI Research & Frontier Telemetry Vectors.
 * Patterns use flat, non-backtracking word-boundary alternations (ReDoS-safe).
 */
export const RESEARCH_VECTORS: readonly ResearchVectorDefinition[] = [
  {
    id: 'test-time-reasoning',
    label: 'TEST-TIME COMPUTE & REASONING',
    pattern:
      /\b(test-time|chain-of-thought|cot|reasoning model|tree search|self-evolving|recursive knowledge|process reward|verifiable reward|rollout)\b/i,
  },
  {
    id: 'agentic-harness',
    label: 'AGENTIC HARNESS & TOOL USE',
    pattern:
      /\b(agentic|coding agent|agent harness|multi-agent|tool-use|tool calling|computer use|web agent|autonomous agent|agent benchmark)\b/i,
  },
  {
    id: 'post-training-rl',
    label: 'POST-TRAINING RL & ALIGNMENT',
    pattern:
      /\b(reinforcement learning|rlvr|rlhf|dpo|grpo|preference optim|preference learning|reward model|post-training|asynchronous rl|fine-tuning|fine-tune)\b/i,
  },
  {
    id: 'safety-evals-cyber',
    label: 'SAFETY, EVALS & CYBER DEFENSE',
    pattern:
      /\b(cybersecurity|cyber defense|jailbreak|red-team|red teaming|violet team|safety sufficiency|hallucination|surveillance|fairness|guardrail|vulnerability)\b/i,
  },
  {
    id: 'open-weights-inference',
    label: 'OPEN WEIGHTS & FAST INFERENCE',
    pattern:
      /\b(open-weight|open weights|open-source|releases weights|hugging face|speculative decoding|speculative drafter|quantization|quantized|kv-cache|trillion-parameter|mixture-of-experts|moe)\b/i,
  },
  {
    id: 'multimodal-embodied',
    label: 'MULTIMODAL & EMBODIED VLA',
    pattern:
      /\b(multimodal|vision-language|vlm|vla|embodied|humanoid|robotics|robotic|speech emotion|world model|world modeling|video generation|audio-visual)\b/i,
  },
  {
    id: 'rag-memory-context',
    label: 'RETRIEVAL, MEMORY & CONTEXT',
    pattern:
      /\b(retrieval|rag|long-context|context window|personalization|personalized|contextbench|episodic memory|knowledge graph|embedding|reranker)\b/i,
  },
  {
    id: 'compute-silicon',
    label: 'FRONTIER COMPUTE & SILICON',
    pattern:
      /\b(datacenter|data center|blackwell|gpu|tpu|superchip|semiconductor|compute cluster|cuda|wafer|inference cost|h100|h200|b200|gb200)\b/i,
  },
];

const VALID_VECTOR_IDS = new Set<string>(RESEARCH_VECTORS.map((v) => v.id));

export function isValidVectorId(id?: string | null): id is string {
  return typeof id === 'string' && VALID_VECTOR_IDS.has(id);
}

export function getVectorDefinition(id?: string | null): ResearchVectorDefinition | undefined {
  if (!id) return undefined;
  return RESEARCH_VECTORS.find((v) => v.id === id);
}

/**
 * Extracts all matching research vector IDs from normalized article text.
 */
export function detectVectorIds(text: string): Set<string> {
  const matched = new Set<string>();
  if (!text) return matched;

  for (const vector of RESEARCH_VECTORS) {
    if (vector.pattern.test(text)) {
      matched.add(vector.id);
    }
  }
  return matched;
}

/**
 * Checks whether a frontend `Article` matches a specific research vector.
 */
export function articleMatchesVector(
  article: { title: string; contentSnippet?: string; aiSummary?: { tldr?: string } },
  vectorId: string
): boolean {
  const def = getVectorDefinition(vectorId);
  if (!def) return false;
  const combined = `${article.title} ${article.contentSnippet || ''} ${article.aiSummary?.tldr || ''}`;
  return def.pattern.test(combined);
}

function classifyMomentumStatus(deltaPct: number): VectorMomentumStatus {
  if (deltaPct >= 75) return 'SURGING';
  if (deltaPct >= 25) return 'HIGH';
  if (deltaPct >= -12) return 'ACTIVE';
  if (deltaPct >= -35) return 'STABLE';
  return 'COOLING';
}

function computeBarBlocks(deltaPct: number, shareRatio: number): number {
  // Combine momentum velocity (-65%..+180%) and corpus share into a 2..20 block bar
  const clampedDelta = Math.max(-65, Math.min(180, deltaPct));
  const momentumComponent = ((clampedDelta + 65) / 245) * 14; // 0..14
  const shareComponent = Math.min(6, shareRatio * 45); // 0..6
  return Math.max(2, Math.min(20, Math.round(momentumComponent + shareComponent)));
}

export interface CorpusVectorEntry {
  publishedAtMs: number;
  vectorIds: ReadonlySet<string>;
}

/**
 * Computes normalized, Dirichlet-smoothed paradigm momentum across a sorted or unsorted corpus.
 * Adjusts automatically for weekday vs. weekend publication volume by comparing share-of-corpus
 * rather than unnormalized raw counts.
 */
export function computeVectorPulseFromEntries(entries: readonly CorpusVectorEntry[]): VectorPulseSnapshot {
  if (entries.length === 0) {
    return {
      vectors: [],
      corpusSize: 0,
      windowDays: 7,
      recentWindowHours: 48,
    };
  }

  const sorted =
    entries.length > 1 && entries[0].publishedAtMs < entries[entries.length - 1].publishedAtMs
      ? [...entries].sort((a, b) => b.publishedAtMs - a.publishedAtMs)
      : entries;

  const newestMs = sorted[0]?.publishedAtMs || Date.now();
  const oldestMs = sorted[sorted.length - 1]?.publishedAtMs || newestMs;
  const windowDays = Math.max(1, Math.round((newestMs - oldestMs) / 86_400_000));

  // Try a 48h recent frontier window; if weekend/burst volume makes either window too small,
  // split cleanly at the newest 35% vs preceding 65% of the corpus for stable statistical power.
  const cutoff48h = newestMs - 48 * 3_600_000;
  let splitIndex = sorted.findIndex((e) => e.publishedAtMs < cutoff48h);
  if (splitIndex < 60 || sorted.length - splitIndex < 80) {
    splitIndex = Math.max(1, Math.floor(sorted.length * 0.35));
  }

  const recentEntries = sorted.slice(0, splitIndex);
  const baselineEntries = sorted.slice(splitIndex);

  const boundaryMs = recentEntries[recentEntries.length - 1]?.publishedAtMs || cutoff48h;
  const recentWindowHours = Math.max(12, Math.round((newestMs - boundaryMs) / 3_600_000));

  const nRecent = Math.max(1, recentEntries.length);
  const nBase = Math.max(1, baselineEntries.length);

  // Dirichlet / Laplace smoothing prior prevents tiny counts (0 -> 1) from inflating to +999%
  const PRIOR_ALPHA = 1.5;
  const PRIOR_TOTAL = 15;

  const items: VectorPulseItem[] = RESEARCH_VECTORS.map((vec) => {
    let recentCount = 0;
    let baselineCount = 0;

    for (const entry of recentEntries) {
      if (entry.vectorIds.has(vec.id)) recentCount++;
    }
    for (const entry of baselineEntries) {
      if (entry.vectorIds.has(vec.id)) baselineCount++;
    }

    const totalCount = recentCount + baselineCount;
    const recentRate = (recentCount + PRIOR_ALPHA) / (nRecent + PRIOR_TOTAL);
    const baselineRate = (baselineCount + PRIOR_ALPHA) / (nBase + PRIOR_TOTAL);
    const deltaPct = Math.round((recentRate / baselineRate - 1) * 100);
    const shareRatio = totalCount / Math.max(1, sorted.length);

    return {
      id: vec.id,
      label: vec.label,
      recentCount,
      baselineCount,
      totalCount,
      deltaPct,
      barBlocks: computeBarBlocks(deltaPct, shareRatio),
      status: classifyMomentumStatus(deltaPct),
    };
  });

  items.sort((a, b) => {
    if (b.deltaPct !== a.deltaPct) return b.deltaPct - a.deltaPct;
    return b.totalCount - a.totalCount;
  });

  return {
    vectors: items,
    corpusSize: sorted.length,
    windowDays,
    recentWindowHours,
  };
}

/**
 * Helper to compute the initial SSR Vector Pulse directly from raw JSON storage records.
 */
export function computeVectorPulseFromRawRecords(
  records: ReadonlyArray<Record<string, unknown>>
): VectorPulseSnapshot {
  const entries: CorpusVectorEntry[] = [];
  for (const item of records) {
    if (!item || typeof item !== 'object') continue;
    const rawDate =
      typeof item.publishedAt === 'string'
        ? item.publishedAt
        : typeof item.pubDate === 'string'
          ? item.pubDate
          : '';
    const pubMs = Date.parse(rawDate);
    if (Number.isNaN(pubMs)) continue;

    const title = typeof item.title === 'string' ? item.title : '';
    const snippet = typeof item.contentSnippet === 'string' ? item.contentSnippet : '';
    const summaryObj = (item.summary ?? item.aiSummary) as { tldr?: unknown } | undefined;
    const tldr = typeof summaryObj?.tldr === 'string' ? summaryObj.tldr : '';

    entries.push({
      publishedAtMs: pubMs,
      vectorIds: detectVectorIds(`${title} ${snippet} ${tldr}`),
    });
  }
  entries.sort((a, b) => b.publishedAtMs - a.publishedAtMs);
  return computeVectorPulseFromEntries(entries);
}
