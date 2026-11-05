'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  Search, 
  RefreshCw, 
  Filter, 
  Radio, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StockAnalysis, MarketOverviewResponse, MarketCategory } from '@/types/market';
import NFADisclaimerBanner from '@/components/NFADisclaimerBanner';
import TickerTape from '@/components/TickerTape';
import StockCard from '@/components/StockCard';
import StockDetailModal from '@/components/StockDetailModal';
import GlobalHeader from '@/components/GlobalHeader';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';

export default function MarketsPage() {
  const [marketData, setMarketData] = useState<MarketOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory | 'ALL'>('ALL');
  const [selectedStock, setSelectedStock] = useState<StockAnalysis | null>(null);

  // Fetch telemetry from /api/markets
  const fetchMarketTelemetry = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const url = isManual ? `/api/markets?fresh=1&t=${Date.now()}` : '/api/markets';
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
    fetchMarketTelemetry();
  }, []);

  // Filter stocks based on search and filters
  const filteredStocks = useMemo(() => {
    if (!marketData) return [];

    return marketData.stocks.filter((stock) => {
      // Category filter
      if (selectedCategory !== 'ALL' && stock.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = stock.symbol.toLowerCase().includes(q);
        const matchesName = stock.companyName.toLowerCase().includes(q);
        const matchesSector = stock.sectorLabel.toLowerCase().includes(q);
        const matchesCatalyst = stock.correlatedArticles.some(a => a.title.toLowerCase().includes(q));
        if (!matchesSymbol && !matchesName && !matchesSector && !matchesCatalyst) {
          return false;
        }
      }

      return true;
    });
  }, [marketData, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-black font-mono selection:bg-black selection:text-white flex flex-col">
      {/* Unified Zero-Shift Global Navigation */}
      <GlobalHeader active="markets" />

      {/* Ticker Tape Strip */}
      {marketData && (
        <TickerTape
          stocks={marketData.stocks}
          onSelectStock={(s) => setSelectedStock(s)}
          selectedSymbol={selectedStock?.symbol}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-[1700px] mx-auto w-full px-6 sm:px-12 py-8">
        <ScrollReveal yOffset={20}>
          {/* NFA Disclaimer Banner */}
          <NFADisclaimerBanner />

          {/* Title & Description */}
          <div className="pb-6 border-b-2 border-black flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-black/60 uppercase tracking-widest mb-2 font-bold">
                <Cpu className="w-4 h-4 text-black" />
                <span>GLOBAL TECH & SILICON // RESEARCH CORRELATION // XGBOOST GBDT</span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-black leading-none">
                Global Tech Markets
              </h1>
              <p className="mt-3 text-xs sm:text-sm font-sans font-medium text-black/70 max-w-3xl leading-relaxed">
                Comprehensive algorithmic synthesis correlating frontier AI research, compute scaling laws, and technological catalysts with 30 leading tech equities across semiconductors, hyperscalers, autonomous robotics, cybersecurity, and enterprise cloud platforms.
              </p>
            </div>

            {/* Macro Telemetry Box */}
            <div className="p-4 border border-black bg-white shrink-0 font-mono text-xs space-y-1.5 min-w-[260px]">
              <div className="text-[10px] text-black/50 font-bold uppercase tracking-wider pb-1 border-b border-black/10 flex items-center justify-between">
                <span>[MACRO REGIME]</span>
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

              <div className="flex justify-between items-center pt-1">
                <span className="text-black/60">DISPATCHES CORRELATED:</span>
                <span className="font-bold text-black">{marketData?.activeDispatchesCount || 0}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-black/60">MACRO SENTIMENT:</span>
                <span className={`font-bold ${
                  (marketData?.macroSentimentScore || 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  {(marketData?.macroSentimentScore || 0) >= 0 ? '+' : ''}{marketData?.macroSentimentScore?.toFixed(2) || '0.00'}
                </span>
              </div>

              <div className="text-[10px] font-bold text-black bg-black/5 px-2 py-1 border border-black/15 text-center mt-2 uppercase">
                {marketData?.macroSentimentLabel || 'CALIBRATING'}
              </div>
            </div>
          </div>

          {/* Instant Search & Filter Bar */}
          <div className="mt-6 space-y-4">
            <div className="relative flex items-center border-2 border-black bg-white shadow-xs">
              <div className="pl-4 pr-2 text-black/40">
                <Search className="w-5 h-5 text-black" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH TICKER OR COMPANY (E.G. 'NVDA', 'MICROSOFT', 'TSMC', 'BLACKWELL')..."
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
                { id: 'CLOUD_CYBER', label: 'CLOUD & CYBER' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
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
          </div>
        </ScrollReveal>

        {/* Stock Grid */}
        <div className="py-8">
          {isLoading ? (
            <div className="py-24 text-center font-mono text-xs text-black/40">
              SYNTHESIZING MARKET TELEMETRY & RUNNING GBDT ENSEMBLE...
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

      {/* Stock Detail Modal */}
      <StockDetailModal
        stock={selectedStock}
        onClose={() => setSelectedStock(null)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

