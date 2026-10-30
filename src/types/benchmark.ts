import { FrontierLab } from './index';

export interface ModelBenchmark {
  id: string;
  name: string;
  slug: string;
  creator: {
    id: string;
    name: string;
    lab: FrontierLab;
  };
  evaluations: {
    intelligenceIndex: number; // Artificial Analysis Intelligence Index (0-100)
    speedTokensPerSecond: number; // Median output tokens/sec
    blendedPricePer1M?: number; // Cost in USD per 1M tokens
    costPerTask?: number; // Cost in USD per standard evaluation task
  };
  metrics: {
    rank: number;
    speedRank: number;
    costRank: number;
  };
  category: 'Frontier' | 'Open Weights' | 'Specialized';
  releaseDate?: string;
}

export interface BenchmarkResponse {
  source: 'live_api' | 'verified_telemetry_snapshot';
  attribution: {
    provider: 'Artificial Analysis';
    url: 'https://artificialanalysis.ai';
    notice: 'Independent analysis of AI models and benchmarks via Artificial Analysis API';
  };
  models: ModelBenchmark[];
  lastUpdated: string;
}
