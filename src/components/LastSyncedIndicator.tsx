'use client';

import React, { useState, useEffect, memo } from 'react';
import { getDictionary, Locale } from '@/lib/i18n';

interface LastSyncedIndicatorProps {
  lastSyncedTime: number;
  isSyncing: boolean;
  onSync: () => void;
  locale?: Locale;
}

function formatRelativeTime(timestamp: number, justNowLabel: string): string {
  if (!timestamp) return justNowLabel;
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 10) return justNowLabel;
  if (diffSec < 60) return `${diffSec}S`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}M`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}H`;
  return `${Math.floor(diffHours / 24)}D`;
}

/**
 * Isolated leaf component displaying telemetry sync freshness.
 * Encapsulates its own 5s refresh timer so ticking seconds never re-render parent layouts.
 */
export const LastSyncedIndicator = memo(function LastSyncedIndicator({
  lastSyncedTime,
  isSyncing,
  onSync,
  locale = 'en',
}: LastSyncedIndicatorProps) {
  const dict = getDictionary(locale);
  const [timeAgo, setTimeAgo] = useState<string>(() =>
    formatRelativeTime(lastSyncedTime, dict.nav.justNow)
  );

  useEffect(() => {
    setTimeAgo(formatRelativeTime(lastSyncedTime, dict.nav.justNow));

    const interval = setInterval(() => {
      setTimeAgo(formatRelativeTime(lastSyncedTime, dict.nav.justNow));
    }, 5000);

    return () => clearInterval(interval);
  }, [lastSyncedTime, dict.nav.justNow]);

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
          <span>[{dict.nav.syncing}]</span>
        </>
      ) : (
        <span>
          [{dict.nav.lastSync} {timeAgo}]
        </span>
      )}
    </button>
  );
});
