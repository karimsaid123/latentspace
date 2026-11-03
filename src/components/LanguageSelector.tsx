'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { LOCALES, Locale, isRTL, isValidLocale, DEFAULT_LOCALE } from '@/lib/i18n';
import { Globe } from 'lucide-react';

const emptySubscribe = () => () => {};

interface LanguageSelectorProps {
  currentLocale: Locale;
  onSelectLocale: (locale: Locale) => void;
  className?: string;
}

export default function LanguageSelector({
  currentLocale,
  onSelectLocale,
  className = '',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeConfig = LOCALES[currentLocale] || LOCALES[DEFAULT_LOCALE];

  if (!isMounted) {
    return (
      <div
        className={`h-7 sm:h-8 px-2 flex items-center justify-center shrink-0 border border-black/35 font-mono text-[10px] sm:text-[11px] font-bold text-black opacity-70 ${className}`}
      >
        <span>EN</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative shrink-0 font-mono ${className}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label="Select Language"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-7 sm:h-8 px-2 sm:px-2.5 flex items-center gap-1.5 shrink-0 border border-black/35 hover:border-black hover:bg-black/[0.04] transition-colors cursor-pointer text-black font-bold text-[10px] sm:text-[11px] tracking-wider"
        title="Select Interface & Briefing Language"
      >
        <Globe className="w-3.5 h-3.5 text-black/70 stroke-[2]" />
        <span>{activeConfig.label}</span>
        <span className="text-[9px] text-black/50">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-44 bg-[#faf9f6] text-black border border-black shadow-2xl z-50 py-1 font-mono text-[10px] tracking-wider divide-y divide-black/10 animate-fade-in"
        >
          {Object.values(LOCALES).map((loc) => {
            const isSelected = loc.code === currentLocale;
            return (
              <button
                key={loc.code}
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelectLocale(loc.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-black text-[#faf9f6] font-bold'
                    : 'hover:bg-black/[0.06] text-black'
                }`}
                dir={loc.dir}
              >
                <div className="flex items-center gap-2">
                  <span className={isSelected ? 'text-[#ff8000]' : 'text-black/50'}>
                    [{loc.label}]
                  </span>
                  <span>{loc.nativeName}</span>
                </div>
                {isSelected && <span className="text-[#ff8000] font-bold text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
