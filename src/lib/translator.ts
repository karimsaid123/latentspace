import type { AISummary } from '@/core/domain/entities';
import type { Locale } from './i18n';
import { SingleFlight } from '@/core/services/single-flight';

const TARGET_LANG_MAP: Record<Exclude<Locale, 'en'>, string> = {
  es: 'es',
  ar: 'ar',
  zh: 'zh-CN',
};

interface CachedEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_TRANSLATION_CACHE_ENTRIES = 2000;
const TRANSLATION_TTL_MS = 14 * 86_400 * 1000; // 14 days

const summaryTranslationStore = new Map<string, CachedEntry<AISummary>>();
const feedItemTranslationStore = new Map<string, CachedEntry<{ title: string; tldr: string }>>();
const translationFlight = new SingleFlight();

function setBoundedMap<T>(
  map: Map<string, CachedEntry<T>>,
  key: string,
  value: T,
  ttlMs = TRANSLATION_TTL_MS
): void {
  const now = Date.now();
  if (!map.has(key) && map.size >= MAX_TRANSLATION_CACHE_ENTRIES) {
    for (const [k, v] of map.entries()) {
      if (now > v.expiresAt) {
        map.delete(k);
      }
    }
    if (map.size >= MAX_TRANSLATION_CACHE_ENTRIES) {
      const oldestKey = map.keys().next().value;
      if (oldestKey !== undefined) {
        map.delete(oldestKey);
      }
    }
  }
  map.set(key, { value, expiresAt: now + ttlMs });
}

function getBoundedMap<T>(map: Map<string, CachedEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

export function getCachedLocalizedSummary(articleId: string, locale: Locale): AISummary | null {
  return getBoundedMap(summaryTranslationStore, `sum_${articleId}_${locale}`);
}

export function setCachedLocalizedSummary(
  articleId: string,
  locale: Locale,
  summary: AISummary
): void {
  setBoundedMap(summaryTranslationStore, `sum_${articleId}_${locale}`, summary);
}

async function requestNeuralChunkTranslation(
  cleanLines: string[],
  targetLang: string
): Promise<string[]> {
  if (cleanLines.length === 0) return [];
  const joined = cleanLines.join('\n\n');

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t&tl=${encodeURIComponent(
        targetLang
      )}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ q: joined }).toString(),
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!response.ok) {
      return cleanLines;
    }

    const rawData: unknown = await response.json();
    if (!Array.isArray(rawData) || !Array.isArray(rawData[0])) {
      return cleanLines;
    }

    const segments = rawData[0] as unknown[];
    const translatedText = segments
      .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
      .join('');

    const parts = translatedText.split(/\n{2,}/).map((p) => p.trim());
    if (parts.length === cleanLines.length) {
      return parts;
    }

    // Fallback: if segment count shifted, translate individually in parallel
    return Promise.all(
      cleanLines.map(async (singleLine) => {
        try {
          const singleRes = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t&tl=${encodeURIComponent(
              targetLang
            )}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ q: singleLine }).toString(),
              signal: AbortSignal.timeout(6_000),
            }
          );
          if (!singleRes.ok) return singleLine;
          const sData: unknown = await singleRes.json();
          if (!Array.isArray(sData) || !Array.isArray(sData[0])) return singleLine;
          return (
            (sData[0] as unknown[])
              .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
              .join('')
              .trim() || singleLine
          );
        } catch {
          return singleLine;
        }
      })
    );
  } catch {
    return cleanLines;
  }
}

export async function translateLines(lines: string[], locale: Locale): Promise<string[]> {
  if (locale === 'en' || lines.length === 0) return lines;
  const targetLang = TARGET_LANG_MAP[locale];
  if (!targetLang) return lines;

  const normalized = lines.map((l) => l.replace(/\s+/g, ' ').trim());
  const nonEmptyIndices: number[] = [];
  const nonEmptyLines: string[] = [];

  normalized.forEach((line, idx) => {
    if (line.length > 0) {
      nonEmptyIndices.push(idx);
      nonEmptyLines.push(line);
    }
  });

  if (nonEmptyLines.length === 0) return lines;

  // Group into chunks of max 10 lines or ~2400 characters for optimal latency
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentLen = 0;

  for (const line of nonEmptyLines) {
    if (currentChunk.length >= 10 || (currentLen + line.length > 2400 && currentChunk.length > 0)) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentLen = 0;
    }
    currentChunk.push(line);
    currentLen += line.length + 2;
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  const translatedChunks = await Promise.all(
    chunks.map((chunk) => requestNeuralChunkTranslation(chunk, targetLang))
  );
  const flatTranslated = translatedChunks.flat();

  const result = [...lines];
  nonEmptyIndices.forEach((originalIdx, i) => {
    result[originalIdx] = flatTranslated[i] || lines[originalIdx];
  });

  return result;
}

