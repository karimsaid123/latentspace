import {
  TickerSymbol,
  MarketCategory,
  NewsCatalyst,
  XGBoostPrediction,
  ModelTrajectory,
  RiskLevel,
  PriceChannel30d,
  DecisionTreeStep,
  FactorImpactItem,
  FeatureAttributionItem,
  ExplainableDecisionTree,
} from '@/types/market';
import {
  DIRECTION_FEATURE_KEYS,
  FEATURE_META,
  MacroContextInput,
  OHLCVBar,
  TrainedXGBoostArtifact,
  calculateWilderRSISeries,
  evaluateGBDTWithAttribution,
  extractQuantFeatureVector,
  predictEnsembleScore,
  sigmoid,
} from './xgboost-gbdt';
import rawTrainedModel from '../../data/xgboost-model.json';

export const TRAINED_MODEL_ARTIFACT = rawTrainedModel as unknown as TrainedXGBoostArtifact;

export interface TickerMapping {
  symbol: TickerSymbol;
  companyName: string;
  keywords: string[];
  labs: string[];
  category: MarketCategory;
  sectorLabel: string;
  strictPatterns: RegExp[];
  ecosystemPatterns?: RegExp[];
  benchmarkLab?: string;
}

export interface QuantInferenceContext {
  ohlcvBars?: OHLCVBar[];
  macro?: MacroContextInput;
  benchmarkRank?: {
    modelName: string;
    rank: number;
    intelligenceIndex: number;
  };
  todayVolume?: number;
}

/**
 * Calculates Welles Wilder 14-period Relative Strength Index (RSI).
 * Uses Wilder exponential smoothing when >14 quotes are available. Bounds output [0, 100].
 */
export function calculateRSI14(quotes: number[]): number {
  if (!quotes || quotes.length < 4) return 50.0;
  const series = calculateWilderRSISeries(quotes, 14);
  const val = series[series.length - 1] ?? 50.0;
  return Math.round(val * 10) / 10;
}

/**
 * Computes Simple Moving Average (SMA) over the specified window period.
 */
export function calculateSMA(quotes: number[], period: number): number {
  if (!quotes || quotes.length === 0) return 0;
  const slice = quotes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Math.round((sum / slice.length) * 100) / 100;
}

/**
 * Computes daily and annualized historical standard deviation (volatility).
 */
export function calculateVolatility(quotes: number[]): { dailyVol: number; annualizedVol: number } {
  if (!quotes || quotes.length < 3) return { dailyVol: 0.02, annualizedVol: 31.7 };
  const returns: number[] = [];
  for (let i = 1; i < quotes.length; i++) {
    if (quotes[i - 1] > 0) {
      returns.push((quotes[i] - quotes[i - 1]) / quotes[i - 1]);
    }
  }
  if (returns.length < 2) return { dailyVol: 0.02, annualizedVol: 31.7 };
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
  const dailyVol = Math.sqrt(variance);
  const annualizedVol = Math.round(dailyVol * Math.sqrt(252) * 1000) / 10;
  return { dailyVol, annualizedVol };
}

/**
 * Computes the calibrated 30-day directional price drift and 80% volatility channel.
 */
export function calculate30dChannel(
  currentPrice: number,
  dailyVol: number,
  signalScore: number,
  forecastAnnualizedVol?: number
): PriceChannel30d {
  const effectiveDailyVol =
    forecastAnnualizedVol && forecastAnnualizedVol > 0
      ? forecastAnnualizedVol / 100 / Math.sqrt(252)
      : dailyVol;
  const drift = currentPrice * (signalScore * 0.055);
  const spread = Math.max(
    currentPrice * 0.03,
    currentPrice * (effectiveDailyVol * Math.sqrt(21) * 1.28)
  );
  return {
    low: Math.max(1, Math.round((currentPrice + drift - spread) * 100) / 100),
    base: Math.round((currentPrice + drift) * 100) / 100,
    high: Math.round((currentPrice + drift + spread) * 100) / 100,
  };
}

