'use client';

import React from 'react';
import { Article } from '@/types';
import ArtFrame from './ArtFrame';

interface EditorialSpreadProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export default function EditorialSpread({
  articles,
  onSelectArticle,
}: EditorialSpreadProps) {
  if (!articles || articles.length === 0) return null;

  const lead = articles[0];
  const second = articles[1] || articles[0];
  const third = articles[2] || articles[0];
  const fourth = articles[3] || articles[0];
  const fifth = articles[4] || articles[0];
  const sixth = articles[5] || articles[0];

  return (
    <div className="w-full max-w-[1700px] mx-auto px-6 sm:px-12 py-8 select-none">
      
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: MONUMENTAL SWISS HEADLINES (Image 2 exact match)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-6 pb-28 border-b border-black/10">
        
        {/* Top Right micro quote */}
        <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-8">
          <span>002</span>
          <span>ISN'T IT PRETTY BAAAD</span>
        </div>

        {/* Lead Giant Headline */}
        <div className="relative mb-14">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
            <h1
              onClick={() => onSelectArticle(lead)}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black uppercase tracking-[-0.05em] leading-[0.82] text-black hover:opacity-75 transition-opacity cursor-pointer max-w-6xl"
            >
              {lead.title}
            </h1>
            
            <div className="font-mono text-[9px] tracking-widest text-black/50 uppercase shrink-0 pt-3">
              <span>001</span><br />
              <span>[{lead.source.name}]</span>
            </div>
          </div>

          <div className="mt-4 font-mono text-[9px] tracking-widest text-black/50 uppercase">
            <span>0.2-FROM {lead.author || lead.source.name}</span>
          </div>
        </div>

        {/* Nested Art Frame + Secondary Massive Headline (Baudelaire composition) */}
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
                subTag="0.1 PSYCHO"
                aspect="portrait"
              />
            </div>
          </div>

          {/* Secondary Giant Swiss Headline */}
          <div className="lg:col-span-9 flex flex-col justify-between pl-0 lg:pl-8">
            <div 
              onClick={() => onSelectArticle(second)}
              className="cursor-pointer mb-10"
            >
              <span className="font-mono text-[9px] tracking-widest text-black/50 uppercase block mb-2">
                0.1 PSYCHO // [{second.source.name}]
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-[-0.045em] leading-[0.84] text-black hover:opacity-75 transition-opacity">
                {second.title}
              </h2>
            </div>

            {/* Bottom Right Art specimen */}
            <div className="flex justify-end items-end gap-6 pt-4">
              <span className="font-mono text-[9px] tracking-widest text-black/50 uppercase max-w-[180px] text-right hidden sm:block">
                JUST GIBBERISH TO BALANCE THE STRUCTURE OF THE NICE LAYOUT
              </span>
              <div 
                onClick={() => onSelectArticle(second)}
                className="cursor-pointer w-28 sm:w-36 shrink-0"
              >
                <ArtFrame
                  src={second.imageUrl}
                  alt={second.title}
                  indexCode="002"
                  subTag="0.1 PSYCHO"
                  aspect="portrait"
                />
              </div>
            </div>
          </div>

        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: VERTICAL SWISS TYPOGRAPHY & ART STACK (Image 3 exact match)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative py-28 border-b border-black/10">
        
        <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-8">
          <span>MY BROTHER IN CHRIST SHUT UP</span>
          <span>ISN'T IT PRETTY BAAAD</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Stack of 3 Art Thumbnail Frames (Image 3) */}
          <div className="lg:col-span-3 flex flex-col gap-10">
            {[third, fourth, fifth].map((item, idx) => (
              <div 
                key={item.id} 
                onClick={() => onSelectArticle(item)}
                className="cursor-pointer max-w-[160px] sm:max-w-[190px]"
              >
                <ArtFrame
                  src={item.imageUrl}
                  alt={item.title}
                  indexCode={`00${idx + 3}`}
                  subTag="0.1 PSYCHO"
                  aspect="portrait"
                />
                <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-black/60 truncate">
                  [{item.source.name}]
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Giant Horizontal & Sideways Typography */}
          <div className="lg:col-span-9 flex flex-col justify-between h-full pl-0 lg:pl-10">
            <div>
              <span className="font-mono text-[9px] tracking-widest text-black/50 uppercase block mb-3">
                0.1 PSYCHO // 0.2-FROM COGNITIVE INTELLIGENCE
              </span>
              <h2
                onClick={() => onSelectArticle(third)}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-[-0.045em] leading-[0.84] text-black hover:opacity-75 transition-opacity cursor-pointer mb-8"
              >
                {third.title}
              </h2>
            </div>

            <div className="mt-12 flex justify-between items-end font-mono text-[9px] tracking-widest text-black/50 uppercase">
              <span>OR MAYBE IT'S GOOD PARIS TO HONGKONG AND THEN DEN</span>
              <span>0.1 PSYCHO</span>
            </div>
          </div>

        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 3: SCATTERED EDITORIAL GALLERY SPREAD (Image 1 exact match)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative py-28 border-b border-black/10">
        
        <div className="relative min-h-[750px] w-full">
          
          {/* Top Left Specimen */}
          <div className="absolute top-0 left-0 sm:left-6">
            <span className="font-mono text-[9px] tracking-widest text-black/50 block mb-2">
              002
            </span>
            <div 
              onClick={() => onSelectArticle(fourth)}
              className="w-28 sm:w-36 cursor-pointer"
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

          {/* Top Center-Right Micro Annotation */}
          <div className="absolute top-8 left-1/3 max-w-[200px] font-mono text-[9px] tracking-widest text-black uppercase leading-relaxed hidden sm:block">
            <span>JUST GIBBERISH TO BALANCE THE STRUCTURE OF THE NICE LAYOUT</span>
          </div>

          {/* Middle Center Specimen */}
          <div className="absolute top-64 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div 
              onClick={() => onSelectArticle(fifth)}
              className="w-32 sm:w-44 cursor-pointer"
            >
              <ArtFrame
                src={fifth.imageUrl}
                alt={fifth.title}
                indexCode="005"
                subTag="0.1 PSYCHO"
                aspect="portrait"
              />
            </div>
            <div 
              onClick={() => onSelectArticle(fifth)}
              className="mt-4 font-mono text-[10px] text-center max-w-xs cursor-pointer uppercase font-bold hover:opacity-70 transition-opacity"
            >
              {fifth.title}
            </div>
          </div>

          {/* Middle Right Annotation */}
          <div className="absolute top-64 right-6 font-mono text-[9px] tracking-widest text-black uppercase">
            <span>0.1 PSYCHO</span>
          </div>

          {/* Lower Left Annotation */}
          <div className="absolute bottom-36 left-0 sm:left-4 font-mono text-[9px] tracking-widest text-black uppercase max-w-[190px] leading-normal hidden sm:block">
            <span>OR MAYBE IT'S GOOD PARIS TO HONGKONG AND THEN DEN</span>
          </div>

          {/* Lower Center Annotation */}
          <div className="absolute bottom-28 left-1/3 font-mono text-[9px] tracking-widest text-black uppercase">
            <span>MY BROTHER IN CHRIST SHUT UP</span>
          </div>

          {/* Lower Right Specimen */}
          <div className="absolute bottom-12 right-0 sm:right-8">
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
            <span className="font-mono text-[9px] tracking-widest text-black/50 block">
              JUST GIBBERISH TO BALANCE THE STRUCTURE OF THE NICE LAYOUT
            </span>
          </div>

        </div>

      </section>


      {/* ─────────────────────────────────────────────────────────────
          SECTION 4: COMPLETE SPECIMEN CATALOG (Browse all 80+ AI articles)
          Stark Swiss typography, minimalist rhythm, corner handles
      ───────────────────────────────────────────────────────────── */}
      <section className="py-24">
        
        <div className="flex justify-between items-baseline font-mono text-[10px] tracking-widest text-black/50 uppercase pb-6 border-b border-black mb-16">
          <span className="font-bold text-black">SPECIMEN LEDGER // {articles.length} ENTRIES</span>
          <span>PARIS TO SAN FRANCISCO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
          {articles.map((art, idx) => (
            <div
              key={art.id}
              onClick={() => onSelectArticle(art)}
              className="group cursor-pointer flex flex-col justify-between border-t border-black pt-4"
            >
              <div>
                <div className="flex justify-between font-mono text-[9px] tracking-widest text-black/50 uppercase mb-3">
                  <span>{(idx + 1).toString().padStart(3, '0')}</span>
                  <span className="font-bold text-black">[{art.source.name}]</span>
                </div>

                <div className="mb-4">
                  <ArtFrame
                    src={art.imageUrl}
                    alt={art.title}
                    indexCode={`REF_${(idx + 1).toString().padStart(3, '0')}`}
                    subTag={`"${art.category}"`}
                    aspect="landscape"
                  />
                </div>

                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-[-0.035em] leading-[0.88] text-black group-hover:opacity-70 transition-opacity line-clamp-3 mb-3">
                  {art.title}
                </h3>

                <p className="font-mono text-[10px] uppercase text-black/70 line-clamp-2 leading-relaxed">
                  {art.aiSummary.tldr}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-black/10 flex justify-between font-mono text-[9px] tracking-widest text-black/40 uppercase">
                <span>{art.category}</span>
                <span className="font-bold text-black">READ →</span>
              </div>
            </div>
          ))}
        </div>

      </section>

    </div>
  );
}
