'use client';

import React, { useState } from 'react';

interface ArtFrameProps {
  src?: string;
  alt?: string;
  indexCode?: string;
  subTag?: string;
  className?: string;
  aspect?: 'square' | 'portrait' | 'landscape' | 'wide';
  hoverEffect?: boolean;
}

export default function ArtFrame({
  src,
  alt = 'AI Specimen',
  indexCode = '001',
  subTag = '0.1 PSYCHO',
  className = '',
  aspect = 'portrait',
  hoverEffect = true,
}: ArtFrameProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const aspectClass = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
    wide: 'aspect-[16/9]',
  }[aspect];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group inline-block select-none ${className}`}
    >
      {/* 4 Corner Bounding Box Square Handles (Virgil Abloh / Lookbook signature) */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-black dark:bg-white z-20 transition-transform group-hover:scale-125 duration-150" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-black dark:bg-white z-20 transition-transform group-hover:scale-125 duration-150" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black dark:bg-white z-20 transition-transform group-hover:scale-125 duration-150" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black dark:bg-white z-20 transition-transform group-hover:scale-125 duration-150" />

      {/* Micro-annotations outside frame */}
      <div className="absolute -top-4 left-0 font-mono text-[9px] tracking-widest text-black/60 dark:text-white/60 uppercase">
        {indexCode}
      </div>
      <div className="absolute -bottom-4 right-0 font-mono text-[9px] tracking-widest text-black/60 dark:text-white/60 uppercase">
        {subTag}
      </div>

      {/* Image or Generative Art Container */}
      <div
        className={`relative overflow-hidden bg-[#e8e7e1] dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 ${aspectClass}`}
      >
        {src && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all duration-700 ${
              hoverEffect ? 'group-hover:scale-105' : ''
            }`}
          />
        ) : (
          /* Generative High-Fashion Art Graphic (inspired by Yeezy/Virgil & Blue Flora Telemetry) */
          <div className="w-full h-full flex flex-col justify-between p-4 bg-gradient-to-br from-[#dcdad2] via-[#e5e4de] to-[#c8c5b9] dark:from-[#141414] dark:via-[#1c1c1c] dark:to-[#0f0f0f] text-black dark:text-white font-mono text-[10px]">
            <div className="flex justify-between items-start opacity-70">
              <span className="tracking-widest">SPECIMEN // {indexCode}</span>
              <span className="tracking-tighter">AI.RAW</span>
            </div>

            <div className="my-auto flex flex-col items-center justify-center opacity-85">
              <div className="w-16 h-16 rounded-full border border-dashed border-black/40 dark:border-white/40 flex items-center justify-center animate-spin-slow">
                <div className="w-8 h-8 rounded-full border border-black dark:border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-black dark:bg-white" />
                </div>
              </div>
              <span className="mt-3 text-[9px] tracking-widest uppercase opacity-75">
                NEURAL ARTIFACT
              </span>
            </div>

            <div className="flex justify-between items-end opacity-60 text-[8px] tracking-widest">
              <span>LAT 37.77 N</span>
              <span>LON 122.41 W</span>
            </div>
          </div>
        )}

        {/* ASCII / Matrix Telemetry Overlay on Hover (Directly inspired by Image 4) */}
        <div
          className={`absolute inset-0 p-3 pointer-events-none font-mono text-[8px] leading-[10px] text-black/70 dark:text-white/80 transition-opacity duration-300 select-none flex flex-col justify-between ${
            isHovered ? 'opacity-90 backdrop-blur-[1px] bg-white/10 dark:bg-black/20' : 'opacity-0'
          }`}
        >
          <div className="flex justify-between">
            <span>/ S M</span>
            <span>X O  8 4</span>
            <span>4 8 X M</span>
          </div>
          <div className="flex justify-around opacity-75">
            <span>H H H</span>
            <span>S # S  0 / H</span>
            <span>4 / 8 I S</span>
          </div>
          <div className="flex justify-between opacity-60">
            <span>[SYS_CLK 0.1]</span>
            <span>#84 MS#</span>
          </div>
        </div>
      </div>
    </div>
  );
}
