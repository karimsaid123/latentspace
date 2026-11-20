import {
  TickerSymbol,
  StockAnalysis,
  MarketOverviewResponse,
  MacroRegimeSnapshot,
} from '@/types/market';
import {
  TICKER_DEFINITIONS,
  TRAINED_MODEL_ARTIFACT,
  TickerMapping,
  correlateArticlesForTicker,
  runXGBoostQuantModel,
} from './xgboost-engine';
import {
  MacroContextInput,
  OHLCVBar,
  calculateSMAValue,
} from './xgboost-gbdt';
import { VERIFIED_BENCHMARK_SNAPSHOT } from './benchmark-client';
import { container } from '@/core/container';
import { decodeHtmlEntities } from './sanitize';
import rawArticles from '../../data/articles.json';
import { logger } from './logger';

interface CacheEntry {
  timestamp: number;
  data: MarketOverviewResponse;
}

let cachedMarketOverview: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const VERIFIED_MARKET_SNAPSHOT: Record<TickerSymbol, {
  price: number;
  changeAmount: number;
  changePercent: number;
  marketCap: string;
  volume: string;
  sparkline: number[];
  high52w: number;
  low52w: number;
}> = {
  NVDA: {
    price: 185.03,
    changeAmount: -15.10,
    changePercent: -7.54,
    marketCap: '$3.52T',
    volume: '48.2M',
    sparkline: [210.96, 216.0, 217.94, 215.38, 213.66, 204.64, 202.06, 206.69, 200.13, 185.03],
    high52w: 243.37,
    low52w: 164.27
  },
  TSLA: {
    price: 343.47,
    changeAmount: -41.72,
    changePercent: -10.83,
    marketCap: '$1.12T',
    volume: '68.5M',
    sparkline: [372.22, 391.62, 407.46, 404.22, 403.3, 399.81, 403.82, 398.5, 385.19, 343.47],
    high52w: 498.83,
    low52w: 297.38
  },
  MSFT: {
    price: 541.80,
    changeAmount: -13.99,
    changePercent: -2.52,
    marketCap: '$3.21T',
    volume: '18.4M',
    sparkline: [524.51, 532.6, 531.33, 531.01, 530.14, 521.91, 507.12, 520.99, 555.8, 541.80],
    high52w: 559.15,
    low52w: 349.20
  },
  GOOGL: {
    price: 285.74,
    changeAmount: -3.19,
    changePercent: -1.11,
    marketCap: '$2.33T',
    volume: '22.1M',
    sparkline: [320.21, 316.8, 320.58, 324.89, 283.82, 279.84, 278.99, 280.03, 288.93, 285.74],
    high52w: 408.61,
    low52w: 270.70
  },
  META: {
    price: 606.97,
    changeAmount: -23.03,
    changePercent: -3.66,
    marketCap: '$1.48T',
    volume: '12.8M',
    sparkline: [642.62, 630.56, 620.19, 612.49, 624.52, 614.99, 606.73, 621.03, 630.0, 606.97],
    high52w: 779.82,
    low52w: 520.26
  },
  AMZN: {
    price: 261.77,
    changeAmount: -4.26,
    changePercent: -1.60,
    marketCap: '$2.18T',
    volume: '24.9M',
    sparkline: [248.0, 249.09, 253.1, 254.6, 243.79, 240.35, 245.63, 250.69, 266.03, 261.77],
    high52w: 287.20,
    low52w: 196.00
  },
  AAPL: {
    price: 345.14,
    changeAmount: -4.37,
    changePercent: -1.25,
    marketCap: '$3.55T',
    volume: '34.2M',
    sparkline: [347.73, 343.91, 347.1, 343.83, 348.91, 344.63, 338.32, 331.9, 349.51, 345.14],
    high52w: 355.38,
    low52w: 243.42
  },
  TSM: {
    price: 357.92,
    changeAmount: -37.83,
    changePercent: -9.56,
    marketCap: '$1.03T',
    volume: '15.6M',
    sparkline: [418.51, 424.37, 436.87, 439.51, 431.81, 406.13, 398.63, 404.8, 395.75, 357.92],
    high52w: 487.47,
    low52w: 266.82
  },
  AMD: {
    price: 414.61,
    changeAmount: -74.17,
    changePercent: -15.17,
    marketCap: '$240.8B',
    volume: '29.3M',
    sparkline: [516.79, 531.28, 560.26, 578.44, 566.42, 504.8, 466.84, 483.9, 488.78, 414.61],
    high52w: 658.52,
    low52w: 188.22
  },
  AVGO: {
    price: 300.53,
    changeAmount: -24.95,
    changePercent: -7.66,
    marketCap: '$834.0B',
    volume: '14.1M',
    sparkline: [321.68, 329.17, 342.33, 351.81, 345.0, 326.08, 322.23, 332.13, 325.48, 300.53],
    high52w: 495.00,
    low52w: 289.96
  },
  ASML: {
    price: 1385.18,
    changeAmount: -111.12,
    changePercent: -7.43,
    marketCap: '$285.2B',
    volume: '2.1M',
    sparkline: [1571.8, 1590.9, 1635.57, 1662.85, 1675.7, 1565.9, 1526.14, 1552.14, 1496.3, 1385.18],
    high52w: 1999.96,
    low52w: 946.11
  },
  ARM: {
    price: 167.68,
    changeAmount: -24.12,
    changePercent: -12.58,
    marketCap: '$147.2B',
    volume: '9.8M',
    sparkline: [210.33, 223.35, 226.6, 235.9, 228.77, 205.97, 196.79, 202.49, 191.8, 167.68],
    high52w: 452.70,
    low52w: 100.02
  },
  QCOM: {
    price: 152.36,
    changeAmount: -20.83,
    changePercent: -12.03,
    marketCap: '$182.4B',
    volume: '14.2M',
    sparkline: [175.91, 179.6, 184.17, 182.97, 185.41, 164.79, 162.08, 164.43, 173.19, 152.36],
    high52w: 259.92,
    low52w: 121.99
  },
  INTC: {
    price: 54.46,
    changeAmount: -3.82,
    changePercent: -6.55,
    marketCap: '$105.6B',
    volume: '45.1M',
    sparkline: [86.96, 90.47, 93.74, 95.53, 92.07, 65.76, 59.97, 60.55, 58.27, 54.46],
    high52w: 142.35,
    low52w: 32.89
  },
  MU: {
    price: 688.01,
    changeAmount: -107.22,
    changePercent: -13.48,
    marketCap: '$124.5B',
    volume: '22.7M',
    sparkline: [877.55, 903.7, 928.76, 983.23, 934.27, 884.74, 833.59, 855.1, 795.23, 688.01],
    high52w: 1255.00,
    low52w: 192.59
  },
  ORCL: {
    price: 114.39,
    changeAmount: -9.35,
    changePercent: -7.55,
    marketCap: '$380.2B',
    volume: '16.8M',
    sparkline: [126.16, 126.06, 130.53, 144.54, 139.56, 130.67, 119.22, 126.19, 123.73, 114.39],
    high52w: 250.25,
    low52w: 111.66
  },
  PLTR: {
    price: 155.30,
    changeAmount: -16.40,
    changePercent: -9.55,
    marketCap: '$155.3B',
    volume: '35.4M',
    sparkline: [196.75, 198.84, 198.73, 196.81, 196.42, 184.11, 178.34, 175.4, 171.7, 155.30],
    high52w: 212.94,
    low52w: 106.37
  },
  SNOW: {
    price: 275.58,
    changeAmount: -15.02,
    changePercent: -5.17,
    marketCap: '$89.4B',
    volume: '6.8M',
    sparkline: [325.43, 334.95, 337.42, 339.91, 330.27, 306.08, 290.68, 295.04, 290.6, 275.58],
    high52w: 384.56,
    low52w: 118.30
  },
  CRM: {
    price: 222.60,
    changeAmount: -4.51,
    changePercent: -1.99,
    marketCap: '$248.5B',
    volume: '8.9M',
    sparkline: [248.57, 247.61, 240.89, 242.11, 230.9, 229.17, 226.18, 222.2, 227.11, 222.60],
    high52w: 269.11,
    low52w: 146.32
  },
  NOW: {
    price: 104.34,
    changeAmount: -4.47,
    changePercent: -4.11,
    marketCap: '$195.4B',
    volume: '2.3M',
    sparkline: [158.96, 158.18, 154.78, 150.13, 109.67, 105.12, 106.01, 109.16, 108.81, 104.34],
    high52w: 175.80,
    low52w: 81.24
  },
  ADBE: {
    price: 246.80,
    changeAmount: -1.68,
    changePercent: -0.68,
    marketCap: '$218.0B',
    volume: '4.5M',
    sparkline: [263.82, 258.62, 248.36, 249.76, 248.12, 250.23, 251.47, 246.14, 248.48, 246.80],
    high52w: 362.71,
    low52w: 190.12
  },
  IBM: {
    price: 246.88,
    changeAmount: -7.44,
    changePercent: -2.92,
    marketCap: '$228.6B',
    volume: '5.1M',
    sparkline: [253.56, 253.44, 250.25, 253.22, 258.28, 257.81, 252.51, 250.04, 254.32, 246.88],
    high52w: 332.46,
    low52w: 199.19
  },
  CRWD: {
    price: 219.66,
    changeAmount: -21.34,
    changePercent: -8.85,
    marketCap: '$86.2B',
    volume: '5.7M',
    sparkline: [257.57, 261.83, 268.02, 266.66, 261.15, 250.43, 241.81, 244.68, 241.0, 219.66],
    high52w: 286.99,
    low52w: 85.68
  },
  PANW: {
    price: 320.50,
    changeAmount: -27.54,
    changePercent: -7.91,
    marketCap: '$112.4B',
    volume: '4.1M',
    sparkline: [380.55, 390.46, 401.7, 394.49, 380.57, 365.87, 351.72, 350.2, 348.04, 320.50],
    high52w: 432.33,
    low52w: 139.57
  },
  NET: {
    price: 239.32,
    changeAmount: -27.26,
    changePercent: -10.21,
    marketCap: '$68.5B',
    volume: '6.2M',
    sparkline: [325.73, 331.86, 327.8, 318.72, 310.3, 280.7, 265.17, 273.62, 266.58, 239.32],
    high52w: 370.35,
    low52w: 158.83
  },
  DDOG: {
    price: 176.68,
    changeAmount: -12.04,
    changePercent: -6.38,
    marketCap: '$45.8B',
    volume: '5.4M',
    sparkline: [269.65, 280.24, 280.82, 278.41, 265.84, 235.27, 216.1, 220.52, 188.72, 176.68],
    high52w: 300.68,
    low52w: 98.01
  },
  NFLX: {
    price: 65.55,
    changeAmount: -0.84,
    changePercent: -1.27,
    marketCap: '$310.2B',
    volume: '4.8M',
    sparkline: [65.85, 63.9, 62.52, 61.99, 62.05, 62.08, 62.34, 63.42, 66.39, 65.55],
    high52w: 116.73,
    low52w: 61.39
  },
  UBER: {
    price: 68.77,
    changeAmount: -1.10,
    changePercent: -1.57,
    marketCap: '$152.0B',
    volume: '18.2M',
    sparkline: [66.7, 66.13, 65.78, 65.27, 65.74, 65.25, 66.71, 66.6, 69.87, 68.77],
    high52w: 95.18,
    low52w: 64.04
  },
  COIN: {
    price: 134.77,
    changeAmount: -16.73,
    changePercent: -11.04,
    marketCap: '$42.5B',
    volume: '11.4M',
    sparkline: [164.45, 159.6, 161.09, 162.32, 160.59, 143.54, 137.83, 145.45, 151.5, 134.77],
    high52w: 324.80,
    low52w: 133.51
  },
  SHOP: {
    price: 144.39,
    changeAmount: -8.64,
    changePercent: -5.65,
    marketCap: '$115.8B',
    volume: '9.6M',
    sparkline: [168.68, 168.18, 165.81, 168.22, 166.89, 157.49, 156.22, 142.57, 153.03, 144.39],
    high52w: 180.88,
    low52w: 94.00
  }
};

function sanitizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function formatCompactVolume(vol: number | undefined, fallback: string): string {
  if (typeof vol !== 'number' || !Number.isFinite(vol) || vol <= 0) return fallback;
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(0)}K`;
  return String(Math.round(vol));
}

async function fetchYahooChartOHLCV(
  symbol: string,
  range: '3mo' | '1y' = '1y',
  timeoutMs = 3000
): Promise<{
  price: number;
  changeAmount: number;
  changePercent: number;
  bars: OHLCVBar[];
  sparkline: number[];
  volume?: number;
  high52w?: number;
  low52w?: number;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    const timestamps: number[] = result?.timestamp || [];
    const quote = result?.indicators?.quote?.[0] || {};

    if (!meta || typeof meta.regularMarketPrice !== 'number') return null;

    const bars: OHLCVBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i];
      const h = quote.high?.[i];
      const l = quote.low?.[i];
      const c = quote.close?.[i];
      const v = quote.volume?.[i] ?? 0;
      if (
        typeof c === 'number' &&
        Number.isFinite(c) &&
        c > 0
      ) {
        bars.push({
          t: Math.floor(timestamps[i] / 86400),
          o: typeof o === 'number' && Number.isFinite(o) ? o : c,
          h: typeof h === 'number' && Number.isFinite(h) ? h : c,
          l: typeof l === 'number' && Number.isFinite(l) ? l : c,
          c,
          v: typeof v === 'number' && Number.isFinite(v) ? v : 0,
        });
      }
    }

    const price = meta.regularMarketPrice;
    const closes = bars.map((b) => b.c);
    const yesterday =
      closes.length >= 2
        ? closes[closes.length - 2]
        : typeof meta.previousClose === 'number'
          ? meta.previousClose
          : price;

    const changePercent =
      typeof meta.regularMarketChangePercent === 'number'
        ? meta.regularMarketChangePercent
        : yesterday > 0
          ? ((price - yesterday) / yesterday) * 100
          : 0;
    const changeAmount =
      typeof meta.regularMarketChange === 'number'
        ? meta.regularMarketChange
        : price - yesterday;

    const sparkline = closes.slice(-15).map((c) => Math.round(c * 100) / 100);

    return {
      price: Math.round(price * 100) / 100,
      changeAmount: Math.round(changeAmount * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      bars,
      sparkline,
      volume: typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : undefined,
      high52w: meta.fiftyTwoWeekHigh,
      low52w: meta.fiftyTwoWeekLow,
    };
  } catch {
    return null;
  }
}

async function fetchTickerQuoteWithFallback(symbol: TickerSymbol): Promise<{
  price: number;
  changeAmount: number;
  changePercent: number;
  sparkline: number[];
  bars: OHLCVBar[];
  volumeFormatted: string;
  todayVolume?: number;
  high52w?: number;
  low52w?: number;
}> {
  const fallback = VERIFIED_MARKET_SNAPSHOT[symbol];
  const live = await fetchYahooChartOHLCV(symbol, '1y', 3200);

  if (live && live.bars.length >= 5) {
    return {
      price: live.price,
      changeAmount: live.changeAmount,
      changePercent: live.changePercent,
      sparkline: live.sparkline.length >= 5 ? live.sparkline : fallback.sparkline,
      bars: live.bars,
      volumeFormatted: formatCompactVolume(live.volume, fallback.volume),
      todayVolume: live.volume,
      high52w: live.high52w || fallback.high52w,
      low52w: live.low52w || fallback.low52w,
    };
  }

  const fallbackBars: OHLCVBar[] = fallback.sparkline.map((c, idx) => ({
    t: idx + 1,
    o: c,
    h: c * 1.01,
    l: c * 0.99,
    c,
    v: 1_000_000,
  }));

  return {
    price: fallback.price,
    changeAmount: fallback.changeAmount,
    changePercent: fallback.changePercent,
    sparkline: fallback.sparkline,
    bars: fallbackBars,
    volumeFormatted: fallback.volume,
    high52w: fallback.high52w,
    low52w: fallback.low52w,
  };
}

interface RawMarketArticle {
  id?: string;
  title?: string;
  sourceName?: string;
  source?: { name?: string };
  publisher?: string;
  publishedAt?: string;
  pubDate?: string;
  canonicalUrl?: string;
  link?: string;
  url?: string;
  contentSnippet?: string;
  description?: string;
  lab?: string;
  relatedTickers?: string[];
  __isMarketNews?: boolean;
  stream?: string;
  summary?: { tldr?: string; takeaways?: string[]; impact?: string };
  aiSummary?: { tldr?: string; takeaways?: string[]; impact?: string };
}

interface YahooSearchNewsItem {
  uuid?: string;
  title?: string;
  link?: string;
  publisher?: string;
  providerPublishTime?: number;
  relatedTickers?: string[];
}

async function fetchLiveTickerNews(ticker: TickerMapping): Promise<RawMarketArticle[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker.symbol)}&newsCount=6&quotesCount=0`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { news?: YahooSearchNewsItem[] };
    const rawNews: YahooSearchNewsItem[] = Array.isArray(json?.news) ? json.news : [];

    const firstCompanyWord = ticker.companyName.split(/[\s.,]/)[0].toLowerCase();
    const filtered: RawMarketArticle[] = [];

    for (const item of rawNews) {
      const title = decodeHtmlEntities(String(item?.title || '')).trim();
      const safeUrl = sanitizeHttpUrl(item?.link);
      if (!title || !safeUrl) continue;

      const relatedTickers: string[] = Array.isArray(item?.relatedTickers) ? item.relatedTickers : [];
      const titleMatchesEntity =
        ticker.strictPatterns.some((re) => re.test(title)) ||
        (firstCompanyWord.length >= 4 && new RegExp(`\\b${firstCompanyWord}\\b`, 'i').test(title));
      const explicitlyTaggedAndRelevant =
        relatedTickers.includes(ticker.symbol) &&
        (titleMatchesEntity || ticker.ecosystemPatterns?.some((re) => re.test(title)));

      if (!titleMatchesEntity && !explicitlyTaggedAndRelevant) continue;

      const pubEpoch = typeof item?.providerPublishTime === 'number' ? item.providerPublishTime * 1000 : Date.now();
      filtered.push({
        id: `yf-${ticker.symbol}-${item?.uuid || pubEpoch}`,
        title,
        sourceName: decodeHtmlEntities(String(item?.publisher || 'Yahoo Finance')),
        publishedAt: new Date(pubEpoch).toISOString(),
        canonicalUrl: safeUrl,
        contentSnippet: '',
        relatedTickers,
        __isMarketNews: true,
      });
    }
    return filtered;
  } catch {
    return [];
  }
}

