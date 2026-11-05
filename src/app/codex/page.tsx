'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  Cpu, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  X,
  Compass,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { CodexCategory, CodexLevel } from '@/types/codex';
import { searchCodex, getCodexEntryById, EnrichedCodexEntry } from '@/lib/codex-engine';
import articlesData from '../../../data/articles.json';
import CodexDetailModal from '@/components/CodexDetailModal';
import Footer from '@/components/Footer';
import LiveClock from '@/components/LiveClock';
import MobileHeader from '@/components/MobileHeader';
import ThemeToggle from '@/components/ThemeToggle';
import ScrollReveal from '@/components/ScrollReveal';

const CATEGORIES: { id: CodexCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'ALL CONCEPTS' },
  { id: 'FOUNDATIONS', label: 'FOUNDATIONS' },
  { id: 'ARCHITECTURES', label: 'ARCHITECTURES' },
  { id: 'TRAINING_ALIGNMENT', label: 'TRAINING & ALIGNMENT' },
  { id: 'INFERENCE_SYSTEMS', label: 'INFERENCE & SYSTEMS' },
  { id: 'FRONTIER_REASONING', label: 'FRONTIER REASONING' }
];

const LEVELS: { id: CodexLevel | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'ALL LEVELS' },
  { id: 'BEGINNER', label: 'BEGINNER' },
  { id: 'INTERMEDIATE', label: 'INTERMEDIATE' },
  { id: 'FRONTIER', label: 'FRONTIER' }
];

