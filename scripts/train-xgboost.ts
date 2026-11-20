import fs from 'fs/promises';
import path from 'path';
import { TICKER_DEFINITIONS } from '../src/lib/xgboost-engine';
import {
  DIRECTION_FEATURE_KEYS,
  VOL_FEATURE_KEYS,
  OHLCVBar,
  TrainedXGBoostArtifact,
  calculateSMAValue,
  extractQuantFeatureVector,
  predictEnsembleScore,
  sigmoid,
  trainHistogramXGBoost,
} from '../src/lib/xgboost-gbdt';
import { ModelValidationMetrics } from '../src/types/market';

async function fetch5yOHLCV(symbol: string): Promise<OHLCVBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5y&interval=1d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Yahoo Finance returned ${res.status} for ${symbol}`);
  }
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const bars: OHLCVBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i] ?? 0;
    if (
      typeof o === 'number' &&
      typeof h === 'number' &&
      typeof l === 'number' &&
      typeof c === 'number' &&
      c > 0 &&
      Number.isFinite(c)
    ) {
      bars.push({
        t: Math.floor(timestamps[i] / 86400),
        o,
        h,
        l,
        c,
        v: typeof v === 'number' && Number.isFinite(v) ? v : 0,
      });
    }
  }
  return bars;
}

function buildMacroLookup(bars: OHLCVBar[]) {
  const closes = bars.map((b) => b.c);
  const map = new Map<number, { c: number; s20: number; r1: number; r5: number }>();
  for (let i = 0; i < bars.length; i++) {
    const c = bars[i].c;
    const s20 = calculateSMAValue(closes, 20, i);
    const r1 = i >= 1 ? ((c / closes[i - 1]) - 1) * 100 : 0;
    const r5 = i >= 5 ? ((c / closes[i - 5]) - 1) * 100 : 0;
    map.set(bars[i].t, { c, s20, r1, r5 });
  }
  return map;
}

function realizedAnnVolSlice(closes: number[], endIndex: number, period: number): number {
  const start = Math.max(1, endIndex - period + 1);
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = start; i <= endIndex; i++) {
    const lr = Math.log(closes[i] / closes[i - 1]);
    sum += lr;
    sumSq += lr * lr;
    count++;
  }
  const mean = sum / Math.max(1, count);
  const v = Math.max(1e-10, (sumSq - count * mean * mean) / Math.max(1, count - 1));
  return Math.sqrt(v) * Math.sqrt(252) * 100;
}

function legacyHeuristicSignal(quotes15: number[], changePct1d: number, sectorMean1d: number): {
  signal: number;
  low: number;
  high: number;
} {
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < quotes15.length; i++) {
    const d = quotes15[i] - quotes15[i - 1];
    if (d > 0) gains += d;
    else losses += Math.abs(d);
  }
  const rsi14 = losses === 0 ? 100 : gains === 0 ? 0 : 100 - 100 / (1 + gains / losses);
  const sma5 = quotes15.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, quotes15.length);
  const sma15 = quotes15.reduce((a, b) => a + b, 0) / quotes15.length;

  let treeSum = 0;
  if (changePct1d >= 2.0) treeSum += 0.35;
  else if (changePct1d >= 0.5) treeSum += 0.25;
  else if (changePct1d < -2.0) treeSum -= 0.55;
  else if (changePct1d < -0.5) treeSum -= 0.30;

  if (rsi14 < 30) treeSum += 0.30;
  else if (rsi14 > 70) treeSum -= 0.30;

  if (sma5 > sma15 * 1.012) treeSum += 0.25;
  else if (sma5 < sma15 * 0.988) treeSum -= 0.25;

  const relAlpha = changePct1d - sectorMean1d;
  if (relAlpha > 2.0) treeSum += 0.25;
  else if (relAlpha < -2.0) treeSum -= 0.25;
  else treeSum += relAlpha * 0.05;

  treeSum += changePct1d >= 0 ? 0.12 : -0.10;
  const sig = Math.tanh(treeSum);

  const rets: number[] = [];
  for (let i = 1; i < quotes15.length; i++) rets.push((quotes15[i] - quotes15[i - 1]) / quotes15[i - 1]);
  const meanR = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
  const varR = rets.reduce((a, b) => a + (b - meanR) ** 2, 0) / Math.max(1, rets.length - 1);
  const dailyVol = Math.sqrt(varR);
  const cur = quotes15[quotes15.length - 1];
  const drift = cur * (sig * 0.07);
  const spread = Math.max(cur * 0.035, cur * (dailyVol * Math.sqrt(21) * 1.25));
  return {
    signal: sig,
    low: cur + drift - spread,
    high: cur + drift + spread,
  };
}

interface TrainingRow {
  day: number;
  xDir: number[];
  xVol: number[];
  yDir5: number;
  fwd5: number;
  yAlpha5: number;
  yLogVol21: number;
  yHiVol21: number;
  price: number;
  fwd21Close: number;
  oldSig: number;
  oldInCh: number;
}

const DIRECTION_MONOTONE = [-1, -1, -1, -1, -1, -1, -1, 0, 0, 1, 1, 0];
const ALPHA_MONOTONE = [-1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0];

async function main() {
  console.log('Fetching 5-year daily OHLCV history for macro benchmarks + 30 equities...');
  const [vixBars, qqqBars, smhBars] = await Promise.all([
    fetch5yOHLCV('^VIX'),
    fetch5yOHLCV('QQQ'),
    fetch5yOHLCV('SMH'),
  ]);
  const vixMap = buildMacroLookup(vixBars);
  const qqqMap = buildMacroLookup(qqqBars);
  const smhMap = buildMacroLookup(smhBars);

  const tickerSeries = await Promise.all(
    TICKER_DEFINITIONS.map(async (def) => ({
      def,
      bars: await fetch5yOHLCV(def.symbol),
    }))
  );

  console.log(
    `Loaded ${tickerSeries.length} tickers (min bars: ${Math.min(...tickerSeries.map((s) => s.bars.length))}). Extracting stationary features...`
  );

  const byDay = new Map<number, Omit<TrainingRow, 'yAlpha5'>[]>();

  for (const { def, bars } of tickerSeries) {
    const closes = bars.map((b) => b.c);
    const isChip = def.category === 'CHIPS_HARDWARE';

    for (let i = 200; i < bars.length - 21; i++) {
      const b = bars[i];
      const vix = vixMap.get(b.t);
      const qqq = qqqMap.get(b.t);
      const smh = smhMap.get(b.t);
      if (!vix || !qqq || !smh) continue;

      const extracted = extractQuantFeatureVector(
        bars,
        {
          vixLevel: vix.c,
          vixSma20: vix.s20,
          vixChange5dPct: vix.r5,
          qqqChange5dPct: qqq.r5,
          smhChange5dPct: smh.r5,
          qqqChange1dPct: qqq.r1,
          smhChange1dPct: smh.r1,
        },
        isChip,
        undefined,
        i
      );

      const fwd5 = ((closes[i + 5] / b.c) - 1) * 100;
      const fwdVol21 = realizedAnnVolSlice(closes, i + 21, 21);
      const old = legacyHeuristicSignal(closes.slice(i - 14, i + 1), extracted.indicators.return1dPct, qqq.r1);
      const fwd21Close = closes[i + 21];

      const row: Omit<TrainingRow, 'yAlpha5'> = {
        day: b.t,
        xDir: extracted.directionVector,
        xVol: extracted.volVector,
        yDir5: fwd5 > 0 ? 1 : 0,
        fwd5,
        yLogVol21: Math.log(Math.max(5, fwdVol21)),
        yHiVol21: fwdVol21 > 45 ? 1 : 0,
        price: b.c,
        fwd21Close,
        oldSig: old.signal,
        oldInCh: fwd21Close >= old.low && fwd21Close <= old.high ? 1 : 0,
      };

      const bucket = byDay.get(b.t) ?? [];
      bucket.push(row);
      byDay.set(b.t, bucket);
    }
  }

  const days = [...byDay.keys()].sort((a, b) => a - b);
  const allRows: TrainingRow[] = [];
  for (const d of days) {
    const list = byDay.get(d)!;
    if (list.length < 18) continue;
    const sortedFwd = list.map((r) => r.fwd5).sort((a, b) => a - b);
    const medianFwd5 = sortedFwd[Math.floor(sortedFwd.length / 2)];
    for (const r of list) {
      allRows.push({
        ...r,
        yAlpha5: r.fwd5 > medianFwd5 ? 1 : 0,
      });
    }
  }

  console.log(`Constructed ${allRows.length} aligned panel samples across ${days.length} trading days.`);

  // 4-fold expanding-window purged walk-forward validation (22-day embargo gap prevents forward overlap)
  const folds = [0.5, 0.62, 0.74, 0.86];
  let oosTot = 0;
  let oosDirOk = 0;
  let oosOldOk = 0;
  let oosBrier = 0;
  let oosBaseBrier = 0;
  let oosAlphaOk = 0;
  let oosVolRegOk = 0;
  let oosVolSqErr = 0;
  let oosVolSqTot = 0;
  let oosNewChCov = 0;
  let oosOldChCov = 0;

  for (let f = 0; f < folds.length; f++) {
    const trEndIdx = Math.floor(days.length * folds[f]);
    const teStartIdx = trEndIdx + 22;
    const teEndIdx = f + 1 < folds.length ? Math.floor(days.length * folds[f + 1]) : days.length - 1;
    const train = allRows.filter((r) => r.day <= days[trEndIdx]);
    const test = allRows.filter((r) => r.day >= days[teStartIdx] && r.day <= days[teEndIdx]);

    const dirM = trainHistogramXGBoost(
      train.map((r) => r.xDir),
      train.map((r) => r.yDir5),
      {
        objective: 'logistic',
        featureKeys: [...DIRECTION_FEATURE_KEYS],
        trees: 40,
        depth: 2,
        learningRate: 0.05,
        lambda: 120,
        minChildWeight: 100,
        gamma: 1.5,
        colsampleByTree: 0.75,
        subsample: 0.8,
        monotoneConstraints: DIRECTION_MONOTONE,
        seed: 42 + f,
      }
    );

    const alphaM = trainHistogramXGBoost(
      train.map((r) => r.xDir),
      train.map((r) => r.yAlpha5),
      {
        objective: 'logistic',
        featureKeys: [...DIRECTION_FEATURE_KEYS],
        trees: 35,
        depth: 2,
        learningRate: 0.04,
        lambda: 100,
        minChildWeight: 80,
        gamma: 1.2,
        colsampleByTree: 0.75,
        subsample: 0.8,
        monotoneConstraints: ALPHA_MONOTONE,
        seed: 100 + f,
      }
    );

    const volM = trainHistogramXGBoost(
      train.map((r) => r.xVol),
      train.map((r) => r.yLogVol21),
      {
        objective: 'regression',
        featureKeys: [...VOL_FEATURE_KEYS],
        trees: 45,
        depth: 3,
        learningRate: 0.06,
        lambda: 30,
        minChildWeight: 40,
        gamma: 0.2,
        colsampleByTree: 0.8,
        subsample: 0.8,
        seed: 200 + f,
      }
    );

    const hiVolM = trainHistogramXGBoost(
      train.map((r) => r.xVol),
      train.map((r) => r.yHiVol21),
      {
        objective: 'logistic',
        featureKeys: [...VOL_FEATURE_KEYS],
        trees: 40,
        depth: 3,
        learningRate: 0.06,
        lambda: 30,
        minChildWeight: 40,
        gamma: 0.5,
        colsampleByTree: 0.8,
        subsample: 0.8,
        seed: 300 + f,
      }
    );

    const trainMeanY = train.reduce((a, r) => a + r.yDir5, 0) / train.length;
    const trainMeanLogVol = train.reduce((a, r) => a + r.yLogVol21, 0) / train.length;

    let foldDirOk = 0;
    for (const r of test) {
      const pDir = sigmoid(predictEnsembleScore(dirM, r.xDir));
      const pAlpha = sigmoid(predictEnsembleScore(alphaM, r.xDir));
      const pHiVol = sigmoid(predictEnsembleScore(hiVolM, r.xVol));
      const predLogVol = predictEnsembleScore(volM, r.xVol);

      if ((pDir >= 0.5 ? 1 : 0) === r.yDir5) {
        oosDirOk++;
        foldDirOk++;
      }
      if ((r.oldSig >= 0 ? 1 : 0) === r.yDir5) oosOldOk++;
      if ((pAlpha >= 0.5 ? 1 : 0) === r.yAlpha5) oosAlphaOk++;
      if ((pHiVol >= 0.5 ? 1 : 0) === r.yHiVol21) oosVolRegOk++;

      oosBrier += (pDir - r.yDir5) ** 2;
      oosBaseBrier += (trainMeanY - r.yDir5) ** 2;
      oosVolSqErr += (predLogVol - r.yLogVol21) ** 2;
      oosVolSqTot += (r.yLogVol21 - trainMeanLogVol) ** 2;

      const predAnnVol = Math.exp(predLogVol) / 100;
      const spread80 = r.price * (predAnnVol / Math.sqrt(252)) * Math.sqrt(21) * 1.28;
      const drift = r.price * ((pDir - 0.5) * 0.08);
      if (r.fwd21Close >= r.price + drift - spread80 && r.fwd21Close <= r.price + drift + spread80) {
        oosNewChCov++;
      }
      oosOldChCov += r.oldInCh;
      oosTot++;
    }

    console.log(
      `Fold ${f + 1}/${folds.length} | train=${train.length} test=${test.length} | OOS Dir=${((foldDirOk / test.length) * 100).toFixed(2)}%`
    );
  }

  const validationMetrics: ModelValidationMetrics = {
    modelVersion: 'xgb-hist-v2.0',
    trainedAt: new Date().toISOString(),
    trainingSamples: allRows.length,
    validationSamples: oosTot,
    horizonDays: 5,
    directionOosAccuracyPct: Math.round((oosDirOk / oosTot) * 10000) / 100,
    oldHeuristicOosAccuracyPct: Math.round((oosOldOk / oosTot) * 10000) / 100,
    brierScore: Math.round((oosBrier / oosTot) * 10000) / 10000,
    baselineBrierScore: Math.round((oosBaseBrier / oosTot) * 10000) / 10000,
    alphaOosAccuracyPct: Math.round((oosAlphaOk / oosTot) * 10000) / 100,
    volRegimeOosAccuracyPct: Math.round((oosVolRegOk / oosTot) * 10000) / 100,
    volRegressorOosR2: Math.round((1 - oosVolSqErr / oosVolSqTot) * 1000) / 1000,
    channel80CoveragePct: Math.round((oosNewChCov / oosTot) * 1000) / 10,
    oldChannelCoveragePct: Math.round((oosOldChCov / oosTot) * 1000) / 10,
  };

  console.log('\n=== 4-FOLD PURGED WALK-FORWARD OOS RESULTS ===');
  console.log(validationMetrics);

  // Train final production ensembles on 100% of historical samples
  console.log('\nTraining final production multi-head ensembles on full corpus...');
  const directionModel = trainHistogramXGBoost(
    allRows.map((r) => r.xDir),
    allRows.map((r) => r.yDir5),
    {
      objective: 'logistic',
      featureKeys: [...DIRECTION_FEATURE_KEYS],
      trees: 40,
      depth: 2,
      learningRate: 0.05,
      lambda: 120,
      minChildWeight: 100,
      gamma: 1.5,
      colsampleByTree: 0.75,
      subsample: 0.8,
      monotoneConstraints: DIRECTION_MONOTONE,
      seed: 2026,
    }
  );

  const alphaModel = trainHistogramXGBoost(
    allRows.map((r) => r.xDir),
    allRows.map((r) => r.yAlpha5),
    {
      objective: 'logistic',
      featureKeys: [...DIRECTION_FEATURE_KEYS],
      trees: 35,
      depth: 2,
      learningRate: 0.04,
      lambda: 100,
      minChildWeight: 80,
      gamma: 1.2,
      colsampleByTree: 0.75,
      subsample: 0.8,
      monotoneConstraints: ALPHA_MONOTONE,
      seed: 2027,
    }
  );

  const volatilityModel = trainHistogramXGBoost(
    allRows.map((r) => r.xVol),
    allRows.map((r) => r.yLogVol21),
    {
      objective: 'regression',
      featureKeys: [...VOL_FEATURE_KEYS],
      trees: 45,
      depth: 3,
      learningRate: 0.06,
      lambda: 30,
      minChildWeight: 40,
      gamma: 0.2,
      colsampleByTree: 0.8,
      subsample: 0.8,
      seed: 2028,
    }
  );

  const volRegimeModel = trainHistogramXGBoost(
    allRows.map((r) => r.xVol),
    allRows.map((r) => r.yHiVol21),
    {
      objective: 'logistic',
      featureKeys: [...VOL_FEATURE_KEYS],
      trees: 40,
      depth: 3,
      learningRate: 0.06,
      lambda: 30,
      minChildWeight: 40,
      gamma: 0.5,
      colsampleByTree: 0.8,
      subsample: 0.8,
      seed: 2029,
    }
  );

  const artifact: TrainedXGBoostArtifact = {
    modelVersion: validationMetrics.modelVersion,
    trainedAt: validationMetrics.trainedAt,
    tickerCount: tickerSeries.length,
    validationMetrics,
    directionModel,
    alphaModel,
    volatilityModel,
    volRegimeModel,
  };

  const outPath = path.join(process.cwd(), 'data', 'xgboost-model.json');
  await fs.writeFile(outPath, JSON.stringify(artifact), 'utf8');
  const stats = await fs.stat(outPath);
  console.log(`Saved trained artifact to ${outPath} (${(stats.size / 1024).toFixed(1)} KB).`);
}

main().catch((err) => {
  console.error('Training failed:', err);
  process.exit(1);
});
