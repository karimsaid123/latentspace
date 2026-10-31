'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';
import { ExternalLink, Share2 } from 'lucide-react';
import ArticleShareModal from './ArticleShareModal';
import { getCompanyBrand, CompanyLogo } from './CompanyBrand';

interface EditorialModalProps {
  article: Article | null;
  onClose: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
}

export default function EditorialModal({
  article,
  onClose,
  isBookmarked = false,
  onToggleBookmark,
}: EditorialModalProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!article) {
      setIsShareOpen(false);
      return;
    }

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

  if (!mounted || !article) return null;

  const brand = getCompanyBrand(article.lab || article.source?.name);
  const wordCount = (article.contentSnippet || '').split(' ').length + (article.aiSummary?.tldr || '').split(' ').length;
  const readTimeMinutes = Math.max(1, Math.round(wordCount / 40));

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
        
        {/* 4 Corner Bounding Box Square Handles */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black z-30" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 font-mono text-[10px] tracking-widest text-black/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black uppercase">[{article.source?.name || 'LATENTSPACE'}]</span>
            {article.lab && article.lab !== 'Independent' && (
              <span className="hidden sm:inline-block font-semibold uppercase text-black/50">
                // {article.lab}
              </span>
            )}
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
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-[9px] tracking-widest uppercase text-black/50">
              <span className={`font-bold ${article.entryType === 'RESEARCH_PAPER' ? 'text-black border border-black px-1.5 py-0.5' : 'text-black'}`}>
                {article.entryType === 'RESEARCH_PAPER' ? 'RESEARCH PAPER' : 'DISPATCH'}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 border flex items-center justify-center p-0.5 shrink-0"
                  style={{ backgroundColor: brand.bgTint, borderColor: brand.borderColor }}
                >
                  <CompanyLogo brandId={brand.id} className="w-2.5 h-2.5" />
                </div>
                <span className="font-bold" style={{ color: brand.textColor }}>
                  {article.lab || 'FRONTIER LAB'}
                </span>
              </div>
              {article.arxivId && (
                <>
                  <span>•</span>
                  <span className="font-bold text-black">{article.arxivId}</span>
                </>
              )}
              <span>•</span>
              <span>IMPACT: {article.aiSummary?.impact || 'NOTABLE'}</span>
              <span>•</span>
              <span>~{readTimeMinutes} MIN READ</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-[-0.035em] leading-[0.92] text-black">
              {article.title}
            </h2>
          </div>

          {article.imageUrl && (
            <div className="max-w-md">
              <ArtFrame
                src={article.imageUrl}
                alt={article.title}
                indexCode="001"
                aspect="landscape"
              />
            </div>
          )}

          {/* 01: Executive Intelligence Brief */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                01 // EXECUTIVE SUMMARY
              </span>
              <div className="h-px flex-1 bg-black/10" />
            </div>
            <p className="font-sans text-base sm:text-lg leading-[1.65] text-black/90 font-normal antialiased">
              {article.aiSummary?.tldr || article.contentSnippet || ''}
            </p>
          </div>

          {/* 02: Key Actionable Takeaways */}
          {article.aiSummary?.takeaways && article.aiSummary.takeaways.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                  02 // KEY TAKEAWAYS
                </span>
                <div className="h-px flex-1 bg-black/10" />
              </div>
              <ul className="space-y-2.5">
                {article.aiSummary.takeaways.map((point, idx) => (
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
          {(article.aiSummary?.technicalAnalysis || article.aiSummary?.strategicImplications) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                  03 // ANALYSIS & IMPLICATIONS
                </span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {article.aiSummary?.technicalAnalysis && (
                  <div className="p-4 bg-white border border-black/10 space-y-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black/50 block">
                      TECHNICAL ARCHITECTURE
                    </span>
                    <p className="font-sans text-xs sm:text-sm leading-relaxed text-black/80 antialiased">
                      {article.aiSummary.technicalAnalysis}
                    </p>
                  </div>
                )}

                {article.aiSummary?.strategicImplications && (
                  <div className="p-4 bg-white border border-black/10 space-y-2">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black/50 block">
                      STRATEGIC IMPACT
                    </span>
                    <p className="font-sans text-xs sm:text-sm leading-relaxed text-black/80 antialiased">
                      {article.aiSummary.strategicImplications}
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
                "{article.contentSnippet}"
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
                className="flex items-center gap-1 font-bold uppercase text-black border border-black px-3 py-1.5 hover:bg-black hover:text-[#faf9f6] transition-colors"
              >
                <span>OPEN PDF ↗</span>
              </a>
            )}

            <a
              href={article.link || (article as any).canonicalUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-bold uppercase text-black bg-black text-[#faf9f6] px-3.5 py-1.5 hover:bg-black/80 transition-colors"
            >
              <span>{article.entryType === 'RESEARCH_PAPER' ? 'VIEW ON ARXIV' : `READ ON ${article.source?.name || 'SOURCE'}`}</span>
              <ExternalLink className="w-3 h-3" />
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
