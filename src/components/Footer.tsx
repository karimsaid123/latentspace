'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import LiveClock from './LiveClock';

const Footer = memo(function Footer() {
  return (
    <footer className="w-full border-t border-black/10 py-16 font-mono text-[9px] uppercase tracking-widest text-black/50 select-none">
      <div className="max-w-[1700px] mx-auto px-6 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-black transition-colors font-bold">
            LATENT SPACE
          </Link>
          <span className="text-black/20">/</span>
          <Link href="/codex" className="hover:text-black transition-colors">
            CODEX COMPENDIUM
          </Link>
          <span className="text-black/20">/</span>
          <Link href="/benchmarks" className="hover:text-black transition-colors">
            BENCHMARKS & ARENA
          </Link>
          <span className="text-black/20">/</span>
          <Link href="/markets" className="hover:text-black transition-colors font-bold text-[#ff8000]">
            AI & SILICON MARKETS
          </Link>
        </div>

        <span className="flex items-center gap-2 text-black/80 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <LiveClock prefix="DEVICE TIME: " useLocaleDefault />
        </span>
        <span>EDITION: 2026</span>
      </div>
    </footer>
  );
});

export default Footer;
