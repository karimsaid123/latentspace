'use client';

import React from 'react';
import { Radio, ChevronRight } from 'lucide-react';
import { Article } from '@/types';

interface TickerProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export default function Ticker({ articles, onSelectArticle }: TickerProps) {
  if (!articles || articles.length === 0) return null;

  const topItems = articles.slice(0, 8);

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-xs py-2 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-3 overflow-hidden">
        
        {/* Ticker Badge */}
        <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold tracking-wider text-[10px] uppercase">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          AI RADAR
        </div>

        {/* Scrollable / Marquee Items */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap text-slate-300">
          {topItems.map((art, idx) => (
            <button
              key={art.id}
              onClick={() => onSelectArticle(art)}
              className="inline-flex items-center gap-2 hover:text-cyan-400 transition-colors group cursor-pointer text-left"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600 group-hover:bg-cyan-400"></span>
              <span className="font-semibold text-slate-400 text-[11px] group-hover:text-cyan-300">
                [{art.source.name}]
              </span>
              <span className="text-slate-300 group-hover:text-white line-clamp-1 max-w-[280px] sm:max-w-[400px]">
                {art.title}
              </span>
              <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