async function fetchMacroBenchmarks(): Promise<MacroContextInput> {
  const [vix, qqq, smh] = await Promise.all([
    fetchYahooChartOHLCV('^VIX', '3mo', 2500),
    fetchYahooChartOHLCV('QQQ', '3mo', 2500),
    fetchYahooChartOHLCV('SMH', '3mo', 2500),
  ]);

  const computeRet5 = (bars: OHLCVBar[] | undefined, fallback: number) => {
    if (!bars || bars.length < 6) return fallback;
    const last = bars[bars.length - 1].c;
    const prev5 = bars[bars.length - 6].c;
    return prev5 > 0 ? Math.round(((last / prev5) - 1) * 10000) / 100 : fallback;
  };

  const vixLevel = vix?.price ?? 20.0;
  const vixCloses = vix?.bars.map((b) => b.c) ?? [vixLevel];
  const vixSma20 = calculateSMAValue(vixCloses, 20) || vixLevel;
  const vixChange5dPct = computeRet5(vix?.bars, 0);

  return {
    vixLevel,
    vixSma20,
    vixChange5dPct,
    qqqChange5dPct: computeRet5(qqq?.bars, 0),
    smhChange5dPct: computeRet5(smh?.bars, 0),
    qqqChange1dPct: qqq?.changePercent ?? 0,
    smhChange1dPct: smh?.changePercent ?? 0,
  };
}

