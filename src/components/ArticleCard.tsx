'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  ExternalLink, 
  Bookmark, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Share2,
  Check
} from 'lucide-react';
import { Article } from '@/types';

interface ArticleCardProps {
  article: Article;
  onSelectArticle: (article: Article) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

function timeAgo(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Zojuist';
    if (mins < 60) return `${mins}m geleden`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}u geleden`;
    const days = Math.floor(hours / 24);
    return `${days}d geleden`;
  } catch {
    return '';
  }
}

export default function ArticleCard({
  article,
  onSelectArticle,
  onToggleBookmark,
}: ArticleCardProps) {
  const [showTakeaways, setShowTakeaways] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(article.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const impactStyles = {
    Breakthrough: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    High: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    Notable: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  }[article.aiSummary.impact] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  return (
    <article
      onClick={() => onSelectArticle(article)}
      className="group flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-violet-500/50 hover:shadow-xl dark:hover:shadow-violet-950/20 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      <div>
        {/* Optional Image Header */}
        {article.imageUrl && (
          <div className="relative w-full h-44 overflow-hidden bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        <div className="p-5">
          {/* Top Metadata Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 text-[11px] font-bold rounded-md text-white shadow-xs"
                style={{ backgroundColor: article.source.color || '#6366f1' }}
              >
                {article.source.name}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(article.pubDate)}
              </span>
            </div>

            {/* Impact badge */}
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${impactStyles}`}>
              {article.aiSummary.impact === 'Breakthrough' && '⚡ '}
              {article.aiSummary.impact === 'High' && '🔥 '}
              {article.aiSummary.impact}
            </span>
          </div>

          {/* Article Title */}
          <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2 leading-snug mb-3">
            {article.title}
          </h3>

          {/* AI TLDR Box */}
          <div className="p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-400 mb-1">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>AI TL;DR</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
              {article.aiSummary.tldr}
            </p>
          </div>

          {/* Expandable Key Takeaways */}
          {article.aiSummary.takeaways && article.aiSummary.takeaways.length > 0 && (
            <div className="mb-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTakeaways(!showTakeaways);
                }}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 py-1 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Belangrijkste punten ({article.aiSummary.takeaways.length})
                </span>
                {showTakeaways ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showTakeaways && (
                <ul className="mt-2 space-y-1.5 pl-1 pr-1 pb-1">
                  {article.aiSummary.takeaways.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-normal">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
            {article.category}
          </span>
          <span className="text-slate-600 dark:text-slate-400 text-[11px]">
            {article.aiSummary.readTimeMinutes} min leestijd
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Share button */}
          <button
            onClick={handleShare}
            title={copied ? 'Link gekopieerd!' : 'Deel artikel'}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Bookmark button */}
          <button
            onClick={(e) => onToggleBookmark(article.id, e)}
            title="Bladwijzer opslaan"
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              article.bookmarked
                ? 'text-amber-500 hover:text-amber-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${article.bookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Direct link */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open bron"
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}
