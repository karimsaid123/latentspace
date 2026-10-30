'use client';

import React, { useEffect, useState } from 'react';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';
import { ExternalLink } from 'lucide-react';
import { getTopBenchmarkForLab } from '@/lib/benchmark-client';

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyLink = () => {
    if (!article) return;
    navigator.clipboard.writeText(article.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!article) return null;

  const wordCount = (article.contentSnippet || '').split(' ').length + (article.aiSummary?.tldr || '').split(' ').length;
  const readTimeMinutes = Math.max(1, Math.round(wordCount / 40));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm select-none animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Minimalist Reader Sheet */}
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#faf9f6] text-black border border-black z-10 overflow-hidden shadow-2xl animate-modal-in">
        
        {/* 4 Corner Bounding Box Square Handles */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-black z-30" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black z-30" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 font-mono text-[9px] uppercase tracking-widest text-black/60">
          <div>
            <span>ENTRY // {article.id.slice(0, 8)}</span>
            <span className="ml-3 font-bold text-black">[{article.source.name}]</span>
          </div>

          <div className="flex items-center gap-3">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(article.id)}
                className={`cursor-pointer transition-colors ${
                  isBookmarked ? 'text-black font-black' : 'text-black/60 hover:text-black'
                }`}
              >
                [{isBookmarked ? '★ SAVED' : '+ SAVE'}]
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="text-black/60 hover:text-black cursor-pointer transition-colors"
            >
              [{copied ? 'COPIED ✓' : 'SHARE'}]
            </button>

            <button
              onClick={onClose}
              className="font-bold text-black hover:opacity-60 cursor-pointer ml-2"
            >
              [CLOSE ✕]
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 select-text">
          
          <div>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] tracking-widest uppercase text-black/50 mb-3">
              <span className={`font-bold ${article.entryType === 'RESEARCH_PAPER' ? 'text-black border border-black px-1.5 py-0.5' : 'text-black'}`}>
                {article.entryType === 'RESEARCH_PAPER' ? 'RESEARCH' : 'NEWS'}
              </span>
              <span>•</span>
              <span className="text-black font-bold">LAB: [{article.lab || 'FRONTIER LAB'}]</span>
              {article.arxivId && (
                <>
                  <span>•</span>
                  <span className="font-bold text-black">[{article.arxivId}]</span>
                </>
              )}
              <span>•</span>
              <span>IMPACT: [{article.aiSummary?.impact || 'NOTABLE'}]</span>
              <span>•</span>
              <span>~{readTimeMinutes} MIN READ</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-[-0.04em] leading-[0.88] text-black">
              {article.title}
            </h2>
          </div>

          {/* Artificial Analysis Benchmark Telemetry for Lab */}
          {(() => {
            const topBenchmark = article.lab ? getTopBenchmarkForLab(article.lab) : undefined;
            if (!topBenchmark) return null;
            return (
              <div className="p-3 bg-black/[0.02] border border-black/15 font-mono text-[9px] uppercase tracking-wider flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">AA BENCHMARK [{topBenchmark.name}]:</span>
                  <span className="text-black/50">INDEPENDENT EVALUATION</span>
                </div>
                <div className="flex items-center gap-3 font-bold text-black">
                  <span>IQ: {topBenchmark.evaluations.intelligenceIndex}/100</span>
                  <span>•</span>
                  <span>SPEED: {topBenchmark.evaluations.speedTokensPerSecond} TOK/S</span>
                  <span>•</span>
                  <span>COST: ${topBenchmark.evaluations.blendedPricePer1M?.toFixed(2)}/1M</span>
                </div>
              </div>
            );
          })()}

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
          <div className="p-6 bg-black/[0.03] border-l-2 border-black font-mono text-xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-black block mb-3">
              01 // EXECUTIVE INTELLIGENCE BRIEF
            </span>
            <p className="uppercase leading-relaxed text-black/90">
              {article.aiSummary?.tldr || article.contentSnippet || ''}
            </p>
          </div>

          {/* 02: Technical & Architectural Breakdown */}
          {article.aiSummary?.technicalAnalysis && (
            <div className="p-6 border border-black/10 font-mono text-xs bg-black/[0.01]">
              <span className="text-[10px] font-black uppercase tracking-widest text-black block mb-3">
                02 // TECHNICAL & ARCHITECTURAL BREAKDOWN
              </span>
              <p className="uppercase leading-relaxed text-black/80">
                {article.aiSummary.technicalAnalysis}
              </p>
            </div>
          )}

          {/* 03: Strategic & Ecosystem Implications */}
          {article.aiSummary?.strategicImplications && (
            <div className="p-6 border-l-2 border-black/30 bg-black/[0.02] font-mono text-xs">
              <span className="text-[10px] font-black uppercase tracking-widest text-black block mb-3">
                03 // STRATEGIC & ECOSYSTEM IMPLICATIONS
              </span>
              <p className="uppercase leading-relaxed text-black/80">
                {article.aiSummary.strategicImplications}
              </p>
            </div>
          )}

          {/* 04: Key Actionable Takeaways */}
          {article.aiSummary?.takeaways && article.aiSummary.takeaways.length > 0 && (
            <div className="font-mono text-xs space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-black block">
                04 // KEY ACTIONABLE TAKEAWAYS:
              </span>
              <ul className="space-y-2.5">
                {article.aiSummary.takeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 uppercase text-black/85 leading-relaxed">
                    <span className="font-bold text-black">—</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source Snippet */}
          {article.contentSnippet && (
            <div className="font-mono text-xs space-y-2 pt-4 border-t border-black/10">
              <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 block">
                PRIMARY SOURCE SNIPPET:
              </span>
              <p className="text-black/60 leading-relaxed uppercase">
                {article.contentSnippet}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px]">
          <span className="text-black/40">
            RECORDED: {new Date(article.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>

          <div className="flex items-center gap-4">
            {article.pdfUrl && (
              <a
                href={article.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-bold uppercase text-black border border-black px-2.5 py-1 hover:bg-black hover:text-[#faf9f6] transition-colors"
              >
                <span>OPEN PDF ↗</span>
              </a>
            )}

            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-bold uppercase text-black hover:opacity-60 underline underline-offset-4"
            >
              <span>{article.entryType === 'RESEARCH_PAPER' ? 'VIEW ON ARXIV / SOURCE' : `READ ON ${article.source.name}`}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
