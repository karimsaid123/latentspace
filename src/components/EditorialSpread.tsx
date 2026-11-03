'use client';

import React, { useState, useMemo, useEffect, memo } from 'react';
import { Article } from '@/types';
import ScrollReveal from './ScrollReveal';
import { getDictionary, Locale } from '@/lib/i18n';

const CATALOG_PAGE_SIZE = 24;

interface EditorialSpreadProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  bookmarkedIds?: string[];
  onToggleBookmark?: (id: string, e: React.MouseEvent) => void;
  locale?: Locale;
}

const EditorialSpread = memo(function EditorialSpread({
  articles,
  onSelectArticle,
  bookmarkedIds = [],
  onToggleBookmark,
  locale = 'en',
}: EditorialSpreadProps) {
  const dict = getDictionary(locale);
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(CATALOG_PAGE_SIZE);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // Reset pagination whenever the article list identity changes
  useEffect(() => {
    setVisibleCatalogCount(CATALOG_PAGE_SIZE);
  }, [articles]);

  const savedIdSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  if (!articles || articles.length === 0) return null;

  const lead = articles[0];
  const second = articles[1];
  const third = articles[2];
  const archiveItems = articles.slice(3, 6);
  const catalogSlice = articles.slice(0, visibleCatalogCount);
  const remainingCount = Math.max(0, articles.length - visibleCatalogCount);

  return (
    <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-12 py-8 select-none">

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: REFINED SWISS EDITORIAL LEAD STORIES (Image-free)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-6 pb-14 lg:pb-16 animate-fade-up">

        {/* Lead Headline */}
        <div className="relative">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <h1
              onClick={() => onSelectArticle(lead)}
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-[-0.035em] leading-[0.98] text-black hover:opacity-75 hover:translate-x-1 transition-all duration-300 cursor-pointer max-w-5xl break-words [overflow-wrap:anywhere]"
            >
              {lead.title}
            </h1>

            <div className="font-mono text-[9px] tracking-widest text-black/50 uppercase shrink-0 pt-2">
              <span>[{lead.source.name}]</span>
            </div>
          </div>

          <div className="mt-4 font-mono text-[9px] tracking-widest text-black/50 uppercase flex flex-wrap items-center gap-3">
            <span>{dict.modal.by} {lead.author || lead.source.name}</span>
            <span>//</span>
            <span className="font-bold text-black">{dict.feed.lab} [{lead.lab || 'FRONTIER'}]</span>
            <span>//</span>
            <span className={lead.entryType === 'RESEARCH_PAPER' ? 'font-bold text-black border border-black px-1.5 py-0.5' : ''}>
              [{lead.entryType === 'RESEARCH_PAPER' ? dict.feed.researchBadge : dict.feed.newsBadge}]
            </span>
            {lead.arxivId && <span className="font-bold text-black">[{lead.arxivId}]</span>}
            {onToggleBookmark && (
              <>
                <span>//</span>
                <button
                  onClick={(e) => onToggleBookmark(lead.id, e)}
                  className={`hover:text-black cursor-pointer transition-colors ${
                    savedIdSet.has(lead.id) ? 'text-black font-bold' : 'text-black/50 hover:text-black'
                  }`}
                  title={savedIdSet.has(lead.id) ? 'Saved' : 'Save article'}
                >
                  [{savedIdSet.has(lead.id) ? <><span className="text-[#ff8000]">★</span> {dict.modal.saved}</> : dict.modal.save}]
                </button>
              </>
            )}
          </div>

          {(lead.aiSummary?.tldr || lead.contentSnippet) && (
            <p
              onClick={() => onSelectArticle(lead)}
              className="mt-5 text-sm sm:text-base text-black/75 font-sans max-w-3xl leading-relaxed line-clamp-4 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {(lead.aiSummary?.tldr || lead.contentSnippet).split(/\n{2,}/)[0]}
            </p>
          )}
        </div>

        {/* Secondary Story (Refined Headline, Image-free) */}
        {second && second.id !== lead.id && (
          <div className="pt-10 mt-10 border-t border-black/10">
            <div
              onClick={() => onSelectArticle(second)}
              className="cursor-pointer group max-w-5xl"
            >
              <div className="flex items-center justify-between gap-4 font-mono text-[9px] tracking-widest text-black/50 uppercase mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-black">[{second.source.name}]</span>
                  <span>//</span>
                  <span className="font-bold text-black">{dict.feed.lab} [{second.lab || 'FRONTIER'}]</span>
                  <span>//</span>
                  <span className={second.entryType === 'RESEARCH_PAPER' ? 'font-bold text-black border border-black px-1.5 py-0.5' : ''}>
                    [{second.entryType === 'RESEARCH_PAPER' ? dict.feed.researchBadge : dict.feed.newsBadge}]
                  </span>
                </div>
                {onToggleBookmark && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(second.id, e);
                    }}
                    className={`hover:text-black cursor-pointer transition-colors ${
                      savedIdSet.has(second.id) ? 'text-black font-bold' : 'text-black/50 hover:text-black'
                    }`}
                    title={savedIdSet.has(second.id) ? 'Saved' : 'Save article'}
                  >
                    [{savedIdSet.has(second.id) ? <><span className="text-[#ff8000]">★</span> {dict.modal.saved}</> : dict.modal.save}]
                  </button>
                )}
              </div>

              <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-[-0.035em] leading-[1.02] text-black group-hover:opacity-75 group-hover:translate-x-1 transition-all duration-300 break-words [overflow-wrap:anywhere]">
                {second.title}
              </h2>

              {(second.aiSummary?.tldr || second.contentSnippet) && (
                <p className="mt-3 text-sm text-black/70 font-sans max-w-3xl leading-relaxed line-clamp-3">
                  {(second.aiSummary?.tldr || second.contentSnippet).split(/\n{2,}/)[0]}
                </p>
              )}
            </div>
          </div>
        )}

      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: FEATURED DISPATCH (Refined Headline, Image-free)
      ───────────────────────────────────────────────────────────── */}
      {third && third.id !== lead.id && (!second || third.id !== second.id) && (
        <section className="relative py-12 lg:py-16 border-t border-black/10">

          <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-6">
            <span>{dict.feed.featuredDispatch}</span>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-black">[{third.source.name}]</span>
                <span>//</span>
                <span className="font-bold text-black">{dict.feed.lab} [{third.lab || 'FRONTIER'}]</span>
              </div>
              {onToggleBookmark && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(third.id, e);
                  }}
                  className={`hover:text-black cursor-pointer transition-colors ${
                    savedIdSet.has(third.id) ? 'text-black font-bold' : 'text-black/50 hover:text-black'
                  }`}
                  title={savedIdSet.has(third.id) ? 'Saved' : 'Save article'}
                >
                  [{savedIdSet.has(third.id) ? <><span className="text-[#ff8000]">★</span> {dict.modal.saved}</> : dict.modal.save}]
                </button>
              )}
            </div>

            <h2
              onClick={() => onSelectArticle(third)}
              className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-[-0.035em] leading-[1.02] text-black hover:opacity-75 hover:translate-x-1 transition-all duration-300 cursor-pointer mb-4 break-words [overflow-wrap:anywhere] max-w-5xl"
            >
              {third.title}
            </h2>

            <div className="font-mono text-[9px] tracking-widest text-black/50 uppercase flex flex-wrap items-center gap-3 mb-4">
              <span>{dict.modal.by} {third.author || third.source.name}</span>
              <span>//</span>
              <span className={third.entryType === 'RESEARCH_PAPER' ? 'font-bold text-black border border-black px-1.5 py-0.5' : ''}>
                [{third.entryType === 'RESEARCH_PAPER' ? dict.feed.researchBadge : dict.feed.newsBadge}]
              </span>
              {third.arxivId && <span className="font-bold text-black">[{third.arxivId}]</span>}
            </div>

            {(third.aiSummary?.tldr || third.contentSnippet) && (
              <p
                onClick={() => onSelectArticle(third)}
                className="text-sm text-black/70 font-sans max-w-3xl leading-relaxed line-clamp-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                {(third.aiSummary?.tldr || third.contentSnippet).split(/\n{2,}/)[0]}
              </p>
            )}
          </div>

        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: ARCHITECTURAL 3-COLUMN DISPATCH ARCHIVE (Image-free)
      ───────────────────────────────────────────────────────────── */}
      {archiveItems.length > 0 && (
        <section className="relative py-12 lg:py-16 border-t border-black/10">

          <div className="flex justify-between items-baseline font-mono text-[9px] tracking-widest text-black/50 uppercase mb-8">
            <span>{dict.feed.dispatchArchive}</span>
            <span>{dict.feed.curatedRadar}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
            {archiveItems.map((item, idx) => {
              const displayIdx = String(idx + 4).padStart(3, '0');
              const isItemSaved = savedIdSet.has(item.id);
              return (
                <div key={item.id} className="flex flex-col items-start w-full border-t border-black pt-4">
                  <ScrollReveal yOffset={25} delayMs={(idx + 1) * 50} className="w-full">
                    <div
                      onClick={() => onSelectArticle(item)}
                      className="w-full flex items-center justify-between gap-2.5 mb-3 cursor-pointer group font-mono text-[9px]"
                    >
                      <span className="font-bold tracking-widest text-black group-hover:underline">
                        [{displayIdx} // {item.source.name}]
                      </span>
                      <span className="tracking-wider text-black/50 uppercase">
                        [{item.lab || 'FRONTIER'}]
                      </span>
                    </div>

                    <h3
                      onClick={() => onSelectArticle(item)}
                      className="font-mono text-base sm:text-lg font-bold uppercase tracking-tight leading-snug cursor-pointer hover:opacity-70 transition-opacity break-words [overflow-wrap:anywhere] mb-3"
                    >
                      {item.title}
                    </h3>

                    {(item.aiSummary?.tldr || item.contentSnippet) && (
                      <p
                        onClick={() => onSelectArticle(item)}
                        className="font-sans text-xs text-black/70 leading-relaxed line-clamp-4 cursor-pointer mb-4"
                      >
                        {item.aiSummary?.tldr || item.contentSnippet}
                      </p>
                    )}

                    <div className="flex items-center justify-between font-mono text-[9px] text-black/40 uppercase pt-2 border-t border-black/10 w-full">
                      <span>{item.entryType === 'RESEARCH_PAPER' ? dict.feed.researchBadge : dict.feed.newsBadge}</span>
                      {onToggleBookmark && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBookmark(item.id, e);
                          }}
                          className={`hover:text-black cursor-pointer transition-colors ${
                            isItemSaved ? 'text-black font-bold' : 'text-black/40'
                          }`}
                        >
                          [{isItemSaved ? <span className="text-[#ff8000]">★</span> : dict.modal.save}]
                        </button>
                      )}
                    </div>
                  </ScrollReveal>
                </div>
              );
            })}
          </div>

        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: COMPLETE CATALOG (Image-free, Balanced Typography)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-16 lg:py-20 border-t border-black/10">

        <div className="flex justify-between items-baseline font-mono text-[10px] tracking-widest text-black/50 uppercase mb-8">
          <span className="font-bold text-black">CATALOG ARCHIVE</span>
          {isCatalogOpen && (
            <button
              onClick={() => setIsCatalogOpen(false)}
              className="text-black/40 hover:text-black cursor-pointer transition-colors"
            >
              [COLLAPSE ARCHIVE]
            </button>
          )}
        </div>

        {!isCatalogOpen ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest py-8">
            <span className="text-black/50">
              SHOWING <strong className="text-black">0</strong> OF <strong className="text-black">{articles.length}</strong> ARCHIVED ENTRIES
            </span>
            <button
              onClick={() => setIsCatalogOpen(true)}
              className="px-5 py-2.5 border border-black bg-white hover:bg-black hover:text-[#faf9f6] font-bold transition-all duration-300 hover:scale-[1.01] cursor-pointer"
            >
              [LOAD ARCHIVE (+{Math.min(CATALOG_PAGE_SIZE, articles.length)})]
            </button>
          </div>
        ) : (
          <div className="animate-fade-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
              {catalogSlice.map((art, idx) => (
                <div
                  key={`${art.id}_catalog_${idx}`}
                  onClick={() => onSelectArticle(art)}
                  className="group cursor-pointer flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 border-t border-black/10 pt-4"
                >
                  <div>
                    <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-2">
                      <span className="font-bold text-black group-hover:underline">[{art.source.name}]</span>
                      <span>[{art.lab || 'FRONTIER'}]</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black uppercase tracking-[-0.025em] leading-snug text-black group-hover:text-black/70 transition-colors line-clamp-3 mb-2.5">
                      {art.title}
                    </h3>

                    <p className="font-sans text-xs text-black/70 group-hover:text-black/90 transition-colors line-clamp-3 leading-relaxed antialiased">
                      {art.aiSummary?.tldr || art.contentSnippet || ''}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/5 flex justify-between items-center font-mono text-[9px] tracking-widest text-black/40 uppercase">
                    <div className="flex items-center gap-2 truncate">
                      <span className={art.entryType === 'RESEARCH_PAPER' ? 'font-bold text-black underline underline-offset-2' : ''}>
                        {art.entryType === 'RESEARCH_PAPER' ? dict.feed.researchBadge : dict.feed.newsBadge}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {onToggleBookmark && (
                        <button
                          onClick={(e) => onToggleBookmark(art.id, e)}
                          className={`hover:text-black cursor-pointer transition-colors ${
                            savedIdSet.has(art.id) ? 'text-black font-bold' : 'text-black/40'
                          }`}
                          title={savedIdSet.has(art.id) ? 'Saved' : 'Save article'}
                        >
                          [{savedIdSet.has(art.id) ? <span className="text-[#ff8000]">★</span> : dict.modal.save}]
                        </button>
                      )}
                      <span className="font-bold text-black flex items-center gap-1">
                        READ <span className="inline-block transition-transform duration-200 group-hover:translate-x-1.5">→</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {remainingCount > 0 && (
              <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest">
                <span className="text-black/50">
                  SHOWING <strong className="text-black">{catalogSlice.length}</strong> OF <strong className="text-black">{articles.length}</strong> ARCHIVED ENTRIES
                </span>
                <button
                  onClick={() => setVisibleCatalogCount((prev) => prev + CATALOG_PAGE_SIZE)}
                  className="px-5 py-2.5 border border-black bg-white hover:bg-black hover:text-[#faf9f6] font-bold transition-colors cursor-pointer"
                >
                  [LOAD MORE TELEMETRY (+{Math.min(CATALOG_PAGE_SIZE, remainingCount)})]
                </button>
              </div>
            )}
          </div>
        )}

      </section>

    </div>
  );
});

export default EditorialSpread;
