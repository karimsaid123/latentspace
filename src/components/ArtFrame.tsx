'use client';

import React, { useState, useEffect, memo } from 'react';

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
  priority?: boolean;
}

const ArtFrame = memo(function ArtFrame({
  src,
  alt = 'Visual',
  indexCode = '001',
  className = '',
  aspect = 'portrait',
  priority = false,
}: ArtFrameProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the source URL changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const aspectClass = {
    portrait: 'aspect-[3/4]',
    square: 'aspect-square',
    landscape: 'aspect-[4/3]',
  }[aspect];

  // Pick deterministic fallback art safely (handles "000" without negative modulo)
  const numericIndex = parseInt(indexCode.replace(/\D/g, '') || '1', 10);
  const safeIdx = (((numericIndex - 1) % FALLBACK_ART.length) + FALLBACK_ART.length) % FALLBACK_ART.length;
  const fallbackSrc = FALLBACK_ART[safeIdx];
  const imageToDisplay = src && !hasError ? src : fallbackSrc;

  return (
    <div className={`relative group select-none ${className || 'inline-block'}`}>
      {/* Clean index above frame (e.g. 001, 002) */}
      {indexCode && (
        <span className="absolute -top-4 left-0 font-mono text-[9px] tracking-widest text-black/60 uppercase transition-all duration-300 group-hover:text-black group-hover:tracking-wider">
          {indexCode}
        </span>
      )}

      {/* Frame content: Always a real piece of art */}
      <div className={`relative overflow-hidden bg-[#e8e7e2] border border-black/10 transition-colors duration-500 group-hover:border-black/30 w-full ${aspectClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageToDisplay}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover grayscale contrast-125 group-hover:contrast-100 group-hover:grayscale-0 group-hover:scale-105 transition-[transform,filter] duration-700 ease-out"
        />
      </div>
    </div>
  );
});

export default ArtFrame;
