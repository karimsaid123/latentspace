import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  TICKER_DEFINITIONS, 
  calculateArticleSentiment, 
  correlateArticlesForTicker, 
  runXGBoostQuantModel 
} from '../src/lib/xgboost-engine';
import { 
  VERIFIED_MARKET_SNAPSHOT, 
  getMarketOverview 
} from '../src/lib/stocks-client';
import { TickerSymbol } from '../src/types/market';

describe('AI & Silicon Markets Quant Engine Suite', () => {
  it('validates all ticker definitions and market categories', () => {
    assert.ok(Array.isArray(TICKER_DEFINITIONS));
    assert.equal(TICKER_DEFINITIONS.length, 12);

    const validCategories = new Set(['CHIPS_HARDWARE', 'HYPERSCALERS', 'AI_ENTERPRISE']);
    const expectedSymbols: TickerSymbol[] = [
      'NVDA', 'MSFT', 'GOOGL', 'META', 'TSM', 'AMD', 'AMZN', 'AAPL', 'PLTR', 'AVGO', 'ASML', 'ARM'
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
    assert.equal(symbols.length, 12);

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

  it('resolves market overview with full stock roster and macro sentiment', async () => {
    const overview = await getMarketOverview();
    assert.ok(overview);
    assert.equal(overview.stocks.length, 12);
    assert.ok(typeof overview.macroSentimentScore === 'number');
    assert.ok(overview.disclaimer.includes('NOT FINANCIAL ADVICE'));
    
    const nvda = overview.stocks.find(s => s.symbol === 'NVDA');
    assert.ok(nvda);
    assert.ok(nvda.currentPrice > 0);
    assert.ok(nvda.prediction);
  });
});

