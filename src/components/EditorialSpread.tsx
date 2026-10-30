'use client';

import React, { useState, useMemo, useEffect, memo } from 'react';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';
import ScrollReveal from './ScrollReveal';

const CATALOG_PAGE_SIZE = 24;

interface EditorialSpreadProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  bookmarkedIds?: string[];
  onToggleBookmark?: (id: string, e: React.MouseEvent) => void;
  onSelectLab?: (lab: string) => void;
}

const LAB_SECTORS = [
  { id: 'OpenAI', name: 'OPENAI', short: 'OPENAI' },
  { id: 'Google DeepMind', name: 'DEEPMIND', short: 'DEEPMIND' },
  { id: 'Anthropic', name: 'ANTHROPIC', short: 'ANTHROPIC' },
  { id: 'SpaceX & xAI', name: 'SPACEX & xAI', short: 'xAI' },
  { id: 'Mistral AI', name: 'MISTRAL AI', short: 'MISTRAL' },
  { id: 'Moonshot AI', name: 'MOONSHOT AI & KIMI', short: 'KIMI' },
  { id: 'Meta AI', name: 'META AI', short: 'META' },
  { id: 'NVIDIA', name: 'NVIDIA', short: 'NVIDIA' },
];

const EditorialSpread = memo(function EditorialSpread({
  articles,
  onSelectArticle,
  bookmarkedIds = [],
  onToggleBookmark,
  onSelectLab,
}: EditorialSpreadProps) {
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(CATALOG_PAGE_SIZE);

  // Reset pagination whenever the article list identity changes
  useEffect(() => {
    setVisibleCatalogCount(CATALOG_PAGE_SIZE);
  }, [articles]);

  const savedIdSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  // Single O(N) pass to group articles by lab sector instead of 8 repeated filters per render
  const articlesByLab = useMemo(() => {
    const grouped: Record<string, Article[]> = {};
    for (const a of articles || []) {
      const lab = a.lab || 'Independent';
      if (!grouped[lab]) grouped[lab] = [];
      grouped[lab].push(a);
    }
    return grouped;
  }, [articles]);

  if (!articles || articles.length === 0) return null;

  const lead = articles[0];
  const second = articles[1] || articles[0];
  const third = articles[2] || articles[0];
  const fourth = articles[3] || articles[0];
  const fifth = articles[4] || articles[0];
  const sixth = articles[5] || articles[0];
  const catalogSlice = articles.slice(0, visibleCatalogCount);
  const remainingCount = Math.max(0, articles.length - visibleCatalogCount);

  return (
    <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-12 py-8 select-none">
      
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: MONUMENTAL SWISS HEADLINES (Image 2 style)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-6 pb-28 border-b border-black/10 animate-fade-up">
        
        {/* Lead Giant Headline */}
        <div className="relative mb-14">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
            <h1
              onClick={() => onSelectArticle(lead)}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-[-0.05em] leading-[0.82] text-black hover:opacity-75 hover:translate-x-1 transition-all duration-300 cursor-pointer max-w-6xl"
            >
              {lead.title}
            </h1>
            
            <div className="font-mono text-[9px] tracking-widest text-black/50 uppercase shrink-0 pt-3">
              <span>[{lead.source.name}]</span>
            </div>
          </div>

          <div className="mt-4 font-mono text-[9px] tracking-widest text-black/50 uppercase flex flex-wrap items-center gap-3">
            <span>BY {lead.author || lead.source.name}</span>
            <span>//</span>
            <span className="font-bold text-black">LAB: [{lead.lab || 'FRONTIER'}]</span>
            <span>//</span>
            <span className={lead.entryType === 'RESEARCH_PAPER' ? 'font-bold text-black border border-black px-1.5 py-0.5' : ''}>
              [{lead.entryType === 'RESEARCH_PAPER' ? 'RESEARCH' : 'NEWS'}]
            </span>
            {lead.arxivId && <span className="font-bold text-black">[{lead.arxivId}]</span>}
            {onToggleBookmark && (
              <>
                <span>//</span>
                <button
                  onClick={(e) => onToggleBookmark(lead.id, e)}
                  className={`hover:text-black cursor-pointer transition-colors ${
                    bookmarkedIds.includes(lead.id) ? 'text-black font-bold' : 'text-black/50 hover:text-black'
                  }`}
                  title={bookmarkedIds.includes(lead.id) ? 'Saved' : 'Save article'}
                >
                  [{bookmarkedIds.includes(lead.id) ? <><span className="text-yellow-500">★</span> SAVED</> : '+ SAVE'}]
                </button>
              </>
            )}
          </div>
        </div>

        {/* Nested Art Frame + Secondary Giant Swiss Headline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-6">
          
          {/* Small thumbnail art with 4 corner black handles */}
          <div className="lg:col-span-3">
            <div 
              onClick={() => onSelectArticle(lead)}
              className="cursor-pointer max-w-[180px] sm:max-w-[210px]"
            >
              <ArtFrame
                src={lead.imageUrl}
                alt={lead.title}
                indexCode="001"
                aspect="portrait"
                priority
              />
            </div>
          </div>

          {/* Secondary Giant Swiss Headline */}
          <div className="lg:col-span-9 flex flex-col justify-between pl-0 lg:pl-8">
            <div 
              onClick={() => onSelectArticle(second)}
              className="cursor-pointer mb-10 group"
            >
              <div className="flex items-center justify-between gap-4 font-mono text-[9px] tracking-widest text-black/50 uppercase mb-2">
                <span>[{second.source.name}]</span>
                {onToggleBookmark && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(second.id, e);
                    }}
                    className={`hover:text-black cursor-pointer transition-colors ${
                      bookmarkedIds.includes(second.id) ? 'text-black font-bold' : 'text-black/50 hover:text-black'
                    }`}
                    title={bookmarkedIds.includes(second.id) ? 'Saved' : 'Save article'}
                  >
                    [{bookmarkedIds.includes(second.id) ? <><span className="text-yellow-500">★</span> SAVED</> : '+ SAVE'}]
                  </button>
                )}
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-[-0.045em] leading-[0.84] text-black group-hover:opacity-75 group-hover:translate-x-1 transition-all duration-300">
                {second.title}
              </h2>
            </div>

            {/* Bottom Right Art Block */}
            <div className="flex justify-end items-end pt-4">
              <div 
                onClick={() => onSelectArticle(second)}
                className="cursor-pointer w-28 sm:w-36 shrink-0"
              >
                <ArtFrame
                  src={second.imageUrl}
                  alt={second.title}
                  indexCode="002"
                  aspect="portrait"
                />
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL TELEMETRY TICKER MARQUEE (Infinite smooth scroll)
      ───────────────────────────────────────────────────────────── */}
      <div className="w-full overflow-hidden border-b border-black py-3 select-none bg-[#faf9f6]">
        <div className="animate-marquee font-mono text-[10px] tracking-[0.22em] uppercase font-bold text-black flex items-center gap-10 whitespace-nowrap">
          <span>LATENT SPACE // AUTONOMOUS AI TELEMETRY</span>
          <span className="text-black/30">▪</span>
          <span>NEURAL ARCHITECTURE // REAL-TIME HARVEST</span>
          <span className="text-black/30">▪</span>
          <span>FRONTIER WEIGHTS // MULTIMODAL INFERENCE</span>
          <span className="text-black/30">▪</span>
          <span>ZERO-LATENCY INGESTION // GLOBAL NETWORK</span>
          <span className="text-black/30">▪</span>
          <span>LATENT SPACE // AUTONOMOUS AI TELEMETRY</span>
          <span className="text-black/30">▪</span>
          <span>NEURAL ARCHITECTURE // REAL-TIME HARVEST</span>
          <span className="text-black/30">▪</span>
          <span>FRONTIER WEIGHTS // MULTIMODAL INFERENCE</span>
          <span className="text-black/30">▪</span>
          <span>ZERO-LATENCY INGESTION // GLOBAL NETWORK</span>
          <span className="text-black/30">▪</span>
        </div>
      </div>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: MONUMENTAL SWISS TYPOGRAPHY DISPATCH
      ───────────────────────────────────────────────────────────── */}
      <section className="relative py-16 lg:py-20">
        
        <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-8">
          <span>FEATURED DISPATCH</span>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-black">[{third.source.name}]</span>
              <span>//</span>
              <span className="font-bold text-black">LAB: [{third.lab || 'FRONTIER'}]</span>
            </div>
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(third.id, e);
                }}
                className={`hover:text-black cursor-pointer transition-colors ${
                  bookmarkedIds.includes(third.id) ? 'text-black font-bold' : 'text-black/50 hover:text-black'
                }`}
                title={bookmarkedIds.includes(third.id) ? 'Saved' : 'Save article'}
              >
                [{bookmarkedIds.includes(third.id) ? <><span className="text-yellow-500">★</span> SAVED</> : '+ SAVE'}]
              </button>
            )}
          </div>

          <h2
            onClick={() => onSelectArticle(third)}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-[-0.045em] leading-[0.84] text-black hover:opacity-75 transition-opacity cursor-pointer mb-8"
          >
            {third.title}
          </h2>

          <div className="font-mono text-[9px] tracking-widest text-black/50 uppercase flex flex-wrap items-center gap-3">
            <span>BY {third.author || third.source.name}</span>
            <span>//</span>
            <span className={third.entryType === 'RESEARCH_PAPER' ? 'font-bold text-black border border-black px-1.5 py-0.5' : ''}>
              [{third.entryType === 'RESEARCH_PAPER' ? 'RESEARCH' : 'NEWS'}]
            </span>
            {third.arxivId && <span className="font-bold text-black">[{third.arxivId}]</span>}
          </div>
        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: ARCHITECTURAL 3-COLUMN EDITORIAL GALLERY SPREAD
      ───────────────────────────────────────────────────────────── */}
      <section className="relative py-16 lg:py-20">
        
        {/* Top Header of Section 3 */}
        <div className="flex justify-between items-baseline font-mono text-[9px] tracking-widest text-black/50 uppercase mb-8">
          <span>GALLERY ARCHIVE</span>
        </div>

        {/* 3-Column Swiss Grid with Clean Spacing (no dividing lines) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 items-start">
          
          {/* ─── COLUMN 1: LEFT (004) ─── */}
          <div className="flex flex-col items-start w-full">
            <ScrollReveal yOffset={45} parallaxSpeed={0.04} delayMs={50} className="w-full">
              
              {/* Large ArtFrame */}
              <div 
                onClick={() => onSelectArticle(fourth)}
                className="w-full max-w-[380px] cursor-pointer"
              >
                <ArtFrame
                  src={fourth.imageUrl}
                  alt={fourth.title}
                  indexCode="004"
                  aspect="portrait"
                  className="w-full"
                />
              </div>

              {/* Source & Lab Metadata Line */}
              <div 
                onClick={() => onSelectArticle(fourth)}
                className="w-full max-w-[380px] flex items-center justify-between gap-2.5 my-3 cursor-pointer group"
                title={fourth.title}
              >
                <span className="font-mono text-[9px] font-bold tracking-widest text-black shrink-0 group-hover:underline">
                  [{fourth.source.name}]
                </span>
                <span className="font-mono text-[9px] tracking-wider text-black/50 uppercase">
                  [{fourth.lab || 'FRONTIER'}]
                </span>
              </div>

              {/* Article Headline */}
              <h3 
                onClick={() => onSelectArticle(fourth)}
                className="font-mono text-sm sm:text-base md:text-lg font-bold uppercase tracking-tight leading-snug cursor-pointer hover:opacity-70 transition-opacity max-w-[380px]"
              >
                {fourth.title}
              </h3>
            </ScrollReveal>
          </div>

          {/* ─── COLUMN 2: CENTER (005) ─── */}
          <div className="flex flex-col items-center w-full">
            <ScrollReveal yOffset={55} parallaxSpeed={-0.03} delayMs={100} className="w-full flex flex-col items-center">
              
              {/* Hero Large Center ArtFrame */}
              <div 
                onClick={() => onSelectArticle(fifth)}
                className="w-full max-w-[450px] cursor-pointer"
              >
                <ArtFrame
                  src={fifth.imageUrl}
                  alt={fifth.title}
                  indexCode="005"
                  aspect="portrait"
                  className="w-full"
                />
              </div>

              {/* Source & Lab Metadata Line */}
              <div 
                onClick={() => onSelectArticle(fifth)}
                className="w-full max-w-[450px] flex items-center justify-between gap-2.5 my-3 cursor-pointer group"
                title={fifth.title}
              >
                <span className="font-mono text-[9px] font-bold tracking-widest text-black shrink-0 group-hover:underline">
                  [{fifth.source.name}]
                </span>
                <span className="font-mono text-[9px] tracking-wider text-black/50 uppercase">
                  [{fifth.lab || 'FRONTIER'}]
                </span>
              </div>

              {/* Giant Center Headline */}
              <h3 
                onClick={() => onSelectArticle(fifth)}
                className="font-mono text-base sm:text-lg md:text-xl font-black uppercase tracking-tight leading-tight cursor-pointer hover:opacity-70 transition-opacity max-w-[450px] text-center"
              >
                {fifth.title}
              </h3>
            </ScrollReveal>
          </div>

          {/* ─── COLUMN 3: RIGHT (006) ─── */}
          <div className="flex flex-col items-start lg:items-end w-full">
            <ScrollReveal yOffset={45} parallaxSpeed={0.05} delayMs={150} className="w-full flex flex-col items-start lg:items-end">
              
              {/* Large ArtFrame */}
              <div 
                onClick={() => onSelectArticle(sixth)}
                className="w-full max-w-[380px] cursor-pointer"
              >
                <ArtFrame
                  src={sixth.imageUrl}
                  alt={sixth.title}
                  indexCode="006"
                  aspect="portrait"
                  className="w-full"
                />
              </div>

              {/* Source & Lab Metadata Line */}
              <div 
                onClick={() => onSelectArticle(sixth)}
                className="w-full max-w-[380px] flex items-center justify-between gap-2.5 my-3 cursor-pointer group"
                title={sixth.title}
              >
                <span className="font-mono text-[9px] font-bold tracking-widest text-black shrink-0 group-hover:underline">
                  [{sixth.source.name}]
                </span>
                <span className="font-mono text-[9px] tracking-wider text-black/50 uppercase">
                  [{sixth.lab || 'FRONTIER'}]
                </span>
              </div>

              {/* Article Headline */}
              <h3 
                onClick={() => onSelectArticle(sixth)}
                className="font-mono text-sm sm:text-base md:text-lg font-bold uppercase tracking-tight leading-snug cursor-pointer hover:opacity-70 transition-opacity max-w-[380px] text-left lg:text-right"
              >
                {sixth.title}
              </h3>
            </ScrollReveal>
          </div>

        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION: FRONTIER LABS INTELLIGENCE DOSSIER (Dedicated Lab Sections)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative py-20 lg:py-24">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline font-mono text-[10px] tracking-widest text-black/50 uppercase mb-12 gap-2">
          <div>
            <span className="font-bold text-black text-sm">FRONTIER LABS // INTELLIGENCE DOSSIERS</span>
            <span className="ml-3 text-[9px] text-black/40">DEDICATED RESEARCH SECTORS</span>
          </div>
          <span>ACTIVE MONITORING: 8 ENTERPRISE CLUSTERS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {LAB_SECTORS.map((lab, idx) => {
            const labArticles = articlesByLab[lab.id] || [];
            const leadArt = labArticles[0];

            return (
              <ScrollReveal
                key={lab.id}
                delayMs={(idx % 4) * 80}
                yOffset={35}
                className="h-full"
              >
                <div 
                  className="border border-black p-6 sm:p-8 flex flex-col justify-between bg-[#faf9f6] relative group hover:shadow-xl transition-all duration-300 h-full"
                >
                  <div>
                    <div className="flex justify-between items-baseline font-mono text-[9px] tracking-widest text-black/40 uppercase mb-4">
                      <span className="font-bold text-black">[DOSSIER]</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-[-0.04em] text-black leading-none mb-6 group-hover:translate-x-1 transition-transform">
                      {lab.name}
                    </h3>

                    {leadArt ? (
                      <div className="mb-6">
                        <div 
                          onClick={() => onSelectArticle(leadArt)}
                          className="cursor-pointer mb-3"
                        >
                          <ArtFrame
                            src={leadArt.imageUrl}
                            alt={leadArt.title}
                            indexCode={`LAB_00${idx + 1}`}
                            aspect="landscape"
                          />
                        </div>

                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 
                            onClick={() => onSelectArticle(leadArt)}
                            className="text-base sm:text-lg font-black uppercase tracking-tight text-black line-clamp-2 hover:opacity-75 transition-opacity cursor-pointer flex-1"
                          >
                            {leadArt.title}
                          </h4>
                          {onToggleBookmark && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleBookmark(leadArt.id, e);
                              }}
                              className={`shrink-0 font-mono text-[9px] hover:text-black cursor-pointer transition-colors pt-1 ${
                                bookmarkedIds.includes(leadArt.id) ? 'text-black font-bold' : 'text-black/40'
                              }`}
                              title={bookmarkedIds.includes(leadArt.id) ? 'Saved' : 'Save article'}
                            >
                              [{bookmarkedIds.includes(leadArt.id) ? <span className="text-yellow-500">★</span> : '+ SAVE'}]
                            </button>
                          )}
                        </div>

                        <p className="font-mono text-[9px] uppercase text-black/60 line-clamp-2 leading-relaxed">
                          {leadArt.aiSummary?.tldr || leadArt.contentSnippet}
                        </p>
                      </div>
                    ) : (
                      <div className="py-12 text-center font-mono text-[9px] tracking-widest text-black/40 uppercase">
                        NO DIRECT TELEMETRY IN CURRENT CYCLE
                      </div>
                    )}

                    {/* Secondary Lab Headlines */}
                    {labArticles.slice(1, 3).length > 0 && (
                      <div className="space-y-2.5 pt-4 font-mono text-[9px]">
                        {labArticles.slice(1, 3).map((art, aIdx) => (
                          <div
                            key={`${art.id}_lab_${aIdx}`}
                            onClick={() => onSelectArticle(art)}
                            className="flex items-start gap-2 text-black/70 hover:text-black cursor-pointer uppercase truncate group/link"
                          >
                            <span className="font-bold text-black shrink-0 group-hover/link:translate-x-0.5 transition-transform">→</span>
                            <span className="truncate">{art.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-between items-center font-mono text-[9px]">
                    <span className="text-black/40 uppercase">STATUS: LIVE RADAR</span>
                    {onSelectLab && (
                      <button
                        onClick={() => onSelectLab(lab.id)}
                        className="font-bold uppercase text-black hover:underline underline-offset-4 cursor-pointer"
                      >
                        VIEW ALL {lab.short} →
                      </button>
                    )}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: COMPLETE CATALOG (Browse all AI articles)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 lg:py-24">
        
        <div className="flex justify-between items-baseline font-mono text-[10px] tracking-widest text-black/50 uppercase mb-12">
          <span className="font-bold text-black">CATALOG ARCHIVE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {catalogSlice.map((art, idx) => (
            <div
              key={`${art.id}_catalog_${idx}`}
              onClick={() => onSelectArticle(art)}
              className="group cursor-pointer flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-3">
                  <span className="font-bold text-black group-hover:underline">[{art.source.name}]</span>
                </div>

                <div className="mb-4">
                  <ArtFrame
                    src={art.imageUrl}
                    alt={art.title}
                    indexCode={`REF_${(idx + 1).toString().padStart(3, '0')}`}
                    aspect="landscape"
                  />
                </div>

                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-[-0.035em] leading-[0.88] text-black group-hover:text-black/70 transition-colors line-clamp-3 mb-3">
                  {art.title}
                </h3>

                <p className="font-mono text-[10px] uppercase text-black/60 group-hover:text-black/90 transition-colors line-clamp-2 leading-relaxed">
                  {art.aiSummary?.tldr || art.contentSnippet || ''}
                </p>
              </div>

              <div className="mt-4 flex justify-between items-center font-mono text-[9px] tracking-widest text-black/40 uppercase">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-black">[{art.lab || 'FRONTIER'}]</span>
                  <span className="text-black/30">•</span>
                  <span className={art.entryType === 'RESEARCH_PAPER' ? 'font-bold text-black underline underline-offset-2' : ''}>
                    {art.entryType === 'RESEARCH_PAPER' ? 'RESEARCH' : 'NEWS'}
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
                      [{savedIdSet.has(art.id) ? <span className="text-yellow-500">★</span> : '+ SAVE'}]
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
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest">
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

      </section>

    </div>
  );
});

export default EditorialSpread;
