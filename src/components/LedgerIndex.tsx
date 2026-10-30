'use client';

import React, { useState } from 'react';
import { Article } from '@/types';
import { ArrowUpRight, Bookmark, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface LedgerIndexProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

export default function LedgerIndex({
  articles,
  onSelectArticle,
  onToggleBookmark,
}: LedgerIndexProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-10 font-mono text-xs select-none">
      
      {/* Ledger Header Bar */}
      <div className="border-b-2 border-black dark:border-white pb-3 mb-2 flex items-center justify-between uppercase tracking-widest text-black dark:text-white font-bold text-[11px]">
        <div className="grid grid-cols-12 gap-4 w-full">
          <span className="col-span-1">ID</span>
          <span className="col-span-2 hidden sm:block">SOURCE</span>
          <span className="col-span-6 sm:col-span-5">HEADLINE</span>
          <span className="col-span-2 hidden md:block">CATEGORY</span>
          <span className="col-span-2 sm:col-span-2 text-right">IMPACT</span>
        </div>
      </div>

      {/* Ledger Rows */}
      <div className="divide-y divide-black/10 dark:divide-white/10">
        {articles.map((art, idx) => {
          const indexCode = (idx + 1).toString().padStart(3, '0');
          const isExpanded = expandedId === art.id;

          return (
            <div
              key={art.id}
              onClick={() => onSelectArticle(art)}
              className="py-3 group hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* ID */}
                <span className="col-span-1 font-bold text-black/50 dark:text-white/50 group-hover:text-black dark:group-hover:text-white">
                  {indexCode}
                </span>

                {/* Source */}
                <span className="col-span-2 hidden sm:block font-bold text-black dark:text-white tracking-wider">
                  [{art.source.name}]
                </span>

                {/* Title */}
                <div className="col-span-6 sm:col-span-5 font-bold uppercase tracking-tight text-black dark:text-white group-hover:text-[#ff3b00] dark:group-hover:text-[#ff3b00] transition-colors truncate">
                  {art.title}
                </div>

                {/* Category */}
                <span className="col-span-2 hidden md:block text-[10px] text-black/60 dark:text-white/60 tracking-wider">
                  {art.category}
                </span>

                {/* Impact & Actions */}
                <div className="col-span-5 sm:col-span-2 flex items-center justify-end gap-3 text-right">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                    art.aiSummary.impact === 'Breakthrough'
                      ? 'border-[#ff3b00] text-[#ff3b00]'
                      : 'border-black/20 dark:border-white/20 text-black/70 dark:text-white/70'
                  }`}>
                    {art.aiSummary.impact}
                  </span>

                  <button
                    onClick={(e) => toggleExpand(art.id, e)}
                    className="p-1 hover:text-[#ff3b00] transition-colors cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Inline Expansion: AI Breakdown */}
              {isExpanded && (
                <div className="mt-4 p-5 bg-black/5 dark:bg-white/5 border-l-2 border-black dark:border-white text-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-black dark:text-white">
                      "EXECUTIVE TL;DR":
                    </span>
                    <button
                      onClick={(e) => onToggleBookmark(art.id, e)}
                      className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white cursor-pointer"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${art.bookmarked ? 'fill-current text-[#ff3b00]' : ''}`} />
                    </button>
                  </div>

                  <p className="text-black/80 dark:text-white/80 uppercase leading-relaxed">
                    {art.aiSummary.tldr}
                  </p>

                  {art.aiSummary.takeaways.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] text-black/50 dark:text-white/50 block mb-1">
                        KEY TAKEAWAYS:
                      </span>
                      <ul className="space-y-1">
                        {art.aiSummary.takeaways.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-black/70 dark:text-white/70">
                            <span className="text-[#ff3b00]">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center text-[10px] text-black/50 dark:text-white/50">
                    <span>DATE: {new Date(art.pubDate).toLocaleDateString()}</span>
                    <a
                      href={art.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-black dark:text-white font-bold hover:text-[#ff3b00] inline-flex items-center gap-1"
                    >
                      <span>READ ORIGINAL</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
