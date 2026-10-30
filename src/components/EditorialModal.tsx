'use client';

import React, { useEffect } from 'react';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';
import { ExternalLink } from 'lucide-react';

interface EditorialModalProps {
  article: Article | null;
  onClose: () => void;
}

export default function EditorialModal({
  article,
  onClose,
}: EditorialModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!article) return null;

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

          <button
            onClick={onClose}
            className="font-bold text-black hover:opacity-60 cursor-pointer"
          >
            [CLOSE ✕]
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 select-text">
          
          <div>
            <span className="font-mono text-[9px] tracking-widest uppercase text-black/40 block mb-2">
              CLASSIFICATION // "{article.category}"
            </span>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-[-0.04em] leading-[0.88] text-black">
              {article.title}
            </h2>
          </div>

          {article.imageUrl && (
            <div className="max-w-sm">
              <ArtFrame
                src={article.imageUrl}
                alt={article.title}
                indexCode="001"
                aspect="landscape"
              />
            </div>
          )}

          {/* AI TLDR Box */}
          <div className="p-6 bg-black/[0.03] border-l-2 border-black font-mono text-xs">
            <span className="text-[10px] font-bold uppercase tracking-widest block mb-2">
              "AI TL;DR EXECUTIVE SUMMARY"
            </span>
            <p className="uppercase leading-relaxed text-black/90">
              {article.aiSummary?.tldr || article.contentSnippet || ''}
            </p>
          </div>

          {/* Takeaways */}
          {article.aiSummary?.takeaways && article.aiSummary.takeaways.length > 0 && (
            <div className="font-mono text-xs space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 block">
                BELANGRIJKSTE INZICHTEN:
              </span>
              <ul className="space-y-2">
                {article.aiSummary.takeaways.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 uppercase text-black/80">
                    <span className="font-bold">—</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Snippet */}
          {article.contentSnippet && (
            <div className="font-mono text-xs space-y-2 pt-4 border-t border-black/10">
              <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 block">
                CONTENT SNIPPET:
              </span>
              <p className="text-black/60 leading-relaxed uppercase">
                {article.contentSnippet}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/10 flex items-center justify-between font-mono text-[10px]">
          <span className="text-black/40">
            {new Date(article.pubDate).toLocaleDateString()}
          </span>

          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-bold uppercase text-black hover:opacity-60 underline underline-offset-4"
          >
            <span>LEES OP {article.source.name}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
