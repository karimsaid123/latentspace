'use client';

import React, { useState } from 'react';

const FALLBACK_ART = [
  '/art/art-1.jpg',
  '/art/art-2.jpg',
  '/art/art-3.jpg',
  '/art/art-4.jpg',
  '/art/art-5.jpg',
  '/art/art-6.jpg',
];

interface ArtFrameProps {
  src?: string;
  alt?: string;
  indexCode?: string;
  className?: string;
  aspect?: 'portrait' | 'square' | 'landscape';
}

export default function ArtFrame({
  src,
  alt = 'Visual',
  indexCode = '001',
  className = '',
  aspect = 'portrait',
}: ArtFrameProps) {
  const [hasError, setHasError] = useState(false);

  const aspectClass = {
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    landscape: 'aspect-[4/3]',
  }[aspect];

  // Pick deterministic fallback art based on indexCode
  const numericIndex = parseInt(indexCode.replace(/\D/g, '') || '1', 10);
  const fallbackSrc = FALLBACK_ART[(numericIndex - 1) % FALLBACK_ART.length];
  const imageToDisplay = src && !hasError ? src : fallbackSrc;

  return (
    <div className={`relative group inline-block select-none ${className}`}>
      {/* 4 Corner Bounding Box Square Handles */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black z-20 group-hover:scale-125 transition-transform duration-150" />

      {/* Clean index above frame (e.g. 001, 002) */}
      {indexCode && (
        <span className="absolute -top-4 left-0 font-mono text-[9px] tracking-widest text-black/60 uppercase">
          {indexCode}
        </span>
      )}

      {/* Frame content: Always a real piece of art */}
      <div className={`relative overflow-hidden bg-[#e8e7e2] border border-black/10 ${aspectClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageToDisplay}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover grayscale contrast-125 group-hover:contrast-100 group-hover:grayscale-0 transition-all duration-700"
        />
      </div>
    </div>
  );
}
