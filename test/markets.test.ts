import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  TICKER_DEFINITIONS, 
  TRAINED_MODEL_ARTIFACT,
  calculateArticleSentiment, 
  correlateArticlesForTicker, 
  runXGBoostQuantModel,
  calculateRSI14,
  calculateSMA,
  calculateVolatility,
  calculate30dChannel
} from '../src/lib/xgboost-engine';
import {
  evaluateGBDTWithAttribution,
  extractQuantFeatureVector,
  OHLCVBar,
} from '../src/lib/xgboost-gbdt';
import { 
  VERIFIED_MARKET_SNAPSHOT, 
  getMarketOverview 
} from '../src/lib/stocks-client';
import { TickerSymbol } from '../src/types/market';

describe('AI & Silicon Markets Quant Engine Suite', () => {
  it('validates all ticker definitions and market categories', () => {
    assert.ok(Array.isArray(TICKER_DEFINITIONS));
    assert.equal(TICKER_DEFINITIONS.length, 30);

    const validCategories = new Set([
      'CHIPS_HARDWARE',
      'HYPERSCALERS',
      'AUTONOMOUS_ROBOTICS',
      'CONSUMER_PLATFORMS',
      'AI_ENTERPRISE',
      'CLOUD_CYBER'
    ]);
    const expectedSymbols: TickerSymbol[] = [
      'NVDA', 'MSFT', 'GOOGL', 'META', 'TSM', 'AMD', 'AMZN', 'AAPL', 'PLTR', 'AVGO', 'ASML', 'ARM',
      'TSLA', 'QCOM', 'INTC', 'MU', 'ORCL', 'CRM', 'NOW', 'ADBE', 'IBM', 'SNOW', 'CRWD', 'PANW', 'NET', 'DDOG', 'NFLX', 'UBER', 'COIN', 'SHOP'
    ];

    for (const def of TICKER_DEFINITIONS) {
      assert.ok(expectedSymbols.includes(def.symbol));
      assert.ok(def.companyName && def.companyName.length > 2);
      assert.ok(validCategories.has(def.category));
      assert.ok(Array.isArray(def.keywords) && def.keywords.length >= 3);
      assert.ok(def.sectorLabel && def.sectorLabel.length > 5);
    }
  });

  it('validates verified market snapshot fallback data integrity', () => {
    const symbols = Object.keys(VERIFIED_MARKET_SNAPSHOT) as TickerSymbol[];
    assert.equal(symbols.length, 30);

    for (const sym of symbols) {
      const snap = VERIFIED_MARKET_SNAPSHOT[sym];
      assert.ok(snap.price > 0, `${sym} price must be > 0`);
      assert.ok(typeof snap.changePercent === 'number');
      assert.ok(typeof snap.changeAmount === 'number');
      assert.ok(snap.marketCap.startsWith('$'));
      assert.ok(Array.isArray(snap.sparkline) && snap.sparkline.length >= 8);
      assert.ok(snap.high52w && snap.high52w > snap.low52w);
    }
  });

  it('calculates NLP sentiment and identifies catalyst classification correctly', () => {
    const bullText = 'NVIDIA unveils record compute acceleration and massive Blackwell deployment';
    const bullResult = calculateArticleSentiment(bullText);
    assert.ok(bullResult.score > 0, `Expected positive score for bullish text, got ${bullResult.score}`);
    assert.equal(bullResult.catalystType, 'Compute Capacity & Hardware Moat');

    const bearText = 'Antitrust monopoly probe and export curb threatens semiconductor margin collapse';
    const bearResult = calculateArticleSentiment(bearText);
    assert.ok(bearResult.score < 0, `Expected negative score for bearish text, got ${bearResult.score}`);
    assert.equal(bearResult.catalystType, 'Regulatory & Export Dynamics');
  });

  it('correlates articles to appropriate tickers with correlation weights', () => {
    const mockArticles = [
      {
        id: 'art-nvda',
        title: 'NVIDIA B200 Blackwell clusters reach unprecedented throughput',
        contentSnippet: 'Massive compute deployment across hyperscalers boosts hardware demand.',
        sourceName: 'arXiv',
        publishedAt: '2026-11-05T12:00:00Z',
        canonicalUrl: 'https://example.com/nvda'
      },
      {
        id: 'art-googl',
        title: 'Google DeepMind achieves breakthrough with Gemini 4 reasoning architecture',
        contentSnippet: 'TPU v6 infrastructure accelerates frontier model training.',
        sourceName: 'Google Research',
        publishedAt: '2026-11-05T13:00:00Z',
        canonicalUrl: 'https://example.com/googl'
      }
    ];

    const nvdaDef = TICKER_DEFINITIONS.find(t => t.symbol === 'NVDA')!;
    const nvdaMatches = correlateArticlesForTicker(mockArticles, nvdaDef);
    assert.ok(nvdaMatches.length >= 1);
    assert.equal(nvdaMatches[0].articleId, 'art-nvda');
    assert.ok(nvdaMatches[0].correlationWeight > 0.5);

    const googlDef = TICKER_DEFINITIONS.find(t => t.symbol === 'GOOGL')!;
    const googlMatches = correlateArticlesForTicker(mockArticles, googlDef);
    assert.ok(googlMatches.length >= 1);
    assert.equal(googlMatches[0].articleId, 'art-googl');
  });

  it('runs XGBoost GBDT quant model and produces bounded confidence and valid decision paths', () => {
    const catalysts = [
      {
        articleId: '1',
        title: 'NVIDIA accelerates GPU shipment volume',
        sourceName: 'TechWire',
        publishedAt: '2026-11-05T00:00:00Z',
        sentiment: 0.8,
        correlationWeight: 0.9,
        catalystType: 'Compute Capacity & Hardware Moat',
        summarySnippet: 'High demand.',
        url: 'https://example.com'
      },
      {
        articleId: '2',
        title: 'Record revenue beat driven by Blackwell architectures',
        sourceName: 'Reuters',
        publishedAt: '2026-11-05T01:00:00Z',
        sentiment: 0.7,
        correlationWeight: 0.95,
        catalystType: 'Enterprise Adoption & Revenue Conversion',
        summarySnippet: 'Strong earnings.',
        url: 'https://example.com'
      }
    ];

    const prediction = runXGBoostQuantModel('NVDA', 'NVIDIA Corporation', 3.5, catalysts);
    
    assert.equal(prediction.trajectory, 'BULLISH_EXPANSION');
    assert.ok(prediction.confidencePercent >= 50 && prediction.confidencePercent <= 100);
    assert.ok(prediction.signalScore >= -1.0 && prediction.signalScore <= 1.0);
    assert.ok(prediction.thesis.length > 20);
    assert.ok(Array.isArray(prediction.decisionPath) && prediction.decisionPath.length >= 2);
    
    // Feature weights sum to 1.0
    const sumWeights = Object.values(prediction.featureImportance).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sumWeights - 1.0) < 0.01, `Feature weights should sum to 1.0, got ${sumWeights}`);

    // Verify Bearish Contraction when momentum is down with negative catalysts
    const bearCatalysts = [
      {
        articleId: '3',
        title: 'Antitrust probe targets enterprise cloud licensing',
        sourceName: 'FT',
        publishedAt: '2026-11-05T00:00:00Z',
        sentiment: -0.6,
        correlationWeight: 0.9,
        catalystType: 'Regulatory & Export Dynamics',
        summarySnippet: 'Friction.',
        url: 'https://example.com'
      }
    ];
    const bearPred = runXGBoostQuantModel('MSFT', 'Microsoft Corporation', -2.8, bearCatalysts);
    assert.equal(bearPred.trajectory, 'BEARISH_CONTRACTION');
    assert.ok(bearPred.signalScore < 0);

    // Verify High Volatility Churn on extreme swings
    const churnPred = runXGBoostQuantModel('NVDA', 'NVIDIA Corporation', -6.5, catalysts);
    assert.equal(churnPred.trajectory, 'HIGH_VOLATILITY_CHURN');
    assert.equal(churnPred.riskLevel, 'EXTREME');

    // Verify Range-Bound Accumulation on neutral flat action
    const flatPred = runXGBoostQuantModel('PLTR', 'Palantir Technologies', 0.1, []);
    assert.equal(flatPred.trajectory, 'RANGE_BOUND_ACCUMULATION');
    assert.equal(flatPred.riskLevel, 'LOW');
  });

  it('computes accurate multi-horizon technical indicators and 30-day target channels', () => {
    const quotes = [100, 102, 105, 103, 108, 112, 110, 115, 120, 122];
    const rsi = calculateRSI14(quotes);
    assert.ok(rsi >= 0 && rsi <= 100);
    assert.ok(rsi > 60, 'Consecutive gains should yield high RSI');

    const sma5 = calculateSMA(quotes, 5);
    assert.ok(sma5 > 100);

    const vol = calculateVolatility(quotes);
    assert.ok(vol.annualizedVol > 0);

    const channel = calculate30dChannel(122, vol.dailyVol, 0.5);
    assert.ok(channel.low < channel.base);
    assert.ok(channel.base < channel.high);
    assert.ok(channel.low > 0);
  });

  it('resolves market overview with full stock roster and macro sentiment', async () => {
    const overview = await getMarketOverview();
    assert.ok(overview);
    assert.equal(overview.stocks.length, 30);
    assert.ok(typeof overview.macroSentimentScore === 'number');
    assert.ok(overview.disclaimer.includes('NOT FINANCIAL ADVICE'));
    
    const nvda = overview.stocks.find(s => s.symbol === 'NVDA');
    assert.ok(nvda);
    assert.ok(nvda.currentPrice > 0);
    assert.ok(nvda.prediction);
    assert.ok(typeof nvda.prediction.rsi14 === 'number');
    assert.ok(nvda.prediction.expected30dChannel);
    assert.ok(nvda.prediction.expected30dChannel.low < nvda.prediction.expected30dChannel.high);

    const tsla = overview.stocks.find(s => s.symbol === 'TSLA');
    assert.ok(tsla);
    assert.equal(tsla.category, 'AUTONOMOUS_ROBOTICS');
    assert.ok(overview.modelValidation && overview.modelValidation.trainingSamples > 10000);
    assert.ok(overview.macroRegime && overview.macroRegime.vixLevel > 0);
  });

  it('rejects naive substring false positives in entity news correlation', () => {
    const trapArticles = [
      {
        id: 'trap-1',
        title: 'Operating on an updated architecture designed for agent swarms',
        contentSnippet: 'Swarm coordination across robotic arms improves warehouse picking.',
        sourceName: 'TechWire',
        publishedAt: new Date().toISOString(),
        canonicalUrl: 'https://example.com/swarm',
      },
      {
        id: 'trap-2',
        title: 'Airbnb says it is launching an AI travel agent using Muse and Instinct',
        contentSnippet: 'The workflow runs across multi-node n2 and n3 Kubernetes workers.',
        sourceName: 'TechCrunch',
        publishedAt: new Date().toISOString(),
        canonicalUrl: 'https://example.com/airbnb',
      },
      {
        id: 'trap-3',
        title: 'Midterm elections 2026: dramatic shifts in voter turnout and gig workers',
        contentSnippet: 'No hardware or chip makers were involved in this poll.',
        sourceName: 'The Verge',
        publishedAt: new Date().toISOString(),
        canonicalUrl: 'https://example.com/midterm',
      },
    ];

    for (const sym of ['ARM', 'AMD', 'TSM', 'NOW', 'NET', 'MU'] as TickerSymbol[]) {
      const def = TICKER_DEFINITIONS.find(t => t.symbol === sym)!;
      const matches = correlateArticlesForTicker(trapArticles, def);
      assert.equal(matches.length, 0, `${sym} should have 0 false-positive matches, got ${matches.map(m => m.title).join('; ')}`);
    }
  });

  it('handles negation, financial risk signals, and driver tags in sentiment NLP', () => {
    const secProbe = calculateArticleSentiment('', 'Nvidia stock extends rout as SEC accounting probe deepens');
    assert.ok(secProbe.score <= -0.5, `Expected strongly bearish score, got ${secProbe.score}`);
    assert.equal(secProbe.label, 'BEARISH');
    assert.ok(secProbe.drivers.length >= 1);

    const negated = calculateArticleSentiment('', 'Company avoids accounting probe and clears regulatory hurdle');
    assert.ok(negated.score > secProbe.score, 'Negated/avoided probe must score higher than active probe');
  });

  it('verifies trained GBDT artifact and exact zero-drift Saabas Tree-Path attribution', () => {
    assert.ok(TRAINED_MODEL_ARTIFACT.directionModel.trees.length >= 20);
    assert.ok(TRAINED_MODEL_ARTIFACT.volatilityModel.trees.length >= 20);
    assert.ok(TRAINED_MODEL_ARTIFACT.validationMetrics.directionOosAccuracyPct > 50);

    // Build synthetic 60-day OHLCV bars
    const bars: OHLCVBar[] = [];
    let price = 150;
    for (let i = 0; i < 60; i++) {
      price = price * (1 + (i % 3 === 0 ? -0.015 : 0.012));
      bars.push({ t: 20000 + i, o: price * 0.99, h: price * 1.02, l: price * 0.98, c: price, v: 25_000_000 });
    }
    const extracted = extractQuantFeatureVector(
      bars,
      { vixLevel: 24.5, vixSma20: 19.0, vixChange5dPct: 22, qqqChange5dPct: -3.5, smhChange5dPct: -5.2 },
      true
    );

    const evalRes = evaluateGBDTWithAttribution(TRAINED_MODEL_ARTIFACT.directionModel, extracted.directionVector, 6);
    const reconstructed = evalRes.baseScore + evalRes.attributions.reduce((a, b) => a + b, 0);
    assert.ok(
      Math.abs(reconstructed - evalRes.rawScore) < 1e-6,
      `Saabas attribution sum (${reconstructed}) must equal rawScore (${evalRes.rawScore})`
    );
    assert.ok(evalRes.treeTraces.length >= 1 && evalRes.treeTraces.length <= 6);
  });

  it('builds complete Glass-Box DecisionTree and dynamic per-stock feature importance', () => {
    const bars: OHLCVBar[] = [];
    let p = 200;
    for (let i = 0; i < 80; i++) {
      p = p * (1 + Math.sin(i * 0.3) * 0.015);
      bars.push({ t: 20000 + i, o: p * 0.995, h: p * 1.015, l: p * 0.985, c: p, v: 18_000_000 });
    }

    const newsNow = new Date().toISOString();
    const nvdaNews = [
      {
        articleId: 'live-1',
        title: 'Nvidia stock drops on SEC accounting probe report',
        sourceName: 'Yahoo Finance',
        publishedAt: newsNow,
        sentiment: -0.82,
        correlationWeight: 0.95,
        catalystType: 'Regulatory & Export Dynamics',
        summarySnippet: 'SEC probe weighs on shares.',
        url: 'https://finance.yahoo.com/news/nvda',
        stream: 'MARKET_NEWS' as const,
        matchType: 'DIRECT' as const,
        sentimentDrivers: ['Accounting probe'],
      },
    ];

    const withNews = runXGBoostQuantModel('NVDA', 'NVIDIA Corporation', -5.2, nvdaNews, bars.slice(-15).map(b => b.c), -2.0, p, {
      ohlcvBars: bars,
      macro: { vixLevel: 28, vixSma20: 20, vixChange5dPct: 30, qqqChange5dPct: -4, smhChange5dPct: -6 },
    });

    const noNews = runXGBoostQuantModel('ASML', 'ASML Holding N.V.', -1.1, [], bars.slice(-15).map(b => b.c), -2.0, p, {
      ohlcvBars: bars,
      macro: { vixLevel: 16, vixSma20: 17, vixChange5dPct: -5, qqqChange5dPct: 1.5, smhChange5dPct: 2.0 },
    });

    const tree = withNews.decisionTree!;
    assert.ok(tree);
    assert.equal(tree.steps.length, 5);
    assert.deepEqual(
      tree.steps.map(s => s.id),
      ['MARKET_MOOD', 'PRICE_TREND', 'STRETCH_CHECK', 'NEWS_CATALYSTS', 'SECTOR_RISK']
    );
    for (const step of tree.steps) {
      assert.equal(step.chosenBranch.isTaken, true);
      assert.equal(step.alternativeBranch.isTaken, false);
      assert.ok(step.question.length > 10);
    }
    const newsStep = tree.steps.find(s => s.id === 'NEWS_CATALYSTS')!;
    assert.equal(newsStep.evidenceArticles?.length, 1);
    assert.ok((newsStep.evidenceArticles![0].modelImpactPctPts ?? 0) < 0);
    assert.equal(tree.finalProbabilityPct, withNews.upProbabilityPct);
    assert.ok(tree.verdictHeadline.length > 5);

    // Verify dynamic per-stock feature importance differs when inputs differ
    assert.notEqual(
      withNews.featureImportance.newsSentiment,
      noNews.featureImportance.newsSentiment,
      'Feature importance should dynamically reflect stock-specific news and macro drivers'
    );
    const sum1 = Object.values(withNews.featureImportance).reduce((a, b) => a + b, 0);
    const sum2 = Object.values(noNews.featureImportance).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum1 - 1.0) < 0.02);
    assert.ok(Math.abs(sum2 - 1.0) < 0.02);
  });
});

