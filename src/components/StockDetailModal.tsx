'use client';

import React, { useEffect } from 'react';
import { StockAnalysis, ModelValidationMetrics } from '@/types/market';
import DecisionTreeVisualizer from './DecisionTreeVisualizer';
import {
  Cpu,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Radio,
  AlertTriangle,
} from 'lucide-react';

interface StockDetailModalProps {
  stock: StockAnalysis | null;
  onClose: () => void;
  modelValidation?: ModelValidationMetrics;
}

export default function StockDetailModal({
  stock,
  onClose,
  modelValidation,
}: StockDetailModalProps) {
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
  const pred = stock.prediction;
  const upProb = pred.upProbabilityPct ?? 50;
  const ch = pred.expected30dChannel;
  const chSpan = ch ? Math.max(0.01, ch.high - ch.low) : 1;
  const currentPosPct = ch
    ? Math.min(96, Math.max(4, ((stock.currentPrice - ch.low) / chSpan) * 100))
    : 50;

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
        {/* Top Control Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-black/15 gap-3">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-wider flex-wrap">
            <span className="px-2 py-0.5 border border-black/25 bg-black/5 font-bold text-black">
              [{stock.category.replace('_', ' ')}]
            </span>
            <span className="px-2 py-0.5 border border-black/25 bg-[#ff8000]/10 text-black font-bold">
              [RISK: {pred.riskLevel}]
            </span>
            <span className="text-black/60 hidden sm:inline">
              {'//'} TICKER: {stock.symbol}
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
            <div
              className={`flex items-center gap-1 text-xs font-bold ${
                isUp ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isUp ? '+' : ''}
                {stock.changePercent.toFixed(2)}% ({isUp ? '+' : ''}${stock.changeAmount.toFixed(2)})
              </span>
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
            <span className="font-bold text-black text-sm">
              {stock.volumeFormatted}
              {pred.rvol20 !== undefined && (
                <span className="text-[10px] text-black/60 ml-1">({pred.rvol20.toFixed(1)}x avg)</span>
              )}
            </span>
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

        {/* Interactive Open Glass-Box Decision Tree (Plain English + Raw XGBoost Trees) */}
        <DecisionTreeVisualizer stock={stock} modelValidation={modelValidation} />

        {/* Multi-Head Quantitative Synthesis & Technicals */}
        <div className="my-6 p-5 border-2 border-black bg-white">
          <div className="flex items-center justify-between pb-3 border-b border-black/15 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-black">
              <Cpu className="w-4 h-4 text-black" />
              <span>[XGBOOST MULTI-HEAD TELEMETRY &amp; 30D PRICE CHANNEL]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 border border-black/30 bg-black/5 text-black">
                {upProb.toFixed(1)}% UPSIDE ODDS
              </span>
              <span className="text-xs font-bold px-2 py-0.5 border border-black bg-black text-white">
                {pred.confidencePercent}% CONFIDENCE
              </span>
            </div>
          </div>

          <div className="py-4">
            <div className="text-base sm:text-lg font-black text-black uppercase tracking-wider mb-1.5">
              PHASE: {pred.trajectory.replace(/_/g, ' ')}
            </div>
            <p className="font-sans text-xs sm:text-sm text-black/85 leading-relaxed">
              {pred.thesis}
            </p>
          </div>

          {/* Multi-Horizon Technical & Volatility Telemetry Grid */}
          <div className="my-3 p-4 border border-black/20 bg-black/[0.02]">
            <span className="text-[10px] text-black/60 uppercase block font-bold mb-3 tracking-wider">
              [QUANT INDICATORS &amp; VOLATILITY HEADS]
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">WILDER RSI (14D / 5D)</span>
                <span
                  className={`text-base font-black ${
                    (pred.rsi14 || 50) < 32
                      ? 'text-amber-700 dark:text-amber-400'
                      : (pred.rsi14 || 50) > 70
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-black'
                  }`}
                >
                  {pred.rsi14?.toFixed(1) || '50.0'}{' '}
                  <span className="text-xs font-bold text-black/60">/ {pred.rsi5?.toFixed(0) ?? '—'}</span>
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  {(pred.rsi14 || 50) < 32
                    ? '[OVERSOLD ZONE]'
                    : (pred.rsi14 || 50) > 70
                      ? '[OVERBOUGHT ZONE]'
                      : '[NEUTRAL CHANNEL]'}
                </span>
              </div>

              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">SMA TREND (20D / 200D)</span>
                <span className="text-base font-black text-black">
                  {pred.smaTrend === 'UPWARD_EXPANSION'
                    ? 'EXPANSION ↑'
                    : pred.smaTrend === 'DOWNWARD_DRIFT'
                      ? 'DRIFT ↓'
                      : 'FLAT —'}
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  SMA-20: ${pred.sma20?.toFixed(1) || '—'} · 200: ${pred.sma200?.toFixed(1) || '—'}
                </span>
              </div>

              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">PEER ALPHA PROB (5D)</span>
                <span
                  className={`text-base font-black ${
                    (pred.peerOutperformProbPct ?? 50) >= 52
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : (pred.peerOutperformProbPct ?? 50) <= 48
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-black'
                  }`}
                >
                  {(pred.peerOutperformProbPct ?? 50).toFixed(1)}%
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  VS TECH SECTOR MEDIAN
                </span>
              </div>

              <div className="p-2 border border-black/15 bg-white">
                <span className="text-[9px] text-black/50 block">FORECAST VOLATILITY</span>
                <span className="text-base font-black text-black">
                  {(pred.forecastVolAnnualized ?? pred.volatilityAnnualized ?? 30).toFixed(1)}%
                </span>
                <span className="text-[8px] text-black/50 block mt-0.5">
                  HI-VOL RISK: {(pred.highVolRegimeProbPct ?? 30).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* 30-Day Quant Channel Target Box */}
          {ch && (
            <div className="my-4 p-4 border border-black/20 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-black/60 uppercase font-bold tracking-wider">
                  [CALIBRATED 30-DAY PRICE CHANNEL (80% CONFIDENCE BAND)]
                </span>
                <span className="text-[10px] text-[#d96c00] dark:text-[#ff9933] font-bold">
                  BASE TARGET: ${ch.base.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono font-bold py-2 border-y border-black/10">
                <div className="text-rose-700 dark:text-rose-400">
                  <span className="text-[9px] block text-black/50 font-normal">LOWER BOUND</span>
                  <span>${ch.low.toFixed(2)}</span>
                </div>
                <div className="text-center font-black text-black text-sm">
                  <span className="text-[9px] block text-black/50 font-normal">CURRENT</span>
                  <span>${stock.currentPrice.toFixed(2)}</span>
                </div>
                <div className="text-right text-emerald-700 dark:text-emerald-400">
                  <span className="text-[9px] block text-black/50 font-normal">UPPER BOUND</span>
                  <span>${ch.high.toFixed(2)}</span>
                </div>
              </div>

              {/* Channel position visual bar */}
              <div className="relative h-2 bg-black/10 mt-3 mb-1">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-3.5 bg-[#ff8000] border border-black"
                  style={{ left: `calc(${currentPosPct}% - 5px)` }}
                  title={`Current price $${stock.currentPrice.toFixed(2)}`}
                />
              </div>

              <p className="mt-2 text-[10px] font-sans text-black/60 leading-relaxed">
                Channel width comes from the walk-forward Volatility GBDT regressor (predicted ~{(pred.forecastVolAnnualized ?? pred.volatilityAnnualized ?? 30).toFixed(0)}%/yr swing), validated at ~77.6% 30-day empirical containment.
              </p>
            </div>
          )}

          {/* Dynamic Per-Stock Feature Importance Bars */}
          <div className="pt-4 border-t border-black/10">
            <span className="text-[10px] text-black/60 uppercase block font-bold mb-3">
              [DYNAMIC FEATURE WEIGHTS FOR ${stock.symbol}]
            </span>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Breaking News & Research Sentiment', val: pred.featureImportance.newsSentiment },
                { label: 'Price Momentum, Trend & Stretch', val: pred.featureImportance.priceMomentum },
                { label: 'Volatility & Market Fear Regime', val: pred.featureImportance.volatility },
                { label: 'Headline Volume & Trading Flow', val: pred.featureImportance.dispatchVolume },
                { label: 'Open-Source / AI Lab Benchmark Edge', val: pred.featureImportance.openSourcePressure },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>{item.label}</span>
                    <span className="font-bold">{(item.val * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/10">
                    <div
                      className="h-full bg-black"
                      style={{ width: `${Math.min(100, Math.round(item.val * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Correlated Live News & LatentSpace Dispatches */}
        <div className="my-6">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/15">
            <div className="flex items-center gap-2 text-xs font-bold text-black uppercase">
              <Radio className="w-4 h-4 text-[#ff8000]" />
              <span>CORRELATED NEWS &amp; RESEARCH DISPATCHES ({stock.correlatedArticles.length})</span>
            </div>
            <span className="text-[10px] text-black/60 font-mono">
              LIVE MARKET WIRE + ARXIV SIGNALS
            </span>
          </div>

          {stock.correlatedArticles.length === 0 ? (
            <p className="text-xs font-sans text-black/50 italic py-4">
              No recent dispatches directly matched this ticker&apos;s strict entity rules.
            </p>
          ) : (
            <div className="space-y-3">
              {stock.correlatedArticles.map((catalyst, idx) => {
                const safeUrl =
                  catalyst.url && /^https?:\/\//i.test(catalyst.url) ? catalyst.url : undefined;
                const pts = catalyst.modelImpactPctPts ?? 0;

                return (
                  <div
                    key={`${catalyst.articleId}-${idx}`}
                    className="p-3.5 border border-black/20 bg-white hover:border-black transition-colors"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5 text-[9px] font-mono">
                      <span
                        className={`px-1.5 py-0.5 border font-bold ${
                          catalyst.stream === 'MARKET_NEWS'
                            ? 'border-[#ff8000]/50 bg-[#ff8000]/10 text-[#b85a00] dark:text-[#ff9933]'
                            : 'border-blue-600/35 bg-blue-500/10 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        {catalyst.stream === 'MARKET_NEWS' ? 'LIVE MARKET' : 'AI RESEARCH'}
                      </span>
                      {catalyst.matchType && (
                        <span className="px-1.5 py-0.5 border border-black/15 bg-black/5 text-black/70 font-bold">
                          {catalyst.matchType}
                        </span>
                      )}
                      {catalyst.ageLabel && <span className="text-black/55">{catalyst.ageLabel}</span>}
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      {safeUrl ? (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-xs sm:text-sm text-black hover:underline leading-snug"
                        >
                          {catalyst.title}
                        </a>
                      ) : (
                        <span className="font-bold text-xs sm:text-sm text-black leading-snug">
                          {catalyst.title}
                        </span>
                      )}
                      {safeUrl && <ExternalLink className="w-3.5 h-3.5 shrink-0 text-black/50 mt-0.5" />}
                    </div>

                    {catalyst.summarySnippet && catalyst.summarySnippet !== catalyst.title && (
                      <p className="mt-1.5 text-[11px] font-sans text-black/75 line-clamp-2">
                        {catalyst.summarySnippet}
                      </p>
                    )}

                    <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] text-black/60 font-mono flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-black">{catalyst.sourceName}</span>
                        <span>•</span>
                        <span>[{catalyst.catalystType}]</span>
                        {catalyst.sentimentDrivers?.slice(0, 2).map((d, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-black/5 border border-black/15 text-black/80 text-[9px]"
                          >
                            {d}
                          </span>
                        ))}
                      </div>

                      <div className="font-bold text-black">
                        SENTIMENT: {catalyst.sentiment >= 0 ? '+' : ''}
                        {catalyst.sentiment.toFixed(2)} · MODEL:{' '}
                        <span
                          className={
                            pts > 0.05
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : pts < -0.05
                                ? 'text-rose-700 dark:text-rose-400'
                                : 'text-black'
                          }
                        >
                          {pts > 0 ? '+' : ''}
                          {pts.toFixed(1)}% pts
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            This dossier is generated algorithmically by a walk-forward trained Histogram-XGBoost model for educational research and transparency. Neither LatentSpace nor its contributors provide investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}
