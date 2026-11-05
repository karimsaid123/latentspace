'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { StockAnalysis } from '@/types/market';
import { 
  X, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Radio, 
  AlertTriangle,
  GitBranch,
  Layers
} from 'lucide-react';

interface StockDetailModalProps {
  stock: StockAnalysis | null;
  onClose: () => void;
}

export default function StockDetailModal({ stock, onClose }: StockDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (stock) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [stock, onClose]);

  if (!stock) return null;

  const isUp = stock.changeAmount >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#faf9f6] border-2 border-black p-5 sm:p-8 font-mono select-text shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Geometric Corner Accents */}
        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-black" />
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-black" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-black" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-black" />

        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-black/15 gap-3">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-wider flex-wrap">
            <span className="px-2 py-0.5 border border-black/25 bg-black/5 font-bold text-black">
              [{stock.category.replace('_', ' ')}]
            </span>
            <span className="px-2 py-0.5 border border-black/25 bg-[#ff8000]/10 text-black font-bold">
              [RISK: {stock.prediction.riskLevel}]
            </span>
            <span className="text-black/60 hidden sm:inline">
              // NASDAQ: {stock.symbol}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer text-xs font-bold tracking-wider"
          >
            [ESC / CLOSE]
          </button>
        </div>

        {/* Header Title & Price */}
        <div className="pt-6 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-black/15">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black">
                ${stock.symbol}
              </h1>
              <span className="text-sm sm:text-base text-black/70 font-bold">
                {stock.companyName}
              </span>
            </div>
            <p className="text-xs text-black/60 font-sans mt-1">
              Sector: <strong className="text-black font-mono">{stock.sectorLabel}</strong>
            </p>
          </div>

          <div className="flex flex-col sm:items-end">
            <div className="text-2xl sm:text-3xl font-black text-black">
              ${stock.currentPrice.toFixed(2)}
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isUp ? '+' : ''}{stock.changePercent.toFixed(2)}% ({isUp ? '+' : ''}${stock.changeAmount.toFixed(2)})</span>
            </div>
          </div>
        </div>

        {/* Valuation & Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 text-xs border border-black/20 p-4 bg-white">
          <div>
            <span className="text-[10px] text-black/60 uppercase block">MARKET CAPITALIZATION</span>
            <span className="font-bold text-black text-sm">{stock.marketCapFormatted}</span>
          </div>
          <div>
            <span className="text-[10px] text-black/60 uppercase block">24H VOLUME</span>
            <span className="font-bold text-black text-sm">{stock.volumeFormatted}</span>
          </div>
          <div>
            <span className="text-[10px] text-black/60 uppercase block">52-WEEK HIGH</span>
            <span className="font-bold text-black text-sm">${stock.high52w?.toFixed(2) || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-black/60 uppercase block">52-WEEK LOW</span>
            <span className="font-bold text-black text-sm">${stock.low52w?.toFixed(2) || 'N/A'}</span>
          </div>
        </div>

        {/* XGBoost Quantitative Analysis Section */}
        <div className="my-6 p-5 border-2 border-black bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-black/15">
            <div className="flex items-center gap-2 text-xs font-bold text-black">
              <Cpu className="w-4 h-4 text-black" />
              <span>[XGBOOST GBDT MODEL TRAJECTORY SYNTHESIS]</span>
            </div>
            <div className="text-xs font-bold px-2 py-0.5 border border-black bg-black text-white">
              {stock.prediction.confidencePercent}% CONFIDENCE
            </div>
          </div>

          <div className="py-4">
            <div className="text-lg sm:text-xl font-black text-black uppercase tracking-wider mb-2">
              PREDICTED PHASE: {stock.prediction.trajectory.replace('_', ' ')}
            </div>
            <p className="font-sans text-xs sm:text-sm text-black/85 leading-relaxed">
              {stock.prediction.thesis}
            </p>
          </div>

          {/* Multi-Horizon Technical & Volatility Telemetry Grid */}
          <div className="my-4 p-4 border border-black/20 bg-black/[0.02]">
            <span className="text-[10px] text-black/60 uppercase block font-bold mb-3 tracking-wider">
              [MULTI-HORIZON QUANT INDICATORS]
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">RSI (14-DAY)</span>
                <span className={`text-base font-black ${
                  (stock.prediction.rsi14 || 50) < 30 ? 'text-amber-700 dark:text-amber-400' :
                  (stock.prediction.rsi14 || 50) > 70 ? 'text-rose-700 dark:text-rose-400' : 'text-black'
                }`}>
                  {stock.prediction.rsi14?.toFixed(1) || '50.0'}
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  {(stock.prediction.rsi14 || 50) < 30 ? '[OVERSOLD REBOUND]' :
                   (stock.prediction.rsi14 || 50) > 70 ? '[OVERBOUGHT PULLBACK]' : '[NEUTRAL CHANNEL]'}
                </span>
              </div>

              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">SMA TREND</span>
                <span className="text-base font-black text-black">
                  {stock.prediction.smaTrend === 'UPWARD_EXPANSION' ? 'EXPANSION' :
                   stock.prediction.smaTrend === 'DOWNWARD_DRIFT' ? 'DRIFT' : 'FLAT'}
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  SMA-5: ${stock.prediction.sma5?.toFixed(1) || '—'} // 15: ${stock.prediction.sma15?.toFixed(1) || '—'}
                </span>
              </div>

              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">RELATIVE ALPHA</span>
                <span className={`text-base font-black ${
                  (stock.prediction.relativeAlpha || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  {(stock.prediction.relativeAlpha || 0) >= 0 ? '+' : ''}{stock.prediction.relativeAlpha?.toFixed(2) || '0.00'}%
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  VS TECH COMPOSITE
                </span>
              </div>

              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">HIST. VOLATILITY</span>
                <span className="text-base font-black text-black">
                  {stock.prediction.volatilityAnnualized?.toFixed(1) || '30.0'}%
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  ANNUALIZED SIGMA
                </span>
              </div>
            </div>
          </div>

          {/* 30-Day Quant Channel Target Box */}
          {stock.prediction.expected30dChannel && (
            <div className="my-4 p-4 border border-black/20 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-black/60 uppercase font-bold tracking-wider">
                  [ESTIMATED 30-DAY PRICE CHANNEL]
                </span>
                <span className="text-[10px] text-[#ff8000] font-bold">
                  BASE TARGET: ${stock.prediction.expected30dChannel.base.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-bold py-2 border-y border-black/10">
                <div className="text-rose-700 dark:text-rose-400">
                  <span className="text-[9px] block text-black/50 font-normal">LOWER BOUND</span>
                  <span>${stock.prediction.expected30dChannel.low.toFixed(2)}</span>
                </div>
                <div className="text-center font-black text-black text-sm">
                  <span className="text-[9px] block text-black/50 font-normal">CURRENT</span>
                  <span>${stock.currentPrice.toFixed(2)}</span>
                </div>
                <div className="text-right text-emerald-700 dark:text-emerald-400">
                  <span className="text-[9px] block text-black/50 font-normal">UPPER BOUND</span>
                  <span>${stock.prediction.expected30dChannel.high.toFixed(2)}</span>
                </div>
              </div>

              <p className="mt-2 text-[10px] font-sans text-black/60 leading-relaxed">
                Channel calculated via 21-day diffusion model integrating historical price volatility (σ), directional model drift, and time-decayed research alpha.
              </p>
            </div>
          )}

          {/* Feature Importance Bars */}
          <div className="pt-4 border-t border-black/10">
            <span className="text-[10px] text-black/60 uppercase block font-bold mb-3">
              [MODEL FEATURE WEIGHTS ALLOCATION]
            </span>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>AI News Sentiment & Catalysts</span>
                  <span className="font-bold">{(stock.prediction.featureImportance.newsSentiment * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/10">
                  <div className="h-full bg-black" style={{ width: `${stock.prediction.featureImportance.newsSentiment * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Price Momentum & RSI</span>
                  <span className="font-bold">{(stock.prediction.featureImportance.priceMomentum * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/10">
                  <div className="h-full bg-black" style={{ width: `${stock.prediction.featureImportance.priceMomentum * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Dispatch Frequency & Velocity</span>
                  <span className="font-bold">{(stock.prediction.featureImportance.dispatchVolume * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/10">
                  <div className="h-full bg-black" style={{ width: `${stock.prediction.featureImportance.dispatchVolume * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Model Decision Path */}
          <div className="mt-5 pt-4 border-t border-black/10">
            <div className="flex items-center gap-1.5 text-[10px] text-black/60 uppercase font-bold mb-2">
              <GitBranch className="w-3.5 h-3.5 text-black" />
              <span>ENSEMBLE DECISION PATH</span>
            </div>
            <div className="p-3 bg-black/5 border border-black/15 font-mono text-[11px] space-y-1 text-black/85">
              {stock.prediction.decisionPath.map((path, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-[#ff8000] font-bold">›</span>
                  <span>{path}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Correlated LatentSpace Dispatches */}
        <div className="my-6">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/15">
            <div className="flex items-center gap-2 text-xs font-bold text-black uppercase">
              <Radio className="w-4 h-4 text-[#ff8000]" />
              <span>CORRELATED RESEARCH DISPATCHES ({stock.correlatedArticles.length})</span>
            </div>
            <span className="text-[10px] text-black/60 font-mono">
              REAL-TIME ARXIV & LAB SIGNALS
            </span>
          </div>

          {stock.correlatedArticles.length === 0 ? (
            <p className="text-xs font-sans text-black/50 italic py-4">
              No recent dispatches directly mentioning this ticker's keywords or laboratories.
            </p>
          ) : (
            <div className="space-y-3">
              {stock.correlatedArticles.map((catalyst, idx) => (
                <div key={idx} className="p-3.5 border border-black/20 bg-white hover:border-black transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={catalyst.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-xs sm:text-sm text-black hover:underline leading-snug"
                    >
                      {catalyst.title}
                    </a>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-black/50 mt-0.5" />
                  </div>

                  <p className="mt-1.5 text-[11px] font-sans text-black/75 line-clamp-2">
                    {catalyst.summarySnippet}
                  </p>

                  <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] text-black/60 font-mono flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black">{catalyst.sourceName}</span>
                      <span>•</span>
                      <span>[{catalyst.catalystType}]</span>
                    </div>

                    <div className="font-bold text-black">
                      IMPACT: {catalyst.sentiment >= 0 ? '+' : ''}{catalyst.sentiment.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NFA Warning at bottom */}
        <div className="mt-8 p-4 border border-[#ff8000]/50 bg-[#ff8000]/10 text-black text-xs font-mono">
          <div className="flex items-center gap-2 font-black text-black uppercase tracking-wider mb-1">
            <AlertTriangle className="w-4 h-4 text-[#ff8000] shrink-0" />
            <span>[STRICTLY NOT FINANCIAL ADVICE (NFA)]</span>
          </div>
          <p className="font-sans text-[11px] text-black/80 leading-normal">
            This dossier is generated algorithmically for quantitative research and educational exploration. Neither LatentSpace nor its contributors provide investment advice or solicit transactions.
          </p>
        </div>

      </div>
    </div>
  );
}

