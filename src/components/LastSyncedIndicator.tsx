'use client';

import React, { useState, useEffect, memo } from 'react';

interface LastSyncedIndicatorProps {
  lastSyncedTime: number;
  isSyncing: boolean;
  onSync: () => void;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'JUST NOW';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 10) return 'JUST NOW';
  if (diffSec < 60) return `${diffSec}S AGO`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}M AGO`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}H AGO`;
  return `${Math.floor(diffHours / 24)}D AGO`;
}

/**
 * Isolated leaf component displaying telemetry sync freshness.
 * Encapsulates its own 5s refresh timer so ticking seconds never re-render parent layouts.
 */
export const LastSyncedIndicator = memo(function LastSyncedIndicator({
  lastSyncedTime,
  isSyncing,
  onSync,
}: LastSyncedIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>(() => formatRelativeTime(lastSyncedTime));

  useEffect(() => {
    // Sync immediately when timestamp updates
    setTimeAgo(formatRelativeTime(lastSyncedTime));

    const interval = setInterval(() => {
      setTimeAgo(formatRelativeTime(lastSyncedTime));
    }, 5000);

    return () => clearInterval(interval);
  }, [lastSyncedTime]);

  return (
    <button
      onClick={onSync}
      disabled={isSyncing}
      className="hover:text-black cursor-pointer transition-colors disabled:opacity-40 flex items-center gap-1.5 font-medium font-mono"
      title="Telemetry freshness — click to force immediate sync"
    >
      {isSyncing ? (
        <>
          <span className="inline-block w-1.5 h-1.5 bg-black animate-spin" />
          <span>[SYNCING...]</span>
        </>
      ) : (
        <span>[LAST SYNC: {timeAgo}]</span>
      )}
    </button>
  );
});
