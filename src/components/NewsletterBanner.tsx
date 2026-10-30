'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2, Sparkles, Send } from 'lucide-react';

export default function NewsletterBanner() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <section className="my-12 rounded-3xl overflow-hidden relative border border-violet-500/20 bg-gradient-to-r from-violet-900/40 via-slate-900 to-cyan-900/40 p-8 sm:p-12 text-center sm:text-left">
      {/* Background glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 border border-violet-500/30 text-violet-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DAGELIJKSE AI ROUNDUP</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Ontvang elke ochtend de AI Intelligence Brief
          </h2>
          <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
            De 5 belangrijkste AI doorbraken, research papers en marktverschuivingen samengevat in 3 minuten leestijd.
          </p>
        </div>

        <div className="w-full sm:w-auto shrink-0">
          {subscribed ? (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Je bent aangemeld voor de AI Daily Brief!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md w-full">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="jouw.email@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-900/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-600/30 cursor-pointer"
              >
                <span>Aanmelden</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

