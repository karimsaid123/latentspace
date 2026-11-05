'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import LiveClock from './LiveClock';
import { useSavedArticles } from '@/lib/saved-storage';
import { LastSyncedIndicator } from './LastSyncedIndicator';

export type ActiveSection = 'feed' | 'markets' | 'benchmarks' | 'codex' | 'saved';

interface GlobalHeaderProps {
  active: ActiveSection;
  /** Optional search toggle (for feed / search-enabled views) */
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
  searchQuery?: string;
  onSearch?: (q: string) => void;
  isSyncing?: boolean;
  lastSyncedTime?: number;
  onSync?: () => void;
  children?: React.ReactNode;
}

export const PRIMARY_TABS: { id: ActiveSection; href: string; label: string; mobileLabel: string; title: string }[] = [
  { id: 'feed', href: '/', label: '[DISPATCHES]', mobileLabel: 'DISPATCH', title: 'Live Frontier AI Telemetry & Dispatches' },
  { id: 'markets', href: '/markets', label: '[MARKETS]', mobileLabel: 'MARKETS', title: 'Global Tech & Silicon Quant Markets' },
  { id: 'benchmarks', href: '/benchmarks', label: '[BENCHMARKS]', mobileLabel: 'BENCH', title: 'Independent Model Benchmarks & LMSYS Arena' },
  { id: 'codex', href: '/codex', label: '[CODEX]', mobileLabel: 'CODEX', title: 'Deterministic AI & Systems Architecture Codex' },
];

/**
 * Single unified header across all routes (feed, markets, benchmarks, codex, saved).
 * Guarantees zero layout shift when resizing windows or navigating between pages.
 * Primary buttons stay in identical positions regardless of route or viewport size.
 */
