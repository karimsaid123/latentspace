'use client';

import React from 'react';
import { StockAnalysis } from '@/types/market';

interface TickerTapeProps {
  stocks: StockAnalysis[];
  onSelectStock: (stock: StockAnalysis) => void;
  selectedSymbol?: string;
}

export default function TickerTape({ stocks, onSelectStock, selectedSymbol }: TickerTapeProps) {
  if (!stocks || stocks.length === 0) return null;

  // Duplicate stock array to ensure seamless infinite looping marquee
  const marqueeItems = [...stocks, ...stocks];

  return (
    <div className="w-full border-y-2 border-black bg-white select-none overflow-hidden font-mono text-xs flex items-center relative">
      {/* Sticky left indicator badge */}
      <div className="z-10 bg-white flex items-center gap-2 shrink-0 border-r-2 border-black px-3 sm:px-4 py-2.5 text-[10px] tracking-widest text-[#ff8000] font-black shadow-[3px_0_10px_rgba(0,0,0,0.06)]">
        <span className="w-2 h-2 rounded-full bg-[#ff8000] animate-pulse" />
        <span className="hidden sm:inline">[QUANT TAPE]</span>
        <span className="sm:hidden">[TAPE]</span>
      </div>

      {/* Infinite Horizontal Marquee Track */}
      <div className="overflow-hidden flex-1 relative flex items-center">
        <div 
          className="animate-marquee flex items-center gap-8 py-2.5 pl-4 hover:[animation-play-state:paused]"
          style={{ willChange: 'transform' }}
        >
          {marqueeItems.map((stock, idx) => {
            const isUp = stock.changeAmount > 0;
            const isDown = stock.changeAmount < 0;
            const isSelected = selectedSymbol === stock.symbol;

            return (
              <button
                key={`${stock.symbol}-${idx}`}
                type="button"
                onClick={() => onSelectStock(stock)}
                className={`flex items-center gap-2 shrink-0 cursor-pointer transition-all ${
                  isSelected ? 'opacity-100 font-bold underline underline-offset-4' : 'opacity-85 hover:opacity-100'
                }`}
                title={`Inspect ${stock.symbol} quant analysis & XGBoost signal`}
              >
                <span className="font-bold text-black tracking-wider">
                  ${stock.symbol}
                </span>

                <span className="text-black/85 font-mono text-[11px]">
                  ${stock.currentPrice.toFixed(2)}
                </span>

                <span
                  className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 border ${
                    isUp
                      ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                      : isDown
                      ? 'border-rose-600/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                      : 'border-black/20 bg-black/5 text-black/70'
                  }`}
                >
                  {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
