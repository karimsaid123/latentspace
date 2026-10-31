'use client';

import React, { useRef, useEffect, memo } from 'react';
import Link from 'next/link';
import LiveClock from './LiveClock';
import { LastSyncedIndicator } from './LastSyncedIndicator';

interface MinimalNavProps {
  selectedLab: string;
  onSelectLab: (lab: string) => void;
  selectedType: 'ALL' | 'DISPATCH' | 'RESEARCH_PAPER';
  onSelectType: (type: 'ALL' | 'DISPATCH' | 'RESEARCH_PAPER') => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  totalArticles: number;
  lastSyncedTime?: number;
  lastSyncedText?: string;
  savedCount?: number;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  onOpenBenchmarks?: () => void;
}

export const LAB_FILTERS = [
  { id: 'All', label: 'ALL LABS' },
  { id: 'OpenAI', label: 'OPENAI' },
  { id: 'Google DeepMind', label: 'DEEPMIND' },
  { id: 'Anthropic', label: 'ANTHROPIC' },
  { id: 'SpaceX & xAI', label: 'SPACEX & xAI' },
  { id: 'Mistral AI', label: 'MISTRAL' },
  { id: 'Moonshot AI', label: 'KIMI / MOONSHOT' },
  { id: 'Meta AI', label: 'META AI' },
  { id: 'NVIDIA', label: 'NVIDIA' },
];

const MinimalNav = memo(function MinimalNav({
  selectedLab,
  onSelectLab,
  selectedType,
  onSelectType,
  searchQuery,
  onSearch,
  onSync,
  isSyncing,
  lastSyncedTime = 0,
  savedCount = 0,
  isSearchOpen,
  setIsSearchOpen,
}: MinimalNavProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  return (
    <header className="w-full pt-6 pb-4 px-6 sm:px-12 max-w-[1700px] mx-auto select-none font-mono tracking-widest uppercase">
      
      {/* Top minimal line */}
      <div className="relative flex items-center justify-between border-b border-black/15 pb-3 overflow-hidden gap-2 sm:gap-4">
        {isSyncing && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/10 overflow-hidden">
            <div className="h-full bg-black w-1/3 animate-scanline" />
          </div>
        )}

        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="font-black text-sm sm:text-base md:text-lg tracking-tight text-black flex items-center gap-1.5 sm:gap-2">
            LATENT SPACE
            <span className="relative flex h-1.5 w-1.5" title="Live System">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff8000] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ff8000]"></span>
            </span>
          </span>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-black/70 text-[10px] sm:text-[11px] md:text-xs shrink-0">
          <Link
            href="/saved"
            className="border border-black/35 hover:border-black px-2 py-0.5 sm:px-2.5 sm:py-1 text-black font-mono font-bold tracking-wider hover:bg-black/[0.04] transition-colors whitespace-nowrap"
            title="Open your saved articles dossier"
          >
            <span className="sm:hidden">[<span className="text-[#ff8000]">★</span> {savedCount}]</span>
            <span className="hidden sm:inline">[<span className="text-[#ff8000]">★</span> SAVED ({savedCount})]</span>
          </Link>

          <Link
            href="/benchmarks"
            scroll={true}
            className="border border-black/35 hover:border-black px-2 py-0.5 sm:px-2.5 sm:py-1 text-black font-mono font-bold tracking-wider hover:bg-black/[0.04] transition-colors whitespace-nowrap"
            title="Independent Artificial Analysis Benchmarks & Stats"
          >
            <span className="sm:hidden">[STATS]</span>
            <span className="hidden sm:inline">[BENCHMARKS & STATS]</span>
          </Link>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="hover:text-black cursor-pointer transition-colors font-medium whitespace-nowrap"
            title="Press '/' to search anywhere"
          >
            [{isSearchOpen ? 'CLOSE' : 'SEARCH'}]
          </button>

          <div className="hidden md:block shrink-0">
            <LastSyncedIndicator
              lastSyncedTime={lastSyncedTime}
              isSyncing={isSyncing}
              onSync={onSync}
            />
          </div>

          {/* Isolated 1Hz Clock completely on the right */}
          <div className="text-right hidden sm:block font-bold text-[#ff8000] font-mono text-xs sm:text-[13px] tracking-wider pl-3 border-l border-black/20">
            <LiveClock />
          </div>
        </div>

      </div>

      {/* Inline Search Bar if toggled */}
      {isSearchOpen && (
        <div className="pt-3.5 pb-2.5 border-b border-black animate-fade-in flex items-center justify-between gap-4">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="TYPE TO FILTER TELEMETRY (PRESS ESC TO EXIT)..."
            className="w-full bg-transparent font-mono text-xs sm:text-sm uppercase tracking-wider text-black placeholder-black/30 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="font-mono text-[10px] text-black/50 hover:text-black cursor-pointer font-bold shrink-0"
            >
              [CLEAR]
            </button>
          )}
        </div>
      )}

      {/* Frontier Labs & Publications Filter Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3.5 pt-3 pb-0.5 text-[10px] sm:text-[11px] md:text-xs text-black/60">
        
        {/* Lab Sectors */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain pb-1 -mx-6 px-6 sm:mx-0 sm:px-0">
          <span className="text-black font-bold shrink-0 tracking-wider">LAB SECTOR:</span>
          {LAB_FILTERS.map((lab) => {
            const isSelected = selectedLab === lab.id;
            return (
              <button
                key={lab.id}
                onClick={() => onSelectLab(lab.id)}
                className={`hover:text-black transition-colors shrink-0 cursor-pointer font-mono tracking-wider whitespace-nowrap ${
                  isSelected ? 'text-black font-black underline underline-offset-4 decoration-2' : 'text-black/60 hover:text-black'
                }`}
              >
                [{lab.label}]
              </button>
            );
          })}
        </div>

        {/* Publication Format Selector */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-black/10 font-mono tracking-wider overflow-x-auto no-scrollbar pb-1">
          <span className="text-black font-bold shrink-0">TYPE:</span>
          <button
            onClick={() => onSelectType('ALL')}
            className={`hover:text-black transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              selectedType === 'ALL' ? 'text-black font-black underline underline-offset-4 decoration-2' : 'text-black/60 hover:text-black'
            }`}
          >
            [ALL ENTRIES]
          </button>
          <button
            onClick={() => onSelectType('DISPATCH')}
            className={`hover:text-black transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              selectedType === 'DISPATCH' ? 'text-black font-black underline underline-offset-4 decoration-2' : 'text-black/60 hover:text-black'
            }`}
          >
            [NEWS]
          </button>
          <button
            onClick={() => onSelectType('RESEARCH_PAPER')}
            className={`hover:text-black transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
              selectedType === 'RESEARCH_PAPER' ? 'text-black font-black underline underline-offset-4 decoration-2' : 'text-black/60 hover:text-black'
            }`}
          >
            <span>[RESEARCH]</span>
          </button>
        </div>

      </div>

    </header>
  );
});

export default MinimalNav;
