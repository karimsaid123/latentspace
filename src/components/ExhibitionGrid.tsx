'use client';

import React, { useState } from 'react';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';
import { Bookmark, ExternalLink, Share2, Check, ArrowUpRight } from 'lucide-react';

interface ExhibitionGridProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

export default function ExhibitionGrid({
  articles,
  onSelectArticle,
  onToggleBookmark,
}: ExhibitionGridProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = (link: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-10">
      
      {/* Category / Exhibit Header */}
      <div className="border-b border-black/20 dark:border-white/20 pb-4 mb-8 flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-black/60 dark:text-white/60">
        <span>EXHIBITION CATALOG // TOTAL ENTRIES ({articles.length})</span>
        <span>INDEX REF: 001 - {articles.length.toString().padStart(3, '0')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
        {articles.map((article, idx) => {
          const indexCode = (idx + 1).toString().padStart(3, '0');

          return (
            <article
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className="group relative flex flex-col justify-between border-t-2 border-black dark:border-white pt-5 cursor-pointer"
            >
              <div>
                {/* Meta Header */}
                <div className="flex justify-between items-center font-mono text-[9px] tracking-widest uppercase text-black/60 dark:text-white/60 mb-3">
                  <span>SPECIMEN // {indexCode}</span>
                  <span className="font-bold text-black dark:text-white">
                    [{article.source.name}]
                  </span>
                </div>

                {/* Art Frame with corner handles */}
                <div className="mb-5 w-full">
                  <ArtFrame
                    src={article.imageUrl}
                    alt={article.title}
                    indexCode={`REF_${indexCode}`}
                    subTag={`"${article.category}"`}
                    aspect="landscape"
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-[-0.03em] leading-[0.9] text-black dark:text-white group-hover:text-[#ff3b00] dark:group-hover:text-[#ff3b00] transition-colors mb-4 line-clamp-3">
                  {article.title}
                </h3>

                {/* Off-White Quoted TL;DR */}
                <div className="p-3 bg-black/5 dark:bg-white/5 border-l-2 border-black dark:border-white mb-4">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-black/60 dark:text-white/60 block mb-1">
                    "AI TL;DR"
                  </span>
                  <p className="font-mono text-[11px] leading-relaxed text-black/80 dark:text-white/80 line-clamp-3 uppercase">
                    {article.aiSummary.tldr}
                  </p>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div className="border-t border-black/10 dark:border-white/10 pt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-black/60 dark:text-white/60">
                <span className="text-black dark:text-white font-bold">
                  {article.aiSummary.impact} IMPACT
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleShare(article.link, article.id, e)}
                    title="Copy Link"
                    className="hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    {copiedId === article.id ? <Check className="w-3.5 h-3.5 text-[#ff3b00]" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={(e) => onToggleBookmark(article.id, e)}
                    title="Bookmark"
                    className="hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${article.bookmarked ? 'fill-current text-[#ff3b00]' : ''}`} />
                  </button>

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Original Source"
                    className="hover:text-black dark:hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

    </div>
  );
}

