'use client';

import React, { useState, useEffect, memo } from 'react';
import type { VectorMomentumStatus, VectorPulseSnapshot } from '@/types';
import { getDictionary, Locale } from '@/lib/i18n';

interface VectorPulseProps {
  snapshot: VectorPulseSnapshot;
  selectedVectorId: string | null;
  onSelectVector: (vectorId: string | null) => void;
  onClose: () => void;
  lastSyncedTime?: number;
  locale?: Locale;
}

function formatSyncAge(lastSyncedTime?: number, nowMs?: number): string {
  if (!lastSyncedTime || !nowMs || lastSyncedTime <= 0) return 'LIVE TELEMETRY';
  const diffMin = Math.max(0, Math.floor((nowMs - lastSyncedTime) / 60_000));
  if (diffMin < 1) return 'UPDATED: JUST NOW';
  if (diffMin === 1) return 'UPDATED: 1 MIN AGO';
  if (diffMin < 60) return `UPDATED: ${diffMin} MIN AGO`;
  const hrs = Math.floor(diffMin / 60);
  return `UPDATED: ${hrs}H AGO`;
}

function getStatusBadgeClass(status: VectorMomentumStatus, isSelected: boolean): string {
  if (isSelected) {
    return 'text-[#ff8000] font-bold';
  }
  switch (status) {
    case 'SURGING':
      return 'text-[#ff8000] font-bold';
    case 'HIGH':
      return 'text-[#00aa66] font-bold';
    case 'ACTIVE':
      return 'text-black font-bold';
    case 'STABLE':
      return 'text-black/60';
    case 'COOLING':
      return 'text-black/45';
  }
}

const VectorPulse = memo(function VectorPulse({
  snapshot,
  selectedVectorId,
  onSelectVector,
  onClose,
  lastSyncedTime,
  locale = 'en',
}: VectorPulseProps) {
  const [showAll, setShowAll] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);
  const dict = getDictionary(locale);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    const initTimer = setTimeout(updateNow, 0);
    const interval = setInterval(updateNow, 30_000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [lastSyncedTime]);

  if (!snapshot || !snapshot.vectors || snapshot.vectors.length === 0) {
    return null;
  }

  const visibleVectors = showAll ? snapshot.vectors : snapshot.vectors.slice(0, 5);
  const activeVector = selectedVectorId
    ? snapshot.vectors.find((v) => v.id === selectedVectorId)
    : undefined;

  return (
    <div
      role="dialog"
      aria-label="Research Vector Pulse"
      className="w-full bg-[#faf9f6] text-black border border-black shadow-2xl px-3.5 sm:px-4 py-3 font-mono animate-fade-in select-none"
    >
      {/* Top Header Line */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-black text-[9px] sm:text-[9.5px] tracking-widest uppercase">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff8000] shrink-0" />
          <span className="font-bold text-black truncate">
            {dict.pulse.title} // {snapshot.windowDays}D {dict.pulse.momentum}
          </span>
          <span className="text-black/45 shrink-0">[N={snapshot.corpusSize}]</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-black/60 hover:text-black transition-colors cursor-pointer font-bold shrink-0"
        >
          {dict.pulse.close}
        </button>
      </div>

      {/* Vector Rows */}
      <div className="divide-y divide-black/10 py-0.5">
        {visibleVectors.map((item, idx) => {
          const rank = String(idx + 1).padStart(2, '0');
          const isSelected = selectedVectorId === item.id;
          const isPositive = item.deltaPct >= 0;
          const signedDelta = `${isPositive ? '+' : ''}${item.deltaPct}%`;
          const arrow = isPositive ? '▲' : '▼';

          const barCount12 = Math.max(1, Math.min(12, Math.round(item.barBlocks * 0.6)));
          const barFilled12 = '█'.repeat(barCount12);
          const barEmpty12 = '░'.repeat(12 - barCount12);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectVector(isSelected ? null : item.id);
                onClose();
              }}
              aria-pressed={isSelected}
              className={`w-full text-left py-1.5 px-1.5 transition-colors cursor-pointer grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:gap-2.5 text-[9.5px] sm:text-[10px] tracking-wider ${
                isSelected ? 'bg-black text-[#faf9f6]' : 'hover:bg-black/[0.04] text-black'
              }`}
            >
              {/* Column 1: Rank + Vector Label + Corpus Hits */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`shrink-0 ${
                    isSelected ? 'text-[#ff8000] font-bold' : 'text-black/45'
                  }`}
                >
                  {rank}.
                </span>
                <span className="font-bold truncate">{item.label}</span>
                <span
                  className={`text-[8.5px] shrink-0 ${
                    isSelected ? 'opacity-70' : 'text-black/40'
                  }`}
                  title={`${item.recentCount} recent / ${item.baselineCount} baseline publications`}
                >
                  ({item.totalCount})
                </span>
              </div>

              {/* Column 2: Compact 12-block ASCII Density Bar */}
              <div className="hidden sm:flex items-center tracking-normal text-[9.5px] shrink-0">
                <span className={isSelected ? 'opacity-50' : 'text-black/35'}>[</span>
                <span
                  className={
                    isSelected || item.status === 'SURGING' ? 'text-[#ff8000]' : 'text-black'
                  }
                >
                  {barFilled12}
                </span>
                <span className={isSelected ? 'opacity-25' : 'text-black/15'}>
                  {barEmpty12}
                </span>
                <span className={isSelected ? 'opacity-50' : 'text-black/35'}>]</span>
              </div>

              {/* Column 3: Delta % + Direction + Status Tag */}
              <div className="flex items-center justify-end gap-1.5 shrink-0 tabular-nums">
                <span className="font-bold w-[42px] text-right">{signedDelta}</span>
                <span
                  className={
                    isPositive
                      ? isSelected
                        ? 'text-[#ff8000]'
                        : item.status === 'SURGING'
                          ? 'text-[#ff8000]'
                          : 'text-[#00aa66]'
                      : isSelected
                        ? 'opacity-70'
                        : 'text-black/45'
                  }
                >
                  {arrow}
                </span>
                <span
                  className={`w-[66px] text-right hidden sm:inline-block ${getStatusBadgeClass(
                    item.status,
                    isSelected
                  )}`}
                >
                  [{isSelected ? 'ACTIVE' : item.status}]
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Control Strip */}
      <div className="pt-2 border-t border-black flex flex-wrap items-center justify-between gap-2 text-[8.5px] sm:text-[9px] tracking-widest uppercase text-black/55">
        <div className="flex flex-wrap items-center gap-3">
          {activeVector ? (
            <button
              type="button"
              onClick={() => {
                onSelectVector(null);
                onClose();
              }}
              className="text-[#ff8000] hover:underline font-bold cursor-pointer"
            >
              {dict.pulse.clearActive}
            </button>
          ) : (
            <span>{dict.pulse.selectToFilter}</span>
          )}

          {snapshot.vectors.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="text-black/75 hover:text-black font-bold cursor-pointer transition-colors"
            >
              [{showAll ? dict.pulse.top5 : `${dict.pulse.allVectors} ${snapshot.vectors.length} +`}]
            </button>
          )}
        </div>

        <div className="text-black/45">{formatSyncAge(lastSyncedTime, nowMs)}</div>
      </div>
    </div>
  );
});

export default VectorPulse;
