'use client';

import React, { useState } from 'react';
import {
  StockAnalysis,
  ModelValidationMetrics,
  TrainedTreeNodeTrace,
  NewsCatalyst,
} from '@/types/market';
import { FEATURE_META } from '@/lib/xgboost-gbdt';
import {
  GitBranch,
  CheckCircle2,
  CircleDashed,
  TrendingUp,
  TrendingDown,
  Newspaper,
  ExternalLink,
  Cpu,
  ShieldCheck,
  BarChart2,
  ArrowDown,
} from 'lucide-react';

interface DecisionTreeVisualizerProps {
  stock: StockAnalysis;
  modelValidation?: ModelValidationMetrics;
}

function formatImpactPts(pts: number): string {
  const rounded = Math.round(pts * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}% pts`;
}

function formatThresholdVal(featureKey: string | undefined, val: number | undefined): string {
  if (val === undefined) return '—';
  const meta = featureKey ? FEATURE_META[featureKey] : undefined;
  return meta ? meta.format(val) : val.toFixed(2);
}

function BinaryTreeNodeView({
  node,
  isRoot = false,
  onActivePath = true,
}: {
  node: TrainedTreeNodeTrace;
  isRoot?: boolean;
  onActivePath?: boolean;
}) {
  const isLeaf = !node.featureKey || !node.left || !node.right;

  if (isLeaf) {
    const val = node.leafValue ?? node.expectedValue;
    return (
      <div
        className={`p-2 border text-center font-mono text-[10px] transition-all ${
          onActivePath
            ? 'border-[#ff8000] bg-[#ff8000]/15 text-black font-bold ring-1 ring-[#ff8000]/40'
            : 'border-black/20 bg-black/[0.02] text-black/50 opacity-65'
        }`}
      >
        <div className="text-[9px] uppercase tracking-wider">
          {onActivePath ? '✓ LEAF HIT' : 'LEAF'}
        </div>
        <div className="text-xs font-black mt-0.5">
          {val >= 0 ? '+' : ''}
          {val.toFixed(4)}
        </div>
      </div>
    );
  }

  const wentLeft = node.wentLeft === true;
  const wentRight = node.wentLeft === false;

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`w-full max-w-[260px] p-2 border text-center font-mono text-[10px] ${
          onActivePath
            ? 'border-black bg-white text-black shadow-xs'
            : 'border-black/20 bg-black/[0.02] text-black/50 opacity-65'
        }`}
      >
        {isRoot && (
          <span className="text-[8px] uppercase tracking-widest text-[#d96c00] dark:text-[#ff9933] font-bold block">
            ROOT SPLIT
          </span>
        )}
        <div className="font-bold text-[11px] truncate">{node.humanLabel || node.featureKey}</div>
        <div className="text-[10px] text-black/70 mt-0.5">
          Split ≤ {formatThresholdVal(node.featureKey, node.threshold)}
          {onActivePath && node.actualValue !== undefined && (
            <span className="block text-[9px] font-bold text-[#d96c00] dark:text-[#ff9933] mt-0.5">
              Actual: {formatThresholdVal(node.featureKey, node.actualValue)}
            </span>
          )}
        </div>
      </div>

      {/* Connector lines */}
      <div className="w-px h-3 bg-black/25" />
      <div className="w-3/4 h-px bg-black/25" />

      <div className="grid grid-cols-2 gap-2.5 w-full pt-2">
        <div className="flex flex-col items-center">
          <span
            className={`text-[8px] font-mono font-bold px-1.5 py-0.5 mb-1 border ${
              onActivePath && wentLeft
                ? 'border-[#ff8000] bg-[#ff8000]/15 text-black'
                : 'border-black/15 text-black/45'
            }`}
          >
            YES (≤)
          </span>
          <BinaryTreeNodeView
            node={node.left!}
            onActivePath={onActivePath && wentLeft}
          />
        </div>

        <div className="flex flex-col items-center">
          <span
            className={`text-[8px] font-mono font-bold px-1.5 py-0.5 mb-1 border ${
              onActivePath && wentRight
                ? 'border-[#ff8000] bg-[#ff8000]/15 text-black'
                : 'border-black/15 text-black/45'
            }`}
          >
            NO (&gt;)
          </span>
          <BinaryTreeNodeView
            node={node.right!}
            onActivePath={onActivePath && wentRight}
          />
        </div>
      </div>
    </div>
  );
}

function EmbeddedNewsEvidence({ articles }: { articles: NewsCatalyst[] }) {
  if (!articles || articles.length === 0) {
    return (
      <div className="mt-3 p-2.5 border border-dashed border-black/20 bg-black/[0.02] text-[11px] font-sans text-black/60">
        No direct financial headlines or research papers matched this company today, so the News branch kept the probability unchanged (0.0% pts).
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-black/15 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-black/70">
        <span className="flex items-center gap-1.5">
          <Newspaper className="w-3.5 h-3.5 text-[#ff8000]" />
          <span>Exact News &amp; Research Behind This Step ({articles.length})</span>
        </span>
        <span className="text-black/50">Click headline to open</span>
      </div>

      <div className="space-y-1.5">
        {articles.slice(0, 6).map((art, i) => {
          const pts = art.modelImpactPctPts ?? 0;
          const isBull = (art.sentimentLabel || (art.sentiment >= 0.15 ? 'BULLISH' : art.sentiment <= -0.15 ? 'BEARISH' : 'NEUTRAL')) === 'BULLISH';
          const isBear = (art.sentimentLabel || (art.sentiment >= 0.15 ? 'BULLISH' : art.sentiment <= -0.15 ? 'BEARISH' : 'NEUTRAL')) === 'BEARISH';
          const badgeClasses = isBull
            ? 'border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            : isBear
              ? 'border-rose-600/35 bg-rose-500/10 text-rose-800 dark:text-rose-300'
              : 'border-black/20 bg-black/5 text-black/70';

          const safeHref = art.url && /^https?:\/\//i.test(art.url) ? art.url : undefined;

          return (
            <div
              key={`${art.articleId}-${i}`}
              className="p-2.5 border border-black/15 bg-white text-xs flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1 font-mono text-[9px]">
                    <span
                      className={`px-1.5 py-0.5 border font-bold ${
                        art.stream === 'MARKET_NEWS'
                          ? 'border-[#ff8000]/50 bg-[#ff8000]/10 text-[#b85a00] dark:text-[#ff9933]'
                          : 'border-blue-600/35 bg-blue-500/10 text-blue-800 dark:text-blue-300'
                      }`}
                    >
                      {art.stream === 'MARKET_NEWS' ? 'LIVE MARKET' : 'AI RESEARCH'}
                    </span>
                    {art.matchType && (
                      <span className="px-1.5 py-0.5 border border-black/15 bg-black/[0.03] text-black/65 font-bold">
                        {art.matchType}
                      </span>
                    )}
                    <span className="text-black/55">
                      {art.sourceName} {art.ageLabel ? `· ${art.ageLabel}` : ''}
                    </span>
                  </div>

                  {safeHref ? (
                    <a
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans font-bold text-xs text-black hover:underline inline-flex items-start gap-1 leading-snug"
                    >
                      <span>{art.title}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-black/45" />
                    </a>
                  ) : (
                    <span className="font-sans font-bold text-xs text-black leading-snug block">
                      {art.title}
                    </span>
                  )}
                </div>

                <div className={`shrink-0 px-2 py-1 border font-mono text-[10px] font-bold text-right ${badgeClasses}`}>
                  <div>{isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL'}</div>
                  <div className="text-[11px] font-black">{formatImpactPts(pts)}</div>
                </div>
              </div>

              {art.sentimentDrivers && art.sentimentDrivers.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono text-black/50 uppercase">Why:</span>
                  {art.sentimentDrivers.map((drv, dIdx) => (
                    <span
                      key={dIdx}
                      className="text-[9px] font-mono px-1.5 py-0.5 bg-black/5 border border-black/15 text-black/80"
                    >
                      {drv}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DecisionTreeVisualizer({
  stock,
  modelValidation,
}: DecisionTreeVisualizerProps) {
  const [viewMode, setViewMode] = useState<'plain' | 'technical'>('plain');
  const [selectedTreeIdx, setSelectedTreeIdx] = useState(0);

  const tree = stock.prediction.decisionTree;
  if (!tree) return null;

  const pred = stock.prediction;
  const upProb = Math.min(
    99,
    Math.max(
      1,
      tree.finalProbabilityPct ??
        pred.upProbabilityPct ??
        Math.round(Math.min(95, Math.max(5, 50 + pred.signalScore * 28)) * 10) / 10
    )
  );
  const downProb = Math.round((100 - upProb) * 10) / 10;
  const targetPrice = pred.expected30dChannel?.base ?? stock.currentPrice;
  const derived30d =
    stock.currentPrice > 0
      ? Math.round(((targetPrice - stock.currentPrice) / stock.currentPrice) * 1000) / 10
      : 0;
  const exp30d = pred.expectedReturn30dPct ?? derived30d;
  const exp5d = pred.expectedReturn5dPct ?? Math.round(exp30d * Math.sqrt(5 / 21) * 10) / 10;
  const dir =
    pred.predictedDirection ??
    (exp30d >= 0.3 || upProb >= 52.5 ? 'UP' : exp30d <= -0.3 || upProb <= 47.5 ? 'DOWN' : 'FLAT');
  const isBullLean = dir === 'UP';
  const isBearLean = dir === 'DOWN';

  const selectedTree = tree.trainedTrees[selectedTreeIdx] || tree.trainedTrees[0];

  return (
    <div className="my-6 border-2 border-black bg-[#faf9f6] p-4 sm:p-6 font-mono">
      {/* Header + Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/15">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
            <GitBranch className="w-4 h-4 text-[#ff8000]" />
            <span>[OPEN GLASS-BOX DECISION TREE // HOW THIS PREDICTION WAS MADE]</span>
          </div>
          <p className="font-sans text-xs text-black/70 mt-1">
            Full step-by-step transparency showing every checkpoint, rule, and news article used for <strong>${stock.symbol}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('plain')}
            className={`px-2.5 py-1.5 border text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
              viewMode === 'plain'
                ? 'border-black bg-black text-[#faf9f6]'
                : 'border-black/30 bg-white text-black hover:border-black'
            }`}
          >
            [PLAIN ENGLISH TREE]
          </button>
          <button
            type="button"
            onClick={() => setViewMode('technical')}
            className={`px-2.5 py-1.5 border text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${
              viewMode === 'technical'
                ? 'border-black bg-black text-[#faf9f6]'
                : 'border-black/30 bg-white text-black hover:border-black'
            }`}
          >
            [RAW XGBOOST TREES]
          </button>
        </div>
      </div>

      {viewMode === 'plain' ? (
        <div className="pt-5 space-y-6">
          {/* 1. Calibrated Upside vs Downside Odds Meter */}
          <div className="p-4 border-2 border-black bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-black/55 font-bold">
                    FINAL MODEL VERDICT · {tree.horizonLabel}
                  </span>
                  <span className="px-1.5 py-0.5 border border-black bg-black text-[#faf9f6] text-[9px] font-black">
                    {pred.confidencePercent}% CONFIDENCE
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-0.5 border text-xs font-black ${
                      isBullLean
                        ? 'border-emerald-600/50 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
                        : isBearLean
                          ? 'border-rose-600/50 bg-rose-500/12 text-rose-800 dark:text-rose-300'
                          : 'border-blue-600/40 bg-blue-500/10 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {isBullLean
                      ? `↑ PREDICTED RISE ${exp30d >= 0 ? '+' : ''}${exp30d.toFixed(1)}% (30D)`
                      : isBearLean
                        ? `↓ PREDICTED DROP ${exp30d.toFixed(1)}% (30D)`
                        : `↔ SIDEWAYS ${exp30d >= 0 ? '+' : ''}${exp30d.toFixed(1)}% (30D)`}
                  </span>
                  <span className="text-xs font-bold text-black">
                    TARGET: ${targetPrice.toFixed(2)} · 5D EST: {exp5d >= 0 ? '+' : ''}
                    {exp5d.toFixed(1)}%
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-black mt-1.5">
                  {tree.verdictHeadline}
                </h3>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[9px] text-black/55 block">UPSIDE ODDS</span>
                  <span
                    className={`text-xl font-black ${
                      isBullLean
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : isBearLean
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-black'
                    }`}
                  >
                    {upProb.toFixed(1)}%
                  </span>
                </div>
                <div className="h-8 w-px bg-black/15" />
                <div className="text-right">
                  <span className="text-[9px] text-black/55 block">DOWNSIDE ODDS</span>
                  <span className="text-xl font-black text-black/80">
                    {downProb.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Odds Gauge Bar */}
            <div className="relative h-4 w-full border border-black/30 bg-black/5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isBullLean
                    ? 'bg-emerald-600/80'
                    : isBearLean
                      ? 'bg-rose-600/75'
                      : 'bg-blue-600/70'
                }`}
                style={{ width: `${upProb}%` }}
              />
              {/* 50% coin-flip marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
                style={{ left: '50%' }}
                title="50% Neutral Baseline"
              />
            </div>
            <div className="flex justify-between text-[9px] text-black/55 mt-1 font-bold">
              <span>0% BEARISH</span>
              <span>50% COIN FLIP</span>
              <span>100% BULLISH</span>
            </div>

            <p className="mt-3 font-sans text-xs sm:text-sm text-black/85 leading-relaxed">
              {tree.verdictSummary}
            </p>
          </div>

          {/* 2. Bull vs Bear Tug-of-War Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-emerald-600/40 bg-emerald-500/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase pb-2 mb-2.5 border-b border-emerald-600/20">
                <TrendingUp className="w-4 h-4" />
                <span>Pushing Odds UP (Bullish Drivers)</span>
              </div>
              {tree.bullishFactors.length === 0 ? (
                <p className="font-sans text-xs text-black/60 italic">
                  No major positive drivers are pushing odds upward right now.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tree.bullishFactors.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="font-sans">
                        <span className="font-bold text-black block">{f.label}</span>
                        <span className="text-[11px] text-black/70">{f.plainExplanation}</span>
                      </div>
                      <span className="shrink-0 px-1.5 py-0.5 border border-emerald-600/40 bg-white font-mono text-[10px] font-black text-emerald-800 dark:text-emerald-300">
                        {formatImpactPts(f.impactPctPts)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 border border-rose-600/40 bg-rose-500/[0.06]">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 dark:text-rose-300 uppercase pb-2 mb-2.5 border-b border-rose-600/20">
                <TrendingDown className="w-4 h-4" />
                <span>Pulling Odds DOWN (Bearish Drivers)</span>
              </div>
              {tree.bearishFactors.length === 0 ? (
                <p className="font-sans text-xs text-black/60 italic">
                  No major negative drivers are pulling odds downward right now.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tree.bearishFactors.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-2 text-xs">
                      <div className="font-sans">
                        <span className="font-bold text-black block">{f.label}</span>
                        <span className="text-[11px] text-black/70">{f.plainExplanation}</span>
                      </div>
                      <span className="shrink-0 px-1.5 py-0.5 border border-rose-600/40 bg-white font-mono text-[10px] font-black text-rose-800 dark:text-rose-300">
                        {formatImpactPts(f.impactPctPts)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 3. Visual 5-Stage Branching Decision Tree */}
          <div>
            {/* Root Node */}
            <div className="max-w-xl mx-auto p-3 border-2 border-black bg-white text-center">
              <span className="text-[9px] uppercase tracking-widest text-black/55 font-bold block">
                DECISION TREE ROOT · HISTORICAL STARTING POINT
              </span>
              <span className="text-sm font-black text-black">
                START AT {tree.baseProbabilityPct.toFixed(1)}% BASELINE ODDS FOR ${stock.symbol}
              </span>
            </div>

            {tree.steps.map((step) => {
              const stepTone =
                step.sentiment === 'BULLISH'
                  ? {
                      border: 'border-emerald-600/60',
                      bg: 'bg-emerald-500/[0.06]',
                      badge: 'border-emerald-600/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
                    }
                  : step.sentiment === 'BEARISH'
                    ? {
                        border: 'border-rose-600/60',
                        bg: 'bg-rose-500/[0.06]',
                        badge: 'border-rose-600/40 bg-rose-500/15 text-rose-800 dark:text-rose-300',
                      }
                    : {
                        border: 'border-black/40',
                        bg: 'bg-black/[0.03]',
                        badge: 'border-black/25 bg-black/5 text-black/75',
                      };

              return (
                <div key={step.id} className="flex flex-col items-center">
                  {/* Connector line */}
                  <div className="flex flex-col items-center py-1 text-black/40">
                    <div className="w-0.5 h-4 bg-black/25" />
                    <ArrowDown className="w-3.5 h-3.5 -mt-1" />
                  </div>

                  {/* Decision Node Card */}
                  <div className="w-full border-2 border-black bg-white p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-black/10">
                      <div>
                        <span className="text-[10px] font-bold text-[#d96c00] dark:text-[#ff9933] uppercase tracking-wider">
                          CHECKPOINT {step.stepNumber} OF 5 · {step.title}
                        </span>
                        <h4 className="font-sans font-bold text-sm text-black mt-0.5">
                          {step.question}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 border text-[10px] font-black ${stepTone.badge}`}>
                          {formatImpactPts(step.impactPctPts)}
                        </span>
                        <span className="px-2 py-0.5 border border-black bg-black text-[#faf9f6] text-[10px] font-black">
                          → {step.runningProbabilityPct.toFixed(1)}% UP
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 px-2.5 py-1.5 bg-black/[0.03] border border-black/10 text-[11px] font-sans text-black/80">
                      <strong className="font-mono text-[10px] uppercase text-black">Measured:</strong>{' '}
                      {step.measuredSummary}
                    </div>

                    {/* Left vs Right Branch Fork */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {/* Active Chosen Branch */}
                      <div className={`p-3 border-2 ${stepTone.border} ${stepTone.bg}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#ff8000]" />
                            <span>[ACTIVE PATH]</span>
                          </span>
                          <span className="text-[9px] font-bold text-black/60">
                            {step.chosenBranch.condition}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-black mb-1">
                          {step.chosenBranch.label}
                        </div>
                        <p className="font-sans text-[11px] text-black/80 leading-relaxed">
                          {step.chosenBranch.explanation}
                        </p>
                      </div>

                      {/* Untaken Alternative Branch */}
                      <div className="p-3 border border-dashed border-black/25 bg-black/[0.015] opacity-65">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-black/60">
                            <CircleDashed className="w-3.5 h-3.5" />
                            <span>[NOT TAKEN]</span>
                          </span>
                          <span className="text-[9px] text-black/50">
                            {step.alternativeBranch.condition}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-black/75 mb-1">
                          {step.alternativeBranch.label}
                        </div>
                        <p className="font-sans text-[11px] text-black/65 leading-relaxed">
                          {step.alternativeBranch.explanation}
                        </p>
                      </div>
                    </div>

                    {/* News Evidence embedded inside Step 4 */}
                    {step.id === 'NEWS_CATALYSTS' && (
                      <EmbeddedNewsEvidence articles={step.evidenceArticles || []} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Connector to Final Leaf */}
            <div className="flex flex-col items-center py-1 text-black/40">
              <div className="w-0.5 h-4 bg-black/25" />
              <ArrowDown className="w-3.5 h-3.5 -mt-1" />
            </div>

            {/* Final Leaf Node */}
            <div className="p-4 border-2 border-black bg-white text-center">
              <span className="text-[10px] uppercase tracking-widest text-black/60 font-bold block mb-2">
                FINAL DECISION LEAF · STEP-BY-STEP CALCULATION
              </span>
              <div className="flex items-center justify-center flex-wrap gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-1 border border-black/20 bg-black/5 font-bold">
                  Base {tree.baseProbabilityPct.toFixed(1)}%
                </span>
                {tree.steps.map((s) => (
                  <React.Fragment key={s.id}>
                    <span className="text-black/40">→</span>
                    <span className="px-2 py-1 border border-black/20 bg-white font-bold">
                      S{s.stepNumber}: {s.impactPctPts >= 0 ? '+' : ''}
                      {s.impactPctPts.toFixed(1)}
                    </span>
                  </React.Fragment>
                ))}
                <span className="text-black/40">=</span>
                <span className="px-2.5 py-1 border border-black bg-black text-[#faf9f6] font-black text-xs">
                  {tree.finalProbabilityPct.toFixed(1)}% UPSIDE ({stock.prediction.trajectory.replace(/_/g, ' ')})
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TECHNICAL VIEW: Walk-Forward Scorecard + Exact Saabas Attributions + Real Binary XGBoost Trees */
        <div className="pt-5 space-y-6">
          {/* 1. Out-of-Sample Walk-Forward Scorecard */}
          {modelValidation && (
            <div className="p-4 border-2 border-black bg-white">
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-black/15 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                  <ShieldCheck className="w-4 h-4 text-[#ff8000]" />
                  <span>4-Fold Purged Walk-Forward Validation ({modelValidation.modelVersion})</span>
                </span>
                <span className="text-[10px] text-black/60">
                  {modelValidation.trainingSamples.toLocaleString()} train rows · {modelValidation.validationSamples.toLocaleString()} strict OOS rows
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 border border-black/15 bg-black/[0.02]">
                  <span className="text-[9px] text-black/55 block">5D DIRECTION OOS</span>
                  <span className="text-base font-black text-black">
                    {modelValidation.directionOosAccuracyPct.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 block font-bold">
                    vs {modelValidation.oldHeuristicOosAccuracyPct.toFixed(2)}% legacy
                  </span>
                </div>

                <div className="p-2.5 border border-black/15 bg-black/[0.02]">
                  <span className="text-[9px] text-black/55 block">PEER ALPHA OOS</span>
                  <span className="text-base font-black text-black">
                    {modelValidation.alphaOosAccuracyPct.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-black/55 block">
                    vs tech peer median
                  </span>
                </div>

                <div className="p-2.5 border border-black/15 bg-black/[0.02]">
                  <span className="text-[9px] text-black/55 block">VOL REGIME OOS</span>
                  <span className="text-base font-black text-black">
                    {modelValidation.volRegimeOosAccuracyPct.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-black/55 block">
                    Vol R² = {modelValidation.volRegressorOosR2.toFixed(2)}
                  </span>
                </div>

                <div className="p-2.5 border border-black/15 bg-black/[0.02]">
                  <span className="text-[9px] text-black/55 block">30D 80% CI COVERAGE</span>
                  <span className="text-base font-black text-black">
                    {modelValidation.channel80CoveragePct.toFixed(1)}%
                  </span>
                  <span className="text-[9px] text-emerald-700 dark:text-emerald-400 block font-bold">
                    vs {modelValidation.oldChannelCoveragePct.toFixed(1)}% legacy
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Exact Tree-Path (Saabas) Feature Attribution Table */}
          <div className="p-4 border border-black/25 bg-white">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/15">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                <BarChart2 className="w-4 h-4 text-[#ff8000]" />
                <span>Exact Tree-Path Feature Attributions (Log-Odds &amp; % pts)</span>
              </span>
              <span className="text-[10px] text-black/55">Sum matches final output</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-black/15 text-[9px] text-black/55 uppercase">
                    <th className="py-1.5 pr-3">Feature</th>
                    <th className="py-1.5 pr-3">Measured Value</th>
                    <th className="py-1.5 pr-3 text-right">Log-Odds Δ</th>
                    <th className="py-1.5 text-right">Odds Shift</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {tree.featureAttributions.map((fa) => (
                    <tr key={fa.key}>
                      <td className="py-1.5 pr-3 font-bold text-black">{fa.label}</td>
                      <td className="py-1.5 pr-3 text-black/75">{fa.valueFormatted}</td>
                      <td className="py-1.5 pr-3 text-right font-bold">
                        {fa.logOddsImpact >= 0 ? '+' : ''}
                        {fa.logOddsImpact.toFixed(4)}
                      </td>
                      <td
                        className={`py-1.5 text-right font-black ${
                          fa.pctPtsImpact > 0.05
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : fa.pctPtsImpact < -0.05
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-black/60'
                        }`}
                      >
                        {formatImpactPts(fa.pctPtsImpact)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Interactive Trained Binary XGBoost Tree Diagrams (Top 6 Contributing Trees) */}
          {tree.trainedTrees.length > 0 && (
            <div className="p-4 border border-black/25 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-black/15">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                  <Cpu className="w-4 h-4 text-[#ff8000]" />
                  <span>Top Contributing Trained XGBoost Trees (Depth 2)</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {tree.trainedTrees.map((tr, idx) => (
                    <button
                      key={tr.treeIndex}
                      type="button"
                      onClick={() => setSelectedTreeIdx(idx)}
                      className={`px-2 py-1 border text-[10px] font-bold cursor-pointer transition-colors ${
                        selectedTreeIdx === idx
                          ? 'border-black bg-black text-[#faf9f6]'
                          : 'border-black/25 bg-white text-black hover:border-black'
                      }`}
                    >
                      Tree #{tr.treeIndex} ({tr.contributionLogOdds >= 0 ? '+' : ''}
                      {tr.contributionLogOdds.toFixed(3)})
                    </button>
                  ))}
                </div>
              </div>

              {selectedTree && (
                <div>
                  <div className="mb-4 text-[11px] text-black/75 flex items-center justify-between flex-wrap gap-2">
                    <span>
                      Showing actual split thresholds learned during 5-year training for{' '}
                      <strong>Tree #{selectedTree.treeIndex}</strong>
                    </span>
                    <span className="font-bold text-black">
                      Leaf Weight: {selectedTree.leafValue >= 0 ? '+' : ''}
                      {selectedTree.leafValue.toFixed(4)} → Contribution:{' '}
                      {selectedTree.contributionLogOdds >= 0 ? '+' : ''}
                      {selectedTree.contributionLogOdds.toFixed(4)} log-odds (
                      {formatImpactPts(selectedTree.contributionPctPts)})
                    </span>
                  </div>

                  <div className="overflow-x-auto pb-2">
                    <div className="min-w-[460px]">
                      <BinaryTreeNodeView node={selectedTree.root} isRoot onActivePath />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
