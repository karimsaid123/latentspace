'use client';

import React, { useState } from 'react';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';
import { ArrowUpRight, Sparkles, Bookmark, ExternalLink } from 'lucide-react';

interface EditorialSpreadProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
}

export default function EditorialSpread({
  articles,
  onSelectArticle,
  onToggleBookmark,
}: EditorialSpreadProps) {
  const [hoveredArticle, setHoveredArticle] = useState<Article | null>(null);

  if (!articles || articles.length === 0) return null;

  const lead = articles[0];
  const second = articles[1] || articles[0];
  const third = articles[2] || articles[0];
  const fourth = articles[3] || articles[0];
  const fifth = articles[4] || articles[0];
  const sixth = articles[5] || articles[0];

  return (
    <div className="relative w-full py-12 px-4 sm:px-8 max-w-[1600px] mx-auto select-none bg-hairline-grid">
      
      {/* ─────────────────────────────────────────────────────────────
          SPREAD SECTION 1: MONUMENTAL SWISS TYPOGRAPHY (Image 2 style)
          Juxtaposing massive bold uppercase headlines with micro art frames
      ───────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-black/15 dark:border-white/15 pb-24 mb-24">
        
        {/* Top Corner Meta */}
        <div className="flex justify-between items-start font-mono text-[9px] tracking-widest text-black/60 dark:text-white/60 uppercase mb-8">
          <div>
            <span>[SPREAD_01 // LOOKBOOK]</span>
            <span className="ml-4 font-bold text-black dark:text-white">EDITION.AI/2026</span>
          </div>
          <div className="text-right">
            <span>ISN'T IT PRETTY</span>
            <span className="block font-bold">BAAAD</span>
          </div>
        </div>

        {/* Lead Headline: Massive, tight, Swiss uppercase */}
        <div className="relative group mb-12">
          <div className="flex items-start justify-between gap-4">
            <h2
              onClick={() => onSelectArticle(lead)}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-[-0.04em] leading-[0.85] text-black dark:text-white hover:text-[#ff3b00] dark:hover:text-[#ff3b00] transition-colors cursor-pointer max-w-5xl"
            >
              {lead.title}
            </h2>

            {/* Micro tag right next to headline (Image 2 motif: 002) */}
            <span className="font-mono text-[10px] tracking-widest text-black/70 dark:text-white/70 uppercase shrink-0 pt-2">
              001 // {lead.source.name}
            </span>
          </div>

          {/* Editorial quote tag below header */}
          <div className="mt-4 flex items-center gap-3 font-mono text-[9px] tracking-widest text-black/50 dark:text-white/50 uppercase">
            <span>0.2-FROM {lead.author || lead.source.name}</span>
            <span>▪</span>
            <span>"{lead.category}"</span>
            <span>▪</span>
            <span>IMPACT: {lead.aiSummary.impact}</span>
          </div>
        </div>

        {/* Nested Art Frame + Secondary Typographic Composition */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-6">
          
          {/* Small thumbnail art with 4 corner bounding box handles (Direct match to user image 2) */}
          <div className="md:col-span-3">
            <div 
              onClick={() => onSelectArticle(lead)} 
              className="cursor-pointer max-w-[220px]"
            >
              <ArtFrame
                src={lead.imageUrl}
                alt={lead.title}
                indexCode="001"
                subTag="0.1 PSYCHO"
                aspect="portrait"
              />
            </div>

            <div className="mt-8 font-mono text-[9px] leading-relaxed tracking-wider text-black/60 dark:text-white/60 uppercase">
              <p className="mb-2 font-bold text-black dark:text-white">
                "AI TL;DR SPECIMEN"
              </p>
              <p className="line-clamp-4">
                {lead.aiSummary.tldr}
              </p>
            </div>
          </div>

          {/* Secondary Massive Typographic Block (Inspired by Baudelaire poem layout in Image 2) */}
          <div className="md:col-span-9 flex flex-col justify-between pl-0 md:pl-12">
            
            <div className="group cursor-pointer mb-12" onClick={() => onSelectArticle(second)}>
              <span className="font-mono text-[9px] tracking-widest text-black/50 dark:text-white/50 uppercase block mb-2">
                0.1 PSYCHO // {second.source.name}
              </span>
              <h3 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-[-0.04em] leading-[0.88] text-black dark:text-white group-hover:text-[#ff3b00] dark:group-hover:text-[#ff3b00] transition-colors">
                {second.title}
              </h3>
              <p className="mt-4 font-mono text-[11px] text-black/70 dark:text-white/70 uppercase tracking-wider max-w-2xl line-clamp-2">
                {second.aiSummary.tldr}
              </p>
            </div>

            {/* Bottom Right Art specimen */}
            <div className="flex justify-end items-end gap-6 pt-6">
              <div className="text-right font-mono text-[9px] tracking-widest text-black/50 dark:text-white/50 uppercase max-w-xs hidden sm:block">
                <span>JUST GIBBERISH TO BALANCE THE STRUCTURE OF THE NICE LAYOUT</span>
              </div>
              <div 
                onClick={() => onSelectArticle(second)}
                className="cursor-pointer w-28 sm:w-36"
              >
                <ArtFrame
                  src={second.imageUrl}
                  alt={second.title}
                  indexCode="002"
                  subTag="SPECIMEN"
                  aspect="portrait"
                />
              </div>
            </div>

          </div>

        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          SPREAD SECTION 2: VERTICAL SWISS TYPOGRAPHY & ART STACK (Image 3 style)
          Writing-mode vertical text running alongside stacked art specimens
      ───────────────────────────────────────────────────────────── */}
      <section className="relative border-b border-black/15 dark:border-white/15 pb-24 mb-24">
        
        {/* Top labels */}
        <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/60 dark:text-white/60 uppercase mb-8">
          <span>002 // MY BROTHER IN CHRIST SHUT UP</span>
          <span>ISN'T IT PRETTY BAAAD</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Stack of 3 Art Specimen Thumbnails (Direct match to Image 3) */}
          <div className="md:col-span-4 flex flex-col gap-10">
            {[third, fourth, fifth].map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => onSelectArticle(item)}
                className="group cursor-pointer flex gap-4 items-start"
              >
                <div className="w-24 sm:w-28 shrink-0">
                  <ArtFrame
                    src={item.imageUrl}
                    alt={item.title}
                    indexCode={`00${idx + 3}`}
                    subTag="0.1 PSYCHO"
                    aspect="portrait"
                  />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider">
                  <span className="text-black/50 dark:text-white/50 block mb-1">
                    [{item.source.name}]
                  </span>
                  <h4 className="font-bold text-xs leading-tight text-black dark:text-white group-hover:text-[#ff3b00] transition-colors line-clamp-3">
                    {item.title}
                  </h4>
                  <span className="text-[9px] text-[#ff3b00] mt-2 block font-bold">
                    → READ SPECIMEN
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Monumental Vertical & Horizontal Monolith (Image 3) */}
          <div className="md:col-span-8 flex flex-col justify-between h-full pl-0 md:pl-10">
            
            <div className="border-l-2 border-black dark:border-white pl-6 md:pl-10">
              <span className="font-mono text-[9px] tracking-widest text-black/50 dark:text-white/50 uppercase block mb-3">
                [0.1 COGNITION // FRONTIER MODELING]
              </span>
              <h2
                onClick={() => onSelectArticle(third)}
                className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[-0.04em] leading-[0.88] text-black dark:text-white hover:text-[#ff3b00] transition-colors cursor-pointer"
              >
                {third.title}
              </h2>

              <div className="mt-8 p-6 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-mono text-xs">
                <div className="flex items-center gap-2 font-bold uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff3b00]" />
                  <span>"EXECUTIVE AI BRIEF"</span>
                </div>
                <p className="text-black/80 dark:text-white/80 leading-relaxed uppercase">
                  {third.aiSummary.tldr}
                </p>
                <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-4 text-[10px] text-black/60 dark:text-white/60">
                  <span>SOURCE: {third.source.name}</span>
                  <span>CATEGORY: {third.category}</span>
                  <span>TIME: {third.aiSummary.readTimeMinutes} MIN</span>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-between items-end font-mono text-[9px] tracking-widest text-black/60 dark:text-white/60 uppercase">
              <span>OR MAYBE IT'S GOOD PARIS TO HONGKONG AND THEN DEN</span>
              <span className="font-bold text-black dark:text-white">[END_SECTION_02]</span>
            </div>

          </div>

        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          SPREAD SECTION 3: SCATTERED MINIMALIST EDITORIAL (Image 1 style)
          Harmonious scattered composition with provocative annotations
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pb-24">
        
        {/* Horizontal hairline guide lines */}
        <div className="w-full border-t border-black/10 dark:border-white/10 my-12" />

        <div className="relative min-h-[700px] w-full">
          
          {/* Top Left Item */}
          <div className="absolute top-0 left-4 sm:left-12 max-w-xs">
            <span className="font-mono text-[9px] tracking-widest text-black/50 dark:text-white/50 block mb-2">
              002
            </span>
            <div 
              onClick={() => onSelectArticle(fourth)}
              className="w-28 sm:w-36 cursor-pointer mb-3"
            >
              <ArtFrame
                src={fourth.imageUrl}
                alt={fourth.title}
                indexCode="004"
                subTag="0.1 PSYCHO"
                aspect="portrait"
              />
            </div>
          </div>

          {/* Top Center-Right Annotation (Image 1 style) */}
          <div className="absolute top-8 left-1/3 max-w-[200px] font-mono text-[9px] tracking-widest text-black/70 dark:text-white/70 uppercase leading-relaxed hidden sm:block">
            <span>JUST GIBBERISH TO BALANCE THE STRUCTURE OF THE NICE LAYOUT</span>
          </div>

          {/* Middle Center Item */}
          <div className="absolute top-56 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div 
              onClick={() => onSelectArticle(fifth)}
              className="w-32 sm:w-44 cursor-pointer"
            >
              <ArtFrame
                src={fifth.imageUrl}
                alt={fifth.title}
                indexCode="005"
                subTag="SPECIMEN"
                aspect="portrait"
              />
            </div>
            <div 
              onClick={() => onSelectArticle(fifth)}
              className="mt-4 font-mono text-[10px] text-center max-w-sm cursor-pointer uppercase font-bold hover:text-[#ff3b00] transition-colors"
            >
              {fifth.title}
            </div>
          </div>

          {/* Middle Right Annotation */}
          <div className="absolute top-64 right-8 font-mono text-[9px] tracking-widest text-black/70 dark:text-white/70 uppercase">
            <span>0.1 PSYCHO</span>
          </div>

          {/* Lower Left Annotation */}
          <div className="absolute bottom-40 left-4 font-mono text-[9px] tracking-widest text-black/70 dark:text-white/70 uppercase max-w-[180px] leading-normal hidden md:block">
            <span>OR MAYBE IT'S GOOD PARIS TO HONGKONG AND THEN DEN</span>
          </div>

          {/* Lower Center Annotation */}
          <div className="absolute bottom-32 left-1/3 font-mono text-[9px] tracking-widest text-black/70 dark:text-white/70 uppercase">
            <span>MY BROTHER IN CHRIST SHUT UP</span>
          </div>

          {/* Lower Right Item */}
          <div className="absolute bottom-16 right-8 sm:right-16">
            <div 
              onClick={() => onSelectArticle(sixth)}
              className="w-28 sm:w-36 cursor-pointer mb-2"
            >
              <ArtFrame
                src={sixth.imageUrl}
                alt={sixth.title}
                indexCode="006"
                subTag="0.1 PSYCHO"
                aspect="portrait"
              />
            </div>
            <div 
              onClick={() => onSelectArticle(sixth)}
              className="font-mono text-[9px] uppercase font-bold max-w-[160px] hover:text-[#ff3b00] cursor-pointer"
            >
              {sixth.title.slice(0, 50)}...
            </div>
          </div>

        </div>

        {/* Bottom divider with final quote */}
        <div className="w-full border-t border-black/10 dark:border-white/10 pt-6 flex justify-between font-mono text-[9px] tracking-widest text-black/50 dark:text-white/50 uppercase">
          <span>PARIS TO SAN FRANCISCO // VIRGIL-STYLE AUTONOMOUS NEWSPAPER</span>
          <span>JUST GIBBERISH TO BALANCE THE STRUCTURE OF THE NICE LAYOUT</span>
        </div>

      </section>

    </div>
  );
}
