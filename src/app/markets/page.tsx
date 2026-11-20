'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Search,
  RefreshCw,
} from 'lucide-react';
import { StockAnalysis, MarketOverviewResponse, MarketCategory } from '@/types/market';
import NFADisclaimerBanner from '@/components/NFADisclaimerBanner';
import TickerTape from '@/components/TickerTape';
import StockCard from '@/components/StockCard';
import StockDetailModal from '@/components/StockDetailModal';
import GlobalHeader from '@/components/GlobalHeader';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';

type SortMode = 'DEFAULT' | 'MOST_BULLISH' | 'MOST_BEARISH' | 'MOST_NEWS' | 'BIGGEST_MOVERS';

const MARKETS_API_VERSION = '2';

function hasCompleteMarketSchema(data: MarketOverviewResponse | null | undefined): boolean {
  const firstPred = data?.stocks?.[0]?.prediction;
  return Boolean(
    data?.modelValidation &&
      firstPred?.decisionTree &&
      firstPred?.predictedDirection !== undefined &&
      firstPred?.expectedReturn30dPct !== undefined
  );
}

export default function MarketsPage() {
  const [marketData, setMarketData] = useState<MarketOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | 'ALL'>('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('DEFAULT');
  const [selectedStock, setSelectedStock] = useState<StockAnalysis | null>(null);

  const fetchMarketTelemetry = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const url = isManual
        ? `/api/markets?v=${MARKETS_API_VERSION}&fresh=1&t=${Date.now()}`
        : `/api/markets?v=${MARKETS_API_VERSION}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data: MarketOverviewResponse = await res.json();
      setMarketData(data);
    } catch (err) {
      console.error('Failed to load market telemetry, using fallback', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/markets?v=${MARKETS_API_VERSION}`);
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        let data: MarketOverviewResponse = await res.json();
        if (!hasCompleteMarketSchema(data)) {
          const freshRes = await fetch(
            `/api/markets?v=${MARKETS_API_VERSION}&fresh=1&t=${Date.now()}`,
            { cache: 'no-store' }
          );
          if (freshRes.ok) {
            data = await freshRes.json();
          }
        }
        if (active) setMarketData(data);
      } catch (err) {
        console.error('Failed to load market telemetry, using fallback', err);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredStocks = useMemo(() => {
    if (!marketData) return [];

    const filtered = marketData.stocks.filter((stock) => {
      if (selectedCategory !== 'ALL' && stock.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = stock.symbol.toLowerCase().includes(q);
        const matchesName = stock.companyName.toLowerCase().includes(q);
        const matchesSector = stock.sectorLabel.toLowerCase().includes(q);
        const matchesCatalyst = stock.correlatedArticles.some((a) =>
          a.title.toLowerCase().includes(q)
        );
        if (!matchesSymbol && !matchesName && !matchesSector && !matchesCatalyst) {
          return false;
        }
      }

      return true;
    });

    if (sortMode === 'MOST_BULLISH') {
      return [...filtered].sort(
        (a, b) => (b.prediction.upProbabilityPct ?? 50) - (a.prediction.upProbabilityPct ?? 50)
      );
    }
    if (sortMode === 'MOST_BEARISH') {
      return [...filtered].sort(
        (a, b) => (a.prediction.upProbabilityPct ?? 50) - (b.prediction.upProbabilityPct ?? 50)
      );
    }
    if (sortMode === 'MOST_NEWS') {
      return [...filtered].sort(
        (a, b) => b.correlatedArticles.length - a.correlatedArticles.length
      );
    }
    if (sortMode === 'BIGGEST_MOVERS') {
      return [...filtered].sort(
        (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)
      );
    }

    return filtered;
  }, [marketData, selectedCategory, searchQuery, sortMode]);

  const macro = marketData?.macroRegime;
  const val = marketData?.modelValidation;

  return (
    <div className="min-h-screen bg-[#faf9f6] text-black font-mono selection:bg-black selection:text-white flex flex-col">
      <GlobalHeader active="markets" />

      {marketData && (
        <TickerTape
          stocks={marketData.stocks}
          onSelectStock={(s) => setSelectedStock(s)}
          selectedSymbol={selectedStock?.symbol}
        />
      )}

      <main className="flex-1 max-w-[1700px] mx-auto w-full px-6 sm:px-12 py-8">
        <ScrollReveal yOffset={20}>
          <NFADisclaimerBanner />

          {/* Title & Macro Regime Telemetry */}
          <div className="pb-6 border-b-2 border-black flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-black/60 uppercase tracking-widest mb-2 font-bold">
                <Cpu className="w-4 h-4 text-black" />
                <span>
                  TRAINED HISTOGRAM-XGBOOST // GLASS-BOX DECISION TREES // LIVE NEWS FUSION
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
                Global Tech Markets
              </h1>
              <p className="mt-3 text-xs sm:text-sm font-sans font-medium text-black/70 max-w-3xl leading-relaxed">
                Walk-forward validated Histogram-XGBoost multi-head models combining 1-year OHLCV price structure, CBOE VIX &amp; sector benchmarks, live breaking financial news, and frontier AI research into open, readable decision trees for 30 leading tech equities.
              </p>
            </div>

            {/* Upgraded Macro Telemetry Box */}
            <div className="p-4 border-2 border-black bg-white shrink-0 font-mono text-xs space-y-1.5 min-w-[290px]">
              <div className="text-[10px] text-black/55 font-bold uppercase tracking-wider pb-1 border-b border-black/10 flex items-center justify-between">
                <span>[MACRO &amp; MODEL TELEMETRY]</span>
                <button
                  onClick={() => fetchMarketTelemetry(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-1 text-black hover:opacity-70 cursor-pointer"
                  title="Refresh market telemetry"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>REFRESH</span>
                </button>
              </div>

              {macro && (
                <div className="grid grid-cols-3 gap-2 py-1 border-b border-black/10 text-[10px]">
                  <div>
                    <span className="text-black/50 block">VIX FEAR</span>
                    <span
                      className={`font-black ${
                        macro.vixLevel >= 26
                          ? 'text-rose-700 dark:text-rose-400'
                          : macro.vixLevel < 19
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-black'
                      }`}
                    >
                      {macro.vixLevel.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-black/50 block">QQQ 1D</span>
                    <span
                      className={`font-black ${
                        macro.qqqChange1dPct >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {macro.qqqChange1dPct >= 0 ? '+' : ''}
                      {macro.qqqChange1dPct.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-black/50 block">BREADTH</span>
                    <span className="font-black text-black">{macro.marketBreadthPct}% &gt;20d</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-0.5">
                <span className="text-black/60">LIVE NEWS + PAPERS:</span>
                <span className="font-bold text-black">
                  {marketData?.liveNewsCount ?? 0} LIVE / {marketData?.activeDispatchesCount ?? 0} AI
                </span>
              </div>

              {val && (
                <div className="flex justify-between items-center">
                  <span className="text-black/60">OOS WALK-FORWARD:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {val.directionOosAccuracyPct.toFixed(1)}% DIR · {val.volRegimeOosAccuracyPct.toFixed(1)}% VOL
                  </span>
                </div>
              )}

              <div className="text-[10px] font-bold text-black bg-black/5 px-2 py-1 border border-black/15 text-center mt-1.5 uppercase">
                {macro?.regimeLabel?.replace(/_/g, ' ') || marketData?.macroSentimentLabel || 'CALIBRATING'}
              </div>
            </div>
          </div>

          {/* Search, Sector Filter & Sort Bar */}
          <div className="mt-6 space-y-3">
            <div className="relative flex items-center border-2 border-black bg-white shadow-xs">
              <div className="pl-4 pr-2 text-black/40">
                <Search className="w-5 h-5 text-black" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH TICKER, COMPANY, OR NEWS CATALYST (E.G. 'NVDA', 'SEC', 'ASML', 'BLACKWELL')..."
                className="w-full py-3.5 pr-10 bg-transparent font-mono text-xs sm:text-sm uppercase tracking-wider text-black placeholder-black/35 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="pr-4 text-xs font-bold text-black/50 hover:text-black cursor-pointer"
                >
                  [CLEAR]
                </button>
              )}
            </div>

            {/* Category / Sector Filter */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth overscroll-x-contain -mx-6 px-6 sm:mx-0 sm:px-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <span className="text-[10px] text-black font-bold shrink-0 tracking-wider">
                SECTOR:
              </span>
              {[
                { id: 'ALL', label: 'ALL TECH' },
                { id: 'CHIPS_HARDWARE', label: 'CHIPS & SILICON' },
                { id: 'HYPERSCALERS', label: 'HYPERSCALERS' },
                { id: 'AUTONOMOUS_ROBOTICS', label: 'AUTONOMOUS & ROBOTICS' },
                { id: 'CONSUMER_PLATFORMS', label: 'CONSUMER & PLATFORMS' },
                { id: 'AI_ENTERPRISE', label: 'ENTERPRISE & SAAS' },
                { id: 'CLOUD_CYBER', label: 'CLOUD & CYBER' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as MarketCategory | 'ALL')}
                  className={`h-7.5 sm:h-8 px-2.5 sm:px-3 border text-[10px] sm:text-[11px] font-bold tracking-wider shrink-0 cursor-pointer transition-colors flex items-center justify-center ${
                    selectedCategory === cat.id
                      ? 'border-black bg-black text-[#faf9f6]'
                      : 'border-black/25 bg-white text-black/75 hover:border-black hover:text-black hover:bg-black/5'
                  }`}
                >
                  [{cat.label}]
                </button>
              ))}
            </div>

            {/* Sort Controls */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth overscroll-x-contain -mx-6 px-6 sm:mx-0 sm:px-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <span className="text-[10px] text-black/65 font-bold shrink-0 tracking-wider">
                SORT BY:
              </span>
              {[
                { id: 'DEFAULT', label: 'DEFAULT' },
                { id: 'MOST_BULLISH', label: 'MOST BULLISH ODDS' },
                { id: 'MOST_BEARISH', label: 'MOST BEARISH ODDS' },
                { id: 'MOST_NEWS', label: 'MOST NEWS' },
                { id: 'BIGGEST_MOVERS', label: 'BIGGEST 24H MOVERS' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortMode(s.id as SortMode)}
                  className={`h-7 px-2.5 border text-[10px] font-bold tracking-wider shrink-0 cursor-pointer transition-colors flex items-center justify-center ${
                    sortMode === s.id
                      ? 'border-[#ff8000] bg-[#ff8000]/15 text-black'
                      : 'border-black/20 bg-white text-black/70 hover:border-black hover:text-black'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Stock Grid */}
        <div className="py-8">
          {isLoading ? (
            <div className="py-24 text-center font-mono text-xs text-black/40">
              SYNTHESIZING 1Y OHLCV TELEMETRY, LIVE NEWS &amp; TRAINED XGBOOST TREES...
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="p-16 border-2 border-dashed border-black/20 text-center font-mono">
              <p className="text-sm font-bold text-black uppercase">
                NO TICKERS MATCH CURRENT FILTER CRITERIA
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSortMode('DEFAULT');
                }}
                className="mt-3 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                [RESET ALL FILTERS]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStocks.map((stock) => (
                <StockCard
                  key={stock.symbol}
                  stock={stock}
                  onOpenDetails={(s) => setSelectedStock(s)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
        modelValidation={marketData?.modelValidation}
      />

      <Footer />
    </div>
  );
}
