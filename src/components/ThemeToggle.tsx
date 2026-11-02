'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') ||
      (!localStorage.getItem('latentspace-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
      localStorage.getItem('latentspace-theme') === 'dark';

    if (isDark) {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('latentspace-theme')) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          setTheme('dark');
        } else {
          document.documentElement.classList.remove('dark');
          setTheme('light');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('latentspace-theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!isMounted) {
    return (
      <button
        aria-label="Toggle Theme"
        className={`border border-black/35 px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono font-bold tracking-wider whitespace-nowrap cursor-pointer opacity-70 flex items-center gap-1.5 ${className}`}
      >
        <span className="text-[#ff8000]">☾</span>
        <span className="sm:hidden">DARK</span>
        <span className="hidden sm:inline">DARK MODE</span>
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`border border-black/35 hover:border-black px-2 py-0.5 sm:px-2.5 sm:py-1 text-black font-mono font-bold tracking-wider hover:bg-black/[0.04] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${className}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="text-[#ff8000] text-xs sm:text-sm">{isDark ? '☀' : '☾'}</span>
      <span className="sm:hidden">{isDark ? 'LIGHT' : 'DARK'}</span>
      <span className="hidden sm:inline">{isDark ? 'LIGHT MODE' : 'DARK MODE'}</span>
    </button>
  );
}
