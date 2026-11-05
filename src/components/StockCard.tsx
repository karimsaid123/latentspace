'use client';

import React from 'react';
import { StockAnalysis, ModelTrajectory } from '@/types/market';
import { TrendingUp, TrendingDown, ArrowUpRight, Cpu, Radio, ShieldAlert } from 'lucide-react';

interface StockCardProps {
  stock: StockAnalysis;
  onOpenDetails: (stock: StockAnalysis) => void;
}

export default function StockCard({ stock, onOpenDetails }: StockCardProps) {
  const isUp = stock.changeAmount >= 0;
  const isDown = stock.changeAmount < 0;

  // Trajectory visual mapping
  const trajectoryConfig: Record<ModelTrajectory, { label: string; border: string; bg: string; text: string }> = {
    BULLISH_EXPANSION: {
      label: 'BULLISH EXPANSION',
      border: 'border-emerald-600/40',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-800 dark:text-emerald-300'
    },
    BEARISH_CONTRACTION: {
      label: 'BEARISH CONTRACTION',
      border: 'border-rose-600/40',
      bg: 'bg-rose-500/10',
      text: 'text-rose-800 dark:text-rose-300'
    },
    HIGH_VOLATILITY_CHURN: {
      label: 'VOLATILITY SPIKE',
      border: 'border-[#ff8000]/40',
      bg: 'bg-[#ff8000]/10',
      text: 'text-[#d96c00] dark:text-[#ff9933]'
    },
    RANGE_BOUND_ACCUMULATION: {
      label: 'RANGE-BOUND CONSOLIDATION',
      border: 'border-blue-600/40',
      bg: 'bg-blue-500/10',
      text: 'text-blue-800 dark:text-blue-300'
    }
  };

  const traj = trajectoryConfig[stock.prediction.trajectory];

  // SVG Sparkline calculation
  const sparkline = stock.sparkline;
  const minPrice = Math.min(...sparkline);
  const maxPrice = Math.max(...sparkline);
  const range = maxPrice - minPrice || 1;
  const height = 36;
  const width = 120;
  
  const points = sparkline.map((val, idx) => {
    const x = (idx / (sparkline.length - 1)) * width;
    const y = height - ((val - minPrice) / range) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  const sparklineColor = isUp ? '#059669' : '#e11d48';
  const topCatalyst = stock.correlatedArticles[0];

  return (
    <div className="relative border-2 border-black bg-white p-5 sm:p-6 font-mono select-none flex flex-col justify-between hover:shadow-md transition-shadow">
      {/* Corner geometric accents */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-black" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-black" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-black" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-black" />

      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-black/15">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black text-black tracking-tight">
                ${stock.symbol}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 border border-black/20 bg-black/5 text-black/70 uppercase">
                [{stock.category.replace('_', ' ')}]
              </span>
            </div>
            <p className="text-xs text-black/60 truncate max-w-[200px] sm:max-w-[240px] mt-0.5 font-bold">
              {stock.companyName}
            </p>
          </div>

          {/* SVG Sparkline */}
          <div className="flex flex-col items-end">
            <svg width={width} height={height} className="overflow-visible">
              <polyline
                fill="none"
                stroke={sparklineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>
            <span className="text-[9px] text-black/40 mt-1 uppercase">15-Day Trajectory</span>
          </div>
        </div>

        {/* Current Price & 24h Delta */}
        <div className="py-4 flex items-baseline justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-black">
              ${stock.currentPrice.toFixed(2)}
            </div>
            <div className="text-[11px] text-black/60 mt-0.5">
              MCAP: <span className="font-bold text-black">{stock.marketCapFormatted}</span> // VOL: {stock.volumeFormatted}
            </div>
          </div>

          <div className={`px-2.5 py-1 border text-xs sm:text-sm font-bold flex items-center gap-1 ${
            isUp 
              ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' 
              : 'border-rose-600/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
          }`}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
          </div>
        </div>

        {/* XGBoost Trajectory Badge */}
        <div className="my-3 p-3 border border-black/20 bg-black/[0.02]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] tracking-widest text-black/60 uppercase font-bold flex items-center gap-1">
              <Cpu className="w-3 h-3 text-black" />
              <span>[XGBOOST MODEL SIGNAL]</span>
            </span>
            <span className="text-[10px] font-bold text-black">
              {stock.prediction.confidencePercent}% CONF
            </span>
          </div>

          <div className={`px-2 py-1 border font-bold text-xs uppercase tracking-wider text-center ${traj.border} ${traj.bg} ${traj.text}`}>
            {traj.label}
          </div>

          <p className="mt-2 text-[11px] font-sans text-black/75 leading-relaxed line-clamp-2">
            {stock.prediction.thesis}
          </p>
        </div>

        {/* Top Correlated AI Dispatch */}
        <div className="my-3 pt-2.5 border-t border-black/10">
          <div className="flex items-center justify-between text-[10px] text-black/60 uppercase mb-1 font-bold">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#ff8000]" />
              <span>LATEST AI CATALYST</span>
            </span>
            <span>{stock.correlatedArticles.length} LINKED DISPATCHES</span>
          </div>

          {topCatalyst ? (
            <div className="text-[11px] font-sans">
              <p className="font-bold text-black line-clamp-2 hover:underline cursor-pointer" onClick={() => onOpenDetails(stock)}>
                "{topCatalyst.title}"
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-black/60">
                <span>{topCatalyst.sourceName}</span>
                <span>//</span>
                <span className="text-black font-semibold">[{topCatalyst.catalystType}]</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] font-sans text-black/50 italic">
              No recent high-impact dispatches detected. Model operating on macro volatility baseline.
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-2 border-t border-black/15 flex items-center justify-between">
        <span className="text-[10px] text-black/50 font-bold">
          RISK: [{stock.prediction.riskLevel}]
        </span>

        <button
          onClick={() => onOpenDetails(stock)}
          className="border border-black px-3 py-1.5 text-xs font-bold tracking-wider hover:bg-black hover:text-white transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>[QUANT DOSSIER]</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

