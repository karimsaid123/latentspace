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
  catalystType: string; // e.g. "Compute Capacity & Hardware Moat", "Regulatory & Export Dynamics"
  summarySnippet: string;
  url: string;
  stream?: 'MARKET_NEWS' | 'AI_RESEARCH';
  matchType?: 'DIRECT' | 'ECOSYSTEM';
  sentimentLabel?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentDrivers?: string[];
  impactLevel?: string;
  modelImpactPctPts?: number;
  ageLabel?: string;
}

export interface PriceChannel30d {
  low: number;
  base: number;
  high: number;
}

export type DecisionTreeStepId =
  | 'MARKET_MOOD'
  | 'PRICE_TREND'
  | 'STRETCH_CHECK'
  | 'NEWS_CATALYSTS'
  | 'SECTOR_RISK';

export interface DecisionTreeBranch {
  label: string;
  condition: string;
  explanation: string;
  isTaken: boolean;
  impactPctPts?: number;
}

export interface DecisionTreeStep {
  id: DecisionTreeStepId;
  stepNumber: number;
  title: string;
  question: string;
  measuredSummary: string;
  technicalDetail: string;
  impactPctPts: number;
  runningProbabilityPct: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  chosenBranch: DecisionTreeBranch;
  alternativeBranch: DecisionTreeBranch;
  evidenceArticles?: NewsCatalyst[];
}

export interface FactorImpactItem {
  id: string;
  label: string;
  plainExplanation: string;
  valueText: string;
  impactPctPts: number;
  category: 'MACRO' | 'TREND' | 'STRETCH' | 'NEWS' | 'RISK';
}

export interface TrainedTreeNodeTrace {
  featureKey?: string;
  humanLabel?: string;
  threshold?: number;
  actualValue?: number;
  wentLeft?: boolean;
  leafValue?: number;
  expectedValue: number;
  left?: TrainedTreeNodeTrace;
  right?: TrainedTreeNodeTrace;
}

export interface TrainedTreeTrace {
  treeIndex: number;
  contributionLogOdds: number;
  contributionPctPts: number;
  leafValue: number;
  root: TrainedTreeNodeTrace;
}

export interface FeatureAttributionItem {
  key: string;
  label: string;
  valueFormatted: string;
  logOddsImpact: number;
  pctPtsImpact: number;
}

export interface ExplainableDecisionTree {
  baseProbabilityPct: number;
  finalProbabilityPct: number;
  horizonLabel: string;
  verdictHeadline: string;
  verdictSummary: string;
  steps: DecisionTreeStep[];
  bullishFactors: FactorImpactItem[];
  bearishFactors: FactorImpactItem[];
  featureAttributions: FeatureAttributionItem[];
  trainedTrees: TrainedTreeTrace[];
}

export interface ModelValidationMetrics {
  modelVersion: string;
  trainedAt: string;
  trainingSamples: number;
  validationSamples: number;
  horizonDays: number;
  directionOosAccuracyPct: number;
  oldHeuristicOosAccuracyPct: number;
  brierScore: number;
  baselineBrierScore: number;
  alphaOosAccuracyPct: number;
  volRegimeOosAccuracyPct: number;
  volRegressorOosR2: number;
  channel80CoveragePct: number;
  oldChannelCoveragePct: number;
}

export interface MacroRegimeSnapshot {
  vixLevel: number;
  vixChange5dPct: number;
  qqqChange1dPct: number;
  qqqChange5dPct: number;
  smhChange1dPct: number;
  smhChange5dPct: number;
  marketBreadthPct: number;
  regimeLabel: 'CALM_RISK_ON' | 'ELEVATED_CAUTION' | 'HIGH_FEAR_STRESS';
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
  rsi14?: number;
  smaTrend?: 'UPWARD_EXPANSION' | 'NEUTRAL_FLAT' | 'DOWNWARD_DRIFT';
  sma5?: number;
  sma15?: number;
  relativeAlpha?: number;
  volatilityAnnualized?: number;
  expected30dChannel?: PriceChannel30d;
  paperVelocityScore?: number;
  upProbabilityPct?: number;
  peerOutperformProbPct?: number;
  highVolRegimeProbPct?: number;
  forecastVolAnnualized?: number;
  rsi5?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  atr14Pct?: number;
  rvol20?: number;
  bbPctB?: number;
  return5dPct?: number;
  return21dPct?: number;
  macdHistNorm?: number;
  decisionTree?: ExplainableDecisionTree;
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
  macroRegime?: MacroRegimeSnapshot;
  modelValidation?: ModelValidationMetrics;
  liveNewsCount?: number;
}
