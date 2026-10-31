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
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Reset error state whenever the source URL changes
  useEffect(() => {
    setHasError(false);
    setFallbackFailed(false);
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
        {fallbackFailed ? (
          <div className="w-full h-full bg-[#0c0d10] p-4 flex flex-col justify-between text-white font-mono select-none">
            <div className="flex justify-between items-center text-[9px] tracking-widest text-white/50 uppercase">
              <span>[{sourceName || 'LATENT SPACE'}]</span>
              <span className="text-[#ff8000]">● LIVE</span>
            </div>
            <div className="my-auto text-center px-2">
              <div className="text-sm sm:text-base font-black tracking-tight text-white/90 uppercase line-clamp-3 leading-snug">
                {title || alt}
              </div>
            </div>
            <div className="text-[8px] tracking-widest text-white/40 uppercase flex justify-between border-t border-white/10 pt-2">
              <span>{lab || 'FRONTIER AI'}</span>
              <span>INDEX_{indexCode}</span>
            </div>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageToDisplay}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            onError={() => {
              if (src && !hasError) {
                setHasError(true);
              } else {
                setFallbackFailed(true);
              }
            }}
            className="w-full h-full object-cover grayscale contrast-125 group-hover:contrast-100 group-hover:grayscale-0 group-hover:scale-105 transition-[transform,filter] duration-700 ease-out"
          />
        )}
      </div>
    </div>
  );
});

export default ArtFrame;
