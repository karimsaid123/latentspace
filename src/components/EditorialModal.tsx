'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Article } from '@/types';
import { ExternalLink, Share2 } from 'lucide-react';
import ArticleShareModal from './ArticleShareModal';
import { getCompanyBrand, CompanyLogo } from './CompanyBrand';

interface EditorialModalProps {
  article: Article | null;
  onClose: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
}

const emptySubscribe = () => () => {};

export default function EditorialModal({
  article,
  onClose,
  isBookmarked = false,
  onToggleBookmark,
}: EditorialModalProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [summary, setSummary] = useState(article?.aiSummary);
  const [isEnriching, setIsEnriching] = useState(false);
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!article) return;
    setSummary(article.aiSummary);

    // If this article only has a heuristic/template summary, enrich it on-demand with Gemini!
    if (article.aiSummary?.generatedWith !== 'gemini') {
      setIsEnriching(true);
      fetch(`/api/summarize?id=${encodeURIComponent(article.id)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.summary) {
            setSummary(data.summary);
          }
        })
        .catch(() => {})
        .finally(() => setIsEnriching(false));
    }
  }, [article?.id]);

  useEffect(() => {
    if (!article) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        if (isShareOpen) {
          setIsShareOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [article, onClose, isShareOpen]);

  if (!isMounted || !article) return null;

  const brand = getCompanyBrand(article.lab || article.source?.name);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm select-none animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
      />

      {/* Minimalist Reader Sheet */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#faf9f6] text-black border border-black z-10 overflow-hidden shadow-2xl animate-modal-in">

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 font-mono text-[10px] tracking-widest text-black/60">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-black uppercase">[{article.source?.name || 'LATENTSPACE'}]</span>
            {summary?.generatedWith === 'gemini' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#00aa66]/10 text-[#00aa66] border border-[#00aa66]/30 text-[9px] font-mono font-bold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00aa66]" />
                GEMINI FLASH
              </span>
            ) : isEnriching ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-black/5 text-black/60 border border-black/10 text-[9px] font-mono tracking-wider uppercase animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff8000] animate-ping" />
                SYNTHESIZING...
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(article.id)}
                className={`cursor-pointer transition-colors uppercase font-mono ${
                  isBookmarked ? 'text-black font-bold' : 'text-black/60 hover:text-black'
                }`}
              >
                [{isBookmarked ? <><span className="text-[#ff8000]">★</span> SAVED</> : '+ SAVE'}]
              </button>
            )}

            <button
              onClick={() => setIsShareOpen(true)}
              className="text-black/60 hover:text-black cursor-pointer transition-colors uppercase font-mono flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>[SHARE]</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="font-bold text-black hover:opacity-60 cursor-pointer uppercase font-mono ml-1"
            >
              [CLOSE ✕]
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 select-text">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
              <div
                className="w-4 h-4 border flex items-center justify-center p-0.5 shrink-0"
                style={{ backgroundColor: brand.bgTint, borderColor: brand.borderColor }}
              >
                <CompanyLogo brandId={brand.id} className="w-2.5 h-2.5" />
              </div>
              <span className="font-bold tracking-wider" style={{ color: brand.textColor }}>
                {article.lab || 'FRONTIER LAB'}
              </span>
              {article.arxivId && (
                <span className="font-mono text-[9px] font-semibold text-black/40 ml-1">
                  [{article.arxivId}]
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight leading-snug text-black">
              {article.title}
            </h2>
          </div>

          {/* 01: Executive Intelligence Brief */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                {'01 // EXECUTIVE SUMMARY'}
              </span>
              <div className="h-px flex-1 bg-black/10" />
            </div>
            <p className="font-sans text-base sm:text-lg leading-[1.65] text-black/90 font-normal antialiased">
              {summary?.tldr || article.contentSnippet || ''}
            </p>
          </div>

          {/* 02: Key Actionable Takeaways */}
          {summary?.takeaways && summary.takeaways.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                  {'02 // KEY TAKEAWAYS'}
                </span>
                <div className="h-px flex-1 bg-black/10" />
              </div>
              <ul className="space-y-2.5">
                {summary.takeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 font-sans text-sm sm:text-base leading-relaxed text-black/85">
                    <span className="font-mono text-xs font-bold text-[#ff8000] mt-0.5 shrink-0">
                      [{idx + 1}]
                    </span>
                    <span className="antialiased">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 03: Analysis & Implications */}
          {(summary?.technicalAnalysis || summary?.strategicImplications) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                  {'03 // ANALYSIS & IMPLICATIONS'}
                </span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary?.technicalAnalysis && (
                  <div className="p-4 bg-white border border-black/10 space-y-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black/50 block">
                      TECHNICAL ARCHITECTURE
                    </span>
                    <p className="font-sans text-xs sm:text-sm leading-relaxed text-black/80 antialiased">
                      {summary.technicalAnalysis}
                    </p>
                  </div>
                )}

                {summary?.strategicImplications && (
                  <div className="p-4 bg-white border border-black/10 space-y-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black/50 block">
                      STRATEGIC IMPACT
                    </span>
                    <p className="font-sans text-xs sm:text-sm leading-relaxed text-black/80 antialiased">
                      {summary.strategicImplications}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Source Snippet */}
          {article.contentSnippet && (
            <div className="pt-4 border-t border-black/10 space-y-1.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black/40 block">
                PRIMARY SOURCE EXCERPT
              </span>
              <p className="font-sans text-xs sm:text-sm leading-relaxed text-black/60 italic antialiased">
                &ldquo;{article.contentSnippet}&rdquo;
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px]">
          <div className="flex items-center gap-3 text-black/50">
            <span>RECORDED: {new Date(article.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>

          <div className="flex items-center gap-3">
            {article.pdfUrl && (
              <a
                href={article.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-bold uppercase text-black border border-black px-3.5 py-2 hover:bg-black hover:text-white transition-colors cursor-pointer text-[11px] tracking-wider"
              >
                <span>OPEN PDF ↗</span>
              </a>
            )}

            <a
              href={article.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-bold uppercase text-white bg-black px-4 py-2 hover:bg-[#ff8000] hover:text-black transition-all cursor-pointer shadow-sm text-[11px] tracking-wider"
            >
              <span>{article.entryType === 'RESEARCH_PAPER' ? 'VIEW ON ARXIV' : `READ ON ${article.source?.name || 'SOURCE'}`}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>

      {/* Branded Article Share Modal */}
      <ArticleShareModal
        article={article}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
