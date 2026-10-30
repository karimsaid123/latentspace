'use client';

import React, { useState } from 'react';

interface MinimalNavProps {
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  totalArticles: number;
}

const CATEGORIES = [
  { id: 'All', label: 'ALL' },
  { id: 'LLMs & GenAI', label: 'LLMs' },
  { id: 'Robotics & Hardware', label: 'ROBOTICS' },
  { id: 'Open Source & Research', label: 'RESEARCH' },
  { id: 'Business & Big Tech', label: 'BUSINESS' },
  { id: 'Ethics & Policy', label: 'POLICY' },
];

export default function MinimalNav({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearch,
  onSync,
  isSyncing,
  totalArticles,
}: MinimalNavProps) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="w-full pt-8 pb-4 px-6 sm:px-12 max-w-[1700px] mx-auto select-none font-mono text-[10px] tracking-widest uppercase">
      
      {/* Top minimal line */}
      <div className="flex items-baseline justify-between border-b border-black/10 pb-4">
        
        {/* Brand / Index Number */}
        <div className="flex items-baseline gap-4">
          <span className="font-black text-sm tracking-tighter text-black">
            EPOCH
          </span>
          <span className="text-black/40 text-[9px]">
            N° 001 // ENTRIES: {totalArticles}
          </span>
        </div>

        {/* Minimal Controls */}
        <div className="flex items-center gap-6 text-black/60">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="hover:text-black cursor-pointer transition-colors"
          >
            [{showSearch ? 'CLOSE SEARCH' : 'SEARCH'}]
          </button>

          <button
            onClick={onSync}
            disabled={isSyncing}
            className="hover:text-black cursor-pointer transition-colors disabled:opacity-40"
          >
            [{isSyncing ? 'SYNCING...' : 'SYNC'}]
          </button>

          <div className="text-right hidden sm:block font-bold text-black/80">
            AUTONOMOUS<br />AI RADAR
          </div>
        </div>

      </div>

      {/* Inline Search Bar if toggled */}
      {showSearch && (
        <div className="pt-4 pb-2 border-b border-black">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="SEARCH ARTICLES (PRESS ESC TO CLOSE)..."
            autoFocus
            className="w-full bg-transparent font-mono text-xs uppercase tracking-wider text-black placeholder-black/30 focus:outline-none"
          />
        </div>
      )}

      {/* Minimal Category Filter Line */}
      <div className="flex items-center gap-4 pt-3 overflow-x-auto no-scrollbar text-[9px] text-black/40">
        <span className="text-black/60 font-bold shrink-0">FILTER:</span>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`hover:text-black transition-colors shrink-0 cursor-pointer ${
                isSelected ? 'text-black font-black underline underline-offset-4' : ''
              }`}
            >
              [{cat.label}]
            </button>
          );
        })}
      </div>

    </header>
  );
}
