import { getServerSecret } from './runtime-env';
import { SingleFlight } from '@/core/services/single-flight';

/**
 * Research-paper credibility signals aggregated from free, trusted public APIs:
 * - Hugging Face Papers  → community upvotes, linked GitHub repo, linked models/datasets/spaces
 * - OpenAlex             → total citation count (open scholarly graph, no key required)
 * - Semantic Scholar     → influential citations + TLDR (only when SEMANTIC_SCHOLAR_API_KEY is set;
 *                          the anonymous pool is shared and returns 429 under load)
 */
export interface PaperSignals {
  arxivId: string;
  hfUpvotes: number | null;
  hfUrl: string | null;
  githubRepo: string | null;
  githubStars: number | null;
  linkedModels: number | null;
  linkedDatasets: number | null;
  linkedSpaces: number | null;
  citations: number | null;
  influentialCitations: number | null;
  s2Tldr: string | null;
  fetchedAt: string;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const FETCH_TIMEOUT_MS = 5_000;

const cache = new Map<string, { value: PaperSignals; expiresAt: number }>();
const flight = new SingleFlight();

export function normalizeArxivId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim();
  // Modern arXiv format: 2401.12345 or 2401.12345v2, including URLs and prefixes
  const modern = cleaned.match(/(?:arxiv[:\s\/]|\/abs\/|\/pdf\/|^)(\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?(?:$|[\/\?\#\s])/i);
  if (modern) return modern[1];
  // Legacy arXiv format: cs/0101001 or cs.AI/0101001
  const legacy = cleaned.match(/(?:arxiv[:\s\/]|\/abs\/|\/pdf\/|^)([a-zA-Z\-]+(?:\.[a-zA-Z\-]{2})?\/\d{7})(?:v\d+)?(?:\.pdf)?(?:$|[\/\?\#\s])/i);
  if (legacy) return legacy[1];
  return null;
}

function toCount(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

function safeGithubUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' && u.hostname === 'github.com' ? u.toString() : null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...headers },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function loadSignals(arxivId: string): Promise<PaperSignals> {
  const s2Key = getServerSecret('SEMANTIC_SCHOLAR_API_KEY');

  const [hf, openAlex, s2] = await Promise.all([
    fetchJson(`https://huggingface.co/api/papers/${arxivId}`),
    fetchJson(
      `https://api.openalex.org/works/doi:10.48550/arXiv.${arxivId}?select=cited_by_count`
    ),
    s2Key
      ? fetchJson(
          `https://api.semanticscholar.org/graph/v1/paper/arXiv:${arxivId}?fields=citationCount,influentialCitationCount,tldr`,
          { 'x-api-key': s2Key }
        )
      : Promise.resolve(null),
  ]);

  const s2Citations = toCount(s2?.citationCount);
  const oaCitations = toCount(openAlex?.cited_by_count);
  const tldr = typeof s2?.tldr?.text === 'string' ? s2.tldr.text.trim().slice(0, 400) : null;

  return {
    arxivId,
    hfUpvotes: toCount(hf?.upvotes),
    hfUrl: hf ? `https://huggingface.co/papers/${arxivId}` : null,
    githubRepo: safeGithubUrl(hf?.githubRepo),
    githubStars: toCount(hf?.githubStars),
    linkedModels: toCount(hf?.numTotalModels),
    linkedDatasets: toCount(hf?.numTotalDatasets),
    linkedSpaces: toCount(hf?.numTotalSpaces),
    citations: s2Citations ?? oaCitations,
    influentialCitations: toCount(s2?.influentialCitationCount),
    s2Tldr: tldr || null,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getPaperSignals(arxivId: string): Promise<PaperSignals> {
  const now = Date.now();
  const hit = cache.get(arxivId);
  if (hit && hit.expiresAt > now) return hit.value;

  const value = await flight.execute(`paper_signals_${arxivId}`, () => loadSignals(arxivId));

  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(arxivId, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

