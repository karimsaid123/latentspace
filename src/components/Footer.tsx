'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-black/10 py-16 font-mono text-[9px] uppercase tracking-widest text-black/50 select-none">
      <div className="max-w-[1700px] mx-auto px-6 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>EPOCH // AUTONOMOUS AI INTELLIGENCE</span>
        <span>SAN FRANCISCO // LONDON // PARIS // TOKYO</span>
        <span>EDITION: 2026</span>
      </div>
    </footer>
  );
}
