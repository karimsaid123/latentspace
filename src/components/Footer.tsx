'use client';

import React from 'react';
import { Sparkles, Terminal, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
                NeuralPulse AI
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Geautomatiseerde AI nieuws aggregator & summarizer
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span>Bronnen: OpenAI, DeepMind, TechCrunch, The Verge, Hugging Face, MIT Tech Review</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Gebouwd met</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>voor AI liefhebbers & onderzoekers</span>
          </div>

        </div>
      </div>
    </footer>
  );
}
