'use client';

import React from 'react';
import { StockAnalysis } from '@/types/market';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TickerTapeProps {
  stocks: StockAnalysis[];
  onSelectStock: (stock: StockAnalysis) => void;
  selectedSymbol?: string;
}

export default function TickerTape({ stocks, onSelectStock, selectedSymbol }: TickerTapeProps) {
  if (!stocks || stocks.length === 0) return null;

  return (
    <div className="w-full border-y-2 border-black bg-white select-none overflow-hidden font-mono text-xs">
      <div 
        className="flex items-center overflow-x-auto no-scrollbar py-2.5 px-4 sm:px-6 gap-6 sm:gap-8 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-2 shrink-0 border-r border-black/20 pr-4 sm:pr-6 text-[10px] tracking-widest text-[#ff8000] font-black">
          <span className="w-2 h-2 rounded-full bg-[#ff8000] animate-pulse" />
          <span>[QUANT TAPE]</span>
        </div>

        {stocks.map((stock) => {
          const isUp = stock.changeAmount > 0;
          const isDown = stock.changeAmount < 0;
          const isSelected = selectedSymbol === stock.symbol;

          return (
            <button
              key={stock.symbol}
              onClick={() => onSelectStock(stock)}
              className={`flex items-center gap-2 shrink-0 cursor-pointer transition-all hover:opacity-100 ${
                isSelected ? 'opacity-100 font-bold underline underline-offset-4' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <span className="font-bold text-black tracking-wider">
                ${stock.symbol}
              </span>

              <span className="text-black/85 font-mono text-[11px]">
                ${stock.currentPrice.toFixed(2)}
              </span>

              <span
                className={`flex items-center text-[10px] font-bold px-1 py-0.5 border ${
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
  );
}
