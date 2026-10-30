'use client';

import React, { useState, useEffect, memo } from 'react';

interface LiveClockProps {
  className?: string;
  useLocaleDefault?: boolean;
  prefix?: string;
}

/**
 * Isolated 1Hz clock component so ticking seconds never trigger
 * re-renders in parent pages, charts, or article lists.
 */
const LiveClock = memo(function LiveClock({
  className = '',
  useLocaleDefault = false,
  prefix = '',
}: LiveClockProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString(useLocaleDefault ? undefined : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [useLocaleDefault]);

  return (
    <span className={className}>
      {prefix}
      {time || '--:--:--'}
    </span>
  );
});

export default LiveClock;
