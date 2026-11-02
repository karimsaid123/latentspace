'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

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
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 border border-black/35 hover:border-black transition-colors cursor-pointer opacity-70 ${className}`}
      >
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black/70 stroke-[2.2]" />
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 border border-black/35 hover:border-black hover:bg-black/[0.04] transition-colors cursor-pointer select-none ${className}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ff8000] stroke-[2.2]" />
      ) : (
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[2.2]" />
      )}
    </button>
  );
}
