'use client';

import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface NFADisclaimerBannerProps {
  className?: string;
}

export default function NFADisclaimerBanner({ className = '' }: NFADisclaimerBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return (
      <div className={`mb-6 p-2 border border-[#ff8000]/40 bg-[#ff8000]/5 flex items-center justify-between text-[10px] font-mono tracking-wider ${className}`}>
        <div className="flex items-center gap-2 text-black/80 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff8000]" />
          <span>[SYSTEM NOTICE: STRICTLY NOT FINANCIAL ADVICE // NFA ACTIVE]</span>
        </div>
        <button
          onClick={() => setIsDismissed(false)}
          className="text-black/60 hover:text-black font-bold underline cursor-pointer"
        >
          [EXPAND NOTICE]
        </button>
      </div>
    );
  }

  return (
    <div className={`relative mb-8 p-4 sm:p-5 border-2 border-black bg-white shadow-xs font-mono select-none ${className}`}>
      {/* Corner geometric accents */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-black/15">
        <div className="flex items-center gap-2.5">
          <div className="p-1 bg-[#ff8000] text-black">
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-black text-xs sm:text-sm tracking-widest uppercase text-black">
            [⚠️ EXPERIMENTAL QUANT SYNTHESIS // STRICTLY NOT FINANCIAL ADVICE (NFA)]
          </span>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="self-end sm:self-auto text-[10px] font-bold tracking-wider px-2 py-0.5 border border-black/30 hover:border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
          title="Minimize disclaimer"
        >
          [ACKNOWLEDGE / MINIMIZE]
        </button>
      </div>

      <div className="pt-3 text-[11px] sm:text-xs font-sans text-black/80 leading-relaxed space-y-1.5">
        <p>
          <strong className="font-mono text-black font-bold uppercase">[DISCLAIMER NOTICE]:</strong> All trajectory predictions, confidence metrics, and sentiment evaluations are deterministic algorithmic outputs computed by a lightweight Gradient Boosted Decision Tree (XGBoost) model correlating real-time arXiv research dispatches with public equity price action.
        </p>
        <p className="text-black/70">
          This system possesses <strong className="text-black font-semibold">zero fiduciary duty</strong> and does not constitute investment, financial, tax, or legal advice. Equities and semiconductor markets involve substantial risk of principal loss. For educational, algorithmic research, and entertainment purposes only.
        </p>
      </div>
    </div>
  );
}
