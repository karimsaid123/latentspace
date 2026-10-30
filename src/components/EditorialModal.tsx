'use client';

import React, { useEffect, useState } from 'react';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';
import { X, Bookmark, ExternalLink, Share2, Check } from 'lucide-react';

interface EditorialModalProps {
  article: Article | null;
  onClose: () => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

export default function EditorialModal({
  article,
  onClose,
  onToggleBookmark,
}: EditorialModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Industrial Specimen Sheet */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#f4f3ef] dark:bg-[#0d0d0d] text-black dark:text-white border-2 border-black dark:border-white z-10 overflow-hidden shadow-2xl">
        
        {/* 4 Corner Bounding Box Square Handles */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black dark:bg-white z-30" />

        {/* Header Telemetry */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-black/15 dark:border-white/15 font-mono text-[10px] uppercase tracking-widest text-black/60 dark:text-white/60">
          <div>
            <span>SPECIMEN // {article.id.slice(0, 8)}</span>
            <span className="ml-3 font-bold text-black dark:text-white">"{article.source.name}"</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleShare}
              className="hover:text-black dark:hover:text-white cursor-pointer"
            >
              [{copied ? 'COPIED' : 'SHARE'}]
            </button>
            <button
              onClick={(e) => onToggleBookmark(article.id, e)}
              className="hover:text-black dark:hover:text-white cursor-pointer"
            >
              [{article.bookmarked ? 'SAVED ★' : 'SAVE'}]
            </button>
            <button
              onClick={onClose}
              className="font-bold text-black dark:text-white hover:text-[#ff3b00] cursor-pointer"
            >
              [CLOSE ✕]
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 select-text">
          
          {/* Title */}
          <div>
            <div className="font-mono text-[9px] tracking-widest uppercase text-black/50 dark:text-white/50 mb-2">
              0.1 PSYCHO // CATEGORY: "{article.category}"
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-[-0.04em] leading-[0.9] text-black dark:text-white">
              {article.title}
            </h2>
          </div>

          {/* Optional Art Frame */}
          {article.imageUrl && (
            <div className="max-w-md">
              <ArtFrame
                src={article.imageUrl}
                alt={article.title}
                indexCode="SPECIMEN_ART"
                subTag="0.1 COGNITION"
                aspect="wide"
              />
            </div>
          )}

          {/* AI Executive TL;DR Box */}
          <div className="p-6 bg-black/5 dark:bg-white/5 border-l-4 border-black dark:border-white">
            <div className="font-mono text-xs font-bold uppercase tracking-widest text-black dark:text-white mb-2 flex items-center justify-between">
              <span>"AI TL;DR EXECUTIVE SUMMARY"</span>
              <span className="text-[10px] text-[#ff3b00]">
                IMPACT: {article.aiSummary.impact}
              </span>
            </div>
            <p className="font-mono text-xs sm:text-sm uppercase leading-relaxed text-black/90 dark:text-white/90">
              {article.aiSummary.tldr}
            </p>
          </div>

          {/* Key Takeaways */}
          {article.aiSummary.takeaways && article.aiSummary.takeaways.length > 0 && (
            <div className="font-mono text-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 block">
                "AI TAKEAWAYS":
              </span>
              <ul className="space-y-2">
                {article.aiSummary.takeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 uppercase text-black/80 dark:text-white/80">
                    <span className="text-[#ff3b00] font-bold">—</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Excerpt */}
          {article.contentSnippet && (
            <div className="font-mono text-xs space-y-2 pt-4 border-t border-black/10 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 block">
                "RAW CONTENT SNIPPET":
              </span>
              <p className="text-black/70 dark:text-white/70 leading-relaxed uppercase">
                {article.contentSnippet}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/15 dark:border-white/15 flex items-center justify-between font-mono text-xs">
          <span className="text-black/50 dark:text-white/50 text-[10px]">
            DATE: {new Date(article.pubDate).toISOString()}
          </span>

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 font-bold uppercase bg-black text-white dark:bg-white dark:text-black hover:bg-[#ff3b00] dark:hover:bg-[#ff3b00] dark:hover:text-white transition-colors"
          >
            <span>"READ ORIGINAL ON {article.source.name}"</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>
    </div>
  );
}
