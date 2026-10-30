'use client';

import React, { useState, useEffect } from 'react';

export default function Footer() {
  const [deviceTime, setDeviceTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setDeviceTime(
        new Date().toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="w-full border-t border-black/10 py-16 font-mono text-[9px] uppercase tracking-widest text-black/50 select-none">
      <div className="max-w-[1700px] mx-auto px-6 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span>LATENT SPACE // AUTONOMOUS AI INTELLIGENCE</span>
        <span className="flex items-center gap-2 text-black/80 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>DEVICE TIME: {deviceTime || '--:--:--'}</span>
        </span>
        <span>SAN FRANCISCO // LONDON // PARIS // TOKYO</span>
        <span>EDITION: 2026</span>
      </div>
    </footer>
  );
}