export default function GlobalHeader({
  active,
  onToggleSearch,
  isSearchOpen = false,
  searchQuery = '',
  onSearch,
  isSyncing = false,
  lastSyncedTime = 0,
  onSync,
  children,
}: GlobalHeaderProps) {
  const { count: savedCount } = useSavedArticles();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when toggled open
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Global keyboard shortcut '/' to focus search, ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        if (onToggleSearch && !isSearchOpen) {
          onToggleSearch();
        } else {
          const firstSearchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
          firstSearchInput?.focus();
        }
      } else if (e.key === 'Escape') {
        if (isSearchOpen && onToggleSearch) {
          onToggleSearch();
        } else if (isInputActive) {
          (activeElement as HTMLElement).blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, onToggleSearch]);

  return (
    <header className="relative w-full pt-5 sm:pt-6 pb-3 sm:pb-4 px-4 sm:px-8 lg:px-12 max-w-[1700px] mx-auto select-none font-mono tracking-widest uppercase border-b border-black/15">
      {/* Background sync scanline indicator */}
      {isSyncing && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/10 overflow-hidden">
          <div className="h-full bg-black w-1/3 animate-scanline" />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP / TABLET UNIFIED BAR (md and up: 768px+)
          Single rock-solid row. Buttons NEVER shift between pages.
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Brand & Section Navigation Tabs */}
        <div className="flex items-center gap-3 lg:gap-5 shrink-0">
          <Link
            href="/"
            className="font-black text-sm lg:text-base tracking-tight text-black flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
            title="LatentSpace Frontier AI Intelligence"
          >
            LATENT SPACE
            <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-[#ff8000] shrink-0" title="System Live" />
          </Link>

          <span className="text-black/20 hidden lg:inline">//</span>

          {/* Primary Navigation Tabs */}
          <nav aria-label="Primary Destinations" className="flex items-center gap-1.5 lg:gap-2">
            {PRIMARY_TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`h-7.5 lg:h-8 px-2.5 lg:px-3 text-[10px] lg:text-[11px] font-bold tracking-wider flex items-center justify-center transition-colors border whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-black bg-black text-[#faf9f6]'
                      : 'border-black/30 hover:border-black text-black/75 hover:text-black hover:bg-black/5'
                  }`}
                  title={tab.title}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Utilities (Right side) */}
        <div className="flex items-center gap-2 lg:gap-2.5 shrink-0 text-black/70 text-[10px] lg:text-[11px]">
          {onSync && (
            <div className="hidden xl:block shrink-0">
              <LastSyncedIndicator
                lastSyncedTime={lastSyncedTime}
                isSyncing={isSyncing}
                onSync={onSync}
              />
            </div>
          )}

          {onToggleSearch ? (
            <button
              type="button"
              onClick={onToggleSearch}
              className={`h-7.5 lg:h-8 px-2.5 lg:px-3 border font-bold tracking-wider hover:border-black hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap ${
                isSearchOpen ? 'border-black bg-black text-[#faf9f6]' : 'border-black/35 text-black'
              }`}
              title="Toggle search filter (Shortcut: '/')"
            >
              [{isSearchOpen ? 'CLOSE' : 'SEARCH'}]
            </button>
          ) : (
            <Link
              href="/?search=1"
              className="h-7.5 lg:h-8 px-2.5 lg:px-3 border border-black/35 hover:border-black text-black font-bold tracking-wider hover:bg-black/5 transition-colors flex items-center justify-center whitespace-nowrap"
              title="Search telemetry dispatches"
            >
              [SEARCH]
            </Link>
          )}

          <Link
            href="/saved"
            aria-current={active === 'saved' ? 'page' : undefined}
            className={`h-7.5 lg:h-8 px-2.5 lg:px-3 border font-bold tracking-wider flex items-center justify-center whitespace-nowrap transition-colors cursor-pointer ${
              active === 'saved'
                ? 'border-black bg-black text-[#faf9f6]'
                : 'border-black/35 hover:border-black text-black hover:bg-black/5'
            }`}
            title="Open saved intelligence dossier"
          >
            <span>[<span className="text-[#ff8000]">★</span> SAVED ({savedCount})]</span>
          </Link>

          <ThemeToggle />

          {/* Real-time Clock - gracefully hidden on compact tablet viewports to guarantee zero wrapping */}
          <div className="text-right hidden xl:block font-bold text-[#ff8000] font-mono text-xs lg:text-[13px] tracking-wider pl-3 border-l border-black/20 shrink-0">
            <LiveClock />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE UNIFIED BAR (< md: under 768px)
          Row 1: Brand & Utilities
          Row 2: 4-Column Equal-Width Grid (Zero layout shift between pages)
      ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Row 1: Brand & Top Utilities */}
        <div className="flex items-center justify-between h-9 gap-2">
          <Link
            href="/"
            className="font-black text-sm tracking-tight text-black flex items-center gap-1.5 shrink-0"
            title="LatentSpace"
          >
            LATENT SPACE
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff8000] shrink-0" aria-hidden />
          </Link>

          <div className="flex items-center gap-1.5 text-[10px] shrink-0">
            {onToggleSearch ? (
              <button
                type="button"
                onClick={onToggleSearch}
                className={`h-7 px-2 border font-bold tracking-wider flex items-center justify-center cursor-pointer ${
                  isSearchOpen ? 'border-black bg-black text-[#faf9f6]' : 'border-black/35 text-black'
                }`}
                title="Search"
              >
                [{isSearchOpen ? '✕' : 'SEARCH'}]
              </button>
            ) : (
              <Link
                href="/?search=1"
                className="h-7 px-2 border border-black/35 text-black font-bold tracking-wider flex items-center justify-center"
                title="Search"
              >
                [SEARCH]
              </Link>
            )}

            <Link
              href="/saved"
              aria-current={active === 'saved' ? 'page' : undefined}
              className={`h-7 min-w-[52px] px-2 border font-bold tracking-wider flex items-center justify-center cursor-pointer ${
                active === 'saved'
                  ? 'border-black bg-black text-[#faf9f6]'
                  : 'border-black/35 text-black'
              }`}
              title="Saved dossier"
            >
              [<span className="text-[#ff8000]">★</span>&nbsp;{savedCount}]
            </Link>

            <ThemeToggle />
          </div>
        </div>

        {/* Row 2: Fixed 4-Column Tab Grid */}
        <nav aria-label="Mobile Navigation" className="grid grid-cols-4 gap-1.5 mt-2.5">
          {PRIMARY_TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={`h-8 flex items-center justify-center border text-[10px] font-bold tracking-wider transition-colors cursor-pointer ${
                  isActive
                    ? 'border-black bg-black text-[#faf9f6]'
                    : 'border-black/30 text-black/75 active:bg-black/10'
                }`}
                title={tab.title}
              >
                {tab.mobileLabel}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. OPTIONAL INLINE SEARCH BAR (Toggled)
      ───────────────────────────────────────────────────────────── */}
      {isSearchOpen && onSearch && (
        <div className="pt-3.5 pb-2 border-b border-black animate-fade-in flex items-center justify-between gap-4 mt-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="TYPE TO FILTER TELEMETRY (PRESS ESC TO EXIT)..."
            className="w-full bg-transparent font-mono text-xs sm:text-sm uppercase tracking-wider text-black placeholder-black/35 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="font-mono text-[10px] text-black/50 hover:text-black cursor-pointer font-bold shrink-0"
              title="Clear search"
            >
              [CLEAR]
            </button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SUB-NAVIGATION CHILDREN (e.g. Homepage Filters)
      ───────────────────────────────────────────────────────────── */}
      {children}
    </header>
  );
}

