'use client';

import React from 'react';
import { StockAnalysis, ModelTrajectory } from '@/types/market';
import { TrendingUp, TrendingDown, ArrowUpRight, Cpu, Radio, GitBranch } from 'lucide-react';

interface StockCardProps {
  stock: StockAnalysis;
  onOpenDetails: (stock: StockAnalysis) => void;
}

export default function StockCard({ stock, onOpenDetails }: StockCardProps) {
  const isUp = stock.changeAmount >= 0;

  const trajectoryConfig: Record<ModelTrajectory, { label: string; border: string; bg: string; text: string }> = {
    BULLISH_EXPANSION: {
      label: 'BULLISH EXPANSION',
      border: 'border-emerald-600/40',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-800 dark:text-emerald-300',
    },
    BEARISH_CONTRACTION: {
      label: 'BEARISH CONTRACTION',
      border: 'border-rose-600/40',
      bg: 'bg-rose-500/10',
      text: 'text-rose-800 dark:text-rose-300',
    },
    HIGH_VOLATILITY_CHURN: {
      label: 'VOLATILITY SPIKE',
      border: 'border-[#ff8000]/40',
      bg: 'bg-[#ff8000]/10',
      text: 'text-[#d96c00] dark:text-[#ff9933]',
    },
    RANGE_BOUND_ACCUMULATION: {
      label: 'RANGE-BOUND CONSOLIDATION',
      border: 'border-blue-600/40',
      bg: 'bg-blue-500/10',
      text: 'text-blue-800 dark:text-blue-300',
    },
  };

  const traj = trajectoryConfig[stock.prediction.trajectory];
  const upProb = stock.prediction.upProbabilityPct ?? 50;

  const sparkline = stock.sparkline;
  const minPrice = Math.min(...sparkline);
  const maxPrice = Math.max(...sparkline);
  const range = maxPrice - minPrice || 1;
  const height = 36;
  const width = 120;

  const points = sparkline
    .map((val, idx) => {
      const x = (idx / Math.max(1, sparkline.length - 1)) * width;
      const y = height - ((val - minPrice) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  const sparklineColor = isUp ? '#059669' : '#e11d48';
  const topCatalyst = stock.correlatedArticles[0];

  return (
    <div className="relative border-2 border-black bg-white p-5 sm:p-6 font-mono select-none flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        {/* Top Header */}
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
              MCAP: <span className="font-bold text-black">{stock.marketCapFormatted}</span> {'//'} VOL:{' '}
              {stock.volumeFormatted}
            </div>
          </div>

          <div
            className={`px-2.5 py-1 border text-xs sm:text-sm font-bold flex items-center gap-1 ${
              isUp
                ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-rose-600/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
            }`}
          >
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {isUp ? '+' : ''}
              {stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* XGBoost Trajectory & Calibrated Upside Odds */}
        <div className="my-3 p-3 border border-black/20 bg-black/[0.02]">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[10px] tracking-widest text-black/60 uppercase font-bold flex items-center gap-1">
              <Cpu className="w-3 h-3 text-black" />
              <span>[XGBOOST 5D OUTLOOK]</span>
            </span>
            <span className="text-[10px] font-black text-black">
              {upProb.toFixed(0)}% UP ODDS · {stock.prediction.confidencePercent}% CONF
            </span>
          </div>

          <div
            className={`px-2 py-1 border font-bold text-xs uppercase tracking-wider text-center ${traj.border} ${traj.bg} ${traj.text}`}
          >
            {traj.label}
          </div>

          {/* Mini Calibrated Upside Gauge */}
          <div className="mt-2">
            <div className="relative h-2 w-full bg-black/10 overflow-hidden">
              <div
                className={`h-full ${
                  upProb >= 53 ? 'bg-emerald-600' : upProb <= 47 ? 'bg-rose-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(98, Math.max(2, upProb))}%` }}
              />
              <div className="absolute top-0 bottom-0 w-px bg-black" style={{ left: '50%' }} />
            </div>
          </div>

          {/* Technical Telemetry Pill Row */}
          <div className="grid grid-cols-3 gap-1.5 my-2.5 font-mono text-[9px]">
            <div className="border border-black/15 bg-white p-1 text-center">
              <span className="text-black/50 block text-[8px]">WILDER RSI-14</span>
              <span
                className={`font-bold ${
                  (stock.prediction.rsi14 || 50) < 32
                    ? 'text-amber-700 dark:text-amber-400'
                    : (stock.prediction.rsi14 || 50) > 70
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-black'
                }`}
              >
                {stock.prediction.rsi14?.toFixed(1) || '50.0'}
              </span>
            </div>
            <div className="border border-black/15 bg-white p-1 text-center">
              <span className="text-black/50 block text-[8px]">SMA TREND</span>
              <span className="font-bold text-black truncate block">
                {stock.prediction.smaTrend === 'UPWARD_EXPANSION'
                  ? 'EXPANSION ↑'
                  : stock.prediction.smaTrend === 'DOWNWARD_DRIFT'
                    ? 'DRIFT ↓'
                    : 'FLAT —'}
              </span>
            </div>
            <div className="border border-black/15 bg-white p-1 text-center">
              <span className="text-black/50 block text-[8px]">FORECAST VOL</span>
              <span className="font-bold text-black">
                {(stock.prediction.forecastVolAnnualized ?? stock.prediction.volatilityAnnualized ?? 30).toFixed(0)}%/yr
              </span>
            </div>
          </div>

          <p className="mt-1 text-[11px] font-sans font-semibold text-black/85 leading-snug line-clamp-2">
            {stock.prediction.decisionTree?.verdictHeadline || stock.prediction.thesis}
          </p>

          {stock.prediction.expected30dChannel && (
            <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-black/50">30D 80% CHANNEL:</span>
              <span className="font-bold text-black tracking-tight">
                ${stock.prediction.expected30dChannel.low.toFixed(2)} — $
                {stock.prediction.expected30dChannel.high.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Top Correlated News / Research Catalyst */}
        <div className="my-3 pt-2.5 border-t border-black/10">
          <div className="flex items-center justify-between text-[10px] text-black/60 uppercase mb-1 font-bold">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#ff8000]" />
              <span>TOP CATALYST</span>
            </span>
            <span>{stock.correlatedArticles.length} LINKED</span>
          </div>

          {topCatalyst ? (
            <div className="text-[11px] font-sans">
              <div className="flex items-center gap-1.5 mb-1 font-mono text-[9px]">
                <span
                  className={`px-1 py-0.5 border font-bold ${
                    topCatalyst.stream === 'MARKET_NEWS'
                      ? 'border-[#ff8000]/50 bg-[#ff8000]/10 text-[#b85a00] dark:text-[#ff9933]'
                      : 'border-blue-600/35 bg-blue-500/10 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  {topCatalyst.stream === 'MARKET_NEWS' ? 'LIVE MARKET' : 'AI RESEARCH'}
                </span>
                {topCatalyst.modelImpactPctPts !== undefined && Math.abs(topCatalyst.modelImpactPctPts) >= 0.1 && (
                  <span
                    className={`font-bold ${
                      topCatalyst.modelImpactPctPts >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {topCatalyst.modelImpactPctPts >= 0 ? '+' : ''}
                    {topCatalyst.modelImpactPctPts.toFixed(1)}% pts
                  </span>
                )}
              </div>
              <p
                className="font-bold text-black line-clamp-2 hover:underline cursor-pointer"
                onClick={() => onOpenDetails(stock)}
              >
                &ldquo;{topCatalyst.title}&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-black/60">
                <span>{topCatalyst.sourceName}</span>
                <span>{'//'}</span>
                <span className="text-black font-semibold truncate">[{topCatalyst.catalystType}]</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] font-sans text-black/50 italic">
              No recent direct headlines matched. Model running on price, volume &amp; VIX regime.
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-2 border-t border-black/15 flex items-center justify-end">
        <button
          onClick={() => onOpenDetails(stock)}
          className="border border-black px-3 py-1.5 text-xs font-bold tracking-wider hover:bg-black hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <GitBranch className="w-3.5 h-3.5 text-[#ff8000]" />
          <span>[DECISION TREE &amp; DOSSIER]</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
