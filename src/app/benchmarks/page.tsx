'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BarChart3, 
  Zap, 
  DollarSign, 
  Activity, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  Compass, 
  TrendingUp, 
  Sparkles, 
  Cpu,
  ArrowUpDown,
  Check
} from 'lucide-react';
import { getCompanyBrand, CompanyLogo } from '@/components/CompanyBrand';
import { ModelBenchmark, BenchmarkResponse } from '@/types/benchmark';
import { VERIFIED_BENCHMARK_SNAPSHOT } from '@/lib/benchmark-client';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';

type MetricTab = 'intelligence' | 'speed' | 'cost';
type CategoryFilter = 'ALL' | 'Frontier' | 'Open Weights' | 'Specialized';
type TableSortField = 'rank' | 'intelligence' | 'speed' | 'cost' | 'name';

export default function BenchmarksPage() {
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMetricTab, setActiveMetricTab] = useState<MetricTab>('intelligence');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [tableSort, setTableSort] = useState<TableSortField>('rank');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch benchmark telemetry from API or fallback
  useEffect(() => {
    async function loadBenchmarks() {
      try {
        const res = await fetch('/api/benchmarks');
        if (res.ok) {
          const json: BenchmarkResponse = await res.json();
          setData(json);
        } else {
          setData({
            source: 'verified_telemetry_snapshot',
            attribution: {
              provider: 'Artificial Analysis',
              url: 'https://artificialanalysis.ai',
              notice: 'Independent analysis of AI models and benchmarks via Artificial Analysis API',
            },
            models: VERIFIED_BENCHMARK_SNAPSHOT,
            lastUpdated: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Failed to load benchmarks, using verified fallback:', err);
        setData({
          source: 'verified_telemetry_snapshot',
          attribution: {
            provider: 'Artificial Analysis',
            url: 'https://artificialanalysis.ai',
            notice: 'Independent analysis of AI models and benchmarks via Artificial Analysis API',
          },
          models: VERIFIED_BENCHMARK_SNAPSHOT,
          lastUpdated: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    }
    loadBenchmarks();
  }, []);

  const models = useMemo(() => {
    return data?.models || VERIFIED_BENCHMARK_SNAPSHOT;
  }, [data]);

  // Models filtered by category
  const filteredModels = useMemo(() => {
    if (categoryFilter === 'ALL') return models;
    return models.filter((m) => m.category === categoryFilter);
  }, [models, categoryFilter]);

  // Sorted list for Graphs
  const intelligenceSorted = useMemo(() => {
    return [...models].sort(
      (a, b) => b.evaluations.intelligenceIndex - a.evaluations.intelligenceIndex
    );
  }, [models]);

  const speedSorted = useMemo(() => {
    return [...models].sort(
      (a, b) => b.evaluations.speedTokensPerSecond - a.evaluations.speedTokensPerSecond
    );
  }, [models]);

  const costSorted = useMemo(() => {
    return [...models].sort(
      (a, b) => (a.evaluations.blendedPricePer1M || 0) - (b.evaluations.blendedPricePer1M || 0)
    );
  }, [models]);

  // Sorted list for detailed table
  const tableSortedModels = useMemo(() => {
    const list = [...filteredModels];
    list.sort((a, b) => {
      let diff = 0;
      if (tableSort === 'rank') diff = a.metrics.rank - b.metrics.rank;
      if (tableSort === 'intelligence') diff = b.evaluations.intelligenceIndex - a.evaluations.intelligenceIndex;
      if (tableSort === 'speed') diff = b.evaluations.speedTokensPerSecond - a.evaluations.speedTokensPerSecond;
      if (tableSort === 'cost') diff = (a.evaluations.blendedPricePer1M || 0) - (b.evaluations.blendedPricePer1M || 0);
      if (tableSort === 'name') diff = a.name.localeCompare(b.name);
      return sortAsc ? -diff : diff;
    });
    return list;
  }, [filteredModels, tableSort, sortAsc]);

  const toggleSort = (field: TableSortField) => {
    if (tableSort === field) {
      setSortAsc(!sortAsc);
    } else {
      setTableSort(field);
      setSortAsc(false);
    }
  };

  // Lab aggregations
  const labHighlights = useMemo(() => {
    const labs = [
      { id: 'google', name: 'Google DeepMind', labFilter: 'Google DeepMind', desc: 'Gemini 4 Multimodal Frontier & Orbital TPU Acceleration' },
      { id: 'anthropic', name: 'Anthropic', labFilter: 'Anthropic', desc: 'Claude Opus 5.5 & Constitutional AI Reasoning' },
      { id: 'openai', name: 'OpenAI', labFilter: 'OpenAI', desc: 'GPT-6 Astro & High-Throughput Reasoning Matrix' },
      { id: 'xai', name: 'SpaceX & xAI', labFilter: 'SpaceX & xAI', desc: 'Grok 4.7 & Colossus Memphis Supercluster Compute' },
      { id: 'mistral', name: 'Mistral AI', labFilter: 'Mistral AI', desc: 'Mistral Large 4 MoE & Sovereign Open Architecture' },
      { id: 'moonshot', name: 'Moonshot AI', labFilter: 'Moonshot AI', desc: 'Kimi K3.1 Pro & Ultra-Long Context Mathematical Logic' },
    ];

    return labs.map((l) => {
      const topModel = models.find((m) => m.creator.lab === l.labFilter || m.creator.name.toLowerCase().includes(l.id));
      const brand = getCompanyBrand(l.labFilter);
      return {
        ...l,
        brand,
        topModel,
      };
    });
  }, [models]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-black">
      
      {/* ─────────────────────────────────────────────────────────────
          MINIMAL HEADER / TOP NAVIGATION
      ───────────────────────────────────────────────────────────── */}
      <header className="w-full pt-8 pb-5 px-6 sm:px-12 max-w-[1700px] mx-auto select-none font-mono tracking-widest uppercase border-b border-black/15">
        <div className="flex items-center justify-between pb-5 gap-6">
          
          {/* Brand & Breadcrumb */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <Link
              href="/"
              className="font-black text-xl sm:text-2xl tracking-tight text-black flex items-center gap-2.5 hover:opacity-75 transition-opacity"
            >
              LATENT SPACE
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-70"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
              </span>
            </Link>

            <span className="text-black/30 hidden md:inline text-lg">/</span>

            <span className="text-black/60 font-mono text-xs sm:text-[13px] hidden sm:inline tracking-wider">
              INDEX // 000 // ARTIFICIAL ANALYSIS BENCHMARKS
            </span>
          </div>

          {/* Controls & Navigation */}
          <div className="flex items-center gap-6 sm:gap-8 text-black/70 text-xs sm:text-[13px]">
            <Link
              href="/"
              scroll={true}
              className="hover:text-black cursor-pointer transition-colors text-black font-bold flex items-center gap-2 border border-black/40 hover:border-black px-3.5 py-1.5 hover:bg-black/[0.04]"
              title="Return to Frontier Feed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>[← RETURN TO FEED]</span>
            </Link>

            {/* Time on the far right */}
            <div className="text-right hidden sm:block font-bold text-black font-mono text-sm sm:text-base tracking-wider pl-4 border-l-2 border-black/20">
              {currentTime || '--:--:--'}
            </div>
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          HERO & KPI METRICS SUMMARY
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-6 sm:px-12 py-10 select-none animate-fade-up">
        
        {/* Page Title & Mission Statement with Upward Bounce Animation */}
        <section className="mb-12 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-widest text-black/50 mb-4 pb-2 border-b border-black/10">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 bg-black inline-block" />
              <span className="font-bold text-black">INDEPENDENT TELEMETRY PROTOCOL</span>
              <span>•</span>
              <span>ARTIFICIAL ANALYSIS API (v5 INDEX)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-black/40">EVALUATION STANDARD:</span>
              <span className="font-bold text-black">MULTI-MODAL INTELLIGENCE & LATENCY</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-8">
            <div className="lg:col-span-8">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-[-0.04em] leading-[0.85] text-black">
                BENCHMARK<br />RADAR
              </h1>
            </div>
            <div className="lg:col-span-4 font-mono text-xs uppercase text-black/70 leading-relaxed">
              <p>
                Real-time independent analysis of frontier artificial intelligence models. Evaluating multi-modal reasoning depth, token output latency, and compute cost efficiency across global labs.
              </p>
            </div>
          </div>

          {/* Quick KPI Cards (3 Major Indicators) with Staggered Upward Bounce */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-black">
            
            {/* Card 1: Intelligence Leader */}
            <div className="relative border border-black p-6 bg-white shadow-sm animate-fade-up-1">
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

              <div className="flex justify-between items-center font-mono text-[9px] uppercase tracking-widest text-black/40 mb-3">
                <span className="flex items-center gap-1.5 font-bold text-black">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  INTELLIGENCE LEADER
                </span>
                <span>AA INDEX v5</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-black mb-1">
                59 <span className="text-base text-black/40 font-mono">/ 100</span>
              </div>
              <div className="font-mono text-[10px] uppercase font-bold text-black">
                GEMINI 4 CARBON (HIGH)
              </div>
              <div className="font-mono text-[9px] uppercase text-black/50 mt-1">
                Google DeepMind • Frontier Multimodal
              </div>
            </div>

            {/* Card 2: Speed Leader */}
            <div className="relative border border-black p-6 bg-white shadow-sm animate-fade-up-2">
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

              <div className="flex justify-between items-center font-mono text-[9px] uppercase tracking-widest text-black/40 mb-3">
                <span className="flex items-center gap-1.5 font-bold text-black">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  THROUGHPUT LEADER
                </span>
                <span>MEDIAN LATENCY</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-black mb-1">
                176 <span className="text-base text-black/40 font-mono">TOK/S</span>
              </div>
              <div className="font-mono text-[10px] uppercase font-bold text-black">
                DEEPSEEK V4.1 FLASH (MAX)
              </div>
              <div className="font-mono text-[9px] uppercase text-black/50 mt-1">
                DeepSeek • Open Weights High-Speed Tier
              </div>
            </div>

            {/* Card 3: Cost Efficiency Leader */}
            <div className="relative border border-black p-6 bg-white shadow-sm animate-fade-up-3">
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

              <div className="flex justify-between items-center font-mono text-[9px] uppercase tracking-widest text-black/40 mb-3">
                <span className="flex items-center gap-1.5 font-bold text-black">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  COST EFFICIENCY
                </span>
                <span>PER TASK TASK</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-black mb-1">
                $0.26 <span className="text-base text-black/40 font-mono">/ TASK</span>
              </div>
              <div className="font-mono text-[10px] uppercase font-bold text-black">
                MIMO-V2.6-PRO
              </div>
              <div className="font-mono text-[9px] uppercase text-black/50 mt-1">
                MiMo AI • Ultra-Low Latency Inference
              </div>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 1: THE THREE COMPARATIVE CHARTS (Side-by-Side Grid)
        ───────────────────────────────────────────────────────────── */}
        <ScrollReveal yOffset={45} className="mb-20">
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-black font-mono text-[10px] tracking-widest uppercase">
              <div className="flex items-center gap-3">
                <span className="font-bold text-black">01 // TRI-METRIC COMPARATIVE GRAPHS</span>
                <span className="text-black/40 hidden sm:inline">|</span>
                <span className="text-black/60 hidden sm:inline">ARTIFICIAL ANALYSIS BENCHMARKS</span>
              </div>
              <div className="text-black/40 text-[9px] mt-1 sm:mt-0">
                SYNCHRONIZED WITH INDEPENDENT EVALUATION PIPELINE
              </div>
            </div>

            {/* 3 Column Graphs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* ──── GRAPH 1: INTELLIGENCE ──── */}
              <div className="border border-black p-6 bg-white relative flex flex-col justify-between">
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-black/10 font-mono text-[10px] uppercase">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-blue-600 inline-block" />
                      <span className="font-bold text-black">INTELLIGENCE</span>
                    </div>
                    <span className="text-black/40 text-[9px]">HIGHER IS BETTER</span>
                  </div>
                  <p className="font-mono text-[9px] uppercase text-black/50 mt-2 mb-6">
                    Artificial Analysis Intelligence Index (0-100)
                  </p>

                  {/* Bars */}
                  <div className="space-y-3.5">
                    {intelligenceSorted.slice(0, 10).map((m, idx) => {
                      const brand = getCompanyBrand(m.creator.lab || m.creator.name);
                      const percentage = Math.min(100, Math.round((m.evaluations.intelligenceIndex / 65) * 100));

                      return (
                        <div key={m.id} className="group">
                          <div className="flex items-center justify-between font-mono text-[9px] uppercase mb-1">
                            <div className="flex items-center gap-2 truncate max-w-[200px]">
                              <div className="w-4 h-4 border flex items-center justify-center p-0.5 shrink-0 bg-white" style={{ borderColor: brand.borderColor }}>
                                <CompanyLogo brandId={brand.id} className="w-2.5 h-2.5" />
                              </div>
                              <span className="font-bold text-black truncate group-hover:underline">{m.name}</span>
                            </div>
                            <span className="font-bold text-black font-mono">{m.evaluations.intelligenceIndex}</span>
                          </div>

                          {/* Bar Track */}
                          <div className="w-full h-2 bg-black/[0.04] overflow-hidden border border-black/10">
                            <div
                              className="h-full transition-all duration-700 group-hover:opacity-85"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: brand.primaryColor || '#000000',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-black/10 flex justify-between font-mono text-[8px] uppercase text-black/40">
                  <span>SCALE: 0 - 65 INDEX</span>
                  <span>N = 10 TOP PERFORMERS</span>
                </div>
              </div>

              {/* ──── GRAPH 2: SPEED (TOKENS / SEC) ──── */}
              <div className="border border-black p-6 bg-white relative flex flex-col justify-between">
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-black/10 font-mono text-[10px] uppercase">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-amber-500 inline-block" />
                      <span className="font-bold text-black">SPEED</span>
                    </div>
                    <span className="text-black/40 text-[9px]">HIGHER IS BETTER</span>
                  </div>
                  <p className="font-mono text-[9px] uppercase text-black/50 mt-2 mb-6">
                    Output tokens per second latency
                  </p>

                  {/* Bars */}
                  <div className="space-y-3.5">
                    {speedSorted.slice(0, 10).map((m) => {
                      const brand = getCompanyBrand(m.creator.lab || m.creator.name);
                      const percentage = Math.min(100, Math.round((m.evaluations.speedTokensPerSecond / 190) * 100));

                      return (
                        <div key={m.id} className="group">
                          <div className="flex items-center justify-between font-mono text-[9px] uppercase mb-1">
                            <div className="flex items-center gap-2 truncate max-w-[200px]">
                              <div className="w-4 h-4 border flex items-center justify-center p-0.5 shrink-0 bg-white" style={{ borderColor: brand.borderColor }}>
                                <CompanyLogo brandId={brand.id} className="w-2.5 h-2.5" />
                              </div>
                              <span className="font-bold text-black truncate group-hover:underline">{m.name}</span>
                            </div>
                            <span className="font-bold text-black font-mono">{m.evaluations.speedTokensPerSecond} <span className="text-[8px] text-black/50">T/S</span></span>
                          </div>

                          {/* Bar Track */}
                          <div className="w-full h-2 bg-black/[0.04] overflow-hidden border border-black/10">
                            <div
                              className="h-full transition-all duration-700 group-hover:opacity-85"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: '#2563EB',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-black/10 flex justify-between font-mono text-[8px] uppercase text-black/40">
                  <span>SCALE: 0 - 200 TOK/S</span>
                  <span>N = 10 TOP SPEED</span>
                </div>
              </div>

              {/* ──── GRAPH 3: COST PER TASK (USD) ──── */}
              <div className="border border-black p-6 bg-white relative flex flex-col justify-between">
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-black/10 font-mono text-[10px] uppercase">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-orange-600 inline-block" />
                      <span className="font-bold text-black">COST PER TASK</span>
                    </div>
                    <span className="text-black/40 text-[9px]">LOWER IS BETTER</span>
                  </div>
                  <p className="font-mono text-[9px] uppercase text-black/50 mt-2 mb-6">
                    Weighted blended cost (USD) per Intelligence task
                  </p>

                  {/* Bars */}
                  <div className="space-y-3.5">
                    {costSorted.slice(0, 10).map((m) => {
                      const brand = getCompanyBrand(m.creator.lab || m.creator.name);
                      const cost = m.evaluations.blendedPricePer1M || 0;
                      const percentage = Math.min(100, Math.round((cost / 14) * 100));

                      return (
                        <div key={m.id} className="group">
                          <div className="flex items-center justify-between font-mono text-[9px] uppercase mb-1">
                            <div className="flex items-center gap-2 truncate max-w-[200px]">
                              <div className="w-4 h-4 border flex items-center justify-center p-0.5 shrink-0 bg-white" style={{ borderColor: brand.borderColor }}>
                                <CompanyLogo brandId={brand.id} className="w-2.5 h-2.5" />
                              </div>
                              <span className="font-bold text-black truncate group-hover:underline">{m.name}</span>
                            </div>
                            <span className="font-bold text-black font-mono">${cost.toFixed(2)}</span>
                          </div>

                          {/* Bar Track */}
                          <div className="w-full h-2 bg-black/[0.04] overflow-hidden border border-black/10">
                            <div
                              className="h-full transition-all duration-700 group-hover:opacity-85"
                              style={{
                                width: `${Math.max(5, percentage)}%`,
                                backgroundColor: cost < 2 ? '#059669' : cost < 8 ? '#D97706' : '#DC2626',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-black/10 flex justify-between font-mono text-[8px] uppercase text-black/40">
                  <span>SCALE: $0 - $14 PER TASK</span>
                  <span>N = 10 MOST EFFICIENT</span>
                </div>
              </div>

            </div>
          </section>
        </ScrollReveal>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 2: 2D PARETO EFFICIENCY FRONTIER MATRIX (Scatter Plot)
        ───────────────────────────────────────────────────────────── */}
        <ScrollReveal yOffset={45} className="mb-20">
          <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-black font-mono text-[10px] tracking-widest uppercase">
            <div className="flex items-center gap-3">
              <span className="font-bold text-black">02 // 2D PARETO EFFICIENCY FRONTIER</span>
              <span className="text-black/40 hidden sm:inline">|</span>
              <span className="text-black/60 hidden sm:inline">INTELLIGENCE vs. OUTPUT SPEED vs. COST</span>
            </div>
            <div className="text-black/40 text-[9px]">
              QUADRANT MATRIX TELEMETRY
            </div>
          </div>

          <div className="border border-black p-6 sm:p-8 bg-white relative">
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

            {/* Matrix Container */}
            <div className="relative w-full h-[400px] border border-black/20 bg-[#faf9f6]/60 p-4 overflow-hidden">
              
              {/* Quadrant Guidelines */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] border-r border-dashed border-black/20" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] border-b border-dashed border-black/20" />

              {/* Quadrant Labels */}
              <div className="absolute top-3 left-4 font-mono text-[8px] tracking-widest text-black/40 uppercase">
                FRONTIER HEAVYWEIGHTS (HIGH IQ, MODERATE SPEED)
              </div>
              <div className="absolute top-3 right-4 font-mono text-[8px] tracking-widest text-black/40 uppercase text-right">
                VELOCITY TITANS (HIGH IQ & HIGH SPEED)
              </div>
              <div className="absolute bottom-3 left-4 font-mono text-[8px] tracking-widest text-black/40 uppercase">
                SPECIALIZED REASONING
              </div>
              <div className="absolute bottom-3 right-4 font-mono text-[8px] tracking-widest text-black/40 uppercase text-right">
                HIGH-THROUGHPUT ENGINES
              </div>

              {/* Plotted Models */}
              {models.map((m) => {
                const brand = getCompanyBrand(m.creator.lab || m.creator.name);
                // X Axis: Speed (20 to 185) -> 5% to 92%
                const xPct = Math.max(8, Math.min(92, ((m.evaluations.speedTokensPerSecond - 20) / (185 - 20)) * 84 + 8));
                // Y Axis: Intelligence (28 to 62) -> Inverted (higher = top) -> 10% to 90%
                const yPct = Math.max(10, Math.min(90, 100 - (((m.evaluations.intelligenceIndex - 28) / (62 - 28)) * 80 + 10)));
                const isSelected = selectedModelId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModelId(isSelected ? null : m.id)}
                    style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-20 group ${
                      isSelected ? 'scale-125 z-40' : 'hover:scale-110'
                    }`}
                  >
                    {/* Model Plot Node */}
                    <div 
                      className="w-7 h-7 rounded-none border border-black flex items-center justify-center p-1 bg-white shadow-md transition-transform"
                      style={{
                        borderColor: brand.borderColor,
                        backgroundColor: isSelected ? brand.bgTint : '#FFFFFF',
                      }}
                    >
                      <CompanyLogo brandId={brand.id} className="w-4 h-4" />
                    </div>

                    {/* Popover Pill on Hover or Select */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                      <div className="bg-black text-[#faf9f6] border border-black px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider shadow-xl flex flex-col gap-0.5">
                        <span className="font-bold">{m.name}</span>
                        <div className="flex items-center gap-2 text-[8px] text-white/80">
                          <span>IQ: {m.evaluations.intelligenceIndex}</span>
                          <span>•</span>
                          <span>{m.evaluations.speedTokensPerSecond} TOK/S</span>
                          <span>•</span>
                          <span>${m.evaluations.blendedPricePer1M?.toFixed(2)}/TASK</span>
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 bg-black rotate-45 -mt-1" />
                    </div>

                    {/* Subtle permanent label */}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 font-mono text-[8px] uppercase tracking-wider text-black/60 font-bold whitespace-nowrap bg-[#faf9f6]/80 px-1">
                      {m.slug.split('-')[0]}
                    </span>
                  </div>
                );
              })}

            </div>

            {/* Axis Descriptions */}
            <div className="flex flex-wrap justify-between items-center pt-4 mt-2 font-mono text-[9px] uppercase tracking-widest text-black/50">
              <div className="flex items-center gap-2">
                <span className="font-bold text-black">X-AXIS:</span>
                <span>OUTPUT SPEED (TOKENS / SECOND) →</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-black">Y-AXIS:</span>
                <span>↑ INTELLIGENCE INDEX (REASONING DEPTH)</span>
              </div>
              <div className="text-black/40">
                CLICK ANY NODE TO INSPECT TELEMETRY
              </div>
            </div>

          </div>
        </section>
      </ScrollReveal>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 3: FRONTIER LAB HEAD-TO-HEAD MATRICES
        ───────────────────────────────────────────────────────────── */}
        <ScrollReveal yOffset={45} className="mb-20">
          <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-black font-mono text-[10px] tracking-widest uppercase">
            <div className="flex items-center gap-3">
              <span className="font-bold text-black">03 // FRONTIER LAB HEAD-TO-HEAD</span>
              <span className="text-black/40 hidden sm:inline">|</span>
              <span className="text-black/60 hidden sm:inline">FLAGSHIP PERFORMANCE BREAKDOWN</span>
            </div>
            <div className="text-black/40 text-[9px]">
              6 GLOBAL RESEARCH ORGANIZATIONS
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labHighlights.map((lab) => {
              const model = lab.topModel;

              return (
                <div 
                  key={lab.id}
                  className="border border-black p-6 bg-white relative flex flex-col justify-between group hover:shadow-lg transition-all"
                >
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

                  <div>
                    {/* Lab Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-black/10">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 border flex items-center justify-center p-1 shrink-0"
                          style={{
                            borderColor: lab.brand.borderColor,
                            backgroundColor: lab.brand.bgTint,
                          }}
                        >
                          <CompanyLogo brandId={lab.brand.id} className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-black text-lg tracking-tight uppercase text-black leading-none">
                            {lab.name}
                          </h3>
                          <span className="font-mono text-[8px] uppercase tracking-wider text-black/50">
                            VERIFIED FRONTIER
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="font-mono text-[9px] uppercase text-black/60 my-3 leading-relaxed">
                      {lab.desc}
                    </p>

                    {/* Flagship Spec Box */}
                    {model && (
                      <div className="p-3 bg-[#faf9f6] border border-black/10 space-y-2 font-mono text-[9px] uppercase">
                        <div className="flex justify-between items-center text-black font-bold">
                          <span>FLAGSHIP:</span>
                          <span className="truncate max-w-[150px]">{model.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-black/70">
                          <span>INTELLIGENCE:</span>
                          <span className="font-bold text-black">{model.evaluations.intelligenceIndex} / 100</span>
                        </div>
                        <div className="flex justify-between items-center text-black/70">
                          <span>SPEED:</span>
                          <span className="font-bold text-black">{model.evaluations.speedTokensPerSecond} TOK/S</span>
                        </div>
                        <div className="flex justify-between items-center text-black/70">
                          <span>INFERENCE COST:</span>
                          <span className="font-bold text-black">${model.evaluations.blendedPricePer1M?.toFixed(2)} / 1M</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Link back to filter articles on homepage */}
                  <div className="pt-4 mt-4 border-t border-black/10 flex justify-between items-center font-mono text-[9px]">
                    <span className="text-black/40">STATUS: ACTIVE</span>
                    <Link
                      href={`/?lab=${encodeURIComponent(lab.labFilter)}`}
                      className="font-bold uppercase text-black hover:underline underline-offset-4 flex items-center gap-1"
                    >
                      <span>VIEW LAB DISPATCHES</span>
                      <span>→</span>
                    </Link>
                  </div>

                </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 4: COMPLETE VERIFIED TELEMETRY TABLE (Sortable & Filterable)
        ───────────────────────────────────────────────────────────── */}
        <ScrollReveal yOffset={45} className="mb-20">
          <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-black font-mono text-[10px] tracking-widest uppercase">
            <div className="flex items-center gap-3">
              <span className="font-bold text-black">04 // VERIFIED TELEMETRY MATRIX</span>
              <span className="text-black/40 hidden sm:inline">|</span>
              <span className="text-black/60 hidden sm:inline">ALL EVALUATED MODELS</span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
              {(['ALL', 'Frontier', 'Open Weights', 'Specialized'] as CategoryFilter[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-[9px] font-mono uppercase font-bold transition-all cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-black text-[#faf9f6] border border-black'
                      : 'bg-transparent text-black/60 border border-black/20 hover:border-black'
                  }`}
                >
                  [{cat === 'ALL' ? 'ALL CATEGORIES' : cat}]
                </button>
              ))}
            </div>
          </div>

          <div className="border border-black bg-white overflow-x-auto relative">
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

            <table className="w-full text-left font-mono text-[10px] uppercase">
              <thead>
                <tr className="border-b border-black bg-black/[0.03] text-black/60 select-none">
                  <th 
                    onClick={() => toggleSort('rank')}
                    className="p-3.5 pl-5 cursor-pointer hover:text-black font-bold"
                  >
                    <div className="flex items-center gap-1.5">
                      <span># RANK</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-black font-bold"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>MODEL IDENTITY</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th className="p-3.5 font-bold">ORGANIZATION</th>
                  <th className="p-3.5 font-bold">CATEGORY</th>
                  <th 
                    onClick={() => toggleSort('intelligence')}
                    className="p-3.5 cursor-pointer hover:text-black font-bold text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>INTELLIGENCE (0-100)</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('speed')}
                    className="p-3.5 cursor-pointer hover:text-black font-bold text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>OUTPUT SPEED</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('cost')}
                    className="p-3.5 pr-5 cursor-pointer hover:text-black font-bold text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>BLENDED COST / 1M</span>
                      <ArrowUpDown className="w-2.5 h-2.5" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {tableSortedModels.map((m) => {
                  const brand = getCompanyBrand(m.creator.lab || m.creator.name);

                  return (
                    <tr 
                      key={m.id}
                      className="hover:bg-black/[0.02] transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-bold text-black">
                        {(m.metrics.rank).toString().padStart(2, '0')}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-5 h-5 border flex items-center justify-center p-0.5 shrink-0 bg-white"
                            style={{ borderColor: brand.borderColor }}
                          >
                            <CompanyLogo brandId={brand.id} className="w-3 h-3" />
                          </div>
                          <span className="font-black text-black">{m.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-black/70">
                        {m.creator.name}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 border border-black/20 text-[8px] tracking-wider text-black/60 bg-black/[0.02]">
                          [{m.category}]
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-black">
                        {m.evaluations.intelligenceIndex} <span className="text-[8px] text-black/40 font-normal">/ 100</span>
                      </td>
                      <td className="p-3.5 text-right font-bold text-black">
                        {m.evaluations.speedTokensPerSecond} <span className="text-[8px] text-black/40 font-normal">TOK/S</span>
                      </td>
                      <td className="p-3.5 pr-5 text-right font-bold text-black">
                        ${m.evaluations.blendedPricePer1M?.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </ScrollReveal>

        {/* ─────────────────────────────────────────────────────────────
            SECTION 5: OFFICIAL ARTIFICIAL ANALYSIS ATTRIBUTION
        ───────────────────────────────────────────────────────────── */}
        <ScrollReveal yOffset={35} className="mb-16">
          <section className="border border-black p-6 sm:p-8 bg-[#faf9f6] relative">
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 font-mono text-[9px] uppercase tracking-wider text-black/60">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-black inline-block" />
                <span className="font-bold text-black">DATA ATTRIBUTION & METHODOLOGY</span>
              </div>
              <p className="leading-relaxed">
                Benchmark metrics and intelligence scores are provided through the independent analysis of AI models conducted by{' '}
                <strong className="text-black">Artificial Analysis</strong> (Free Data API & v5 Index). Evaluations encompass empirical multi-turn tests, automated coding benchmark evaluations, output token speed measurements, and blended token pricing.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
              <a
                href="https://artificialanalysis.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 border border-black bg-white text-black font-bold hover:bg-black hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>VISIT ARTIFICIALANALYSIS.AI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>
      </ScrollReveal>

      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
