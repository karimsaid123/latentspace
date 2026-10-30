'use client';

import React, { useState } from 'react';

interface ArtFrameProps {
  src?: string;
  alt?: string;
  indexCode?: string;
  subTag?: string;
  className?: string;
  aspect?: 'portrait' | 'square' | 'landscape';
}

export default function ArtFrame({
  src,
  alt = 'Visual',
  indexCode = '001',
  subTag = 'REPORT',
  className = '',
  aspect = 'portrait',
}: ArtFrameProps) {
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const aspectClass = {
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    landscape: 'aspect-[4/3]',
  }[aspect];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative group inline-block select-none ${className}`}
    >
      {/* 4 Corner Bounding Box Square Handles */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />

      {/* Micro-annotations outside frame */}
      {indexCode && (
        <span className="absolute -top-3.5 left-0 font-mono text-[9px] tracking-widest text-black/60 uppercase">
          {indexCode}
        </span>
      )}
      {subTag && (
        <span className="absolute -bottom-3.5 right-0 font-mono text-[9px] tracking-widest text-black/60 uppercase">
          {subTag}
        </span>
      )}

      {/* Frame content */}
      <div className={`relative overflow-hidden bg-[#eeede8] border border-black/10 ${aspectClass}`}>
        {src && !hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full h-full object-cover grayscale contrast-125 group-hover:contrast-100 group-hover:grayscale-0 transition-all duration-700"
          />
        ) : (
          /* Minimalist typographic visual placeholder */
          <div className="w-full h-full flex flex-col justify-between p-3 bg-[#e8e7e1] text-black font-mono text-[9px] uppercase">
            <div className="flex justify-between opacity-60">
              <span>{indexCode}</span>
              <span>LATENT.SPACE</span>
            </div>
            <div className="my-auto text-center font-bold tracking-widest opacity-80">
              ENTRY
            </div>
            <div className="flex justify-between opacity-40 text-[8px]">
              <span>PARIS</span>
              <span>SF</span>
            </div>
          </div>
        )}

        {/* ASCII / Matrix overlay on hover */}
        <div
          className={`absolute inset-0 p-2.5 font-mono text-[8px] leading-[10px] text-black select-none pointer-events-none flex flex-col justify-between transition-opacity duration-200 ${
            isHovered ? 'opacity-90 bg-white/20 backdrop-blur-[1px]' : 'opacity-0'
          }`}
        >
          <div className="flex justify-between">
            <span>/ S M</span>
            <span>X O 8 4</span>
          </div>
          <div className="flex justify-around opacity-60">
            <span>H H H</span>
            <span>48XM</span>
          </div>
          <div className="flex justify-between opacity-75">
            <span>#84 MS#</span>
            <span>0.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
