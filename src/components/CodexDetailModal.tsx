'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, X, BookOpen, Cpu, Sparkles, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { EnrichedCodexEntry } from '@/lib/codex-engine';
import PaperSignalsBar from './PaperSignalsBar';

interface CodexDetailModalProps {
  entry: EnrichedCodexEntry | null;
  onClose: () => void;
  onSelectRelated: (id: string) => void;
}

export default function CodexDetailModal({
  entry,
  onClose,
  onSelectRelated
}: CodexDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    if (entry) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [entry, onClose]);

  if (!entry) return null;

  const levelColor = {
    BEGINNER: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    INTERMEDIATE: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30',
    FRONTIER: 'bg-[#ff8000]/10 text-[#d96c00] dark:text-[#ff9933] border-[#ff8000]/30'
  }[entry.level];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#faf9f6] border-2 border-black p-5 sm:p-8 font-mono select-text shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Geometric Corner Accents */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-black" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-black" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-black" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-black" />

        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-black/15 gap-3">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-wider flex-wrap">
            <span className="px-2 py-0.5 border border-black/25 bg-black/5 font-bold text-black">
              [{entry.category.replace('_', ' ')}]
            </span>
            <span className={`px-2 py-0.5 border font-bold ${levelColor}`}>
              [{entry.level} LEVEL]
            </span>
            {entry.acronym && (
              <span className="text-black/60 hidden sm:inline">
                // {entry.acronym}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer text-xs font-bold tracking-wider"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Title */}
        <div className="pt-5 pb-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-black leading-tight">
            {entry.title}
          </h1>
          <p className="mt-3 text-xs sm:text-sm font-sans font-medium text-black/80 leading-relaxed max-w-3xl">
            {entry.summary}
          </p>
        </div>

        {/* Mathematical Blueprint (if present) */}
        {entry.mathematics && (
          <div className="my-5 p-4 sm:p-5 border border-black bg-white">
            <div className="flex items-center gap-2 text-[10px] tracking-widest text-black/60 uppercase pb-2 mb-2 border-b border-black/10">
              <Cpu className="w-3.5 h-3.5 text-black" />
              <span>MATHEMATICAL FORMULATION & BLUEPRINT</span>
            </div>
            <div className="py-2 text-center overflow-x-auto text-sm sm:text-base font-bold text-black tracking-wider">
              <code>{entry.mathematics.formula}</code>
            </div>
            <p className="mt-2 text-[11px] text-black/70 font-sans leading-normal">
              {entry.mathematics.explanation}
            </p>
          </div>
        )}

        {/* Technical Deep Dive */}
        <div className="my-6">
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-black/60 uppercase pb-2 mb-3 border-b border-black/10">
            <BookOpen className="w-3.5 h-3.5 text-black" />
            <span>TECHNICAL MECHANICS & INNER WORKINGS</span>
          </div>
          <p className="font-sans text-xs sm:text-sm leading-relaxed text-black/85">
            {entry.technicalDeepDive}
          </p>
        </div>

        {/* Key Takeaways */}
        <div className="my-6 p-4 border border-black/20 bg-black/[0.02]">
          <span className="text-[10px] tracking-widest text-black/60 uppercase block font-bold mb-2">
            [CORE PRINCIPLES]
          </span>
          <ul className="space-y-1.5 text-xs font-sans text-black/80">
            {entry.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-mono text-black font-bold">›</span>
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trade-offs Grid (Advantages vs Limitations) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div className="p-4 border border-black/20 bg-emerald-500/[0.03]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-emerald-800 dark:text-emerald-400 uppercase mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>KEY ADVANTAGES</span>
            </div>
            <ul className="space-y-1 text-[11px] font-sans text-black/80">
              {entry.tradeoffs.advantages.map((adv, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-mono font-bold">+</span>
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 border border-black/20 bg-orange-500/[0.03]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-orange-800 dark:text-orange-400 uppercase mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>LIMITATIONS & TRADEOFFS</span>
            </div>
            <ul className="space-y-1 text-[11px] font-sans text-black/80">
              {entry.tradeoffs.limitations.map((lim, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-orange-600 font-mono font-bold">-</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Canonical Landmark Paper */}
        {entry.canonicalPaper && (
          <div className="my-6 p-4 sm:p-5 border border-black bg-white">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-black/10">
              <span className="text-[10px] tracking-widest text-black/60 uppercase font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>CANONICAL LANDMARK PAPER</span>
              </span>
              <a
                href={entry.canonicalPaper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-black/30 hover:border-black hover:bg-black hover:text-white transition-all flex items-center gap-1"
              >
                <span>OPEN ARXIV</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="pt-1">
              <h4 className="text-sm sm:text-base font-bold text-black uppercase">
                {entry.canonicalPaper.title}
              </h4>
              <p className="text-[11px] text-black/60 mt-1 font-mono">
                {entry.canonicalPaper.authors} ({entry.canonicalPaper.year})
              </p>

              {entry.canonicalPaper.arxivId && (
                <div className="mt-3">
                  <PaperSignalsBar arxivId={entry.canonicalPaper.arxivId} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Mentions in LatentSpace Dispatches */}
        {entry.recentMentions.length > 0 && (
          <div className="my-6 p-4 border border-black/15 bg-black/[0.01]">
            <span className="text-[10px] tracking-widest text-black/60 uppercase font-bold block mb-2">
              [MENTIONED IN {entry.mentionsCount} LIVE DISPATCHES]
            </span>
            <div className="divide-y divide-black/10">
              {entry.recentMentions.map((art) => (
                <div key={art.id} className="py-2 flex items-center justify-between gap-3">
                  <a
                    href={art.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-sans font-medium text-black hover:underline line-clamp-1"
                  >
                    {art.title}
                  </a>
                  <span className="text-[9px] text-black/50 shrink-0 font-mono uppercase">
                    {art.sourceName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Concepts (Clickable) */}
        {entry.relatedIds.length > 0 && (
          <div className="pt-4 border-t border-black/15">
            <span className="text-[10px] tracking-widest text-black/60 uppercase block font-bold mb-2">
              [RELATED ARCHITECTURES & CONCEPTS]
            </span>
            <div className="flex flex-wrap gap-2">
              {entry.relatedIds.map((relId) => (
                <button
                  key={relId}
                  onClick={() => onSelectRelated(relId)}
                  className="px-2.5 py-1 border border-black/30 hover:border-black bg-white hover:bg-black hover:text-white transition-all text-[11px] font-mono uppercase cursor-pointer flex items-center gap-1"
                >
                  <span>{relId.replace('-', ' ')}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
