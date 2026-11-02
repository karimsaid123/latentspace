'use client';

import React, { useState, useEffect, memo } from 'react';
import type { VectorMomentumStatus, VectorPulseSnapshot } from '@/types';

interface VectorPulseProps {
  snapshot: VectorPulseSnapshot;
  selectedVectorId: string | null;
  onSelectVector: (vectorId: string | null) => void;
  lastSyncedTime?: number;
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
  lastSyncedTime,
}: VectorPulseProps) {
  const [showAll, setShowAll] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

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
    <section
      aria-label="Research Vector Pulse"
      className="w-full max-w-[1700px] mx-auto px-6 sm:px-12 pt-6 pb-2 select-none"
    >
      <div className="border border-black/20 bg-black/[0.01] px-4 sm:px-6 py-4 font-mono">
        {/* Top Header Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-black text-[9.5px] sm:text-[10.5px] tracking-widest uppercase">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#ff8000] shrink-0" />
            <span className="font-bold text-black truncate">
              RESEARCH VECTOR PULSE // {snapshot.windowDays}-DAY PARADIGM MOMENTUM
            </span>
            <span className="hidden md:inline text-black/50">
              [N={snapshot.corpusSize} ENTRIES]
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="md:hidden text-black/50">[N={snapshot.corpusSize}]</span>
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="text-black/60 hover:text-black transition-colors cursor-pointer font-bold"
            >
              [{isCollapsed ? 'EXPAND +' : 'MINIMIZE −'}]
            </button>
          </div>
        </div>

        {/* Vector Rows */}
        {!isCollapsed && (
          <>
            <div className="divide-y divide-black/10 py-1">
              {visibleVectors.map((item, idx) => {
                const rank = String(idx + 1).padStart(2, '0');
                const isSelected = selectedVectorId === item.id;
                const isPositive = item.deltaPct >= 0;
                const signedDelta = `${isPositive ? '+' : ''}${item.deltaPct}%`;
                const arrow = isPositive ? '▲' : '▼';

                const fullFilled = '█'.repeat(item.barBlocks);
                const fullEmpty = '░'.repeat(Math.max(0, 20 - item.barBlocks));

                const mobileBlocks = Math.max(1, Math.min(10, Math.round(item.barBlocks / 2)));
                const mobileFilled = '█'.repeat(mobileBlocks);
                const mobileEmpty = '░'.repeat(Math.max(0, 10 - mobileBlocks));

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectVector(isSelected ? null : item.id)}
                    aria-pressed={isSelected}
                    className={`w-full text-left py-2 px-2 -mx-2 transition-colors cursor-pointer grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1.35fr)_auto_auto] items-center gap-2 sm:gap-4 text-[10px] sm:text-[11px] tracking-wider ${
                      isSelected
                        ? 'bg-black text-[#faf9f6]'
                        : 'hover:bg-black/[0.04] text-black'
                    }`}
                  >
                    {/* Column 1: Rank + Vector Label + Corpus Hits */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 ${
                          isSelected ? 'text-[#ff8000] font-bold' : 'text-black/45'
                        }`}
                      >
                        {rank}.
                      </span>
                      <span className="font-bold truncate">{item.label}</span>
                      <span
                        className={`text-[9px] shrink-0 ${
                          isSelected ? 'opacity-70' : 'text-black/40'
                        }`}
                        title={`${item.recentCount} recent / ${item.baselineCount} baseline publications`}
                      >
                        ({item.totalCount})
                      </span>
                    </div>

                    {/* Column 2: ASCII Density Bar (Desktop 20-block, Mobile 10-block) */}
                    <div className="hidden lg:flex items-center tracking-normal text-[11px] shrink-0">
                      <span className={isSelected ? 'opacity-50' : 'text-black/35'}>[</span>
                      <span
                        className={
                          isSelected || item.status === 'SURGING'
                            ? 'text-[#ff8000]'
                            : 'text-black'
                        }
                      >
                        {fullFilled}
                      </span>
                      <span className={isSelected ? 'opacity-25' : 'text-black/15'}>
                        {fullEmpty}
                      </span>
                      <span className={isSelected ? 'opacity-50' : 'text-black/35'}>]</span>
                    </div>

                    {/* Column 3: Delta % + Direction + Status Tag */}
                    <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0 tabular-nums">
                      <span className="lg:hidden hidden sm:inline tracking-normal text-[10px]">
                        <span className={isSelected ? 'opacity-50' : 'text-black/35'}>[</span>
                        <span
                          className={
                            isSelected || item.status === 'SURGING'
                              ? 'text-[#ff8000]'
                              : 'text-black'
                          }
                        >
                          {mobileFilled}
                        </span>
                        <span className={isSelected ? 'opacity-25' : 'text-black/15'}>
                          {mobileEmpty}
                        </span>
                        <span className={isSelected ? 'opacity-50' : 'text-black/35'}>]</span>
                      </span>

                      <span className="font-bold w-[52px] text-right">{signedDelta}</span>
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
                        className={`w-[78px] text-right hidden sm:inline-block ${getStatusBadgeClass(
                          item.status,
                          isSelected
                        )}`}
                      >
                        [{isSelected ? 'FILTERED' : item.status}]
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Control Strip */}
            <div className="pt-2.5 border-t-2 border-black flex flex-wrap items-center justify-between gap-2 text-[9px] sm:text-[9.5px] tracking-widest uppercase text-black/55">
              <div className="flex flex-wrap items-center gap-3">
                {activeVector ? (
                  <>
                    <span className="text-black font-bold">
                      ACTIVE VECTOR: [{activeVector.label}]
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectVector(null)}
                      className="text-[#ff8000] hover:underline font-bold cursor-pointer"
                    >
                      [CLEAR VECTOR ✕]
                    </button>
                  </>
                ) : (
                  <span>[CLICK ANY VECTOR TO FILTER FEED]</span>
                )}

                {snapshot.vectors.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((prev) => !prev)}
                    className="text-black/70 hover:text-black font-bold cursor-pointer transition-colors"
                  >
                    [{showAll ? 'SHOW TOP 5 −' : `ALL ${snapshot.vectors.length} VECTORS +`}]
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-black/45">
                <span className="hidden sm:inline">
                  WINDOW: {snapshot.recentWindowHours}H VS PRIOR BASELINE //
                </span>
                <span>{formatSyncAge(lastSyncedTime, nowMs)}</span>
              </div>
            </div>
          </>
        )}

        {/* Collapsed Active Indicator */}
        {isCollapsed && activeVector && (
          <div className="pt-2.5 flex items-center justify-between gap-2 text-[9.5px] tracking-widest uppercase">
            <span className="text-black font-bold">
              FILTERING BY VECTOR: [{activeVector.label}] ({activeVector.totalCount})
            </span>
            <button
              type="button"
              onClick={() => onSelectVector(null)}
              className="text-[#ff8000] font-bold hover:underline cursor-pointer"
            >
              [CLEAR ✕]
            </button>
          </div>
        )}
      </div>
    </section>
  );
});

export default VectorPulse;
