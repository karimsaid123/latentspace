'use client';

import React, { useRef, useState, useEffect, memo } from 'react';
import GlobalHeader from './GlobalHeader';
import VectorPulse from './VectorPulse';
import type { VectorPulseSnapshot } from '@/types';

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
  vectorPulse?: VectorPulseSnapshot;
  selectedVectorId?: string | null;
  onSelectVector?: (vectorId: string | null) => void;
}

export const LAB_FILTERS = [
  { id: 'All', label: 'ALL LABS' },
  { id: 'OpenAI', label: 'OPENAI' },
  { id: 'Google DeepMind', label: 'DEEPMIND' },
  { id: 'Anthropic', label: 'ANTHROPIC' },
  { id: 'SpaceX & xAI', label: 'SPACEX & xAI' },
  { id: 'DeepSeek', label: 'DEEPSEEK' },
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
  isSearchOpen,
  setIsSearchOpen,
  vectorPulse,
  selectedVectorId = null,
  onSelectVector,
}: MinimalNavProps) {
  const pulsePopoverRef = useRef<HTMLDivElement>(null);
  const pulseTriggerRef = useRef<HTMLButtonElement>(null);
  const [isPulseOpen, setIsPulseOpen] = useState(false);

  useEffect(() => {
    if (!isPulseOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (pulsePopoverRef.current?.contains(target)) return;
      if (pulseTriggerRef.current?.contains(target)) return;
      setIsPulseOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPulseOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPulseOpen]);

  const activeVector =
    selectedVectorId && vectorPulse
      ? vectorPulse.vectors.find((v) => v.id === selectedVectorId)
      : undefined;

  return (
    <GlobalHeader
      active="feed"
      onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
      isSearchOpen={isSearchOpen}
      searchQuery={searchQuery}
      onSearch={onSearch}
      isSyncing={isSyncing}
      lastSyncedTime={lastSyncedTime}
      onSync={onSync}
    >
      {/* Frontier Labs & Publications Filter Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3.5 mt-3 sm:mt-3.5 pt-3 pb-0.5 text-[10px] sm:text-[11px] md:text-xs text-black/60 border-t border-black/10">
        
        {/* Lab Sectors */}
        <div 
          className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
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

        {/* Publication Format Selector & Vector Pulse Dropdown Trigger */}
        <div 
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-black/10 font-mono tracking-wider overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
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

          {vectorPulse && onSelectVector && (
            <button
              ref={pulseTriggerRef}
              type="button"
              aria-expanded={isPulseOpen}
              onClick={() => setIsPulseOpen((prev) => !prev)}
              className={`hover:text-black transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                activeVector || isPulseOpen
                  ? 'text-black font-black underline underline-offset-4 decoration-2'
                  : 'text-black/60 hover:text-black'
              }`}
              title="Research Vector Pulse"
            >
              [PULSE]
            </button>
          )}
        </div>

      </div>

      {/* Floating Research Vector Pulse Dropdown */}
      {isPulseOpen && vectorPulse && onSelectVector && (
        <div
          ref={pulsePopoverRef}
          className="absolute right-4 sm:right-8 lg:right-12 left-4 sm:left-auto sm:w-[520px] lg:w-[560px] top-full mt-1 z-40"
        >
          <VectorPulse
            snapshot={vectorPulse}
            selectedVectorId={selectedVectorId}
            onSelectVector={onSelectVector}
            onClose={() => setIsPulseOpen(false)}
            lastSyncedTime={lastSyncedTime}
          />
        </div>
      )}
    </GlobalHeader>
  );
});

export default MinimalNav;
