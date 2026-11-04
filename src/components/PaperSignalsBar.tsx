'use client';

import React, { useEffect, useState } from 'react';
import type { PaperSignals } from '@/lib/paper-signals';

interface PaperSignalsBarProps {
  arxivId?: string;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

const badgeClass =
  'inline-flex items-center gap-1 border border-black/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-black/70 whitespace-nowrap';
const linkClass = `${badgeClass} hover:border-black hover:text-black transition-colors`;

/**
 * Community & citation credibility badges for research papers:
 * Hugging Face upvotes, linked GitHub code, linked models/datasets, and citation counts.
 */
export default function PaperSignalsBar({ arxivId }: PaperSignalsBarProps) {
  const [signals, setSignals] = useState<PaperSignals | null>(null);

  useEffect(() => {
    setSignals(null);
    if (!arxivId) return;
    const controller = new AbortController();
    fetch(`/api/paper-signals?arxivId=${encodeURIComponent(arxivId)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PaperSignals | null) => {
        if (data && !controller.signal.aborted) setSignals(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [arxivId]);

  if (!signals) return null;

  const badges: React.ReactNode[] = [];

  if (signals.hfUpvotes !== null && signals.hfUrl) {
    badges.push(
      <a key="hf" href={signals.hfUrl} target="_blank" rel="noopener noreferrer" className={linkClass} title="Hugging Face community upvotes">
        <span className="text-[#ff8000]">▲</span> {formatCount(signals.hfUpvotes)} HF UPVOTES
      </a>
    );
  }
  if (signals.citations !== null && signals.citations > 0) {
    badges.push(
      <span key="cit" className={badgeClass} title="Citation count (OpenAlex / Semantic Scholar)">
        CITED BY {formatCount(signals.citations)}
        {signals.influentialCitations ? ` · ${formatCount(signals.influentialCitations)} INFLUENTIAL` : ''}
      </span>
    );
  }
  if (signals.githubRepo) {
    badges.push(
      <a key="gh" href={signals.githubRepo} target="_blank" rel="noopener noreferrer" className={linkClass} title="Official code repository">
        {'</>'} CODE{signals.githubStars ? ` · ${formatCount(signals.githubStars)} ★` : ''} ↗
      </a>
    );
  }
  if (signals.linkedModels) {
    badges.push(
      <span key="models" className={badgeClass} title="Models on Hugging Face citing this paper">
        {formatCount(signals.linkedModels)} MODELS
      </span>
    );
  }
  if (signals.linkedDatasets) {
    badges.push(
      <span key="datasets" className={badgeClass} title="Datasets on Hugging Face citing this paper">
        {formatCount(signals.linkedDatasets)} DATASETS
      </span>
    );
  }

  if (badges.length === 0 && !signals.s2Tldr) return null;

  return (
    <div className="space-y-2">
      {badges.length > 0 && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
      {signals.s2Tldr && (
        <p className="font-mono text-[10px] leading-relaxed text-black/55">
          <span className="font-bold text-black/70">TLDR (SEMANTIC SCHOLAR):</span> {signals.s2Tldr}
        </p>
      )}
    </div>
  );
}

