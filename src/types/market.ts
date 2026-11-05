export type TickerSymbol =
  | 'NVDA'
  | 'MSFT'
  | 'GOOGL'
  | 'META'
  | 'TSM'
  | 'AMD'
  | 'AMZN'
  | 'AAPL'
  | 'PLTR'
  | 'AVGO'
  | 'ASML'
  | 'ARM'
  | 'TSLA'
  | 'QCOM'
  | 'INTC'
  | 'MU'
  | 'ORCL'
  | 'CRM'
  | 'NOW'
  | 'ADBE'
  | 'IBM'
  | 'SNOW'
  | 'CRWD'
  | 'PANW'
  | 'NET'
  | 'DDOG'
  | 'NFLX'
  | 'UBER'
  | 'COIN'
  | 'SHOP';

export type MarketCategory =
  | 'CHIPS_HARDWARE'
  | 'HYPERSCALERS'
  | 'AUTONOMOUS_ROBOTICS'
  | 'CONSUMER_PLATFORMS'
  | 'AI_ENTERPRISE'
  | 'CLOUD_CYBER';

export type ModelTrajectory =
  | 'BULLISH_EXPANSION'
  | 'BEARISH_CONTRACTION'
  | 'HIGH_VOLATILITY_CHURN'
  | 'RANGE_BOUND_ACCUMULATION';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface NewsCatalyst {
  articleId: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  sentiment: number; // -1.0 (bearish) to +1.0 (bullish)
  correlationWeight: number; // 0.0 to 1.0
  catalystType: string; // e.g. "Hardware Moat", "Efficiency Shift", "Regulatory"
  summarySnippet: string;
  url: string;
}

export interface XGBoostPrediction {
  trajectory: ModelTrajectory;
  confidencePercent: number; // 0 to 100
  signalScore: number; // -1.0 to +1.0
  thesis: string;
  riskLevel: RiskLevel;
  featureImportance: {
    newsSentiment: number;
    dispatchVolume: number;
    priceMomentum: number;
    openSourcePressure: number;
    volatility: number;
  };
  decisionPath: string[];
}

export interface StockQuote {
  symbol: TickerSymbol;
  companyName: string;
  category: MarketCategory;
  sectorLabel: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  currency: string;
  marketCapFormatted: string;
  volumeFormatted: string;
  sparkline: number[];
  high52w?: number;
  low52w?: number;
}

export interface StockAnalysis extends StockQuote {
  prediction: XGBoostPrediction;
  correlatedArticles: NewsCatalyst[];
  lastModelRun: string;
}

export interface MarketOverviewResponse {
  timestamp: string;
  macroSentimentScore: number;
  macroSentimentLabel: string;
  activeDispatchesCount: number;
  stocks: StockAnalysis[];
  disclaimer: string;
}

