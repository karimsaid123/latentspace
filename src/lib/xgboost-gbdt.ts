import type {
  ModelValidationMetrics,
  TrainedTreeNodeTrace,
  TrainedTreeTrace,
} from '@/types/market';

export interface OHLCVBar {
  t: number; // Unix day index (Math.floor(epochSec / 86400))
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface MacroContextInput {
  vixLevel: number;
  vixSma20: number;
  vixChange5dPct: number;
  qqqChange5dPct: number;
  smhChange5dPct: number;
  qqqChange1dPct?: number;
  smhChange1dPct?: number;
  marketBreadthPct?: number;
}

export const DIRECTION_FEATURE_KEYS = [
  'zRet5',
  'bbPctB',
  'rsi5',
  'distSma20',
  'relSector5d',
  'upVolRatio5d',
  'zRet1',
  'atr14Pct',
  'realizedVol20d',
  'vixLevel',
  'vixZScore',
  'rvol20',
] as const;

export const VOL_FEATURE_KEYS = [
  'atr14Pct',
  'realizedVol5d',
  'realizedVol20d',
  'realizedVol60d',
  'vixLevel',
  'absRet5d',
  'absRet21d',
  'absRet63d',
  'rvol20',
  'distSma200',
] as const;

export type DirectionFeatureKey = (typeof DIRECTION_FEATURE_KEYS)[number];
export type VolFeatureKey = (typeof VOL_FEATURE_KEYS)[number];

export interface FeatureMetaInfo {
  label: string;
  plainName: string;
  unit: string;
  format: (val: number) => string;
}

export const FEATURE_META: Record<string, FeatureMetaInfo> = {
  zRet5: {
    label: '5-Day Z-Return',
    plainName: '5-day price move vs normal volatility',
    unit: 'σ',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}σ`,
  },
  bbPctB: {
    label: 'Bollinger %B (20d)',
    plainName: 'Position inside 20-day price band',
    unit: '',
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
  rsi5: {
    label: 'Wilder RSI-5',
    plainName: '5-day short-term stretch (RSI-5)',
    unit: '',
    format: (v) => v.toFixed(1),
  },
  distSma20: {
    label: 'Dist vs SMA-20',
    plainName: 'Distance from 20-day average price',
    unit: '%',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
  },
  relSector5d: {
    label: '5d Sector Relative Alpha',
    plainName: '5-day performance vs tech sector peers',
    unit: '%',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
  },
  upVolRatio5d: {
    label: '5d Up-Volume Share',
    plainName: 'Share of 5-day volume on green days',
    unit: '%',
    format: (v) => `${(v * 100).toFixed(0)}%`,
  },
  zRet1: {
    label: '1-Day Z-Return',
    plainName: '24-hour move vs normal daily swing',
    unit: 'σ',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}σ`,
  },
  atr14Pct: {
    label: 'ATR-14 %',
    plainName: 'Average daily high-to-low swing',
    unit: '%',
    format: (v) => `${v.toFixed(2)}%`,
  },
  realizedVol20d: {
    label: '20d Realized Vol',
    plainName: '20-day annualized volatility',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
  },
  vixLevel: {
    label: 'CBOE VIX Index',
    plainName: 'Wall Street fear gauge (VIX)',
    unit: '',
    format: (v) => v.toFixed(1),
  },
  vixZScore: {
    label: 'VIX Spike Ratio',
    plainName: 'VIX vs its 20-day baseline',
    unit: '%',
    format: (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`,
  },
  rvol20: {
    label: 'Relative Volume (20d)',
    plainName: 'Today trading volume vs 20-day avg',
    unit: 'x',
    format: (v) => `${v.toFixed(2)}x`,
  },
  realizedVol5d: {
    label: '5d Realized Vol',
    plainName: '5-day annualized volatility',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
  },
  realizedVol60d: {
    label: '60d Realized Vol',
    plainName: '60-day annualized volatility',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
  },
  absRet5d: {
    label: '|5d Return|',
    plainName: 'Magnitude of 5-day price swing',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
  },
  absRet21d: {
    label: '|21d Return|',
    plainName: 'Magnitude of 21-day price swing',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
  },
  absRet63d: {
    label: '|63d Return|',
    plainName: 'Magnitude of 3-month price swing',
    unit: '%',
    format: (v) => `${v.toFixed(1)}%`,
  },
  distSma200: {
    label: 'Dist vs SMA-200',
    plainName: 'Distance from 200-day long-term trend',
    unit: '%',
    format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
  },
};

export interface SerializedTreeNode {
  f?: number;
  t?: number;
  l?: SerializedTreeNode;
  r?: SerializedTreeNode;
  v?: number;
  ev: number;
}

export interface SerializedGBDTEnsemble {
  objective: 'logistic' | 'regression';
  baseScore: number;
  learningRate: number;
  featureKeys: string[];
  trees: SerializedTreeNode[];
}

export interface TrainedXGBoostArtifact {
  modelVersion: string;
  trainedAt: string;
  tickerCount: number;
  validationMetrics: ModelValidationMetrics;
  directionModel: SerializedGBDTEnsemble;
  alphaModel: SerializedGBDTEnsemble;
  volatilityModel: SerializedGBDTEnsemble;
  volRegimeModel: SerializedGBDTEnsemble;
}

export function sigmoid(x: number): number {
  if (x >= 20) return 0.999999998;
  if (x <= -20) return 0.000000002;
  return 1 / (1 + Math.exp(-x));
}

export function logit(p: number): number {
  const clamped = Math.min(0.9999, Math.max(0.0001, p));
  return Math.log(clamped / (1 - clamped));
}

export function calculateSMAValue(values: number[], period: number, endIndex?: number): number {
  if (!values || values.length === 0) return 0;
  const end = endIndex ?? values.length - 1;
  const start = Math.max(0, end - period + 1);
  let sum = 0;
  let count = 0;
  for (let i = start; i <= end; i++) {
    sum += values[i];
    count++;
  }
  return count > 0 ? sum / count : 0;
}

export function calculateWilderRSISeries(closes: number[], period = 14): number[] {
  const n = closes.length;
  const out = new Array<number>(n).fill(50.0);
  if (n < 4) return out;

  if (n <= period) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const rsi = losses === 0 ? (gains === 0 ? 50.0 : 100.0) : gains === 0 ? 0.0 : 100 - 100 / (1 + gains / losses);
    out[n - 1] = rsi;
    return out;
  }

  let initGain = 0;
  let initLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) initGain += diff;
    else initLoss += Math.abs(diff);
  }
  let avgGain = initGain / period;
  let avgLoss = initLoss / period;

  out[period] = avgLoss === 0 ? (avgGain === 0 ? 50.0 : 100.0) : avgGain === 0 ? 0.0 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    if (avgLoss === 0 && avgGain === 0) out[i] = 50.0;
    else if (avgLoss === 0) out[i] = 100.0;
    else if (avgGain === 0) out[i] = 0.0;
    else out[i] = 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out = new Array<number>(values.length);
  out[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

export function calculateMACDSeries(closes: number[]): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  if (closes.length === 0) return { macd: [], signal: [], histogram: [] };
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = closes.map((_, i) => ema12[i] - ema26[i]);
  const signal = calculateEMA(macd, 9);
  const histogram = macd.map((v, i) => v - signal[i]);
  return { macd, signal, histogram };
}

export function calculateRealizedVolAnnualized(
  closes: number[],
  endIndex: number,
  period: number
): number {
  const start = Math.max(1, endIndex - period + 1);
  if (endIndex - start < 1) return 31.7;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = start; i <= endIndex; i++) {
    if (closes[i - 1] <= 0 || closes[i] <= 0) continue;
    const lr = Math.log(closes[i] / closes[i - 1]);
    sum += lr;
    sumSq += lr * lr;
    count++;
  }
  if (count < 2) return 31.7;
  const mean = sum / count;
  const variance = Math.max(1e-10, (sumSq - count * mean * mean) / (count - 1));
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function calculateATRPercent(
  bars: OHLCVBar[],
  endIndex: number,
  period = 14
): number {
  const start = Math.max(1, endIndex - period + 1);
  if (endIndex < 1 || bars[endIndex]?.c <= 0) return 2.5;
  let sumTR = 0;
  let count = 0;
  for (let i = start; i <= endIndex; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    const tr = Math.max(
      cur.h - cur.l,
      Math.abs(cur.h - prev.c),
      Math.abs(cur.l - prev.c)
    );
    sumTR += tr;
    count++;
  }
  const atr = count > 0 ? sumTR / count : 0;
  return (atr / bars[endIndex].c) * 100;
}

export interface ExtractedQuantFeatures {
  directionVector: number[];
  volVector: number[];
  indicators: {
    rsi5: number;
    rsi14: number;
    sma5: number;
    sma15: number;
    sma20: number;
    sma50: number;
    sma200: number;
    bbPctB: number;
    atr14Pct: number;
    dailyVol: number;
    realizedVol5d: number;
    realizedVol20d: number;
    realizedVol60d: number;
    rvol20: number;
    upVolRatio5d: number;
    return1dPct: number;
    return5dPct: number;
    return21dPct: number;
    return63dPct: number;
    relSector5dPct: number;
    macdHistNorm: number;
    zRet1: number;
    zRet5: number;
    distSma20Pct: number;
    distSma200Pct: number;
    vixLevel: number;
    vixZScore: number;
  };
}

export function extractQuantFeatureVector(
  bars: OHLCVBar[],
  macro: MacroContextInput,
  isChipSector: boolean,
  explicitChangePct1d?: number,
  endIndex?: number
): ExtractedQuantFeatures {
  const idx = endIndex ?? bars.length - 1;
  const safeIdx = Math.max(0, Math.min(bars.length - 1, idx));
  const closes = bars.slice(0, safeIdx + 1).map((b) => b.c);
  const c = closes[safeIdx] || 100;

  const ret = (lookback: number) => {
    const prevIdx = Math.max(0, safeIdx - lookback);
    const prev = closes[prevIdx];
    return prev > 0 ? ((c / prev) - 1) * 100 : 0;
  };

  const return1dPct = explicitChangePct1d !== undefined ? explicitChangePct1d : ret(1);
  const return5dPct = ret(5);
  const return21dPct = ret(21);
  const return63dPct = ret(63);

  const realizedVol5d = calculateRealizedVolAnnualized(closes, safeIdx, 5);
  const realizedVol20d = calculateRealizedVolAnnualized(closes, safeIdx, 20);
  const realizedVol60d = calculateRealizedVolAnnualized(closes, safeIdx, 60);
  const dailyVol = Math.max(0.005, realizedVol20d / 100 / Math.sqrt(252));

  const zRet1 = return1dPct / Math.max(0.5, dailyVol * 100);
  const zRet5 = return5dPct / Math.max(1.0, dailyVol * Math.sqrt(5) * 100);

  const sma5 = calculateSMAValue(closes, 5, safeIdx);
  const sma15 = calculateSMAValue(closes, 15, safeIdx);
  const sma20 = calculateSMAValue(closes, 20, safeIdx);
  const sma50 = calculateSMAValue(closes, 50, safeIdx);
  const sma200 = calculateSMAValue(closes, 200, safeIdx);

  const distSma20Pct = sma20 > 0 ? ((c - sma20) / sma20) * 100 : 0;
  const distSma200Pct = sma200 > 0 ? ((c - sma200) / sma200) * 100 : 0;

  let sd20 = 0;
  const bbStart = Math.max(0, safeIdx - 19);
  const bbCount = safeIdx - bbStart + 1;
  for (let k = bbStart; k <= safeIdx; k++) {
    sd20 += Math.pow(closes[k] - sma20, 2);
  }
  sd20 = bbCount > 1 ? Math.sqrt(sd20 / bbCount) : c * 0.02;
  const bbPctB = sd20 > 1e-6 ? (c - (sma20 - 2 * sd20)) / (4 * sd20) : 0.5;

  const rsi5Series = calculateWilderRSISeries(closes, 5);
  const rsi14Series = calculateWilderRSISeries(closes, 14);
  const rsi5 = rsi5Series[safeIdx] ?? 50;
  const rsi14 = rsi14Series[safeIdx] ?? 50;

  const macdObj = calculateMACDSeries(closes);
  const macdHist = macdObj.histogram[safeIdx] ?? 0;
  const macdHistNorm = macdHist / Math.max(0.01, c * dailyVol);

  const atr14Pct = calculateATRPercent(bars, safeIdx, 14);

  let avgVol = 0;
  let volCount = 0;
  const volStart = Math.max(0, safeIdx - 19);
  for (let k = volStart; k <= safeIdx; k++) {
    if (bars[k].v > 0) {
      avgVol += bars[k].v;
      volCount++;
    }
  }
  avgVol = volCount > 0 ? avgVol / volCount : 0;
  const curVol = bars[safeIdx]?.v || 0;
  const rvol20 = avgVol > 0 && curVol > 0 ? Math.min(4.0, Math.max(0.2, curVol / avgVol)) : 1.0;

  let upVol = 0;
  let totVol = 0;
  const uvStart = Math.max(1, safeIdx - 4);
  for (let k = uvStart; k <= safeIdx; k++) {
    const vol = bars[k].v > 0 ? bars[k].v : 1;
    totVol += vol;
    if (bars[k].c >= bars[k - 1].c) upVol += vol;
  }
  const upVolRatio5d = totVol > 0 ? upVol / totVol : 0.5;

  const sectorRet5d = isChipSector ? macro.smhChange5dPct : macro.qqqChange5dPct;
  const relSector5dPct = return5dPct - sectorRet5d;

  const vixSma20 = macro.vixSma20 > 0 ? macro.vixSma20 : macro.vixLevel;
  const vixZScore = vixSma20 > 0 ? (macro.vixLevel - vixSma20) / vixSma20 : 0;

  // Order must match DIRECTION_FEATURE_KEYS
  const directionVector = [
    zRet5,
    bbPctB,
    rsi5,
    distSma20Pct,
    relSector5dPct,
    upVolRatio5d,
    zRet1,
    atr14Pct,
    realizedVol20d,
    macro.vixLevel,
    vixZScore,
    rvol20,
  ];

  // Order must match VOL_FEATURE_KEYS
  const volVector = [
    atr14Pct,
    realizedVol5d,
    realizedVol20d,
    realizedVol60d,
    macro.vixLevel,
    Math.abs(return5dPct),
    Math.abs(return21dPct),
    Math.abs(return63dPct),
    rvol20,
    distSma200Pct,
  ];

  return {
    directionVector,
    volVector,
    indicators: {
      rsi5: Math.round(rsi5 * 10) / 10,
      rsi14: Math.round(rsi14 * 10) / 10,
      sma5: Math.round(sma5 * 100) / 100,
      sma15: Math.round(sma15 * 100) / 100,
      sma20: Math.round(sma20 * 100) / 100,
      sma50: Math.round(sma50 * 100) / 100,
      sma200: Math.round(sma200 * 100) / 100,
      bbPctB: Math.round(bbPctB * 1000) / 1000,
      atr14Pct: Math.round(atr14Pct * 100) / 100,
      dailyVol,
      realizedVol5d: Math.round(realizedVol5d * 10) / 10,
      realizedVol20d: Math.round(realizedVol20d * 10) / 10,
      realizedVol60d: Math.round(realizedVol60d * 10) / 10,
      rvol20: Math.round(rvol20 * 100) / 100,
      upVolRatio5d: Math.round(upVolRatio5d * 1000) / 1000,
      return1dPct: Math.round(return1dPct * 100) / 100,
      return5dPct: Math.round(return5dPct * 100) / 100,
      return21dPct: Math.round(return21dPct * 100) / 100,
      return63dPct: Math.round(return63dPct * 100) / 100,
      relSector5dPct: Math.round(relSector5dPct * 100) / 100,
      macdHistNorm: Math.round(macdHistNorm * 1000) / 1000,
      zRet1: Math.round(zRet1 * 100) / 100,
      zRet5: Math.round(zRet5 * 100) / 100,
      distSma20Pct: Math.round(distSma20Pct * 100) / 100,
      distSma200Pct: Math.round(distSma200Pct * 100) / 100,
      vixLevel: Math.round(macro.vixLevel * 100) / 100,
      vixZScore: Math.round(vixZScore * 1000) / 1000,
    },
  };
}

export function predictTreeLeaf(node: SerializedTreeNode, features: number[]): number {
  let cur = node;
  while (cur.f !== undefined && cur.t !== undefined && cur.l && cur.r) {
    cur = features[cur.f] <= cur.t ? cur.l : cur.r;
  }
  return cur.v ?? cur.ev;
}

export function predictEnsembleScore(
  ensemble: SerializedGBDTEnsemble,
  features: number[]
): number {
  let score = ensemble.baseScore;
  for (const tree of ensemble.trees) {
    score += ensemble.learningRate * predictTreeLeaf(tree, features);
  }
  return score;
}

function buildAnnotatedTreeTrace(
  node: SerializedTreeNode,
  features: number[],
  featureKeys: string[],
  onActivePath: boolean
): TrainedTreeNodeTrace {
  if (node.f === undefined || node.t === undefined || !node.l || !node.r) {
    return {
      leafValue: node.v ?? node.ev,
      expectedValue: node.ev,
    };
  }
  const fIdx = node.f;
  const fKey = featureKeys[fIdx] || `feature_${fIdx}`;
  const actualVal = features[fIdx] ?? 0;
  const wentLeft = actualVal <= node.t;
  return {
    featureKey: fKey,
    humanLabel: FEATURE_META[fKey]?.label || fKey,
    threshold: node.t,
    actualValue: Math.round(actualVal * 1000) / 1000,
    wentLeft: onActivePath ? wentLeft : undefined,
    expectedValue: node.ev,
    left: buildAnnotatedTreeTrace(node.l, features, featureKeys, onActivePath && wentLeft),
    right: buildAnnotatedTreeTrace(node.r, features, featureKeys, onActivePath && !wentLeft),
  };
}

/**
 * Evaluates a trained GBDT ensemble and computes exact Tree-Path (Saabas) per-feature
 * attributions satisfying: baseScore + sum(attributions) === rawScore.
 */
export function evaluateGBDTWithAttribution(
  ensemble: SerializedGBDTEnsemble,
  features: number[],
  topK = 6
): {
  rawScore: number;
  baseScore: number;
  attributions: number[];
  treeTraces: TrainedTreeTrace[];
} {
  const numFeatures = ensemble.featureKeys.length;
  const attributions = new Array<number>(numFeatures).fill(0);
  const lr = ensemble.learningRate;

  let rawScore = ensemble.baseScore;
  let effectiveBase = ensemble.baseScore;
  const rawTraces: TrainedTreeTrace[] = [];

  for (let idx = 0; idx < ensemble.trees.length; idx++) {
    const root = ensemble.trees[idx];
    effectiveBase += lr * root.ev;

    let cur = root;
    while (cur.f !== undefined && cur.t !== undefined && cur.l && cur.r) {
      const fIdx = cur.f;
      const goLeft = features[fIdx] <= cur.t;
      const child = goLeft ? cur.l : cur.r;
      attributions[fIdx] += lr * (child.ev - cur.ev);
      cur = child;
    }

    const leafVal = cur.v ?? cur.ev;
    rawScore += lr * leafVal;

    const contribLogOdds = lr * leafVal;
    const baseProb = sigmoid(effectiveBase);
    const afterProb = sigmoid(effectiveBase + contribLogOdds);

    rawTraces.push({
      treeIndex: idx + 1,
      contributionLogOdds: Math.round(contribLogOdds * 10000) / 10000,
      contributionPctPts: Math.round((afterProb - baseProb) * 1000) / 10,
      leafValue: Math.round(leafVal * 10000) / 10000,
      root: buildAnnotatedTreeTrace(root, features, ensemble.featureKeys, true),
    });
  }

  rawTraces.sort((a, b) => Math.abs(b.contributionLogOdds) - Math.abs(a.contributionLogOdds));

  return {
    rawScore,
    baseScore: effectiveBase,
    attributions,
    treeTraces: rawTraces.slice(0, topK),
  };
}

export interface TrainHistogramXGBoostOptions {
  objective: 'logistic' | 'regression';
  featureKeys: string[];
  trees: number;
  depth: number;
  learningRate: number;
  lambda: number;
  minChildWeight: number;
  gamma: number;
  colsampleByTree: number;
  subsample: number;
  monotoneConstraints?: number[];
  bins?: number;
  seed?: number;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Trains a quantile-binned Histogram XGBoost ensemble with exact second-order
 * Newton splitting, L2 regularization, monotonicity constraints, and bottom-up
 * expected-value (`ev`) calculation for exact zero-drift Saabas attribution.
 */
export function trainHistogramXGBoost(
  X: number[][],
  y: number[],
  opts: TrainHistogramXGBoostOptions
): SerializedGBDTEnsemble {
  const n = X.length;
  const nf = opts.featureKeys.length;
  const B = opts.bins ?? 20;

  const edges: number[][] = [];
  const binned: Uint8Array[] = [];
  for (let f = 0; f < nf; f++) {
    const vals = new Float64Array(n);
    for (let i = 0; i < n; i++) vals[i] = X[i][f];
    vals.sort();
    const e: number[] = [];
    for (let q = 1; q < B; q++) {
      const v = round4(vals[Math.floor((q / B) * n)]);
      if (e.length === 0 || v > e[e.length - 1]) e.push(v);
    }
    edges.push(e);
    const col = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      let lo = 0;
      let hi = e.length;
      const v = X[i][f];
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (v <= e[m]) hi = m;
        else lo = m + 1;
      }
      col[i] = lo;
    }
    binned.push(col);
  }

  let meanY = 0;
  for (let i = 0; i < n; i++) meanY += y[i];
  meanY /= Math.max(1, n);

  const clampedP = Math.min(0.95, Math.max(0.05, meanY));
  const baseScore = round4(
    opts.objective === 'logistic' ? Math.log(clampedP / (1 - clampedP)) : meanY
  );
  const raw = new Float64Array(n).fill(baseScore);
  const g = new Float64Array(n);
  const h = new Float64Array(n);
  const trees: SerializedTreeNode[] = [];

  let seed = opts.seed ?? 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  function buildNode(
    idxs: number[],
    depth: number,
    loBound: number,
    hiBound: number
  ): { node: SerializedTreeNode; count: number } {
    let G = 0;
    let H = 0;
    for (const i of idxs) {
      G += g[i];
      H += h[i];
    }
    const leafVal = round4(Math.min(hiBound, Math.max(loBound, -G / (H + opts.lambda))));
    if (depth >= opts.depth || H < opts.minChildWeight * 2 || idxs.length < 80) {
      return { node: { v: leafVal, ev: leafVal }, count: idxs.length };
    }

    const parentScore = (G * G) / (H + opts.lambda);
    let bestGain = opts.gamma;
    let bestF = -1;
    let bestBin = -1;
    let bestWL = 0;
    let bestWR = 0;

    for (let f = 0; f < nf; f++) {
      if (rand() > opts.colsampleByTree) continue;
      const mono = opts.monotoneConstraints?.[f] ?? 0;
      const e = edges[f];
      const nb = e.length + 1;
      const col = binned[f];
      const bG = new Float64Array(nb);
      const bH = new Float64Array(nb);
      for (const i of idxs) {
        const b = col[i];
        bG[b] += g[i];
        bH[b] += h[i];
      }

      let GL = 0;
      let HL = 0;
      for (let b = 0; b < e.length; b++) {
        GL += bG[b];
        HL += bH[b];
        const GR = G - GL;
        const HR = H - HL;
        if (HL < opts.minChildWeight || HR < opts.minChildWeight) continue;

        const wL = Math.min(hiBound, Math.max(loBound, -GL / (HL + opts.lambda)));
        const wR = Math.min(hiBound, Math.max(loBound, -GR / (HR + opts.lambda)));
        if (mono > 0 && wL > wR) continue;
        if (mono < 0 && wL < wR) continue;

        const gain =
          0.5 *
          ((GL * GL) / (HL + opts.lambda) +
            (GR * GR) / (HR + opts.lambda) -
            parentScore);
        if (gain > bestGain) {
          bestGain = gain;
          bestF = f;
          bestBin = b;
          bestWL = wL;
          bestWR = wR;
        }
      }
    }

    if (bestF === -1) {
      return { node: { v: leafVal, ev: leafVal }, count: idxs.length };
    }

    const thr = edges[bestF][bestBin];
    const col = binned[bestF];
    const leftIdxs: number[] = [];
    const rightIdxs: number[] = [];
    for (const i of idxs) {
      if (col[i] <= bestBin) leftIdxs.push(i);
      else rightIdxs.push(i);
    }

    const mono = opts.monotoneConstraints?.[bestF] ?? 0;
    const mid = 0.5 * (bestWL + bestWR);
    const leftHi = mono > 0 ? Math.min(hiBound, mid) : hiBound;
    const rightLo = mono > 0 ? Math.max(loBound, mid) : loBound;
    const leftLo = mono < 0 ? Math.max(loBound, mid) : loBound;
    const rightHi = mono < 0 ? Math.min(hiBound, mid) : hiBound;

    const leftRes = buildNode(leftIdxs, depth + 1, leftLo, leftHi);
    const rightRes = buildNode(rightIdxs, depth + 1, rightLo, rightHi);
    const totalCount = Math.max(1, leftRes.count + rightRes.count);
    const ev = round4(
      (leftRes.count * leftRes.node.ev + rightRes.count * rightRes.node.ev) /
        totalCount
    );

    return {
      node: {
        f: bestF,
        t: thr,
        l: leftRes.node,
        r: rightRes.node,
        ev,
      },
      count: totalCount,
    };
  }

  const allIdx = Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < opts.trees; t++) {
    for (let i = 0; i < n; i++) {
      if (opts.objective === 'logistic') {
        const p = sigmoid(raw[i]);
        g[i] = p - y[i];
        h[i] = Math.max(1e-6, p * (1 - p));
      } else {
        g[i] = raw[i] - y[i];
        h[i] = 1.0;
      }
    }
    const subIdx = allIdx.filter(() => rand() < opts.subsample);
    const built = buildNode(subIdx.length >= 80 ? subIdx : allIdx, 0, -10, 10);
    trees.push(built.node);
    for (let i = 0; i < n; i++) {
      raw[i] += opts.learningRate * predictTreeLeaf(built.node, X[i]);
    }
  }

  return {
    objective: opts.objective,
    baseScore,
    learningRate: opts.learningRate,
    featureKeys: opts.featureKeys,
    trees,
  };
}
