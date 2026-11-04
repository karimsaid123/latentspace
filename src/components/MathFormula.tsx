'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathFormulaProps {
  formula: string;
  className?: string;
  displayMode?: boolean;
}

export default function MathFormula({
  formula,
  className = '',
  displayMode = true
}: MathFormulaProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode,
        throwOnError: false,
        strict: false
      });
    } catch (err) {
      console.warn('[KaTeX] Render failed for formula:', formula, err);
      return null;
    }
  }, [formula, displayMode]);

  if (!html) {
    return (
      <code className="font-mono text-xs sm:text-sm text-black/80 bg-black/5 px-2 py-1">
        {formula}
      </code>
    );
  }

  return (
    <div
      className={`katex-rendered overflow-x-auto py-1 text-black font-serif ${className}`}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
