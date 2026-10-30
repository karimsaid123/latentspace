'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  Search, 
  Settings2, 
  Bookmark, 
  Sun, 
  Moon, 
  SlidersHorizontal,
  Zap
} from 'lucide-react';

interface HeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onSync: () => void;
  isSyncing: boolean;
  onOpenSettings: () => void;
  onToggleBookmarks: () => void;
  showBookmarksOnly: boolean;
  bookmarkCount: number;
  aiMode: 'gemini' | 'heuristic';
}

export default function Header({
  onSearch,
  searchQuery,
  onSync,
  isSyncing,
  onOpenSettings,
  onToggleBookmarks,
  showBookmarksOnly,
  bookmarkCount,
  aiMode,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Default to dark mode for sleek cyberpunk AI aesthetic
    const stored = localStorage.getItem('theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-[#090d16]/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 shadow-md shadow-violet-500/20 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-[#090d16]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 dark:from-violet-400 dark:via-cyan-300 dark:to-emerald-400 bg-clip-text text-transparent">
                  NeuralPulse
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  AI INTEL
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium hidden md:block">
                Real-time AI news summarized & classified
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-2 sm:mx-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Zoek artikelen, modellen, papers..."
                className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync Feeds button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="Vernieuw en haal nieuwste AI feeds op"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm shadow-violet-600/30 disabled:opacity-60 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isSyncing ? 'Synchroniseren...' : 'Live Sync'}
              </span>
            </button>

            {/* Bookmarks toggle */}
            <button
              onClick={onToggleBookmarks}
              title="Bekijk opgeslagen artikelen"
              className={`relative p-2 rounded-lg border transition-all cursor-pointer ${
                showBookmarksOnly
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-500 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${showBookmarksOnly ? 'fill-current' : ''}`} />
              {bookmarkCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-500 text-slate-950">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {/* Manage Feeds & Settings */}
            <button
              onClick={onOpenSettings}
              title="Bronnen en AI instellingen beheren"
              className="flex items-center gap-1 p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 hidden xl:inline-block">
                {aiMode === 'gemini' ? 'Gemini ✦' : 'Smart AI'}
              </span>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              title="Wissel donkere / lichte modus"
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-violet-600" />}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