async function getLiveResearchArticles(): Promise<RawMarketArticle[]> {
  try {
    await container.bootstrap();
    await container.syncEdgeState();
    const repoArticles = await container.articleRepo.list({ limit: 400 });
    if (repoArticles && repoArticles.length > 0) {
      return repoArticles as unknown as RawMarketArticle[];
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn('Falling back to static articles corpus for markets', { error: message });
  }
  return Array.isArray(rawArticles) ? (rawArticles as RawMarketArticle[]) : [];
}

/**
 * Builds the complete Market Overview, correlating live financial news + LatentSpace
 * research dispatches with 1y OHLCV telemetry and executing the trained XGBoost model.
 */
export async function getMarketOverview(forceFresh = false): Promise<MarketOverviewResponse> {
  const now = Date.now();

  if (!forceFresh && cachedMarketOverview && now - cachedMarketOverview.timestamp < CACHE_TTL_MS) {
    return cachedMarketOverview.data;
  }

  const [articles, macroBase, tickerResults] = await Promise.all([
    getLiveResearchArticles(),
    fetchMacroBenchmarks(),
    Promise.all(
      TICKER_DEFINITIONS.map(async (def) => {
        const [quoteData, liveNews] = await Promise.all([
          fetchTickerQuoteWithFallback(def.symbol),
          fetchLiveTickerNews(def),
        ]);
        const fallback = VERIFIED_MARKET_SNAPSHOT[def.symbol];
        return { def, quoteData, fallback, liveNews, liveNewsCount: liveNews.length };
      })
    ),
  ]);

  const enrichedResults = tickerResults.map((item) => ({
    ...item,
    correlated: correlateArticlesForTicker(articles, item.def, item.liveNews),
  }));

  // Compute live market breadth (% of tracked tech stocks trading above their 20-day SMA)
  let aboveSma20Count = 0;
  for (const item of enrichedResults) {
    const closes = item.quoteData.bars.map((b) => b.c);
    const sma20 = calculateSMAValue(closes, Math.min(20, closes.length));
    if (item.quoteData.price >= sma20) aboveSma20Count++;
  }
  const marketBreadthPct = Math.round((aboveSma20Count / Math.max(1, enrichedResults.length)) * 100);

  const macro: MacroContextInput = {
    ...macroBase,
    marketBreadthPct,
  };

  const totalChange = enrichedResults.reduce((acc, item) => acc + item.quoteData.changePercent, 0);
  const techSectorMeanChange = enrichedResults.length > 0 ? totalChange / enrichedResults.length : 0;

  const resolvedStocks: StockAnalysis[] = [];
  let aggregateSentiment = 0;
  let totalLiveNewsCount = 0;

  for (const item of enrichedResults) {
    totalLiveNewsCount += item.liveNewsCount;

    const topBench = item.def.benchmarkLab
      ? VERIFIED_BENCHMARK_SNAPSHOT.find((b) => b.creator.lab === item.def.benchmarkLab)
      : undefined;

    const prediction = runXGBoostQuantModel(
      item.def.symbol,
      item.def.companyName,
      item.quoteData.changePercent,
      item.correlated,
      item.quoteData.sparkline,
      techSectorMeanChange,
      item.quoteData.price,
      {
        ohlcvBars: item.quoteData.bars,
        macro,
        todayVolume: item.quoteData.todayVolume,
        benchmarkRank: topBench
          ? {
              modelName: topBench.name,
              rank: topBench.metrics.rank,
              intelligenceIndex: topBench.evaluations.intelligenceIndex,
            }
          : undefined,
      }
    );

    aggregateSentiment += prediction.signalScore;

    const attributedArticles =
      prediction.decisionTree?.steps.find((s) => s.id === 'NEWS_CATALYSTS')?.evidenceArticles ||
      item.correlated;

    resolvedStocks.push({
      symbol: item.def.symbol,
      companyName: item.def.companyName,
      category: item.def.category,
      sectorLabel: item.def.sectorLabel,
      currentPrice: item.quoteData.price,
      changeAmount: item.quoteData.changeAmount,
      changePercent: item.quoteData.changePercent,
      currency: 'USD',
      marketCapFormatted: item.fallback.marketCap,
      volumeFormatted: item.quoteData.volumeFormatted,
      sparkline: item.quoteData.sparkline,
      high52w: item.quoteData.high52w,
      low52w: item.quoteData.low52w,
      prediction,
      correlatedArticles: attributedArticles,
      lastModelRun: new Date().toISOString(),
    });
  }

  const meanSentiment = resolvedStocks.length > 0 ? aggregateSentiment / resolvedStocks.length : 0;
  let macroSentimentLabel = 'NEUTRAL_EQUILIBRIUM';
  if (meanSentiment > 0.2) macroSentimentLabel = 'BULLISH_EXPANSION_PHASE';
  else if (meanSentiment < -0.2) macroSentimentLabel = 'BEARISH_CONTRACTION_PHASE';

  const macroRegime: MacroRegimeSnapshot = {
    vixLevel: Math.round(macro.vixLevel * 100) / 100,
    vixChange5dPct: macro.vixChange5dPct,
    qqqChange1dPct: Math.round((macro.qqqChange1dPct ?? 0) * 100) / 100,
    qqqChange5dPct: macro.qqqChange5dPct,
    smhChange1dPct: Math.round((macro.smhChange1dPct ?? 0) * 100) / 100,
    smhChange5dPct: macro.smhChange5dPct,
    marketBreadthPct,
    regimeLabel:
      macro.vixLevel >= 26
        ? 'HIGH_FEAR_STRESS'
        : macro.vixLevel >= 19
          ? 'ELEVATED_CAUTION'
          : 'CALM_RISK_ON',
  };

  const overview: MarketOverviewResponse = {
    timestamp: new Date().toISOString(),
    macroSentimentScore: Math.round(meanSentiment * 100) / 100,
    macroSentimentLabel,
    activeDispatchesCount: articles.length,
    stocks: resolvedStocks,
    disclaimer:
      'STRICTLY NOT FINANCIAL ADVICE (NFA). Trained Histogram-XGBoost model output and algorithmic news correlation for educational, research and entertainment purposes only.',
    macroRegime,
    modelValidation: TRAINED_MODEL_ARTIFACT.validationMetrics,
    liveNewsCount: totalLiveNewsCount,
  };

  cachedMarketOverview = {
    timestamp: now,
    data: overview,
  };

  return overview;
}
