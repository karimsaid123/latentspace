'use client';

import React, { useRef, useEffect } from 'react';

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
  lastSyncedText?: string;
  savedCount?: number;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
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

export default function MinimalNav({
  selectedLab,
  onSelectLab,
  selectedType,
  onSelectType,
  searchQuery,
  onSearch,
  onSync,
  isSyncing,
  totalArticles,
  lastSyncedText = 'LIVE',
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
    <header className="w-full pt-8 pb-4 px-6 sm:px-12 max-w-[1700px] mx-auto select-none font-mono text-[10px] tracking-widest uppercase">
      
      {/* Top minimal line */}
      <div className="relative flex items-baseline justify-between border-b border-black/10 pb-4 overflow-hidden">
        {isSyncing && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/10 overflow-hidden">
            <div className="h-full bg-black w-1/3 animate-scanline" />
          </div>
        )}

        {/* Brand / Index Number */}
        <div className="flex items-baseline gap-4">
          <span className="font-black text-sm tracking-tighter text-black flex items-center gap-2">
            LATENT SPACE
            <span className="relative flex h-1.5 w-1.5" title="Autonomous Background Harvester Active">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-70"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-black"></span>
            </span>
          </span>
          <span className="text-black/40 text-[9px]">
            N° 001 // ENTRIES: {totalArticles}
          </span>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-6 text-black/60">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="hover:text-black cursor-pointer transition-colors"
            title="Press '/' to search anywhere"
          >
            [{isSearchOpen ? 'CLOSE SEARCH' : 'SEARCH'}]
          </button>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="hover:text-black cursor-pointer transition-colors disabled:opacity-40 flex items-center gap-1.5"
            title="Force immediate telemetry ingestion"
          >
            {isSyncing && <span className="inline-block w-1.5 h-1.5 bg-black animate-spin" />}
            [{isSyncing ? 'SYNCING...' : 'SYNC'}]
          </button>

          <div className="text-right hidden sm:block font-bold text-black/80">
            AUTONOMOUS RADAR<br />
            <span className="text-[9px] font-normal text-black/40 tracking-wider">
              AUTO-SYNC // {lastSyncedText}
            </span>
          </div>
        </div>

      </div>

      {/* Inline Search Bar if toggled */}
      {isSearchOpen && (
        <div className="pt-4 pb-2 border-b border-black animate-fade-in flex items-center justify-between gap-4">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="TYPE TO FILTER TELEMETRY (PRESS ESC TO EXIT)..."
            className="w-full bg-transparent font-mono text-xs uppercase tracking-wider text-black placeholder-black/30 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="font-mono text-[9px] text-black/50 hover:text-black cursor-pointer"
            >
              [CLEAR]
            </button>
          )}
        </div>
      )}

      {/* Frontier Labs & Publications Filter Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 text-[9px] text-black/40">
        
        {/* Lab Sectors */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <span className="text-black/60 font-bold shrink-0">LAB SECTOR:</span>
          {LAB_FILTERS.map((lab) => {
            const isSelected = selectedLab === lab.id;
            return (
              <button
                key={lab.id}
                onClick={() => onSelectLab(lab.id)}
                className={`hover:text-black transition-colors shrink-0 cursor-pointer ${
                  isSelected ? 'text-black font-black underline underline-offset-4' : 'text-black/60'
                }`}
              >
                [{lab.label}]
              </button>
            );
          })}

          {/* Saved / Bookmarks Tab */}
          <button
            onClick={() => onSelectLab('SAVED')}
            className={`hover:text-black transition-colors shrink-0 cursor-pointer ml-auto sm:ml-0 ${
              selectedLab === 'SAVED'
                ? 'text-black font-black underline underline-offset-4'
                : 'text-black/50'
            }`}
          >
            [★ SAVED ({savedCount})]
          </button>
        </div>

        {/* Publication Format Selector */}
        <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-black/10">
          <span className="text-black/60 font-bold shrink-0">TYPE:</span>
          <button
            onClick={() => onSelectType('ALL')}
            className={`hover:text-black transition-colors cursor-pointer ${
              selectedType === 'ALL' ? 'text-black font-black underline underline-offset-4' : 'text-black/60'
            }`}
          >
            [ALL ENTRIES]
          </button>
          <button
            onClick={() => onSelectType('DISPATCH')}
            className={`hover:text-black transition-colors cursor-pointer ${
              selectedType === 'DISPATCH' ? 'text-black font-black underline underline-offset-4' : 'text-black/60'
            }`}
          >
            [NEWS]
          </button>
          <button
            onClick={() => onSelectType('RESEARCH_PAPER')}
            className={`hover:text-black transition-colors cursor-pointer flex items-center gap-1 ${
              selectedType === 'RESEARCH_PAPER' ? 'text-black font-black underline underline-offset-4' : 'text-black/60'
            }`}
          >
            <span>[RESEARCH]</span>
          </button>
        </div>

      </div>

    </header>
  );
}