function CodexContent() {
  const searchParams = useSearchParams();
  const initialConcept = searchParams.get('concept') || searchParams.get('term') || null;

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CodexCategory | 'ALL'>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<CodexLevel | 'ALL'>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<EnrichedCodexEntry | null>(null);

  // Initialize selected entry from URL parameter if present
  useEffect(() => {
    if (initialConcept) {
      const found = getCodexEntryById(initialConcept, articlesData);
      if (found) {
        setSelectedEntry(found);
      }
    }
  }, [initialConcept]);

  const results = useMemo(() => {
    return searchCodex(
      {
        query,
        category: selectedCategory,
        level: selectedLevel
      },
      articlesData
    );
  }, [query, selectedCategory, selectedLevel]);

  const handleSelectRelated = (id: string) => {
    const target = getCodexEntryById(id, articlesData);
    if (target) {
      setSelectedEntry(target);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-black font-mono selection:bg-black selection:text-white flex flex-col">
      {/* Top Header */}
      <header className="w-full pt-6 pb-4 px-6 sm:px-12 max-w-[1700px] mx-auto uppercase tracking-widest text-xs border-b border-black/15">
        {/* Desktop Header Line (sm and up) */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="font-bold text-black/60 hover:text-black transition-colors flex items-center gap-1.5"
            >
              <span>[← LIVE DISPATCHES]</span>
            </Link>
            <span className="text-black/30">/</span>
            <span className="font-black text-black">CODEX</span>
          </div>

          <div className="flex items-center gap-3 text-black/70 text-[10px] sm:text-xs">
            <Link
              href="/benchmarks"
              className="border border-black/30 hover:border-black px-2.5 py-1 text-black font-bold hover:bg-black/5 transition-colors"
            >
              [BENCHMARKS]
            </Link>
            <ThemeToggle />
            <div className="pl-3 border-l border-black/20 text-[#ff8000] font-bold">
              <LiveClock />
            </div>
          </div>
        </div>

        <MobileHeader active="codex" />
      </header>

      {/* Main Terminal Header */}
      <main className="flex-1 max-w-[1700px] mx-auto w-full px-6 sm:px-12 py-8">
        <ScrollReveal yOffset={20}>
          <div className="pb-8 border-b-2 border-black">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
              LatentSpace Codex
            </h1>
            <p className="mt-3 text-xs sm:text-sm font-sans font-medium text-black/70 max-w-3xl leading-relaxed">
              Curated, peer-verified technical specifications covering foundational mathematics, deep neural architectures, alignment protocols, and inference systems. Linked directly to landmark arXiv papers.
            </p>

            {/* Instant Search Engine Bar */}
            <div className="mt-6 relative">
              <div className="relative flex items-center border-2 border-black bg-white shadow-xs">
                <div className="pl-4 pr-2 text-black/40">
                  <Search className="w-5 h-5 text-black" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="SEARCH SPECIFICATIONS (E.G. 'ATTENTION', 'MOE', 'DPO', 'KV CACHE', 'FLASHATTENTION')..."
                  className="w-full py-3.5 pr-10 bg-transparent font-mono text-xs sm:text-sm uppercase tracking-wider text-black placeholder-black/35 focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="pr-4 text-xs font-bold text-black/40 hover:text-black cursor-pointer"
                  >
                    [CLEAR]
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <span className="text-[10px] text-black font-bold shrink-0 mr-1 tracking-wider">
                CATEGORY:
              </span>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 border text-[10px] sm:text-[11px] font-mono tracking-wider shrink-0 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-black/25 bg-white text-black/70 hover:border-black hover:text-black'
                    }`}
                  >
                    [{cat.label}]
                  </button>
                );
              })}
            </div>

            {/* Level Filter Pills */}
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <span className="text-[10px] text-black font-bold shrink-0 mr-1 tracking-wider">
                COMPLEXITY:
              </span>
              {LEVELS.map((lvl) => {
                const isSelected = selectedLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setSelectedLevel(lvl.id)}
                    className={`px-2 py-0.5 border text-[9px] sm:text-[10px] font-mono tracking-wider shrink-0 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-black/20 bg-white text-black/60 hover:border-black hover:text-black'
                    }`}
                  >
                    [{lvl.label}]
                  </button>
                );
              })}

              <div className="ml-auto text-[10px] text-black/50 shrink-0 font-bold hidden md:block">
                SHOWING {results.length} SPECIFICATIONS
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Results Grid */}
        <div className="py-8">
          {results.length === 0 ? (
            <div className="p-16 border-2 border-dashed border-black/20 text-center">
              <span className="font-bold text-sm text-black/40 uppercase block">
                NO SPECIFICATIONS FOUND MATCHING &ldquo;{query}&rdquo;
              </span>
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('ALL');
                  setSelectedLevel('ALL');
                }}
                className="mt-3 px-4 py-2 border border-black bg-white hover:bg-black hover:text-white transition-all text-xs font-bold"
              >
                [RESET ALL FILTERS]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((entry) => {
                const levelColor = {
                  BEGINNER: 'text-emerald-700 border-emerald-500/40 bg-emerald-500/5',
                  INTERMEDIATE: 'text-blue-700 border-blue-500/40 bg-blue-500/5',
                  FRONTIER: 'text-[#ff8000] border-[#ff8000]/40 bg-[#ff8000]/5'
                }[entry.level];

                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="border border-black bg-white p-5 hover:border-2 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs relative"
                  >
                    {/* Top Row */}
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-black/10">
                        <span className="text-[9px] font-bold tracking-widest text-black/50 uppercase">
                          {entry.category.replace('_', ' ')}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 border uppercase ${levelColor}`}>
                          {entry.level}
                        </span>
                      </div>

                      {/* Header */}
                      <div className="pt-3 pb-2">
                        <div className="flex items-baseline gap-2">
                          <h3 className="text-lg font-black uppercase text-black tracking-tight group-hover:underline">
                            {entry.title}
                          </h3>
                        </div>
                        {entry.acronym && (
                          <span className="text-[10px] text-black/50 font-bold block mt-0.5">
                            // {entry.acronym}
                          </span>
                        )}
                        <p className="mt-2 text-xs font-sans text-black/75 leading-relaxed line-clamp-3">
                          {entry.summary}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="pt-4 border-t border-black/10 mt-4 flex items-center justify-between text-[10px] text-black/60">
                      <div className="flex items-center gap-2">
                        {entry.canonicalPaper && (
                          <span className="text-[9px] font-mono border border-black/20 px-1 bg-[#faf9f6]" title={entry.canonicalPaper.title}>
                            arXiv:{entry.canonicalPaper.arxivId || 'Paper'}
                          </span>
                        )}
                        {entry.mentionsCount > 0 && (
                          <span className="text-[9px] text-[#ff8000] font-bold">
                            {entry.mentionsCount} dispatches
                          </span>
                        )}
                      </div>

                      <span className="font-bold text-black flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>VIEW SPEC</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedEntry && (
        <CodexDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSelectRelated={handleSelectRelated}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function CodexPage() {
  return (
    <Suspense fallback={<div className="p-12 font-mono text-xs text-black/40">LOADING CODEX...</div>}>
      <CodexContent />
    </Suspense>
  );
}

