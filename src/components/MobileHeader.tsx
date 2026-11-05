'use client';

import React from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { useSavedArticles } from '@/lib/saved-storage';

export type MobileSection = 'feed' | 'benchmarks' | 'codex' | 'saved';

interface MobileHeaderProps {
  active: MobileSection;
  /** Optional search toggle (only rendered on pages that support inline search). */
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
}

const TABS: { id: Exclude<MobileSection, 'saved'>; href: string; label: string }[] = [
  { id: 'feed', href: '/', label: 'DISPATCHES' },
  { id: 'benchmarks', href: '/benchmarks', label: 'BENCHMARKS' },
  { id: 'codex', href: '/codex', label: 'CODEX' },
];

/**
 * Single shared mobile header (< sm). Every page renders this exact component,
 * so brand, utility buttons and section tabs sit at identical positions on
 * every route — no per-page layout drift.
 */
export default function MobileHeader({ active, onToggleSearch, isSearchOpen }: MobileHeaderProps) {
  const { count: savedCount } = useSavedArticles();

  return (
    <div className="sm:hidden font-mono uppercase tracking-widest select-none">
      {/* Row 1: brand (left) + utilities anchored to the right edge */}
      <div className="flex items-center justify-between h-9 gap-2">
        <Link
          href="/"
          className="font-black text-sm tracking-tight text-black flex items-center gap-1.5 shrink-0"
        >
          LATENT SPACE
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff8000] shrink-0" aria-hidden />
        </Link>

        <div className="flex items-center gap-1.5 text-[10px] shrink-0">
          {onToggleSearch && (
            <button
              type="button"
              onClick={onToggleSearch}
              className="h-7 px-2 border border-black/35 text-black font-bold tracking-wider flex items-center justify-center cursor-pointer"
            >
              [{isSearchOpen ? 'CLOSE' : 'SEARCH'}]
            </button>
          )}
          <Link
            href="/saved"
            aria-current={active === 'saved' ? 'page' : undefined}
            className={`h-7 min-w-[52px] px-2 border font-bold tracking-wider flex items-center justify-center ${
              active === 'saved'
                ? 'border-black bg-black text-[#faf9f6]'
                : 'border-black/35 text-black'
            }`}
          >
            [<span className="text-[#ff8000]">★</span>&nbsp;{savedCount}]
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Row 2: equal-width section tabs — fixed grid so nothing ever shifts */}
      <nav aria-label="Sections" className="grid grid-cols-3 gap-1.5 mt-3">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={`h-8 flex items-center justify-center border text-[10px] font-bold tracking-wider transition-colors ${
                isActive
                  ? 'border-black bg-black text-[#faf9f6]'
                  : 'border-black/30 text-black/70 active:bg-black/5'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
