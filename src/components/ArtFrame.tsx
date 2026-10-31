'use client';

import React, { useState, useEffect, memo } from 'react';
import { getArticleFallbackVisual } from '@/lib/brand-visuals';

interface ArtFrameProps {
  src?: string;
  alt?: string;
  indexCode?: string;
  className?: string;
  aspect?: 'portrait' | 'square' | 'landscape';
  priority?: boolean;
  title?: string;
  lab?: string;
  sourceName?: string;
  entryType?: string;
  arxivId?: string;
}

const ArtFrame = memo(function ArtFrame({
  src,
  alt = 'Visual',
  indexCode = '001',
  className = '',
  aspect = 'portrait',
  priority = false,
  title,
  lab,
  sourceName,
  entryType,
  arxivId,
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

  // Resolve intelligent brand/topic editorial visual when source is absent or failed
  const fallbackVisual = getArticleFallbackVisual({
    title: title || alt,
    lab,
    sourceName,
    entryType,
    arxivId,
  });

  const imageToDisplay = src && !hasError ? src : fallbackVisual;

  return (
    <div className={`relative group select-none ${className || 'inline-block'}`}>
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
