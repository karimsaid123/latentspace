'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Bookmark, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Share2, 
  Check,
  User
} from 'lucide-react';
import { Article } from '@/types';

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

export default function ArticleModal({
  article,
  onClose,
  onToggleBookmark,
}: ArticleModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

  const handleShare = () => {
    navigator.clipboard.writeText(article.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-10 overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 text-xs font-bold rounded-md text-white"
              style={{ backgroundColor: article.source.color || '#6366f1' }}
            >
              {article.source.name}
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
              {article.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              title="Kopieer link"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => onToggleBookmark(article.id, e)}
              title="Bladwijzer"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                article.bookmarked
                  ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${article.bookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Sluiten"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Title & Metadata */}
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
              {article.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date(article.pubDate).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {article.author && (
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {article.author}
                </span>
              )}
              <span>{article.aiSummary.readTimeMinutes} min leestijd</span>
            </div>
          </div>

          {/* AI Executive Brief Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-cyan-500/10 border border-violet-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI EXECUTIVE BRIEF</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-700 dark:text-violet-300 font-mono">
                {article.aiSummary.generatedWith === 'gemini' ? 'Gemini ✦ Analysis' : 'Automated AI Summary'}
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-4">
              {article.aiSummary.tldr}
            </p>

            {/* Key Takeaways */}
            {article.aiSummary.takeaways && article.aiSummary.takeaways.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-violet-500/20">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block uppercase tracking-wider">
                  Belangrijkste Conclusies:
                </span>
                <ul className="space-y-2">
                  {article.aiSummary.takeaways.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Excerpt / Full Snippet */}
          {article.contentSnippet && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Artikel Overzicht
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {article.contentSnippet}
              </p>
            </div>
          )}
        </div>

        {/* Footer with External Link */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Originele bron: <strong className="text-slate-800 dark:text-slate-200">{article.source.name}</strong>
          </span>

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-md shadow-violet-600/30 cursor-pointer"
          >
            <span>Lees op {article.source.name}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