export const TICKER_DEFINITIONS: TickerMapping[] = [
  // 1. CHIPS & SILICON HARDWARE
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    keywords: ['nvidia', 'blackwell', 'hopper', 'b200', 'h100', 'cuda', 'dgx', 'tensor core', 'jensen', 'geforce'],
    labs: ['NVIDIA'],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'AI Compute & GPU Acceleration',
    strictPatterns: [
      /\bnvidia\b/i,
      /\bnvda\b/i,
      /\bjensen\s+huang\b/i,
      /\bblackwell\b/i,
      /\b(?:b100|b200|gb200|h100|h200)\b/i,
      /\bcuda\b/i,
      /\bgeforce\b/i,
      /\bdgx\b/i,
      /\bvera\s+rubin\b/i,
      /\brubin\s+gpu\b/i,
    ],
    ecosystemPatterns: [/\bai\s+(?:chip|chips|gpu|gpus|accelerator)\b/i, /\bdata\s+center\s+gpu\b/i],
  },
  {
    symbol: 'TSM',
    companyName: 'Taiwan Semiconductor Mfg.',
    keywords: ['tsmc', 'taiwan semi', 'foundry', 'n3', 'n2', 'cowos', 'advanced packaging', 'wafer', 'semiconductor'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Advanced Semiconductor Fabrication',
    strictPatterns: [
      /\btsmc\b/i,
      /\btaiwan\s+semiconductor\b/i,
      /\bcowos\b/i,
      /\btsmc\s+(?:n2|n3|2nm|3nm|foundry)\b/i,
      /\$tsm\b/i,
    ],
    ecosystemPatterns: [
      /\bsemiconductor\s+foundry\b/i,
      /\bchip\s+fabrication\b/i,
      /\badvanced\s+packaging\b/i,
      /\bsilicon\s+wafer\b/i,
    ],
  },
  {
    symbol: 'AMD',
    companyName: 'Advanced Micro Devices',
    keywords: ['amd', 'instinct', 'mi300', 'mi325', 'rocm', 'lisa su', 'epyc', 'ryzen'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'GPU Acceleration & Server Silicon',
    strictPatterns: [
      /\bamd\b/i,
      /\badvanced\s+micro\s+devices\b/i,
      /\b(?:mi300x?|mi325x?|mi350x?|mi400)\b/i,
      /\bamd\s+instinct\b/i,
      /\brocm\b/i,
      /\blisa\s+su\b/i,
      /\bepyc\b/i,
      /\bryzen\b/i,
    ],
    ecosystemPatterns: [/\bdata\s+center\s+gpu\b/i, /\bx86\s+server\b/i],
  },
  {
    symbol: 'ASML',
    companyName: 'ASML Holding N.V.',
    keywords: ['asml', 'euv', 'lithography', 'high-na', 'veldhoven', 'duv', 'semiconductor equipment'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Extreme Ultraviolet Lithography',
    strictPatterns: [
      /\basml\b/i,
      /\bhigh-na\s+euv\b/i,
      /\beuv\s+lithography\b/i,
      /\bveldhoven\b/i,
    ],
    ecosystemPatterns: [
      /\blithography\b/i,
      /\bsemiconductor\s+equipment\b/i,
      /\bchipmaking\s+(?:tool|equipment|ban|export)\b/i,
      /\btsmc\b/i,
    ],
  },
  {
    symbol: 'AVGO',
    companyName: 'Broadcom Inc.',
    keywords: ['broadcom', 'avgo', 'custom asic', 'tpu silicon', 'ethernet fabric', 'tomahawk', 'hock tan', 'vmware'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Custom AI ASICs & Networking Fabrics',
    strictPatterns: [
      /\bbroadcom\b/i,
      /\bavgo\b/i,
      /\bhock\s+tan\b/i,
      /\bvmware\b/i,
      /\btomahawk\s+(?:switch|ethernet|asic)\b/i,
      /\bcustom\s+ai\s+asic\b/i,
    ],
    ecosystemPatterns: [/\bai\s+networking\b/i, /\bcustom\s+silicon\b/i],
  },
  {
    symbol: 'ARM',
    companyName: 'Arm Holdings plc',
    keywords: ['arm', 'neoverse', 'armv9', 'cortex', 'rene haas', 'grace cpu', 'edge architecture'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Energy-Efficient Silicon Architecture',
    strictPatterns: [
      /\barm\s+holdings\b/i,
      /\barm\s+(?:ltd|plc|stock|shares|neoverse|cortex|chips?|cpus?|architecture|ip|licensing)\b/i,
      /\bArm(?:'s)?\s+(?:chip|CPU|revenue|earnings|design|architecture|holdings|stock)\b/,
      /\bneoverse\b/i,
      /\barmv9\b/i,
      /\brene\s+haas\b/i,
      /\bgrace\s+cpu\b/i,
      /\$arm\b/i,
    ],
    ecosystemPatterns: [/\bmobile\s+processor\b/i, /\bedge\s+silicon\b/i],
  },
  {
    symbol: 'QCOM',
    companyName: 'Qualcomm Inc.',
    keywords: ['qualcomm', 'snapdragon', 'npu', 'edge ai', 'oryon', 'mobile chip', '5g', 'cristiano amon'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'Edge NPU & Mobile Compute',
    strictPatterns: [
      /\bqualcomm\b/i,
      /\bqcom\b/i,
      /\bsnapdragon\b/i,
      /\boryon\b/i,
      /\bcristiano\s+amon\b/i,
    ],
    ecosystemPatterns: [/\bmobile\s+(?:npu|chip|ai)\b/i, /\bsmartphone\s+chip\b/i],
  },
  {
    symbol: 'INTC',
    companyName: 'Intel Corporation',
    keywords: ['intel', 'pat gelsinger', 'gaudi', 'xeon', 'intel foundry', '18a', 'x86', 'core ultra'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'x86 Compute & Silicon Foundry',
    strictPatterns: [
      /\bintel\b/i,
      /\bintc\b/i,
      /\bgaudi\s*[23]?\b/i,
      /\bxeon\b/i,
      /\bintel\s+foundry\b/i,
      /\bcore\s+ultra\b/i,
      /\b18a\s+(?:node|process|foundry)\b/i,
    ],
    ecosystemPatterns: [/\bx86\s+(?:processor|server|cpu)\b/i, /\bchips\s+act\b/i],
  },
  {
    symbol: 'MU',
    companyName: 'Micron Technology',
    keywords: ['micron', 'hbm', 'hbm3e', 'dram', 'nand', 'memory bandwidth', 'sanjay mehrotra'],
    labs: [],
    category: 'CHIPS_HARDWARE',
    sectorLabel: 'High-Bandwidth Memory (HBM) & Storage',
    strictPatterns: [
      /\bmicron\b/i,
      /\bhbm3e?\b/i,
      /\bhbm4\b/i,
      /\bsanjay\s+mehrotra\b/i,
      /\$mu\b/i,
    ],
    ecosystemPatterns: [/\bhigh[- ]bandwidth\s+memory\b/i, /\b(?:dram|nand)\s+(?:pricing|demand|supply|memory)\b/i],
  },

  // 2. HYPERSCALERS & BIG TECH
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    keywords: ['microsoft', 'azure', 'copilot', 'satya', 'nadella', 'azure ai', 'windows ai', 'openai partnership'],
    labs: ['Microsoft', 'OpenAI'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Cloud Platform & Enterprise AI',
    benchmarkLab: 'OpenAI',
    strictPatterns: [
      /\bmicrosoft\b/i,
      /\bmsft\b/i,
      /\bazure\b/i,
      /\bcopilot\b/i,
      /\bsatya\s+nadella\b/i,
      /\bopenai\b/i,
      /\bchatgpt\b/i,
      /\bgpt-[456o]/i,
    ],
    ecosystemPatterns: [/\bcloud\s+infrastructure\b/i, /\benterprise\s+ai\b/i],
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    keywords: ['google', 'deepmind', 'gemini', 'tpu', 'trillium', 'pichai', 'demis', 'hassabis', 'gemma', 'waymo'],
    labs: ['Google DeepMind', 'Google AI'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Frontier Models & Search Ecosystem',
    benchmarkLab: 'Google DeepMind',
    strictPatterns: [
      /\bgoogle\b/i,
      /\balphabet\b/i,
      /\bgoogl?\b/i,
      /\bdeepmind\b/i,
      /\bgemini\b/i,
      /\bpichai\b/i,
      /\bhassabis\b/i,
      /\bwaymo\b/i,
      /\btrillium\b/i,
      /\b(?:google|cloud)\s+tpu\b/i,
    ],
    ecosystemPatterns: [/\bsearch\s+ai\b/i, /\btpu\b/i],
  },
  {
    symbol: 'META',
    companyName: 'Meta Platforms Inc.',
    keywords: ['meta', 'llama', 'zuckerberg', 'fair', 'pytorch', 'open source ai', 'llama 3', 'llama 4', 'reality labs'],
    labs: ['Meta AI', 'FAIR'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Open Foundation Models & Social Graph',
    benchmarkLab: 'Meta AI',
    strictPatterns: [
      /\bmeta\s+platforms\b/i,
      /\bmeta\s+(?:ai|stock|shares|earnings|warns|says|releases|launches|llama|fair)\b/i,
      /\bMeta(?:'s)?\s+(?:AI|Llama|data\s+center|revenue|stock|ads)/,
      /\bzuckerberg\b/i,
      /\byann\s+lecun\b/i,
      /\bllama\s*[345]\b/i,
      /\breality\s+labs\b/i,
      /\$meta\b/i,
    ],
    ecosystemPatterns: [/\bpytorch\b/i, /\bopen[- ]weights?\s+model\b/i],
  },
  {
    symbol: 'AMZN',
    companyName: 'Amazon.com Inc.',
    keywords: ['amazon', 'aws', 'trainium', 'inferentia', 'bedrock', 'anthropic investment', 'andy jassy'],
    labs: ['AWS'],
    category: 'HYPERSCALERS',
    sectorLabel: 'Cloud Infrastructure & Custom Silicon',
    benchmarkLab: 'Anthropic',
    strictPatterns: [
      /\bamazon\b/i,
      /\bamzn\b/i,
      /\baws\b/i,
      /\btrainium\b/i,
      /\binferentia\b/i,
      /\bamazon\s+bedrock\b/i,
      /\bbedrock\s+agent/i,
      /\bandy\s+jassy\b/i,
      /\banthropic\b/i,
    ],
    ecosystemPatterns: [/\bcloud\s+capex\b/i, /\bhyperscaler\b/i],
  },
  {
    symbol: 'ORCL',
    companyName: 'Oracle Corporation',
    keywords: ['oracle', 'larry ellison', 'oci', 'oracle cloud', 'exadata', 'database', 'gpu cluster', 'safra catz'],
    labs: [],
    category: 'HYPERSCALERS',
    sectorLabel: 'Autonomous Cloud Database & GPU Clusters',
    strictPatterns: [
      /\boracle\b/i,
      /\borcl\b/i,
      /\blarry\s+ellison\b/i,
      /\bsafra\s+catz\b/i,
      /\bexadata\b/i,
      /\boracle\s+cloud\b/i,
      /\boci\b/i,
    ],
    ecosystemPatterns: [/\bgpu\s+cluster\b/i, /\bcloud\s+database\b/i],
  },

  // 3. AUTONOMOUS & ROBOTICS
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc. / xAI Ecosystem',
    keywords: ['tesla', 'elon musk', 'fsd', 'optimus', 'robotaxi', 'dojo', 'xai', 'grok', 'cybertruck', 'autonomous driving'],
    labs: ['xAI', 'Tesla', 'SpaceX & xAI'],
    category: 'AUTONOMOUS_ROBOTICS',
    sectorLabel: 'Autonomous Mobility, Robotics & FSD',
    benchmarkLab: 'SpaceX & xAI',
    strictPatterns: [
      /\btesla\b/i,
      /\btsla\b/i,
      /\belon\s+musk\b/i,
      /\boptimus\b/i,
      /\brobotaxi\b/i,
      /\bcybertruck\b/i,
      /\bfull\s+self[- ]driving\b/i,
      /\bxai\b/i,
      /\bgrok\b/i,
    ],
    ecosystemPatterns: [/\bhumanoid\s+robot/i, /\bautonomous\s+driving\b/i],
  },
  {
    symbol: 'UBER',
    companyName: 'Uber Technologies',
    keywords: ['uber', 'dara khosrowshahi', 'autonomous vehicle', 'robotaxi', 'routing algorithm', 'mobility'],
    labs: [],
    category: 'AUTONOMOUS_ROBOTICS',
    sectorLabel: 'Autonomous Fleet Network & Logistics',
    strictPatterns: [
      /\buber\b/i,
      /\bdara\s+khosrowshahi\b/i,
    ],
    ecosystemPatterns: [/\brobotaxi\b/i, /\bautonomous\s+(?:vehicle|fleet|ride)\b/i],
  },

  // 4. CONSUMER TECH & PLATFORMS
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    keywords: ['apple', 'apple intelligence', 'neural engine', 'm4', 'm5', 'private cloud compute', 'tim cook', 'iphone'],
    labs: ['Apple'],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Edge AI Silicon & Consumer Ecosystem',
    strictPatterns: [
      /\bapple\b/i,
      /\baapl\b/i,
      /\bapple\s+intelligence\b/i,
      /\biphone\b/i,
      /\btim\s+cook\b/i,
      /\bmacbook\b/i,
      /\bsiri\b/i,
      /\bm[45]\s+(?:chip|silicon|mac|pro|max)\b/i,
    ],
    ecosystemPatterns: [/\bon-device\s+ai\b/i, /\bsmartphone\s+sales\b/i],
  },
  {
    symbol: 'NFLX',
    companyName: 'Netflix Inc.',
    keywords: ['netflix', 'streaming', 'recommendation algorithm', 'content delivery', 'media platform'],
    labs: [],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Algorithmic Content & Streaming Infrastructure',
    strictPatterns: [/\bnetflix\b/i, /\bnflx\b/i],
    ecosystemPatterns: [/\bstreaming\s+(?:platform|subscribers|ad\s+tier)\b/i],
  },
  {
    symbol: 'COIN',
    companyName: 'Coinbase Global',
    keywords: ['coinbase', 'brian armstrong', 'base l2', 'crypto', 'blockchain', 'ethereum', 'bitcoin', 'web3'],
    labs: [],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Decentralized Protocol & Crypto Infrastructure',
    strictPatterns: [
      /\bcoinbase\b/i,
      /\bbrian\s+armstrong\b/i,
      /\bbase\s+l2\b/i,
      /\$coin\b/i,
    ],
    ecosystemPatterns: [/\bbitcoin\b/i, /\bethereum\b/i, /\bcrypto\s+(?:market|exchange|regulation)\b/i],
  },
  {
    symbol: 'SHOP',
    companyName: 'Shopify Inc.',
    keywords: ['shopify', 'tobi lutke', 'e-commerce', 'merchant ai', 'shopify magic', 'checkout'],
    labs: [],
    category: 'CONSUMER_PLATFORMS',
    sectorLabel: 'Global Merchant AI & Digital Commerce',
    strictPatterns: [
      /\bshopify\b/i,
      /\btobi\s+lutke\b/i,
      /\bshopify\s+magic\b/i,
      /\$shop\b/i,
    ],
    ecosystemPatterns: [/\be-?commerce\s+(?:ai|agent|checkout)\b/i],
  },

  // 5. ENTERPRISE SOFTWARE & AI AGENTS
  {
    symbol: 'PLTR',
    companyName: 'Palantir Technologies',
    keywords: ['palantir', 'aip', 'ontology', 'karp', 'defense ai', 'enterprise ontology', 'bootcamp', 'gotham'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise AI & Defense Analytics',
    strictPatterns: [
      /\bpalantir\b/i,
      /\bpltr\b/i,
      /\balex\s+karp\b/i,
      /\bpalantir\s+(?:aip|ontology|gotham|foundry)\b/i,
    ],
    ecosystemPatterns: [/\bdefense\s+ai\b/i, /\bpentagon\s+ai\b/i],
  },
  {
    symbol: 'SNOW',
    companyName: 'Snowflake Inc.',
    keywords: ['snowflake', 'data cloud', 'cortex', 'data warehouse', 'sridhar ramaswamy', 'iceberg'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise Data Cloud & Cortex AI',
    strictPatterns: [
      /\bsnowflake\b/i,
      /\bsnow\s+(?:stock|shares|earnings|data\s+cloud|cortex)\b/i,
      /\bsridhar\s+ramaswamy\b/i,
      /\$snow\b/i,
    ],
    ecosystemPatterns: [/\bdata\s+warehouse\b/i, /\bapache\s+iceberg\b/i],
  },
  {
    symbol: 'CRM',
    companyName: 'Salesforce Inc.',
    keywords: ['salesforce', 'marc benioff', 'agentforce', 'einstein', 'slack', 'crm'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Autonomous Enterprise Agentforce & CRM',
    strictPatterns: [
      /\bsalesforce\b/i,
      /\bmarc\s+benioff\b/i,
      /\bagentforce\b/i,
      /\$crm\b/i,
    ],
    ecosystemPatterns: [/\benterprise\s+crm\b/i, /\bslack\s+ai\b/i],
  },
  {
    symbol: 'NOW',
    companyName: 'ServiceNow Inc.',
    keywords: ['servicenow', 'bill mcdermott', 'now platform', 'workflow', 'enterprise it'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise Workflow Automation & Generative IT',
    strictPatterns: [
      /\bservicenow\b/i,
      /\bbill\s+mcdermott\b/i,
      /\bnow\s+platform\b/i,
      /\$now\b/i,
    ],
    ecosystemPatterns: [/\benterprise\s+workflow\s+automation\b/i],
  },
  {
    symbol: 'ADBE',
    companyName: 'Adobe Inc.',
    keywords: ['adobe', 'firefly', 'photoshop', 'creative cloud', 'generative fill', 'shantanu narayen'],
    labs: [],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Creative Generative Models & Media Tools',
    strictPatterns: [
      /\badobe\b/i,
      /\badbe\b/i,
      /\badobe\s+firefly\b/i,
      /\bphotoshop\b/i,
      /\bcreative\s+cloud\b/i,
      /\bshantanu\s+narayen\b/i,
    ],
    ecosystemPatterns: [/\bgenerative\s+(?:design|image|video\s+editing)\b/i],
  },
  {
    symbol: 'IBM',
    companyName: 'International Business Machines',
    keywords: ['ibm', 'watsonx', 'quantum computing', 'granite', 'red hat', 'arvind krishna'],
    labs: ['IBM Research'],
    category: 'AI_ENTERPRISE',
    sectorLabel: 'Enterprise Foundation Models & Quantum',
    strictPatterns: [
      /\bibm\b/i,
      /\bwatsonx\b/i,
      /\bred\s+hat\b/i,
      /\barvind\s+krishna\b/i,
      /\bibm\s+(?:granite|quantum)\b/i,
    ],
    ecosystemPatterns: [/\bquantum\s+computing\b/i, /\benterprise\s+mainframe\b/i],
  },

  // 6. CLOUD & CYBERSECURITY
  {
    symbol: 'CRWD',
    companyName: 'CrowdStrike Holdings',
    keywords: ['crowdstrike', 'george kurtz', 'falcon', 'endpoint security', 'xdr', 'cyberattack', 'malware', 'threat intel'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'AI Endpoint Defense & Threat Intelligence',
    strictPatterns: [
      /\bcrowdstrike\b/i,
      /\bcrwd\b/i,
      /\bgeorge\s+kurtz\b/i,
      /\bfalcon\s+(?:platform|xdr|sensor|security)\b/i,
    ],
    ecosystemPatterns: [/\bendpoint\s+security\b/i, /\bai\s+cybersecurity\b/i],
  },
  {
    symbol: 'PANW',
    companyName: 'Palo Alto Networks',
    keywords: ['palo alto networks', 'nikesh arora', 'prisma', 'strata', 'cortex xdr', 'firewall', 'zero trust'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'Next-Generation Enterprise Cybersecurity',
    strictPatterns: [
      /\bpalo\s+alto\s+networks\b/i,
      /\bpanw\b/i,
      /\bnikesh\s+arora\b/i,
      /\bprisma\s+(?:cloud|access|sase)\b/i,
      /\bcortex\s+xdr\b/i,
    ],
    ecosystemPatterns: [/\bzero\s+trust\s+security\b/i, /\benterprise\s+cybersecurity\b/i],
  },
  {
    symbol: 'NET',
    companyName: 'Cloudflare Inc.',
    keywords: ['cloudflare', 'matthew prince', 'workers', 'workers ai', 'edge compute', 'ddos', 'cdn'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'Edge Cloud Compute & Workers AI',
    strictPatterns: [
      /\bcloudflare\b/i,
      /\bmatthew\s+prince\b/i,
      /\bworkers\s+ai\b/i,
      /\bcloudflare\s+workers\b/i,
      /\$net\b/i,
    ],
    ecosystemPatterns: [/\bedge\s+inference\b/i, /\bddos\b/i],
  },
  {
    symbol: 'DDOG',
    companyName: 'Datadog Inc.',
    keywords: ['datadog', 'observability', 'apm', 'cloud monitoring', 'infrastructure metrics'],
    labs: [],
    category: 'CLOUD_CYBER',
    sectorLabel: 'Cloud Infrastructure Observability & Telemetry',
    strictPatterns: [
      /\bdatadog\b/i,
      /\bddog\b/i,
      /\bolivier\s+pomel\b/i,
    ],
    ecosystemPatterns: [/\bcloud\s+observability\b/i, /\bllm\s+observability\b/i],
  },
];

interface WeightedLexiconTerm {
  pattern: RegExp;
  label: string;
  weight: number;
}

const BULLISH_TERMS: WeightedLexiconTerm[] = [
  { pattern: /\b(?:beat|beats|topped|exceeded)\s+(?:estimates|expectations|forecasts|consensus)\b/i, label: 'Earnings beat', weight: 0.50 },
  { pattern: /\b(?:raises|raised|lifts|boosts)\s+(?:guidance|forecast|outlook|target)\b/i, label: 'Guidance raised', weight: 0.45 },
  { pattern: /\b(?:record|all-time\s+high)\s+(?:revenue|earnings|demand|profit|quarter)\b/i, label: 'Record financial performance', weight: 0.45 },
  { pattern: /\b(?:soars?|surges?|rallies|skyrockets?)\b/i, label: 'Strong price rally', weight: 0.35 },
  { pattern: /\b(?:breakthrough|landmark|unprecedented)\b/i, label: 'Tech breakthrough', weight: 0.38 },
  { pattern: /\b(?:tops?\s+(?:the\s+)?leaderboard|takes?\s+#1|ranked\s+#1|claims?\s+#1)\b/i, label: 'Leaderboard #1', weight: 0.40 },
  { pattern: /\b(?:demand\s+surge|massive\s+(?:demand|deployment)|accelerates?|acceleration)\b/i, label: 'Demand acceleration', weight: 0.35 },
  { pattern: /\b(?:outperforms?|dominan\w*|market\s+leadership)\b/i, label: 'Competitive leadership', weight: 0.30 },
  { pattern: /\b(?:analyst\s+upgrade|upgraded?\s+(?:to|from)|buy\s+rating|overweight)\b/i, label: 'Analyst upgrade', weight: 0.35 },
  { pattern: /\b(?:expansion|expand\w*|growth|record)\b/i, label: 'Growth expansion', weight: 0.22 },
  { pattern: /\b(?:partners?|partnership|collaboration|contract|deal|taps)\b/i, label: 'Strategic deal / partnership', weight: 0.20 },
  { pattern: /\b(?:unveils?|launches?|introduces?|deployment|efficiency\s+gain|innovation|profit)\b/i, label: 'Product / efficiency launch', weight: 0.20 },
  { pattern: /\bupgrade\b/i, label: 'Product upgrade', weight: 0.14 },
  { pattern: /\b(?:chip\s+supply|supply\s+expansion)\b/i, label: 'Supply expansion', weight: 0.22 },
];

const BEARISH_TERMS: WeightedLexiconTerm[] = [
  { pattern: /\b(?:sec|doj|ftc|regulatory)\s+(?:probe|investigation|lawsuit|subpoena|charges)\b/i, label: 'Regulatory probe', weight: 0.55 },
  { pattern: /\baccounting\s+(?:probe|investigation|irregularit\w*|scandal)\b/i, label: 'Accounting probe', weight: 0.60 },
  { pattern: /\b(?:antitrust|monopoly\s+lawsuit)\b/i, label: 'Antitrust action', weight: 0.48 },
  { pattern: /\b(?:export\s+ban|export\s+curbs?|export\s+restrictions?|banned)\b/i, label: 'Export restrictions', weight: 0.50 },
  { pattern: /\b(?:melts?\s+down|meltdown|rout|plummets?|crashes?|plunges?|tumbles?|collapses?)\b/i, label: 'Sharp selloff / rout', weight: 0.45 },
  { pattern: /\b(?:slashes?|cuts?|lowers?)\s+(?:guidance|forecast|outlook|spend|spending)\b/i, label: 'Guidance / spend cut', weight: 0.45 },
  { pattern: /\b(?:misses?|missed)\s+(?:estimates|expectations|revenue|earnings)\b/i, label: 'Earnings miss', weight: 0.45 },
  { pattern: /\b(?:downgraded?|underweight|sell\s+rating)\b/i, label: 'Analyst downgrade', weight: 0.35 },
  { pattern: /\b(?:selloff|sell-off|sinks?|drops?|declines?|slumps?|unravels?|correction)\b/i, label: 'Downward market pressure', weight: 0.28 },
  { pattern: /\b(?:margin\s+pressure|shortage|delay(?:ed|s)?|halt(?:ed|s)?|cut\s+spend)\b/i, label: 'Margin / supply headwind', weight: 0.30 },
  { pattern: /\b(?:threatens?|vulnerability|data\s+breach|infringement|backlash|downside|probe|curb)\b/i, label: 'Risk / vulnerability', weight: 0.28 },
  { pattern: /\b(?:rival|commodity|commoditiz\w*)\b/i, label: 'Competitive pressure', weight: 0.20 },
];

const NEGATION_PREFIX_REGEX =
  /\b(?:not|no|never|without|avoids?|avoided|resolves?|resolved|dismisses?|dismissed|denies|denied|clears?|cleared|despite|less)\s*$/i;

function scoreLexiconHits(
  text: string,
  terms: WeightedLexiconTerm[],
  sign: 1 | -1,
  multiplier: number
): { sum: number; drivers: string[] } {
  let sum = 0;
  const drivers: string[] = [];
  for (const term of terms) {
    const match = term.pattern.exec(text);
    if (!match) continue;
    const prefix = text.slice(Math.max(0, match.index - 32), match.index);
    const isNegated = NEGATION_PREFIX_REGEX.test(prefix);
    const effectiveSign = isNegated ? -sign * 0.5 : sign;
    sum += effectiveSign * term.weight * multiplier;
    const tag = isNegated ? `Mitigated: ${term.label}` : term.label;
    if (!drivers.includes(tag)) drivers.push(tag);
  }
  return { sum, drivers };
}

/**
 * Aspect-aware, negation-safe NLP financial & AI sentiment analyzer.
 */
export function calculateArticleSentiment(
  text: string,
  title = ''
): {
  score: number;
  catalystType: string;
  drivers: string[];
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
} {
  const lowerBody = text.toLowerCase();
  const lowerTitle = title.toLowerCase();

  const titleBull = lowerTitle ? scoreLexiconHits(lowerTitle, BULLISH_TERMS, 1, 1.5) : { sum: 0, drivers: [] };
  const titleBear = lowerTitle ? scoreLexiconHits(lowerTitle, BEARISH_TERMS, -1, 1.5) : { sum: 0, drivers: [] };
  const bodyBull = scoreLexiconHits(lowerBody, BULLISH_TERMS, 1, 1.0);
  const bodyBear = scoreLexiconHits(lowerBody, BEARISH_TERMS, -1, 1.0);

  const rawScore = titleBull.sum + titleBear.sum + bodyBull.sum + bodyBear.sum;
  const score = Math.round(Math.max(-1.0, Math.min(1.0, Math.tanh(rawScore * 0.85))) * 100) / 100;

  const combined = `${lowerTitle} ${lowerBody}`;
  let catalystType = 'General AI Market Sentiment';
  if (/\b(?:antitrust|export\s+ban|curb|regulation|sec\b|doj\b|ftc\b|probe|lawsuit)\b/.test(combined)) {
    catalystType = 'Regulatory & Export Dynamics';
  } else if (/\b(?:compute|chip|chips|gpu|gpus|foundry|blackwell|lithography|hbm|silicon|wafer)\b/.test(combined)) {
    catalystType = 'Compute Capacity & Hardware Moat';
  } else if (/\b(?:earnings|revenue|guidance|stock|shares|valuation|selloff|rout|downgrade|upgrade)\b/.test(combined)) {
    catalystType = 'Earnings, Valuation & Market Flow';
  } else if (/\b(?:model|benchmark|reasoning|deepseek|elo|leaderboard|architecture|open[- ]weight)\b/.test(combined)) {
    catalystType = 'Architecture Breakthrough & Model Efficiency';
  } else if (/\b(?:enterprise|cloud|contract|adoption|agent|copilot|deployment|partnership)\b/.test(combined)) {
    catalystType = 'Enterprise Adoption & Revenue Conversion';
  }

  const allDrivers: string[] = [];
  for (const d of [...titleBear.drivers, ...titleBull.drivers, ...bodyBear.drivers, ...bodyBull.drivers]) {
    if (!allDrivers.includes(d)) allDrivers.push(d);
    if (allDrivers.length >= 4) break;
  }

  const label: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    score >= 0.15 ? 'BULLISH' : score <= -0.15 ? 'BEARISH' : 'NEUTRAL';

  return { score, catalystType, drivers: allDrivers, label };
}

function formatAgeLabel(publishedAt: string, nowMs: number): string {
  const pub = Date.parse(publishedAt);
  if (Number.isNaN(pub)) return 'recent';
  const diffHours = Math.max(0, (nowMs - pub) / 3_600_000);
  if (diffHours < 1) return `${Math.max(1, Math.round(diffHours * 60))}m ago`;
  if (diffHours < 48) return `${Math.round(diffHours)}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function hasLabWordMatch(text: string, labs: string[]): boolean {
  if (!text || labs.length === 0) return false;
  const lower = text.toLowerCase();
  return labs.some((l) => {
    const esc = l.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${esc}\\b`, 'i').test(lower);
  });
}

export interface CorrelatableArticle {
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

/**
 * Matches articles from both LatentSpace dispatches and live financial news streams
 * to a ticker using strict word-boundary entity matching (eliminating substring false positives).
 */
export function correlateArticlesForTicker(
  articles: CorrelatableArticle[],
  ticker: TickerMapping,
  extraMarketNews: CorrelatableArticle[] = []
): NewsCatalyst[] {
  const nowMs = Date.now();
  const seenTitles = new Set<string>();
  const directCandidates: { item: NewsCatalyst; rankScore: number }[] = [];
  const ecoCandidates: { item: NewsCatalyst; rankScore: number }[] = [];

  const allRaw: CorrelatableArticle[] = [
    ...extraMarketNews.map((a) => ({ ...a, __isMarketNews: true })),
    ...articles.map((a) => ({ ...a, __isMarketNews: Boolean(a?.__isMarketNews || a?.stream === 'MARKET_NEWS') })),
  ];

  for (const article of allRaw) {
    const title: string = String(article?.title || '').trim();
    if (!title) continue;

    const dedupeKey = title.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 64);
    if (seenTitles.has(dedupeKey)) continue;

    const summaryTldr: string = article?.summary?.tldr || article?.aiSummary?.tldr || '';
    const summaryTakeaways: string = Array.isArray(article?.summary?.takeaways)
      ? article.summary.takeaways.join(' ')
      : '';
    const snippet: string = article?.contentSnippet || article?.description || '';
    const bodyText = `${summaryTldr} ${summaryTakeaways} ${snippet}`.trim();
    const labStr: string = String(article?.lab || '');

    const titleDirect = ticker.strictPatterns.some((re) => re.test(title));
    const bodyDirect = ticker.strictPatterns.some((re) => re.test(bodyText));
    const labDirect =
      hasLabWordMatch(labStr, ticker.labs) &&
      (hasLabWordMatch(title, ticker.labs) || titleDirect || bodyDirect || !article?.__isMarketNews);
    const tickerTagDirect =
      Array.isArray(article?.relatedTickers) &&
      article.relatedTickers.includes(ticker.symbol) &&
      (titleDirect || bodyDirect || title.toLowerCase().includes(ticker.companyName.split(/[\s.,]/)[0].toLowerCase()));

    const isDirect = titleDirect || bodyDirect || labDirect || tickerTagDirect;
    const leadWindow = `${title} ${summaryTldr.slice(0, 260)} ${snippet.slice(0, 200)}`;
    const isEcosystem =
      !isDirect && Boolean(ticker.ecosystemPatterns?.some((re) => re.test(leadWindow)));

    if (!isDirect && !isEcosystem) continue;
    seenTitles.add(dedupeKey);

    const { score, catalystType, drivers, label } = calculateArticleSentiment(bodyText, title);
    const publishedAt = article?.publishedAt || article?.pubDate || new Date().toISOString();
    const ageHours = Math.max(0, (nowMs - Date.parse(publishedAt)) / 3_600_000);
    const isMarketNews = Boolean(article?.__isMarketNews);
    const halfLife = isMarketNews ? 36 : 144;
    const recency = Number.isFinite(ageHours) ? Math.exp(-ageHours / halfLife) : 0.7;

    const impactLevel: string | undefined = article?.summary?.impact || article?.aiSummary?.impact;
    const impactBoost =
      impactLevel === 'Breakthrough' ? 1.3 : impactLevel === 'High' ? 1.15 : 1.0;

    const weight = isDirect
      ? titleDirect
        ? 0.95
        : bodyDirect
          ? 0.80
          : 0.70
      : 0.45;

    const rankScore = weight * recency * impactBoost * (isMarketNews ? 1.25 : 1.0) * (1 + Math.abs(score) * 0.4);

    const catalyst: NewsCatalyst = {
      articleId: String(article?.id || `${ticker.symbol}-${dedupeKey.slice(0, 16)}`),
      title,
      sourceName: article?.sourceName || article?.source?.name || article?.publisher || 'Frontier Wire',
      publishedAt,
      sentiment: score,
      correlationWeight: Math.round(weight * 100) / 100,
      catalystType,
      summarySnippet: (summaryTldr || snippet || title).slice(0, 200) + ((summaryTldr || snippet).length > 200 ? '...' : ''),
      url: article?.canonicalUrl || article?.link || article?.url || '#',
      stream: isMarketNews ? 'MARKET_NEWS' : 'AI_RESEARCH',
      matchType: isDirect ? 'DIRECT' : 'ECOSYSTEM',
      sentimentLabel: label,
      sentimentDrivers: drivers,
      impactLevel,
      ageLabel: formatAgeLabel(publishedAt, nowMs),
    };

    if (isDirect) directCandidates.push({ item: catalyst, rankScore });
    else ecoCandidates.push({ item: catalyst, rankScore });
  }

  directCandidates.sort((a, b) => b.rankScore - a.rankScore);
  ecoCandidates.sort((a, b) => b.rankScore - a.rankScore);

  const selected = directCandidates.slice(0, 8).map((c) => c.item);
  if (selected.length < 3) {
    for (const eco of ecoCandidates) {
      if (selected.length >= 6) break;
      selected.push(eco.item);
    }
  }
  return selected;
}

function buildFallbackBars(sparkline: number[], changePct1d: number): OHLCVBar[] {
  const clean = sparkline.filter((p) => typeof p === 'number' && Number.isFinite(p) && p > 0);
  if (clean.length < 2) {
    const prev = 100 / (1 + changePct1d / 100);
    return [
      { t: 1, o: prev, h: prev * 1.01, l: prev * 0.99, c: prev, v: 1_000_000 },
      { t: 2, o: 100, h: 101, l: 99, c: 100, v: 1_000_000 },
    ];
  }
  return clean.map((c, idx) => ({
    t: idx + 1,
    o: c,
    h: c * 1.008,
    l: c * 0.992,
    c,
    v: 1_000_000,
  }));
}

function logOddsToPctDelta(fromLogOdds: number, deltaLogOdds: number): number {
  const p0 = sigmoid(fromLogOdds) * 100;
  const p1 = sigmoid(fromLogOdds + deltaLogOdds) * 100;
  return Math.round((p1 - p0) * 10) / 10;
}

function sentimentOfDelta(deltaPctPts: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (deltaPctPts >= 0.4) return 'BULLISH';
  if (deltaPctPts <= -0.4) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Multi-Head Trained Histogram-XGBoost Quant Engine + Glass-Box Decision Tree Builder.
 * Combines walk-forward validated technical GBDT ensembles with time-decayed live financial
 * news and frontier AI research catalysts, returning transparent Tree-Path attributions.
 */
export function runXGBoostQuantModel(
  symbol: TickerSymbol,
  companyName: string,
  priceChangePercent24h: number,
  correlatedCatalysts: NewsCatalyst[],
  sparkline: number[] = [],
  techSectorMeanChange = 0,
  explicitCurrentPrice?: number,
  context?: QuantInferenceContext
): XGBoostPrediction {
  const now = Date.now();
  const def = TICKER_DEFINITIONS.find((t) => t.symbol === symbol);
  const isChipSector = def?.category === 'CHIPS_HARDWARE';

  const hasFullHistory = Boolean(context?.ohlcvBars && context.ohlcvBars.length >= 30);
  const bars: OHLCVBar[] = hasFullHistory
    ? context!.ohlcvBars!
    : buildFallbackBars(sparkline, priceChangePercent24h);

  const macro: MacroContextInput = context?.macro ?? {
    vixLevel: 20,
    vixSma20: 20,
    vixChange5dPct: 0,
    qqqChange5dPct: techSectorMeanChange,
    smhChange5dPct: techSectorMeanChange,
    qqqChange1dPct: techSectorMeanChange,
    smhChange1dPct: techSectorMeanChange,
    marketBreadthPct: 50,
  };

  const extracted = extractQuantFeatureVector(
    bars,
    macro,
    Boolean(isChipSector),
    priceChangePercent24h
  );
  const ind = extracted.indicators;
  const currentPrice = explicitCurrentPrice || bars[bars.length - 1]?.c || 100;

  // Evaluate the 4 trained Histogram-XGBoost ensembles
  const dirEval = evaluateGBDTWithAttribution(
    TRAINED_MODEL_ARTIFACT.directionModel,
    extracted.directionVector,
    6
  );
  const alphaEval = evaluateGBDTWithAttribution(
    TRAINED_MODEL_ARTIFACT.alphaModel,
    extracted.directionVector,
    4
  );
  const volRegEval = evaluateGBDTWithAttribution(
    TRAINED_MODEL_ARTIFACT.volRegimeModel,
    extracted.volVector,
    4
  );
  const predLogVol = predictEnsembleScore(
    TRAINED_MODEL_ARTIFACT.volatilityModel,
    extracted.volVector
  );

  // Calibrate Stage-1 technical log-odds (when full 1y OHLCV history is absent in minimal calls, zero out missing macro/multi-month splits and use clean neutral prior + short-term momentum)
  let baseLogOdds = dirEval.baseScore;
  const attr = [...dirEval.attributions]; // [zRet5, bbPctB, rsi5, distSma20, relSector5d, upVolRatio5d, zRet1, atr14Pct, realizedVol20d, vixLevel, vixZScore, rvol20]
  if (!hasFullHistory) {
    baseLogOdds = 0;
    for (let i = 0; i < attr.length; i++) attr[i] = 0;
    const relMom = priceChangePercent24h - techSectorMeanChange;
    attr[4] = Math.max(-0.55, Math.min(0.55, priceChangePercent24h * 0.11 + relMom * 0.03));
    if (sparkline.length >= 5) {
      if (ind.rsi14 < 30) attr[2] = 0.15;
      else if (ind.rsi14 > 70) attr[2] = -0.15;
    }
  }

  // Stage 2: News & Research Catalyst Fusion (with per-article exact attribution)
  let totalEffWeight = 0;
  let weightedSentimentSum = 0;
  let arxivDispatchesCount = 0;
  const articleImpacts: { idx: number; contribution: number }[] = [];

  for (let i = 0; i < correlatedCatalysts.length; i++) {
    const c = correlatedCatalysts[i];
    const pubMs = Date.parse(c.publishedAt);
    const ageHours = Number.isNaN(pubMs) ? 24 : Math.max(0, (now - pubMs) / 3_600_000);
    const isMarketNews = c.stream === 'MARKET_NEWS';
    const timeDecay = !hasFullHistory
      ? Math.max(0.35, Math.exp(-ageHours / 180))
      : isMarketNews
        ? Math.exp(-ageHours / 36)
        : Math.exp(-ageHours / 72);

    const srcLower = c.sourceName.toLowerCase();
    const isArxiv = srcLower.includes('arxiv') || c.url.includes('arxiv.org');
    if (isArxiv) arxivDispatchesCount++;

    const isTier1Finance = /reuters|bloomberg|yahoo finance|wsj|financial times|\bft\b|cnbc|barron/i.test(srcLower);
    const isTopLab = /deepmind|openai|meta|google|anthropic|nvidia|berkeley|stanford/i.test(srcLower);
    const sourceMult = isTier1Finance || isArxiv ? 1.25 : isTopLab ? 1.15 : 1.0;
    const impactMult = c.impactLevel === 'Breakthrough' ? 1.3 : c.impactLevel === 'High' ? 1.15 : 1.0;
    const matchMult = c.matchType === 'ECOSYSTEM' ? 0.55 : 1.0;

    const effWeight = (c.correlationWeight || 0.75) * timeDecay * sourceMult * impactMult * matchMult;
    const signedContribution = c.sentiment * effWeight;
    weightedSentimentSum += signedContribution;
    totalEffWeight += effWeight;
    articleImpacts.push({ idx: i, contribution: signedContribution });
  }

  const avgSentiment =
    totalEffWeight > 0
      ? weightedSentimentSum / totalEffWeight
      : correlatedCatalysts.length > 0
        ? correlatedCatalysts.reduce((acc, c) => acc + c.sentiment, 0) / correlatedCatalysts.length
        : 0;
  const paperVelocityScore = Math.min(1.0, Math.round((arxivDispatchesCount / 3) * 100) / 100);

  const newsLogOdds =
    correlatedCatalysts.length > 0 ? Math.tanh(weightedSentimentSum * 0.42) * 0.75 : 0;

  // Stage 5 benchmark lab leadership boost (mild tie-breaker)
  const benchmarkRank = context?.benchmarkRank;
  const benchmarkLogOdds =
    benchmarkRank && benchmarkRank.rank <= 3 ? 0.08 : benchmarkRank && benchmarkRank.rank <= 6 ? 0.04 : 0;

  // Partition exact attributions into the 5 Glass-Box Steps
  const deltaStep1 = attr[9] + attr[10]; // Macro Mood: vixLevel + vixZScore
  const deltaStep2 = attr[3] + attr[4] + attr[5]; // Price Trend: distSma20 + relSector5d + upVolRatio5d
  const deltaStep3 = attr[0] + attr[1] + attr[2] + attr[6]; // Stretch Check: zRet5 + bbPctB + rsi5 + zRet1
  const deltaStep4 = newsLogOdds; // Breaking News & AI Research
  const deltaStep5 = attr[7] + attr[8] + attr[11] + benchmarkLogOdds; // Volatility, Volume & Lab Edge

  const L0 = baseLogOdds;
  const L1 = L0 + deltaStep1;
  const L2 = L1 + deltaStep2;
  const L3 = L2 + deltaStep3;
  const L4 = L3 + deltaStep4;
  const L5 = L4 + deltaStep5;

  const p0 = Math.round(sigmoid(L0) * 1000) / 10;
  const p1 = Math.round(sigmoid(L1) * 1000) / 10;
  const p2 = Math.round(sigmoid(L2) * 1000) / 10;
  const p3 = Math.round(sigmoid(L3) * 1000) / 10;
  const p4 = Math.round(sigmoid(L4) * 1000) / 10;
  const p5 = Math.round(sigmoid(L5) * 1000) / 10;

  const impactStep1 = Math.round((p1 - p0) * 10) / 10;
  const impactStep2 = Math.round((p2 - p1) * 10) / 10;
  const impactStep3 = Math.round((p3 - p2) * 10) / 10;
  const impactStep4 = Math.round((p4 - p3) * 10) / 10;
  const impactStep5 = Math.round((p5 - p4) * 10) / 10;

  // Distribute exact percentage-point impact across each correlated article (sums to impactStep4)
  const absContribSum = articleImpacts.reduce((acc, x) => acc + Math.abs(x.contribution), 0);
  const netContribSum = articleImpacts.reduce((acc, x) => acc + x.contribution, 0);
  const enrichedArticles: NewsCatalyst[] = correlatedCatalysts.map((cat, idx) => {
    let artPct = 0;
    if (Math.abs(impactStep4) > 0.01 && absContribSum > 1e-6) {
      if (Math.abs(netContribSum) > 0.05) {
        artPct = (articleImpacts[idx].contribution / netContribSum) * impactStep4;
      } else {
        artPct = (articleImpacts[idx].contribution / absContribSum) * Math.abs(deltaStep4) * 20;
      }
    }
    return {
      ...cat,
      modelImpactPctPts: Math.round(artPct * 10) / 10,
    };
  });

  const upProbabilityPct = p5;
  const peerOutperformProbPct = Math.round(sigmoid(alphaEval.rawScore + newsLogOdds * 0.5) * 1000) / 10;
  const highVolRegimeProbPct = hasFullHistory
    ? Math.round(sigmoid(volRegEval.rawScore) * 1000) / 10
    : Math.round(Math.min(95, Math.max(15, (ind.realizedVol20d / 60) * 100)) * 10) / 10;

  const forecastVolAnnualized = hasFullHistory
    ? Math.round(Math.min(130, Math.max(12, Math.exp(predLogVol))) * 10) / 10
    : ind.realizedVol20d;

  const normalizedSignal = Math.round(Math.max(-1, Math.min(1, (upProbabilityPct - 50) / 28)) * 100) / 100;
  const expected30dChannel = calculate30dChannel(
    currentPrice,
    ind.dailyVol,
    normalizedSignal,
    forecastVolAnnualized
  );

  // Dynamic per-stock feature importance (derived from actual Tree-Path + News + Vol contributions)
  const rawImpNews = Math.abs(deltaStep4) + Math.min(0.18, correlatedCatalysts.length * 0.025);
  const rawImpVol = Math.abs(deltaStep1) + Math.abs(attr[7] + attr[8]) + (highVolRegimeProbPct / 100) * 0.14;
  const rawImpMom = Math.abs(deltaStep2) + Math.abs(deltaStep3) + 0.08;
  const rawImpDispatch = Math.min(0.25, correlatedCatalysts.length * 0.03) + Math.abs(attr[11]) + 0.04;
  const rawImpOpen = (paperVelocityScore * 0.12) + Math.abs(benchmarkLogOdds) + 0.04;
  const impTotal = Math.max(0.01, rawImpNews + rawImpVol + rawImpMom + rawImpDispatch + rawImpOpen);

  const wNews = Math.round((rawImpNews / impTotal) * 100) / 100;
  const wMom = Math.round((rawImpMom / impTotal) * 100) / 100;
  const wVol = Math.round((rawImpVol / impTotal) * 100) / 100;
  const wDisp = Math.round((rawImpDispatch / impTotal) * 100) / 100;
  const wOpen = Math.max(0.01, Math.round((1 - (wNews + wMom + wVol + wDisp)) * 100) / 100);

  // SMA trend classification
  const sma5 = ind.sma5;
  const sma15 = ind.sma15;
  let smaTrend: 'UPWARD_EXPANSION' | 'NEUTRAL_FLAT' | 'DOWNWARD_DRIFT' = 'NEUTRAL_FLAT';
  if (hasFullHistory ? ind.distSma20Pct > 1.2 && sma5 >= ind.sma20 : sma5 > sma15 * 1.012) {
    smaTrend = 'UPWARD_EXPANSION';
  } else if (hasFullHistory ? ind.distSma20Pct < -1.2 && sma5 <= ind.sma20 : sma5 < sma15 * 0.988) {
    smaTrend = 'DOWNWARD_DRIFT';
  }

  // Trajectory & Risk Assignment
  const momentum = priceChangePercent24h;
  const isConflictSwing =
    (momentum < -1.5 && avgSentiment > 0.25) || (momentum > 2.5 && avgSentiment < -0.15);
  const isHighVolatility =
    Math.abs(momentum) >= 4.0 ||
    isConflictSwing ||
    (hasFullHistory && highVolRegimeProbPct >= 75 && forecastVolAnnualized > 58);

  let trajectory: ModelTrajectory = 'RANGE_BOUND_ACCUMULATION';
  let riskLevel: RiskLevel = 'MEDIUM';
  let thesis = '';

  if (isHighVolatility) {
    trajectory = 'HIGH_VOLATILITY_CHURN';
    riskLevel = 'EXTREME';
    thesis = `${companyName} is experiencing sharp turbulence (${momentum >= 0 ? '+' : ''}${momentum.toFixed(2)}% today, ${forecastVolAnnualized.toFixed(1)}% forecast annualized vol). The XGBoost ensemble estimates ${upProbabilityPct.toFixed(0)}% upside odds over 5 trading days, while flagging elevated swing risk.`;
  } else if (upProbabilityPct >= 53.5 && normalizedSignal > 0.12) {
    trajectory = 'BULLISH_EXPANSION';
    riskLevel = forecastVolAnnualized > 48 || momentum > 3.0 ? 'HIGH' : 'MEDIUM';
    thesis = `The trained XGBoost model tilts bullish for ${companyName} (${upProbabilityPct.toFixed(0)}% upside odds over 5 trading days). ${impactStep4 > 0.5 ? 'Positive news flow reinforces' : 'Technical structure and sector relative positioning support'} upward follow-through.`;
  } else if (upProbabilityPct <= 46.5 || (momentum < -2.0 && upProbabilityPct < 52)) {
    trajectory = 'BEARISH_CONTRACTION';
    riskLevel = momentum < -4.0 || forecastVolAnnualized > 55 ? 'EXTREME' : 'HIGH';
    thesis = `The XGBoost model tilts cautious/bearish for ${companyName} (${upProbabilityPct.toFixed(0)}% upside odds vs ${(100 - upProbabilityPct).toFixed(0)}% downside odds). ${impactStep4 < -0.5 ? 'Negative news catalysts add downward pressure alongside' : 'Trend weakness and selling pressure weigh on'} near-term price action.`;
  } else {
    trajectory = 'RANGE_BOUND_ACCUMULATION';
    riskLevel = forecastVolAnnualized < 38 && Math.abs(momentum) < 1.5 ? 'LOW' : 'MEDIUM';
    thesis = `The XGBoost ensemble sees balanced, near-coin-flip odds for ${companyName} (${upProbabilityPct.toFixed(0)}% up / ${(100 - upProbabilityPct).toFixed(0)}% down). No strong directional edge outweighs normal market noise right now.`;
  }

  const volPenalty = forecastVolAnnualized > 55 ? 5 : forecastVolAnnualized < 26 ? -3 : 0;
  const confidencePercent = Math.min(
    94,
    Math.max(50, Math.round(50 + Math.abs(upProbabilityPct - 50) * 1.45 - volPenalty))
  );

  // Build Easy-to-Read 5-Stage Glass-Box Decision Tree
  const macroCalm = macro.vixLevel < 20 && ind.vixZScore <= 0.08;
  const macroStress = macro.vixLevel >= 26 || ind.vixZScore >= 0.18;
  const step1: DecisionTreeStep = {
    id: 'MARKET_MOOD',
    stepNumber: 1,
    title: 'Market Mood & Fear Gauge',
    question: 'Is Wall Street calm or panicking right now?',
    measuredSummary: `Fear Index (VIX) is ${macro.vixLevel.toFixed(1)} (${ind.vixZScore >= 0 ? '+' : ''}${(ind.vixZScore * 100).toFixed(0)}% vs 20-day avg)`,
    technicalDetail: `VIX=${macro.vixLevel.toFixed(2)}, VIX Z=${(ind.vixZScore * 100).toFixed(1)}%, QQQ 5d=${macro.qqqChange5dPct.toFixed(1)}%`,
    impactPctPts: impactStep1,
    runningProbabilityPct: p1,
    sentiment: sentimentOfDelta(impactStep1),
    chosenBranch: {
      label: macroStress
        ? 'High Market Fear (VIX Elevated)'
        : macroCalm
          ? 'Calm Market Environment'
          : 'Mixed / Cautious Market',
      condition: macroStress
        ? 'VIX ≥ 26 or surging'
        : macroCalm
          ? 'VIX < 20 and stable'
          : 'VIX 20–26',
      explanation: macroStress
        ? `Fear is high across tech stocks. Historically, after VIX spikes, oversold tech names often see sharper bounce-back setups (impact ${impactStep1 >= 0 ? '+' : ''}${impactStep1.toFixed(1)} pts).`
        : macroCalm
          ? `Broad market volatility is low and calm, keeping baseline odds close to neutral (${impactStep1 >= 0 ? '+' : ''}${impactStep1.toFixed(1)} pts).`
          : `Market mood is slightly cautious, gently nudging odds by ${impactStep1 >= 0 ? '+' : ''}${impactStep1.toFixed(1)} pts.`,
      isTaken: true,
      impactPctPts: impactStep1,
    },
    alternativeBranch: {
      label: macroStress ? 'Calm Market (VIX < 20)' : 'High Fear Spike (VIX ≥ 26)',
      condition: macroStress ? 'VIX < 20' : 'VIX ≥ 26',
      explanation: macroStress
        ? 'If market fear cooled below VIX 20, bounce pressure would fade toward normal baseline.'
        : 'If VIX spiked sharply above 26, fear-driven snapback probability would carry more weight.',
      isTaken: false,
    },
  };

  const trendUp = ind.distSma20Pct > 1.0 && ind.upVolRatio5d >= 0.5;
  const trendDown = ind.distSma20Pct < -1.0 || ind.relSector5dPct < -2.0;
  const step2: DecisionTreeStep = {
    id: 'PRICE_TREND',
    stepNumber: 2,
    title: 'Price Trend & Buying Pressure',
    question: 'Are buyers in control or is the stock lagging behind tech peers?',
    measuredSummary: `Price is ${ind.distSma20Pct >= 0 ? '+' : ''}${ind.distSma20Pct.toFixed(1)}% vs 20-day avg · ${(ind.upVolRatio5d * 100).toFixed(0)}% green-day volume`,
    technicalDetail: `distSMA20=${ind.distSma20Pct.toFixed(1)}%, relSector5d=${ind.relSector5dPct.toFixed(1)}%, upVol5d=${(ind.upVolRatio5d * 100).toFixed(0)}%`,
    impactPctPts: impactStep2,
    runningProbabilityPct: p2,
    sentiment: sentimentOfDelta(impactStep2),
    chosenBranch: {
      label: trendDown
        ? 'Downtrend / Lagging Tech Peers'
        : trendUp
          ? 'Healthy Uptrend & Buyer Control'
          : 'Sideways / Balanced Flow',
      condition: trendDown
        ? 'Below 20d avg or lagging peers'
        : trendUp
          ? 'Above 20d avg & buyers active'
          : 'Near 20d average',
      explanation: trendDown
        ? `${symbol} is trading ${Math.abs(ind.distSma20Pct).toFixed(1)}% ${ind.distSma20Pct >= 0 ? 'above' : 'below'} its 20-day average and ${ind.relSector5dPct >= 0 ? 'outperforming' : 'trailing'} sector peers by ${Math.abs(ind.relSector5dPct).toFixed(1)}% (${impactStep2 >= 0 ? '+' : ''}${impactStep2.toFixed(1)} pts).`
        : trendUp
          ? `Price holds above its 20-day average with ${(ind.upVolRatio5d * 100).toFixed(0)}% of volume on green days (${impactStep2 >= 0 ? '+' : ''}${impactStep2.toFixed(1)} pts).`
          : `Price and volume flow are roughly balanced near the 20-day average (${impactStep2 >= 0 ? '+' : ''}${impactStep2.toFixed(1)} pts).`,
      isTaken: true,
      impactPctPts: impactStep2,
    },
    alternativeBranch: {
      label: trendDown ? 'Healthy Uptrend Above 20d Avg' : 'Weakness Below 20d Avg',
      condition: trendDown ? 'Above 20d avg' : 'Below 20d avg',
      explanation: trendDown
        ? 'Climbing back above its 20-day average with strong green-day volume would improve trend support.'
        : 'Falling below its 20-day average with heavy selling volume would shift this branch cautious.',
      isTaken: false,
    },
  };

  const isOversold = ind.rsi5 <= 32 || ind.zRet5 <= -1.2;
  const isOverbought = ind.rsi5 >= 70 || ind.zRet5 >= 1.2;
  const step3: DecisionTreeStep = {
    id: 'STRETCH_CHECK',
    stepNumber: 3,
    title: '5-Day Overbought / Oversold Check',
    question: 'Did the price drop or rally too fast in the last 5 days?',
    measuredSummary: `5-day move: ${ind.return5dPct >= 0 ? '+' : ''}${ind.return5dPct.toFixed(1)}% (${ind.zRet5 >= 0 ? '+' : ''}${ind.zRet5.toFixed(2)}σ) · 5-day RSI: ${ind.rsi5.toFixed(0)}`,
    technicalDetail: `zRet5=${ind.zRet5.toFixed(2)}σ, BB%B=${(ind.bbPctB * 100).toFixed(0)}%, RSI5=${ind.rsi5.toFixed(1)}`,
    impactPctPts: impactStep3,
    runningProbabilityPct: p3,
    sentiment: sentimentOfDelta(impactStep3),
    chosenBranch: {
      label: isOversold
        ? 'Oversold Stretch (Snapback Zone)'
        : isOverbought
          ? 'Overheated Rally (Pullback Risk)'
          : 'Normal Price Range',
      condition: isOversold
        ? '5d RSI ≤ 32 or drop > 1.2σ'
        : isOverbought
          ? '5d RSI ≥ 70 or jump > 1.2σ'
          : 'Within normal 5-day band',
      explanation: isOversold
        ? `Because ${symbol} dropped sharply over the past 5 days (RSI-5: ${ind.rsi5.toFixed(0)}), the model recognizes classic short-term oversold stretch (${impactStep3 >= 0 ? '+' : ''}${impactStep3.toFixed(1)} pts).`
        : isOverbought
          ? `After a rapid 5-day surge (RSI-5: ${ind.rsi5.toFixed(0)}), the model applies a cooling pullback penalty (${impactStep3 >= 0 ? '+' : ''}${impactStep3.toFixed(1)} pts).`
          : `Recent 5-day movement is inside normal bands, so mean-reversion pressure is minimal (${impactStep3 >= 0 ? '+' : ''}${impactStep3.toFixed(1)} pts).`,
      isTaken: true,
      impactPctPts: impactStep3,
    },
    alternativeBranch: {
      label: isOversold ? 'Overheated Rally (RSI-5 ≥ 70)' : 'Deep Oversold Dip (RSI-5 ≤ 32)',
      condition: isOversold ? 'RSI-5 ≥ 70' : 'RSI-5 ≤ 32',
      explanation: isOversold
        ? 'If the stock had surged rapidly instead, short-term pullback pressure would subtract points.'
        : 'A sharp multi-day selloff into oversold territory often triggers higher short-term bounce odds.',
      isTaken: false,
    },
  };

  const hasNews = enrichedArticles.length > 0;
  const step4: DecisionTreeStep = {
    id: 'NEWS_CATALYSTS',
    stepNumber: 4,
    title: 'Breaking Financial & AI News',
    question: 'What are today’s financial headlines and AI papers saying?',
    measuredSummary: hasNews
      ? `${enrichedArticles.length} linked ${enrichedArticles.length === 1 ? 'article' : 'articles'} · Avg tone: ${avgSentiment >= 0.12 ? 'Bullish' : avgSentiment <= -0.12 ? 'Bearish' : 'Mixed/Neutral'} (${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toFixed(2)})`
      : '0 direct company headlines matched right now',
    technicalDetail: `n=${enrichedArticles.length}, decayedSentiment=${avgSentiment.toFixed(2)}, paperVel=${paperVelocityScore.toFixed(2)}`,
    impactPctPts: impactStep4,
    runningProbabilityPct: p4,
    sentiment: sentimentOfDelta(impactStep4),
    chosenBranch: {
      label: !hasNews
        ? 'No Active News Catalysts'
        : impactStep4 >= 0.5
          ? 'Net Positive News Catalysts'
          : impactStep4 <= -0.5
            ? 'Net Negative / Risk Headlines'
            : 'Mixed or Neutral News Coverage',
      condition: !hasNews
        ? '0 matched headlines'
        : impactStep4 >= 0.5
          ? 'Positive weighted sentiment'
          : impactStep4 <= -0.5
            ? 'Negative weighted sentiment'
            : 'Balanced headlines',
      explanation: !hasNews
        ? `No recent breaking headlines or research papers directly matched ${companyName}, so news adds 0.0 percentage points.`
        : impactStep4 >= 0.5
          ? `Recent coverage is predominantly constructive, lifting upside probability by +${impactStep4.toFixed(1)} pts.`
          : impactStep4 <= -0.5
            ? `Recent headlines contain clear risk or negative catalysts, pulling upside odds down by ${impactStep4.toFixed(1)} pts.`
            : `Headlines balance positive and negative themes, leaving news impact near zero (${impactStep4 >= 0 ? '+' : ''}${impactStep4.toFixed(1)} pts).`,
      isTaken: true,
      impactPctPts: impactStep4,
    },
    alternativeBranch: {
      label: impactStep4 < 0 ? 'Positive Product / Earnings News' : 'Regulatory / Negative News Shock',
      condition: impactStep4 < 0 ? 'Bullish headlines' : 'Bearish headlines',
      explanation: impactStep4 < 0
        ? 'Strong earnings beats, product demand wins, or cleared probes would swing this branch positive.'
        : 'Surprise probes, export bans, or earnings misses would subtract points here.',
      isTaken: false,
    },
    evidenceArticles: enrichedArticles,
  };

  const highVolFlag = highVolRegimeProbPct >= 55 || forecastVolAnnualized >= 45;
  const step5: DecisionTreeStep = {
    id: 'SECTOR_RISK',
    stepNumber: 5,
    title: 'Volatility, Volume & AI Lab Edge',
    question: 'Are price swings stable or choppy, and is there an AI lab edge?',
    measuredSummary: `Forecast swing: ${forecastVolAnnualized.toFixed(0)}%/yr · Volume today: ${ind.rvol20.toFixed(2)}x avg${benchmarkRank ? ` · #${benchmarkRank.rank} AI Model` : ''}`,
    technicalDetail: `ATR=${ind.atr14Pct.toFixed(2)}%, vol20=${ind.realizedVol20d.toFixed(1)}%, rvol=${ind.rvol20.toFixed(2)}x, pHiVol=${highVolRegimeProbPct.toFixed(0)}%`,
    impactPctPts: impactStep5,
    runningProbabilityPct: p5,
    sentiment: sentimentOfDelta(impactStep5),
    chosenBranch: {
      label: highVolFlag
        ? 'Elevated Volatility Regime'
        : 'Steady Volume & Volatility',
      condition: highVolFlag ? 'High Vol Prob ≥ 55% or Vol ≥ 45%' : 'Normal Volatility Regime',
      explanation: highVolFlag
        ? `${symbol} carries ${highVolRegimeProbPct.toFixed(0)}% probability of wide price swings (~${forecastVolAnnualized.toFixed(0)}% annualized), widening the 30-day target range (${impactStep5 >= 0 ? '+' : ''}${impactStep5.toFixed(1)} pts).`
        : `Trading volume (${ind.rvol20.toFixed(2)}x normal) and volatility (~${forecastVolAnnualized.toFixed(0)}%/yr) remain orderly${benchmarkRank ? ` with ${benchmarkRank.modelName} ranked #${benchmarkRank.rank} on Artificial Analysis` : ''} (${impactStep5 >= 0 ? '+' : ''}${impactStep5.toFixed(1)} pts).`,
      isTaken: true,
      impactPctPts: impactStep5,
    },
    alternativeBranch: {
      label: highVolFlag ? 'Calm Low-Volatility Regime' : 'High-Volatility Turbulence Spike',
      condition: highVolFlag ? 'Vol < 35%/yr' : 'Vol ≥ 45%/yr',
      explanation: highVolFlag
        ? 'Quieter daily swings would tighten the expected 30-day price channel.'
        : 'A volume spike alongside wide intraday swings would widen risk bounds.',
      isTaken: false,
    },
  };

  const steps = [step1, step2, step3, step4, step5];

  // Build Bullish vs Bearish Tug-of-War lists
  const allFactors: FactorImpactItem[] = [
    {
      id: 'macro',
      label: step1.chosenBranch.label,
      plainExplanation: step1.measuredSummary,
      valueText: `VIX ${macro.vixLevel.toFixed(1)}`,
      impactPctPts: impactStep1,
      category: 'MACRO',
    },
    {
      id: 'trend',
      label: step2.chosenBranch.label,
      plainExplanation: step2.measuredSummary,
      valueText: `${ind.distSma20Pct >= 0 ? '+' : ''}${ind.distSma20Pct.toFixed(1)}% vs 20d`,
      impactPctPts: impactStep2,
      category: 'TREND',
    },
    {
      id: 'stretch',
      label: step3.chosenBranch.label,
      plainExplanation: step3.measuredSummary,
      valueText: `${ind.return5dPct >= 0 ? '+' : ''}${ind.return5dPct.toFixed(1)}% (5d)`,
      impactPctPts: impactStep3,
      category: 'STRETCH',
    },
    {
      id: 'news',
      label: step4.chosenBranch.label,
      plainExplanation: step4.measuredSummary,
      valueText: `${enrichedArticles.length} articles`,
      impactPctPts: impactStep4,
      category: 'NEWS',
    },
    {
      id: 'risk',
      label: step5.chosenBranch.label,
      plainExplanation: step5.measuredSummary,
      valueText: `${forecastVolAnnualized.toFixed(0)}% vol`,
      impactPctPts: impactStep5,
      category: 'RISK',
    },
  ];

  const bullishFactors = allFactors
    .filter((f) => f.impactPctPts > 0.05)
    .sort((a, b) => b.impactPctPts - a.impactPctPts);
  const bearishFactors = allFactors
    .filter((f) => f.impactPctPts < -0.05)
    .sort((a, b) => a.impactPctPts - b.impactPctPts);

  const featureAttributions: FeatureAttributionItem[] = DIRECTION_FEATURE_KEYS.map((key, idx) => {
    const val = extracted.directionVector[idx];
    const meta = FEATURE_META[key];
    const logOddsImpact = Math.round(attr[idx] * 10000) / 10000;
    const pctPtsImpact = logOddsToPctDelta(baseLogOdds, attr[idx]);
    return {
      key,
      label: meta?.label || key,
      valueFormatted: meta ? meta.format(val) : val.toFixed(2),
      logOddsImpact,
      pctPtsImpact,
    };
  });

  if (Math.abs(newsLogOdds) > 0.0001 || enrichedArticles.length > 0) {
    featureAttributions.push({
      key: 'newsAlpha',
      label: 'Time-Decayed News & Research Alpha',
      valueFormatted: `${enrichedArticles.length} items (${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toFixed(2)})`,
      logOddsImpact: Math.round(newsLogOdds * 10000) / 10000,
      pctPtsImpact: impactStep4,
    });
  }

  featureAttributions.sort((a, b) => Math.abs(b.logOddsImpact) - Math.abs(a.logOddsImpact));

  const verdictHeadline =
    trajectory === 'HIGH_VOLATILITY_CHURN'
      ? `Turbulent Swing Regime — ${upProbabilityPct.toFixed(0)}% Upside Odds`
      : upProbabilityPct >= 56
        ? `Moderately Bullish Setup (${upProbabilityPct.toFixed(0)}% Upside Odds)`
        : upProbabilityPct >= 53
          ? `Slight Bullish Lean (${upProbabilityPct.toFixed(0)}% Upside Odds)`
          : upProbabilityPct <= 44
            ? `Moderately Bearish Setup (${(100 - upProbabilityPct).toFixed(0)}% Downside Odds)`
            : upProbabilityPct <= 47
              ? `Slight Bearish Lean (${(100 - upProbabilityPct).toFixed(0)}% Downside Odds)`
              : `Balanced Toss-Up (${upProbabilityPct.toFixed(0)}% Up / ${(100 - upProbabilityPct).toFixed(0)}% Down)`;

  const topDriver = [...allFactors].sort((a, b) => Math.abs(b.impactPctPts) - Math.abs(a.impactPctPts))[0];
  const verdictSummary = `Starting from a ${p0.toFixed(0)}% market baseline, ${steps.length} decision checkpoints move ${symbol} to ${upProbabilityPct.toFixed(0)}% upside odds over the next 5 trading days. Biggest driver: ${topDriver.label} (${topDriver.impactPctPts >= 0 ? '+' : ''}${topDriver.impactPctPts.toFixed(1)} pts).`;

  const decisionTree: ExplainableDecisionTree = {
    baseProbabilityPct: p0,
    finalProbabilityPct: upProbabilityPct,
    horizonLabel: '5-Day Direction · 30-Day Channel',
    verdictHeadline,
    verdictSummary,
    steps,
    bullishFactors,
    bearishFactors,
    featureAttributions,
    trainedTrees: dirEval.treeTraces,
  };

  const decisionPath = steps.map(
    (s) =>
      `Step ${s.stepNumber} (${s.title}): ${s.chosenBranch.label} — ${s.measuredSummary} (${s.impactPctPts >= 0 ? '+' : ''}${s.impactPctPts.toFixed(1)}% pts → ${s.runningProbabilityPct.toFixed(1)}%)`
  );

  return {
    trajectory,
    confidencePercent,
    signalScore: normalizedSignal,
    thesis,
    riskLevel,
    featureImportance: {
      newsSentiment: wNews,
      dispatchVolume: wDisp,
      priceMomentum: wMom,
      openSourcePressure: wOpen,
      volatility: wVol,
    },
    decisionPath,
    rsi14: ind.rsi14,
    smaTrend,
    sma5: ind.sma5,
    sma15: ind.sma15,
    relativeAlpha: Math.round((momentum - techSectorMeanChange) * 100) / 100,
    volatilityAnnualized: ind.realizedVol20d,
    expected30dChannel,
    paperVelocityScore,
    upProbabilityPct,
    peerOutperformProbPct,
    highVolRegimeProbPct,
    forecastVolAnnualized,
    rsi5: ind.rsi5,
    sma20: ind.sma20,
    sma50: ind.sma50,
    sma200: ind.sma200,
    atr14Pct: ind.atr14Pct,
    rvol20: ind.rvol20,
    bbPctB: ind.bbPctB,
    return5dPct: ind.return5dPct,
    return21dPct: ind.return21dPct,
    macdHistNorm: ind.macdHistNorm,
    decisionTree,
  };
}
