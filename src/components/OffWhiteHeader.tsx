'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Bookmark, Settings2, Sliders } from 'lucide-react';

interface OffWhiteHeaderProps {
  activeView: 'spread' | 'exhibition' | 'archive';
  onChangeView: (view: 'spread' | 'exhibition' | 'archive') => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSync: () => void;
  isSyncing: boolean;
  onOpenSettings: () => void;
  onToggleBookmarks: () => void;
  showBookmarksOnly: boolean;
  bookmarkCount: number;
}

export default function OffWhiteHeader({
  activeView,
  onChangeView,
  searchQuery,
  onSearch,
  onSync,
  isSyncing,
  onOpenSettings,
  onToggleBookmarks,
  showBookmarksOnly,
  bookmarkCount,
}: OffWhiteHeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    // Default to Off-White bone paper
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }

    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/15 dark:border-white/15 bg-[#f4f3ef]/90 dark:bg-[#0d0d0d]/90 backdrop-blur-md transition-colors">
      
      {/* Top Industrial Telemetry Bar */}
      <div className="w-full border-b border-black/10 dark:border-white/10 px-4 sm:px-8 py-1.5 flex items-center justify-between text-[10px] font-mono tracking-widest text-black/60 dark:text-white/60 uppercase">
        <div className="flex items-center gap-4">
          <span className="font-bold text-black dark:text-white">
            "AI NEWS"
          </span>
          <span className="hidden sm:inline">AUTONOMOUS RESEARCH RADAR</span>
          <span className="text-[#ff3b00] dark:text-[#ff4d1a] font-bold flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff3b00] animate-ping" />
            LIVE SPECIMEN FEED
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline">SF 07:26 // PAR 16:26 // TYO 23:26</span>
          <span className="font-bold">{time || '16:26:00'} UTC</span>
          <button
            onClick={toggleTheme}
            className="hover:text-black dark:hover:text-white transition-colors cursor-pointer font-bold"
          >
            [{isDark ? 'MODE: OBSIDIAN' : 'MODE: OFF-WHITE'}]
          </button>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand & Off-White Identity */}
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.05em] uppercase text-black dark:text-white leading-none">
            NEURAL"PULSE"
          </h1>
          <span className="font-mono text-[9px] tracking-widest uppercase text-black/50 dark:text-white/50 border border-black/20 dark:border-white/20 px-1.5 py-0.5">
            EDITION: 2026 // ART.DIR
          </span>
        </div>

        {/* View Switcher: SPREAD / EXHIBITION / ARCHIVE */}
        <div className="flex items-center gap-1 font-mono text-[11px] tracking-wider uppercase border border-black/20 dark:border-white/20 p-1 bg-black/5 dark:bg-white/5 self-start md:self-auto">
          <button
            onClick={() => onChangeView('spread')}
            className={`px-3 py-1 transition-all cursor-pointer font-bold ${
              activeView === 'spread'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            01 "SPREAD"
          </button>
          <button
            onClick={() => onChangeView('exhibition')}
            className={`px-3 py-1 transition-all cursor-pointer font-bold ${
              activeView === 'exhibition'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            02 "GALLERY"
          </button>
          <button
            onClick={() => onChangeView('archive')}
            className={`px-3 py-1 transition-all cursor-pointer font-bold ${
              activeView === 'archive'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
            }`}
          >
            03 "LEDGER"
          </button>
        </div>

        {/* Search, Sync & Actions */}
        <div className="flex items-center gap-3">
          {/* Minimalist Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="SEARCH SPECIMEN..."
              className="w-40 sm:w-56 font-mono text-xs tracking-wider uppercase bg-transparent border-b border-black/30 dark:border-white/30 pb-1 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearch('')}
                className="absolute right-0 top-0 font-mono text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sync Button styled as Industrial Off-White Tag */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs tracking-widest uppercase bg-black text-white dark:bg-white dark:text-black hover:bg-[#ff3b00] dark:hover:bg-[#ff3b00] dark:hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? '"SYNCING"' : '"SYNC"'}</span>
          </button>

          {/* Bookmarks */}
          <button
            onClick={onToggleBookmarks}
            title="Saved specimens"
            className={`p-2 border transition-all cursor-pointer ${
              showBookmarksOnly
                ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:border-black dark:hover:border-white'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${showBookmarksOnly ? 'fill-current' : ''}`} />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Configure Feeds & AI"
            className="p-2 border border-black/20 dark:border-white/20 text-black/70 dark:text-white/70 hover:border-black dark:hover:border-white transition-all cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
