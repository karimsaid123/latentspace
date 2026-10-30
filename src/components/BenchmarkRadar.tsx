'use client';

import React, { useState, useEffect } from 'react';
import { ModelBenchmark, BenchmarkResponse } from '@/types/benchmark';
import { ExternalLink, BarChart3, Zap, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

interface BenchmarkRadarProps {
  onSelectLab?: (lab: string) => void;
}

type MetricMode = 'intelligence' | 'speed' | 'cost';

export default function BenchmarkRadar({ onSelectLab }: BenchmarkRadarProps) {
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricMode, setMetricMode] = useState<MetricMode>('intelligence');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/benchmarks');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load benchmarks:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-12 py-6 border-b border-black/10 font-mono text-[9px] tracking-widest uppercase text-black/40">
        <span>INITIALIZING BENCHMARK TELEMETRY PIPELINE [ARTIFICIAL ANALYSIS API]...</span>
      </div>
    );
  }

  if (!data || !data.models || data.models.length === 0) return null;

  // Sort based on active metric
  const sorted = [...data.models].sort((a, b) => {
    if (metricMode === 'intelligence') {
      return b.evaluations.intelligenceIndex - a.evaluations.intelligenceIndex;
    }
    if (metricMode === 'speed') {
      return b.evaluations.speedTokensPerSecond - a.evaluations.speedTokensPerSecond;
    }
    if (metricMode === 'cost') {
      return (a.evaluations.blendedPricePer1M || 0) - (b.evaluations.blendedPricePer1M || 0);
    }
    return 0;
  });

  const maxIntelligence = 65;
  const maxSpeed = 200;
  const maxCost = 15;

  return (
    <section id="benchmark-radar" className="w-full max-w-[1700px] mx-auto px-6 sm:px-12 py-12 border-b border-black select-none">
      
      {/* Container Box with 4 Corner Bounding Handles */}
      <div className="relative border border-black p-6 sm:p-10 bg-[#faf9f6] shadow-sm">
        
        {/* 4 Corner Square Handles */}
        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black z-20" />
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black z-20" />
        <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-black z-20" />
        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-black z-20" />

        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-baseline gap-4 pb-6 border-b border-black/15 font-mono text-[9px] tracking-widest uppercase text-black/50">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-black text-sm sm:text-base">00 // ARTIFICIAL ANALYSIS BENCHMARK RADAR</span>
              <span className="border border-black px-1.5 py-0.5 text-black font-bold">v5 INDEX</span>
            </div>
            <p className="mt-1 text-black/60 normal-case tracking-normal text-xs font-sans">
              Independent model intelligence, tokens-per-second latency, and blended inference cost per task.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-black/40">
              TELEMETRY: [{data.source === 'live_api' ? 'LIVE API KEY CONNECTED' : 'VERIFIED BENCHMARK SNAPSHOT'}]
            </span>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="font-bold text-black border border-black px-2.5 py-1 hover:bg-black hover:text-[#faf9f6] transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>[{isExpanded ? 'COLLAPSE RADAR' : 'EXPAND RADAR'}]</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="pt-8 space-y-8 animate-fade-in">
            
            {/* Metric Mode Selectors */}
            <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] tracking-widest uppercase">
              <div className="flex items-center gap-2">
                <span className="text-black/50 font-bold shrink-0">PRIMARY METRIC:</span>
                
                <button
                  onClick={() => setMetricMode('intelligence')}
                  className={`px-3 py-1.5 border transition-all cursor-pointer flex items-center gap-1.5 ${
                    metricMode === 'intelligence'
                      ? 'border-black bg-black text-[#faf9f6] font-bold shadow-md'
                      : 'border-black/20 text-black/70 hover:border-black'
                  }`}
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>INTELLIGENCE INDEX [0-100]</span>
                </button>

                <button
                  onClick={() => setMetricMode('speed')}
                  className={`px-3 py-1.5 border transition-all cursor-pointer flex items-center gap-1.5 ${
                    metricMode === 'speed'
                      ? 'border-black bg-black text-[#faf9f6] font-bold shadow-md'
                      : 'border-black/20 text-black/70 hover:border-black'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>SPEED [TOKENS / SEC]</span>
                </button>

                <button
                  onClick={() => setMetricMode('cost')}
                  className={`px-3 py-1.5 border transition-all cursor-pointer flex items-center gap-1.5 ${
                    metricMode === 'cost'
                      ? 'border-black bg-black text-[#faf9f6] font-bold shadow-md'
                      : 'border-black/20 text-black/70 hover:border-black'
                  }`}
                >
                  <DollarSign className="w-3 h-3" />
                  <span>COST [USD / 1M TOKENS]</span>
                </button>
              </div>

              <div className="text-[9px] text-black/40 hidden sm:block">
                {metricMode === 'intelligence' && 'HIGHER SCORE = STRONGER MULTI-MODAL REASONING & ALIGNMENT'}
                {metricMode === 'speed' && 'HIGHER VALUE = FASTER MEDIAN GENERATION LATENCY & TIME-TO-FIRST-TOKEN'}
                {metricMode === 'cost' && 'LOWER VALUE = MORE CAPITAL EFFICIENT TOKENS PER INTELLIGENCE TASK'}
              </div>
            </div>

            {/* Benchmark Leaderboard Grid */}
            <div className="grid grid-cols-1 gap-2 pt-2">
              {sorted.map((model, idx) => {
                let barPercentage = 0;
                let valueDisplay = '';
                
                if (metricMode === 'intelligence') {
                  barPercentage = Math.min(100, (model.evaluations.intelligenceIndex / maxIntelligence) * 100);
                  valueDisplay = `${model.evaluations.intelligenceIndex} / 100`;
                } else if (metricMode === 'speed') {
                  barPercentage = Math.min(100, (model.evaluations.speedTokensPerSecond / maxSpeed) * 100);
                  valueDisplay = `${model.evaluations.speedTokensPerSecond} TOK/S`;
                } else {
                  // Inverted scale for cost: lower is better
                  const price = model.evaluations.blendedPricePer1M || 1;
                  barPercentage = Math.max(10, 100 - (price / maxCost) * 90);
                  valueDisplay = `$${price.toFixed(2)} / 1M`;
                }

                return (
                  <div
                    key={model.id}
                    className="p-3.5 bg-black/[0.015] border border-black/10 hover:border-black transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-[10px] group"
                  >
                    {/* Rank & Model Identity */}
                    <div className="flex items-center gap-4 min-w-[320px]">
                      <span className="font-bold text-black/40 text-[9px] w-6 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="flex flex-col">
                        <span className="font-black text-xs uppercase text-black tracking-tight group-hover:underline">
                          {model.name}
                        </span>
                        
                        <div className="flex items-center gap-2 text-[9px] text-black/50 mt-0.5">
                          <button
                            onClick={() => onSelectLab && onSelectLab(model.creator.lab)}
                            className="font-bold text-black hover:underline cursor-pointer"
                            title={`Filter feed to ${model.creator.lab}`}
                          >
                            [{model.creator.name}]
                          </button>
                          <span>•</span>
                          <span>{model.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Telemetry Bar */}
                    <div className="flex-1 max-w-xl flex items-center gap-3">
                      <div className="flex-1 h-3 bg-black/10 relative overflow-hidden border border-black/20">
                        <div
                          className="h-full bg-black transition-all duration-500 ease-out"
                          style={{ width: `${barPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Numeric Evaluation & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                      <span className="font-bold text-xs text-black">
                        {valueDisplay}
                      </span>

                      <div className="text-[9px] text-black/40 hidden lg:flex items-center gap-3">
                        <span>IQ: {model.evaluations.intelligenceIndex}</span>
                        <span>SPD: {model.evaluations.speedTokensPerSecond}</span>
                        <span>${model.evaluations.blendedPricePer1M?.toFixed(2)}</span>
                      </div>

                      {onSelectLab && (
                        <button
                          onClick={() => onSelectLab(model.creator.lab)}
                          className="text-[9px] font-bold text-black/60 hover:text-black hover:underline cursor-pointer"
                        >
                          [DOSSIER →]
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Mandatory Attribution Footer (as required by Artificial Analysis API) */}
            <div className="pt-4 border-t border-black/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 font-mono text-[9px] text-black/40">
              <div className="flex items-center gap-2">
                <span>BENCHMARK DATA PROVIDED BY</span>
                <a
                  href="https://artificialanalysis.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-black underline underline-offset-4 flex items-center gap-1 hover:opacity-60"
                >
                  <span>ARTIFICIALANALYSIS.AI</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <span>// INDEPENDENT EVALUATIONS</span>
              </div>

              <div className="text-black/50">
                RATE LIMIT: 1,000 REQS/DAY // CACHED HOURLY // KEY: {process.env.ARTIFICIAL_ANALYSIS_API_KEY ? 'ACTIVE' : 'DEFAULT'}
              </div>
            </div>

          </div>
        )}

      </div>

    </section>
  );
}
