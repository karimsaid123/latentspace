'use client';

import React, { useState, useEffect } from 'react';
import { ModelBenchmark, BenchmarkResponse } from '@/types/benchmark';
import { ExternalLink, BarChart3, Zap, DollarSign } from 'lucide-react';
import { getCompanyBrand, CompanyLogo } from '@/components/CompanyBrand';

interface BenchmarkRadarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLab?: (lab: string) => void;
}

type MetricMode = 'intelligence' | 'speed' | 'cost';

export default function BenchmarkRadar({
  isOpen,
  onClose,
  onSelectLab,
}: BenchmarkRadarProps) {
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricMode, setMetricMode] = useState<MetricMode>('intelligence');

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load benchmark telemetry
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

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-fade-in font-mono text-[10px] tracking-widest uppercase text-white">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/70 backdrop-blur-sm select-none animate-fade-in">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Container Box in Monumental Swiss Monospace Theme */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#faf9f6] text-black border border-black z-10 overflow-hidden shadow-2xl animate-modal-in flex flex-col">
        
        {/* 4 Corner Bounding Box Square Handles */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black z-30" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black font-mono text-[9px] uppercase tracking-widest text-black/60 bg-black/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-black inline-block" />
            <span className="font-bold text-black text-xs sm:text-sm">00 // ARTIFICIAL ANALYSIS BENCHMARK RADAR</span>
            <span className="border border-black px-1.5 py-0.5 text-black font-bold">v5 INDEX</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-black/40 text-[9px] hidden sm:inline">
              [{data.source === 'live_api' ? 'LIVE API KEY CONNECTED' : 'VERIFIED BENCHMARK SNAPSHOT'}]
            </span>

            <button
              onClick={onClose}
              className="font-bold text-black border border-black px-2.5 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Close radar"
            >
              <span>[CLOSE ✕]</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          <div className="border-b border-black/10 pb-4">
            <p className="text-black/70 text-xs font-sans tracking-normal leading-relaxed">
              Independent model intelligence evaluation, output tokens-per-second latency, and blended inference cost per benchmark task.
            </p>
          </div>

          {/* Metric Mode Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] tracking-widest uppercase">
            <div className="flex items-center gap-2 flex-wrap">
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

            <div className="text-[9px] text-black/40 hidden md:block">
              {metricMode === 'intelligence' && 'HIGHER SCORE = STRONGER MULTI-MODAL REASONING & ALIGNMENT'}
              {metricMode === 'speed' && 'HIGHER VALUE = FASTER MEDIAN GENERATION LATENCY'}
              {metricMode === 'cost' && 'LOWER VALUE = MORE CAPITAL EFFICIENT PER TASK'}
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
                const price = model.evaluations.blendedPricePer1M || 1;
                barPercentage = Math.max(10, 100 - (price / maxCost) * 90);
                valueDisplay = `$${price.toFixed(2)} / 1M`;
              }

              const brand = getCompanyBrand(model.creator.id || model.creator.name || model.creator.lab);

              return (
                <div
                  key={model.id}
                  className="p-3 sm:p-3.5 bg-black/[0.015] border border-black/10 hover:border-black transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-[10px] group"
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: brand.primaryColor,
                  }}
                >
                  {/* Rank & Company Logo & Model Identity */}
                  <div className="flex items-center gap-3.5 min-w-[320px]">
                    <span className="font-bold text-black/40 text-[9px] w-5 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* Small Company Logo with brand-matched background and border */}
                    <div
                      className="w-7 h-7 shrink-0 border flex items-center justify-center p-1 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: brand.bgTint,
                        borderColor: brand.borderColor,
                      }}
                      title={brand.name}
                    >
                      <CompanyLogo brandId={brand.id} className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col">
                      <span className="font-black text-xs uppercase text-black tracking-tight group-hover:underline">
                        {model.name}
                      </span>
                      
                      <div className="flex items-center gap-2 text-[9px] mt-0.5">
                        <button
                          onClick={() => {
                            if (onSelectLab) onSelectLab(model.creator.lab);
                            onClose();
                          }}
                          className="font-bold hover:underline cursor-pointer flex items-center gap-1"
                          style={{ color: brand.textColor }}
                          title={`Filter feed to ${model.creator.lab}`}
                        >
                          <span>[{model.creator.name}]</span>
                        </button>
                        <span className="text-black/30">•</span>
                        <span className="text-black/50">{model.category}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Telemetry Bar Matching Company Brand Color */}
                  <div className="flex-1 max-w-xl flex items-center gap-3">
                    <div className="flex-1 h-3 bg-black/5 relative overflow-hidden border border-black/15">
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                          width: `${barPercentage}%`,
                          backgroundColor: brand.primaryColor,
                        }}
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
                        onClick={() => {
                          onSelectLab(model.creator.lab);
                          onClose();
                        }}
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

        </div>

        {/* Modal Bottom Footer with Mandatory Attribution */}
        <div className="px-6 py-3 border-t border-black/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-mono text-[9px] text-black/40 bg-black/[0.01]">
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
            RATE LIMIT: 1,000 REQS/DAY // CACHED HOURLY
          </div>
        </div>

      </div>
    </div>
  );
}
