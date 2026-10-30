'use client';

import React from 'react';
import { 
  Sparkles, 
  ExternalLink, 
  Bookmark, 
  Clock, 
  Flame, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';
import { Article } from '@/types';

interface HeroFeaturedProps {
  articles: Article[];
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

export default function HeroFeatured({
  articles,
  onSelectArticle,
  onToggleBookmark,
}: HeroFeaturedProps) {
  if (!articles || articles.length === 0) return null;

  const featured = articles[0];
  const secondary = articles.slice(1, 3);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Top AI Breakthroughs & Headlines
          </h2>
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          Geanalyseerd & gerangschikt door AI
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Featured Hero Card */}
        <div className="lg:col-span-8 group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl hover:border-violet-500/40 transition-all duration-300">
          
          {/* Ambient background glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />

          <div className="relative p-6 sm:p-8 z-10">
            {/* Top metadata row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span 
                  className="px-2.5 py-1 text-xs font-semibold rounded-md text-white shadow-sm"
                  style={{ backgroundColor: featured.source.color || '#6366f1' }}
                >
                  {featured.source.name}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  {featured.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo(featured.pubDate)}
                </span>
              </div>

              {/* Impact badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-3 h-3" />
                {featured.aiSummary.impact === 'Breakthrough' ? '⚡ Breakthrough' : '🔥 High Impact'}
              </span>
            </div>

            {/* Title */}
            <h1 
              onClick={() => onSelectArticle(featured)}
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug hover:text-violet-300 transition-colors cursor-pointer mb-4"
            >
              {featured.title}
            </h1>

            {/* AI TLDR Box */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-violet-500/20 backdrop-blur-sm mb-6">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI TL;DR EXECUTIVE SUMMARY</span>
              </div>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                {featured.aiSummary.tldr}
              </p>
            </div>

            {/* Key Takeaways */}
            {featured.aiSummary.takeaways.length > 0 && (
              <div className="space-y-2 mb-6">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Belangrijkste Inzichten:
                </span>
                <ul className="space-y-2">
                  {featured.aiSummary.takeaways.map((takeaway, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="relative z-10 px-6 sm:px-8 py-4 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between">
            <button
              onClick={() => onSelectArticle(featured)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <span>Volledige AI Analyse lezen</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => onToggleBookmark(featured.id, e)}
                title="Opslaan als bladwijzer"
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  featured.bookmarked
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${featured.bookmarked ? 'fill-current' : ''}`} />
              </button>
              <a
                href={featured.link}
                target="_blank"
                rel="noopener noreferrer"
                title="Open originele bron"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Secondary Trending Column */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {secondary.map((art) => (
            <div
              key={art.id}
              onClick={() => onSelectArticle(art)}
              className="flex-1 group flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-violet-500/40 hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className="px-2 py-0.5 text-[11px] font-semibold rounded text-white"
                    style={{ backgroundColor: art.source.color || '#3b82f6' }}
                  >
                    {art.source.name}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(art.pubDate)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 line-clamp-2 transition-colors mb-2">
                  {art.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">
                  {art.aiSummary.tldr}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                  {art.category}
                </span>
                <span className="text-violet-600 dark:text-violet-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Bekijk <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