export async function translateArticleSummary(
  articleId: string,
  title: string,
  baseSummary: AISummary,
  locale: Locale
): Promise<AISummary> {
  if (locale === 'en') {
    return { ...baseSummary, title, locale: 'en' };
  }

  const cached = getCachedLocalizedSummary(articleId, locale);
  if (cached) return cached;

  return translationFlight.execute(`trans_sum_${articleId}_${locale}`, async () => {
    const doubleCheck = getCachedLocalizedSummary(articleId, locale);
    if (doubleCheck) return doubleCheck;

    const paragraphs = (baseSummary.tldr || '')
      .split(/\n{2,}/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const takeaways = (baseSummary.takeaways || [])
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const inputLines = [title.replace(/\s+/g, ' ').trim(), ...paragraphs, ...takeaways];
    const translatedLines = await translateLines(inputLines, locale);

    const translatedTitle = translatedLines[0] || title;
    const translatedParagraphs = translatedLines.slice(1, 1 + paragraphs.length);
    const translatedTakeaways = translatedLines.slice(1 + paragraphs.length);

    const localizedSummary: AISummary = {
      ...baseSummary,
      title: translatedTitle,
      tldr: translatedParagraphs.join('\n\n') || baseSummary.tldr,
      takeaways: translatedTakeaways,
      generatedWith: 'gemini',
      summaryVersion: Math.max(baseSummary.summaryVersion || 2, 2),
      locale,
    };

    setCachedLocalizedSummary(articleId, locale, localizedSummary);
    return localizedSummary;
  });
}

export async function translateFeedItemsBatch(
  items: Array<{ id: string; title: string; tldr: string }>,
  locale: Locale
): Promise<Record<string, { title: string; tldr: string }>> {
  const out: Record<string, { title: string; tldr: string }> = {};
  if (locale === 'en' || items.length === 0) {
    for (const item of items) {
      out[item.id] = { title: item.title, tldr: item.tldr };
    }
    return out;
  }

  const missingItems: Array<{ id: string; title: string; tldr: string }> = [];
  for (const item of items) {
    const cacheKey = `feed_${item.id}_${locale}`;
    const cached = getBoundedMap(feedItemTranslationStore, cacheKey);
    if (cached) {
      out[item.id] = cached;
    } else {
      // Also check if full summary cache already has this article
      const cachedFull = getCachedLocalizedSummary(item.id, locale);
      if (cachedFull && cachedFull.title) {
        const firstPara = cachedFull.tldr.split(/\n{2,}/)[0] || cachedFull.tldr;
        const entry = { title: cachedFull.title, tldr: firstPara };
        setBoundedMap(feedItemTranslationStore, cacheKey, entry);
        out[item.id] = entry;
      } else {
        missingItems.push(item);
      }
    }
  }

  if (missingItems.length === 0) {
    return out;
  }

  const linesToTranslate: string[] = [];
  for (const item of missingItems) {
    linesToTranslate.push(item.title.slice(0, 360));
    const leadPara = (item.tldr || '').split(/\n{2,}/)[0].slice(0, 650);
    linesToTranslate.push(leadPara);
  }

  const translatedLines = await translateLines(linesToTranslate, locale);

  missingItems.forEach((item, idx) => {
    const translatedTitle = translatedLines[idx * 2] || item.title;
    const translatedTldr = translatedLines[idx * 2 + 1] || item.tldr;
    const entry = { title: translatedTitle, tldr: translatedTldr };
    setBoundedMap(feedItemTranslationStore, `feed_${item.id}_${locale}`, entry);
    out[item.id] = entry;
  });

  return out;
}
