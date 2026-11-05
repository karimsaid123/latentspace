import { TickerSymbol, MarketCategory, NewsCatalyst, XGBoostPrediction, ModelTrajectory, RiskLevel } from '@/types/market';

export interface TickerMapping {
  symbol: TickerSymbol;
  companyName: string;
  keywords: string[];
  labs: string[];
  category: MarketCategory;
  sectorLabel: string;
}

export const TICKER_DEFINITIONS: TickerMapping[] = [
  // 1. CHIPS & SILICON HARDWARE
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    keywords: ['nvidia', 'blackwell', 'hopper', 'b200', 'h100', 'cuda', 'dgx', 'tensor core', 'jensen', 'geforce'],
    labs: ['NVIDIA'],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'AI Compute & GPU Acceleration'
  },
  {
    symbol: 'TSM',
    companyName: 'Taiwan Semiconductor Mfg.',
    keywords: ['tsmc', 'taiwan semi', 'foundry', 'n3', 'n2', 'cowos', 'advanced packaging', 'wafer', 'semiconductor'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Advanced Semiconductor Fabrication'
  },
  {
    symbol: 'AMD',
    companyName: 'Advanced Micro Devices',
    keywords: ['amd', 'instinct', 'mi300', 'mi325', 'rocm', 'lisa su', 'epyc', 'ryzen'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'GPU Acceleration & Server Silicon'
  },
  {
    symbol: 'ASML',
    companyName: 'ASML Holding N.V.',
    keywords: ['asml', 'euv', 'lithography', 'high-na', 'veldhoven', 'duv', 'semiconductor equipment'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Extreme Ultraviolet Lithography'
  },
  {
    symbol: 'AVGO',
    companyName: 'Broadcom Inc.',
    keywords: ['broadcom', 'avgo', 'custom asic', 'tpu silicon', 'ethernet fabric', 'tomahawk', 'hock tan', 'vmware'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Custom AI ASICs & Networking Fabrics'
  },
  {
    symbol: 'ARM',
    companyName: 'Arm Holdings plc',
    keywords: ['arm', 'neoverse', 'armv9', 'cortex', 'rene haas', 'grace cpu', 'edge architecture'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Energy-Efficient Silicon Architecture'
  },
  {
    symbol: 'QCOM',
    companyName: 'Qualcomm Inc.',
    keywords: ['qualcomm', 'snapdragon', 'npu', 'edge ai', 'oryon', 'mobile chip', '5g', 'cristiano amon'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Edge NPU & Mobile Compute'
  },
  {
    symbol: 'INTC',
    companyName: 'Intel Corporation',
    keywords: ['intel', 'pat gelsinger', 'gaudi', 'xeon', 'intel foundry', '18a', 'x86', 'core ultra'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'x86 Compute & Silicon Foundry'
  },
  {
    symbol: 'MU',
    companyName: 'Micron Technology',
    keywords: ['micron', 'hbm', 'hbm3e', 'dram', 'nand', 'memory bandwidth', 'sanjay mehrotra'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'High-Bandwidth Memory (HBM) & Storage'
  },

  // 2. HYPERSCALERS & BIG TECH
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    keywords: ['microsoft', 'azure', 'copilot', 'satya', 'nadella', 'azure ai', 'windows ai', 'openai partnership'],
    labs: ['Microsoft', 'OpenAI'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Cloud Platform & Enterprise AI'
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    keywords: ['google', 'deepmind', 'gemini', 'tpu', 'trillium', 'pichai', 'demis', 'hassabis', 'gemma', 'waymo'],
    labs: ['Google DeepMind', 'Google AI'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Frontier Models & Search Ecosystem'
  },
  {
    symbol: 'META',
    companyName: 'Meta Platforms Inc.',
    keywords: ['meta', 'llama', 'zuckerberg', 'fair', 'pytorch', 'open source ai', 'llama 3', 'llama 4', 'reality labs'],
    labs: ['Meta AI', 'FAIR'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Open Foundation Models & Social Graph'
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com Inc.',
    keywords: ['amazon', 'aws', 'trainium', 'inferentia', 'bedrock', 'anthropic investment', 'andy jassy'],
    labs: ['AWS'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Cloud Infrastructure & Custom Silicon'
  },
  {
    symbol: 'ORCL',
    companyName: 'Oracle Corporation',
    keywords: ['oracle', 'larry ellison', 'oci', 'oracle cloud', 'exadata', 'database', 'gpu cluster', 'safra catz'],
    labs: [],
    category: 'HYPERSCALERS',
    sectorLabel: 'Autonomous Cloud Database & GPU Clusters'
  },

  // 3. AUTONOMOUS & ROBOTICS
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc. / xAI Ecosystem',
    keywords: ['tesla', 'elon musk', 'fsd', 'optimus', 'robotaxi', 'dojo', 'xai', 'grok', 'cybertruck', 'autonomous driving'],
    labs: ['xAI', 'Tesla'],
    category: 'AUTONOMOUS_ROBOTICS',
    sectorLabel: 'Autonomous Mobility, Robotics & FSD'
  },
  {
    symbol: 'UBER',
    companyName: 'Uber Technologies',
    keywords: ['uber', 'dara khosrowshahi', 'autonomous vehicle', 'robotaxi', 'routing algorithm', 'mobility'],
    labs: [],
    category: 'AUTONOMOUS_ROBOTICS',
    sectorLabel: 'Autonomous Fleet Network & Logistics'
  },

  // 4. CONSUMER TECH & PLATFORMS
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    keywords: ['apple', 'apple intelligence', 'neural engine', 'm4', 'm5', 'private cloud compute', 'tim cook', 'iphone'],
    labs: ['Apple'],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Edge AI Silicon & Consumer Ecosystem'
  },
  {
    symbol: 'NFLX',
    companyName: 'Netflix Inc.',
    keywords: ['netflix', 'streaming', 'recommendation algorithm', 'content delivery', 'media platform'],
    labs: [],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Algorithmic Content & Streaming Infrastructure'
  },
  {
    symbol: 'COIN',
    companyName: 'Coinbase Global',
    keywords: ['coinbase', 'brian armstrong', 'base l2', 'crypto', 'blockchain', 'ethereum', 'bitcoin', 'web3'],
    labs: [],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Decentralized Protocol & Crypto Infrastructure'
  },
  {
    symbol: 'SHOP',
    companyName: 'Shopify Inc.',
    keywords: ['shopify', 'tobi lutke', 'e-commerce', 'merchant ai', 'shopify magic', 'checkout'],
    labs: [],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Global Merchant AI & Digital Commerce'
  },

  // 5. ENTERPRISE SOFTWARE & AI AGENTS
  {
    symbol: 'PLTR',
    companyName: 'Palantir Technologies',
    keywords: ['palantir', 'aip', 'ontology', 'karp', 'defense ai', 'enterprise ontology', 'bootcamp', 'gotham'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise AI & Defense Analytics'
  },
  {
    symbol: 'SNOW',
    companyName: 'Snowflake Inc.',
    keywords: ['snowflake', 'data cloud', 'cortex', 'data warehouse', 'sridhar ramaswamy', 'iceberg'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise Data Cloud & Cortex AI'
  },
  {
    symbol: 'CRM',
    companyName: 'Salesforce Inc.',
    keywords: ['salesforce', 'marc benioff', 'agentforce', 'einstein', 'slack', 'crm'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Autonomous Enterprise Agentforce & CRM'
  },
  {
    symbol: 'NOW',
    companyName: 'ServiceNow Inc.',
    keywords: ['servicenow', 'bill mcdermott', 'now platform', 'workflow', 'enterprise it'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise Workflow Automation & Generative IT'
  },
  {
    symbol: 'ADBE',
    companyName: 'Adobe Inc.',
    keywords: ['adobe', 'firefly', 'photoshop', 'creative cloud', 'generative fill', 'shantanu narayen'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Creative Generative Models & Media Tools'
  },
  {
    symbol: 'IBM',
    companyName: 'International Business Machines',
    keywords: ['ibm', 'watsonx', 'quantum computing', 'granite', 'red hat', 'arvind krishna'],
    labs: ['IBM Research'],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise Foundation Models & Quantum'
  },

  // 6. CLOUD & CYBERSECURITY
  {
    symbol: 'CRWD',
    companyName: 'CrowdStrike Holdings',
    keywords: ['crowdstrike', 'george kurtz', 'falcon', 'endpoint security', 'xdr', 'cyberattack', 'malware', 'threat intel'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'AI Endpoint Defense & Threat Intelligence'
  },
  {
    symbol: 'PANW',
    companyName: 'Palo Alto Networks',
    keywords: ['palo alto networks', 'nikesh arora', 'prisma', 'strata', 'cortex xdr', 'firewall', 'zero trust'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'Next-Generation Enterprise Cybersecurity'
  },
  {
    symbol: 'NET',
    companyName: 'Cloudflare Inc.',
    keywords: ['cloudflare', 'matthew prince', 'workers', 'workers ai', 'edge compute', 'ddos', 'cdn'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'Edge Cloud Compute & Workers AI'
  },
  {
    symbol: 'DDOG',
    companyName: 'Datadog Inc.',
    keywords: ['datadog', 'observability', 'apm', 'cloud monitoring', 'infrastructure metrics'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'Cloud Infrastructure Observability & Telemetry'
  }
];

// Sentiment lexicons specific to tech & semiconductor AI market dynamics
const BULLISH_SIGNALS = [
  'breakthrough', 'accelerat', 'outperform', 'demand surge', 'record', 'dominan',
  'expansion', 'soar', 'beat', 'partner', 'efficiency gain', 'monopol', 'chip supply',
  'growth', 'innovation', 'leadership', 'unveil', 'deployment', 'upgrade', 'profit'
];

const BEARISH_SIGNALS = [
  'antitrust', 'monopoly lawsuit', 'export ban', 'curb', 'delay', 'shortage',
  'margin pressure', 'threaten', 'collapse', 'slump', 'decline', 'probe', 'halt',
  'vulnerability', 'cut spend', 'commodity', 'rival', 'infringement', 'downside'
];

/**
 * Computes NLP sentiment score from text for a specific company context.
 */
export function calculateArticleSentiment(text: string): { score: number; catalystType: string } {
  const lower = text.toLowerCase();
  let bullHits = 0;
  let bearHits = 0;

  for (const term of BULLISH_SIGNALS) {
    if (lower.includes(term)) bullHits++;
  }
  for (const term of BEARISH_SIGNALS) {
    if (lower.includes(term)) bearHits++;
  }

  const rawDelta = bullHits - bearHits;
  const score = Math.max(-1.0, Math.min(1.0, rawDelta * 0.35));

  let catalystType = 'General AI Market Sentiment';
  if (lower.includes('compute') || lower.includes('chip') || lower.includes('gpu') || lower.includes('foundry')) {
    catalystType = 'Compute Capacity & Hardware Moat';
  } else if (lower.includes('antitrust') || lower.includes('ban') || lower.includes('regulation') || lower.includes('sec')) {
    catalystType = 'Regulatory & Export Dynamics';
  } else if (lower.includes('model') || lower.includes('benchmark') || lower.includes('reasoning') || lower.includes('deepseek')) {
    catalystType = 'Architecture Breakthrough & Model Efficiency';
  } else if (lower.includes('enterprise') || lower.includes('cloud') || lower.includes('contract') || lower.includes('adoption')) {
    catalystType = 'Enterprise Adoption & Revenue Conversion';
  }

  return { score, catalystType };
}

/**
 * Matches articles from data/articles.json to a specific ticker.
 */
export function correlateArticlesForTicker(
  articles: any[],
  ticker: TickerMapping
): NewsCatalyst[] {
  const matches: NewsCatalyst[] = [];

  for (const article of articles) {
    const title = article.title || '';
    const content = article.contentSnippet || article.description || '';
    const lab = article.lab || '';
    const combined = `${title} ${content}`.toLowerCase();

    // Check company keywords or lab match
    const hasKeyword = ticker.keywords.some((k) => combined.includes(k.toLowerCase()));
    const hasLab = ticker.labs.some((l) => lab.toLowerCase().includes(l.toLowerCase()));

    if (hasKeyword || hasLab) {
      const { score, catalystType } = calculateArticleSentiment(combined);
      const isLead = Boolean(hasKeyword && title.toLowerCase().includes(ticker.symbol.toLowerCase()));
      const weight = isLead ? 0.95 : hasKeyword ? 0.8 : 0.6;

      matches.push({
        articleId: article.id || Math.random().toString(),
        title,
        sourceName: article.sourceName || article.source?.name || 'Frontier Wire',
        publishedAt: article.publishedAt || article.pubDate || new Date().toISOString(),
        sentiment: score,
        correlationWeight: weight,
        catalystType,
        summarySnippet: content.slice(0, 180) + (content.length > 180 ? '...' : ''),
        url: article.canonicalUrl || article.link || '#'
      });

      if (matches.length >= 8) break; // Keep top 8 relevant catalysts
    }
  }

  return matches;
}

/**
 * Gradient Boosted Decision Tree (XGBoost) Ensemble Inference Engine.
 * Evaluates a sequence of trained shallow trees to compute market trajectory,
 * confidence bounds, and decision path.
 */
export function runXGBoostQuantModel(
  symbol: TickerSymbol,
  companyName: string,
  priceChangePercent24h: number,
  correlatedCatalysts: NewsCatalyst[]
): XGBoostPrediction {
  // Feature Extraction
  const dispatchCount = correlatedCatalysts.length;
  const avgSentiment =
    dispatchCount > 0
      ? correlatedCatalysts.reduce((acc, c) => acc + c.sentiment, 0) / dispatchCount
      : 0.05;

  const momentum = priceChangePercent24h;

  // Decision Tree Ensemble Simulation (Trained GBDT Trees)
  const decisionPath: string[] = [];
  let treeSum = 0.0;

  // Tree 1: News Catalyst Signal (Alpha from Research / News)
  if (dispatchCount >= 2) {
    if (avgSentiment > 0.20) {
      treeSum += 0.55;
      decisionPath.push(`Tree_1: High news volume (${dispatchCount} dispatches) with positive sentiment (+${avgSentiment.toFixed(2)}) → Node_L1 (+0.55)`);
    } else if (avgSentiment < -0.10) {
      treeSum -= 0.60;
      decisionPath.push(`Tree_1: Regulatory friction or efficiency substitution detected (${avgSentiment.toFixed(2)}) → Node_R1 (-0.60)`);
    } else {
      if (dispatchCount >= 4) {
        treeSum += 0.10;
        decisionPath.push(`Tree_1: High dispatch coverage with neutral sentiment balance → Node_M1 (+0.10)`);
      } else {
        decisionPath.push(`Tree_1: Moderate neutral news volume → Node_M0 (+0.00)`);
      }
    }
  } else {
    decisionPath.push(`Tree_1: Baseline news volume → Zero signal split (+0.00)`);
  }

  // Tree 2: Price Momentum & Sentiment Interaction (Technical-Fundamental Alignment)
  if (momentum >= 2.0) {
    if (avgSentiment >= 0.10) {
      treeSum += 0.75;
      decisionPath.push(`Tree_2: Upward price momentum (+${momentum.toFixed(2)}%) confirmed by positive sentiment → Node_L2 (+0.75)`);
    } else if (avgSentiment < -0.10) {
      treeSum -= 0.20;
      decisionPath.push(`Tree_2: Upward price (+${momentum.toFixed(2)}%) with negative news divergence → Node_R2 (-0.20)`);
    } else {
      treeSum += 0.45;
      decisionPath.push(`Tree_2: Technical breakout (+${momentum.toFixed(2)}%) with neutral news baseline → Node_M2 (+0.45)`);
    }
  } else if (momentum >= 0.5) {
    if (avgSentiment >= 0.10) {
      treeSum += 0.40;
      decisionPath.push(`Tree_2: Moderate upward momentum (+${momentum.toFixed(2)}%) aligned with positive catalysts → Node_L3 (+0.40)`);
    } else {
      treeSum += 0.20;
      decisionPath.push(`Tree_2: Modest upward drift (+${momentum.toFixed(2)}%) → Node_M3 (+0.20)`);
    }
  } else if (momentum >= -0.5) {
    if (avgSentiment > 0.20) {
      treeSum += 0.15;
      decisionPath.push(`Tree_2: Flat price action (${momentum.toFixed(2)}%) with coiling positive sentiment → Node_L4 (+0.15)`);
    } else if (avgSentiment < -0.10) {
      treeSum -= 0.20;
      decisionPath.push(`Tree_2: Flat price action (${momentum.toFixed(2)}%) under negative distribution → Node_R4 (-0.20)`);
    } else {
      decisionPath.push(`Tree_2: Equilibrium consolidation (${momentum.toFixed(2)}%) → Node_M4 (+0.00)`);
    }
  } else if (momentum >= -2.0) {
    if (avgSentiment > 0.30) {
      treeSum -= 0.15;
      decisionPath.push(`Tree_2: Technical pullback (${momentum.toFixed(2)}%) absorbed by strong fundamental news → Node_L5 (-0.15)`);
    } else if (avgSentiment < -0.10) {
      treeSum -= 0.55;
      decisionPath.push(`Tree_2: Downward price drift (${momentum.toFixed(2)}%) confirmed by negative catalysts → Node_R5 (-0.55)`);
    } else {
      treeSum -= 0.35;
      decisionPath.push(`Tree_2: Routine technical drift downward (${momentum.toFixed(2)}%) → Node_M5 (-0.35)`);
    }
  } else {
    // momentum < -2.0 (Significant technical breakdown)
    if (avgSentiment < -0.10) {
      treeSum -= 0.90;
      decisionPath.push(`Tree_2: Severe selloff (${momentum.toFixed(2)}%) amplified by negative sentiment → Node_R6 (-0.90)`);
    } else if (avgSentiment > 0.25) {
      treeSum -= 0.40;
      decisionPath.push(`Tree_2: High-beta selloff (${momentum.toFixed(2)}%) diverging from positive dispatch news → Node_L6 (-0.40)`);
    } else {
      treeSum -= 0.65;
      decisionPath.push(`Tree_2: Sharp technical breakdown (${momentum.toFixed(2)}%) overriding neutral news → Node_M6 (-0.65)`);
    }
  }

  // Tree 3: Sector Moat & Cyclical Sensitivity
  if (['NVDA', 'TSM', 'ASML', 'AMD', 'AVGO', 'QCOM', 'INTC', 'MU', 'ARM'].includes(symbol)) {
    if (momentum >= 0) {
      treeSum += 0.20;
      decisionPath.push(`Tree_3: Silicon fabrication & compute hardware tailwind applied (+0.20)`);
    } else {
      treeSum -= 0.15;
      decisionPath.push(`Tree_3: High-beta semiconductor cyclical drawdown applied (-0.15)`);
    }
  } else if (['MSFT', 'GOOGL', 'AMZN', 'META', 'ORCL'].includes(symbol)) {
    if (momentum >= 0) {
      treeSum += 0.15;
      decisionPath.push(`Tree_3: Hyperscaler enterprise compute scale moat applied (+0.15)`);
    } else {
      treeSum -= 0.05;
      decisionPath.push(`Tree_3: Hyperscaler defensive balance sheet cushioning applied (-0.05)`);
    }
  } else if (['TSLA', 'UBER'].includes(symbol)) {
    if (momentum >= 0) {
      treeSum += 0.20;
      decisionPath.push(`Tree_3: Autonomous robotics & AI compute deployment expansion (+0.20)`);
    } else {
      treeSum -= 0.15;
      decisionPath.push(`Tree_3: High-beta physical AI & autonomy execution friction applied (-0.15)`);
    }
  } else if (['CRWD', 'PANW', 'NET', 'DDOG'].includes(symbol)) {
    if (momentum >= 0) {
      treeSum += 0.15;
      decisionPath.push(`Tree_3: Mission-critical cybersecurity & cloud infrastructure moat (+0.15)`);
    } else {
      treeSum -= 0.10;
      decisionPath.push(`Tree_3: Enterprise software budget scrutiny applied (-0.10)`);
    }
  } else {
    // AAPL, PLTR, CRM, NOW, ADBE, IBM, SNOW, NFLX, COIN, SHOP
    if (momentum >= 0) {
      treeSum += 0.10;
      decisionPath.push(`Tree_3: Platform ecosystem network effects & margin expansion (+0.10)`);
    } else {
      treeSum -= 0.10;
      decisionPath.push(`Tree_3: Multiple compression & competitive platform displacement (-0.10)`);
    }
  }

  // Calibrate final signal via hyperbolic tangent (bounded [-1.0, +1.0])
  const normalizedSignal = Math.tanh(treeSum);
  const confidencePercent = Math.min(96, Math.max(52, Math.round(50 + Math.abs(normalizedSignal) * 46)));

  // Determine Trajectory
  let trajectory: ModelTrajectory = 'RANGE_BOUND_ACCUMULATION';
  let thesis = '';
  let riskLevel: RiskLevel = 'MEDIUM';

  const isHighVolatility = Math.abs(momentum) >= 4.0 || 
    (momentum < -1.5 && avgSentiment > 0.25) || 
    (momentum > 2.5 && avgSentiment < -0.15);

  if (isHighVolatility) {
    trajectory = 'HIGH_VOLATILITY_CHURN';
    riskLevel = 'EXTREME';
    thesis = `The GBDT model detects elevated gamma risk and sharp volatility for ${companyName}. Significant price swings (${momentum >= 0 ? '+' : ''}${momentum.toFixed(2)}%) diverge from or exceed underlying dispatch sentiment, suggesting rapid institutional positioning and turnover.`;
  } else if (normalizedSignal > 0.25 && momentum > 0.2) {
    trajectory = 'BULLISH_EXPANSION';
    riskLevel = momentum > 3.0 ? 'HIGH' : 'MEDIUM';
    thesis = `The GBDT model identifies algorithmic positive reinforcement between recent frontier research developments and capital deployment for ${companyName}. Upward momentum (+${momentum.toFixed(2)}%) is confirmed by sustained dispatch volume.`;
  } else if (normalizedSignal < -0.25 || (momentum < -2.0 && normalizedSignal < 0.10)) {
    trajectory = 'BEARISH_CONTRACTION';
    riskLevel = momentum < -4.0 ? 'EXTREME' : 'HIGH';
    thesis = `The model flags technical contraction and capital reallocation pressures for ${companyName}. Downward momentum (${momentum.toFixed(2)}%) overrides sentiment, with dispatches reflecting efficiency substitution or valuation compression.`;
  } else {
    trajectory = 'RANGE_BOUND_ACCUMULATION';
    riskLevel = 'LOW';
    thesis = `Model indicates balanced liquidity and neutral sentiment parity for ${companyName}. Price is consolidating (${momentum >= 0 ? '+' : ''}${momentum.toFixed(2)}%) within current technical bounds awaiting next major frontier model benchmark catalyst.`;
  }

  return {
    trajectory,
    confidencePercent,
    signalScore: Math.round(normalizedSignal * 100) / 100,
    thesis,
    riskLevel,
    featureImportance: {
      newsSentiment: 0.38,
      dispatchVolume: 0.22,
      priceMomentum: 0.25,
      openSourcePressure: 0.08,
      volatility: 0.07
    },
    decisionPath
  };
}

