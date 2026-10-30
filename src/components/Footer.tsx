'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-black/15 dark:border-white/15 bg-transparent py-16 font-mono text-xs select-none">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 space-y-8">
        
        {/* Top row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-black/10 dark:border-white/10 pb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-[-0.04em] leading-none mb-2 text-black dark:text-white">
              NEURAL"PULSE"
            </h2>
            <p className="text-[10px] uppercase text-black/50 dark:text-white/50 tracking-widest">
              AUTONOMOUS AI NEWSPAPER // ART DIRECTION BY VIRGIL & YEEZY CODES
            </p>
          </div>

          <div className="text-left md:text-right text-[10px] uppercase text-black/60 dark:text-white/60 space-y-1 tracking-widest">
            <div>SAN FRANCISCO // 37.7749° N, 122.4194° W</div>
            <div>PARIS // 48.8566° N, 2.3522° E</div>
            <div>TOKYO // 35.6762° N, 139.6503° E</div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] uppercase tracking-widest text-black/40 dark:text-white/40">
          <span>FEEDS: OPENAI // DEEPMIND // TECHCRUNCH // THE VERGE // HUGGINGFACE // MIT</span>
          <span>"NOT A HUMAN AUTHOR" // EDITION: 2026</span>
          <span>JUST GIBBERISH TO BALANCE THE STRUCTURE OF THE NICE LAYOUT</span>
        </div>

      </div>
    </footer>
  );
}
