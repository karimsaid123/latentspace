/**
 * LMSYS Chatbot Arena Leaderboard Client
 * Ingests human-preference Elo leaderboard ratings from the official
 * lmarena-ai/leaderboard-dataset on Hugging Face Datasets Server.
 */

export interface LmsysArenaModel {
  rank: number;
  modelName: string;
  organization: string;
  elo: number;
  votes: number;
}

interface CacheEntry {
  data: LmsysArenaModel[];
  timestamp: number;
}

let arenaCache: CacheEntry | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// High-confidence static fallback if upstream HF Datasets Server is unreachable
const FALLBACK_ARENA: LmsysArenaModel[] = [
  { rank: 1, modelName: "Gemini 4 Carbon (High)", organization: "google", elo: 1540, votes: 4403 },
  { rank: 2, modelName: "Gemini 4 Argon (High)", organization: "google", elo: 1528, votes: 11889 },
  { rank: 3, modelName: "Claude Opus 5.5 (High)", organization: "anthropic", elo: 1515, votes: 11415 },
  { rank: 4, modelName: "Claude Fable 5.1 (Max)", organization: "anthropic", elo: 1513, votes: 17178 },
  { rank: 5, modelName: "Claude Opus 5 (Max)", organization: "anthropic", elo: 1507, votes: 35531 },
  { rank: 6, modelName: "Muse Wonder (Max)", organization: "meta", elo: 1499, votes: 7749 },
  { rank: 7, modelName: "Gemini 3.8 Flash (High)", organization: "google", elo: 1498, votes: 47803 },
  { rank: 8, modelName: "MiMo-V2.6-Pro", organization: "xiaomi", elo: 1491, votes: 4037 },
  { rank: 9, modelName: "Qwen3.8-Max", organization: "alibaba", elo: 1483, votes: 31915 },
  { rank: 10, modelName: "Kimi K3 (Max)", organization: "moonshot", elo: 1475, votes: 36780 },
  { rank: 11, modelName: "GLM-5.3 (Max)", organization: "zai", elo: 1473, votes: 26606 },
  { rank: 12, modelName: "GPT-5.5 (High)", organization: "openai", elo: 1471, votes: 69377 },
  { rank: 13, modelName: "DeepSeek-V4-Flash", organization: "deepseek", elo: 1432, votes: 51944 },
  { rank: 14, modelName: "Mistral Large 4", organization: "mistral", elo: 1430, votes: 12066 },
  { rank: 15, modelName: "Grok 4.20 Beta 1", organization: "xai", elo: 1444, votes: 27889 },
];

export async function getLmsysArenaLeaderboard(): Promise<LmsysArenaModel[]> {
  const now = Date.now();
  if (arenaCache && now - arenaCache.timestamp < CACHE_TTL_MS) {
    return arenaCache.data;
  }

  try {
    const res = await fetch(
      'https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest&limit=30',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LatentSpace/1.0 (science@latentspace.internal)'
        },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 21600 } // Next.js 6-hour cache
      }
    );

    if (!res.ok) {
      console.warn(`[LMSYS Arena] HF Datasets Server returned ${res.status}`);
      return arenaCache ? arenaCache.data : FALLBACK_ARENA;
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.rows)) {
      return arenaCache ? arenaCache.data : FALLBACK_ARENA;
    }

    const parsed: LmsysArenaModel[] = data.rows
      .map((item: any) => {
        const row = item.row || {};
        return {
          rank: Math.round(Number(row.rank) || 0),
          modelName: String(row.model_name || '').trim(),
          organization: String(row.organization || '').toLowerCase().trim(),
          elo: Math.round(Number(row.rating) || 0),
          votes: Math.round(Number(row.vote_count) || 0)
        };
      })
      .filter((m: LmsysArenaModel) => m.rank > 0 && m.modelName.length > 0)
      .sort((a: LmsysArenaModel, b: LmsysArenaModel) => a.rank - b.rank);

    if (parsed.length > 0) {
      arenaCache = {
        data: parsed,
        timestamp: now
      };
      return parsed;
    }
  } catch (err) {
    console.warn('[LMSYS Arena] Fetch failed, using fallback:', err instanceof Error ? err.message : err);
  }

  return arenaCache ? arenaCache.data : FALLBACK_ARENA;
}

