'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Article, AISummary } from '@/types';
import { ExternalLink, Share2 } from 'lucide-react';
import ArticleShareModal from './ArticleShareModal';
import { getCompanyBrand, CompanyLogo } from './CompanyBrand';
import { getDictionary, isRTL, Locale } from '@/lib/i18n';

interface EditorialModalProps {
  article: Article | null;
  onClose: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
  onSummaryEnriched?: (articleId: string, summary: AISummary) => void;
  locale?: Locale;
}

const emptySubscribe = () => () => {};

function toSafeExternalUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function renderKeyPointText(point: string): React.ReactNode {
  const cleaned = point.trim();
  // Match "**Lead Label:** rest" or "**Lead Label：** rest" safely in React without innerHTML
  const boldPrefixMatch = cleaned.match(/^\*\*([^*]{2,80}?)\*\*[:：]?\s*(.+)$/);
  if (boldPrefixMatch) {
    const label = boldPrefixMatch[1].replace(/[:：]$/, '').trim();
    const rest = boldPrefixMatch[2].trim();
    return (
      <>
        <strong className="font-semibold text-black">{label}:</strong>{' '}
        <span>{rest}</span>
      </>
    );
  }
  return <span>{cleaned.replace(/\*\*/g, '')}</span>;
}

export default function EditorialModal({
  article,
  onClose,
  isBookmarked = false,
  onToggleBookmark,
  onSummaryEnriched,
  locale = 'en',
}: EditorialModalProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [summary, setSummary] = useState<AISummary | undefined>(article?.aiSummary);
  const [isEnriching, setIsEnriching] = useState(false);
  const summaryCacheRef = useRef<Map<string, AISummary>>(new Map());
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const dict = getDictionary(locale);

  useEffect(() => {
    if (!article) {
      setIsEnriching(false);
      return;
    }

    const cacheKey = `${article.id}_${locale}`;
    const cachedForLocale = summaryCacheRef.current.get(cacheKey);
    if (cachedForLocale) {
      setSummary(cachedForLocale);
      setIsEnriching(false);
      return;
    }

    setSummary(article.aiSummary);

    const summaryLocale = article.aiSummary?.locale || 'en';
    const needsDeepSynthesis =
      article.aiSummary?.generatedWith !== 'gemini' ||
      (article.aiSummary?.summaryVersion || 0) < 2 ||
      summaryLocale !== locale;

    if (needsDeepSynthesis) {
      const controller = new AbortController();
      const targetId = article.id;
      setIsEnriching(true);

      fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-latentspace-client': '1',
        },
        body: JSON.stringify({ articleId: targetId, locale }),
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!controller.signal.aborted && data?.success && data?.summary) {
            summaryCacheRef.current.set(cacheKey, data.summary);
            setSummary(data.summary);
            if (locale === 'en' && data.summary.generatedWith === 'gemini') {
              onSummaryEnriched?.(targetId, data.summary);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsEnriching(false);
          }
        });

      return () => {
        controller.abort();
      };
    } else {
      if (article.aiSummary) {
        summaryCacheRef.current.set(cacheKey, article.aiSummary);
      }
      setIsEnriching(false);
    }
  }, [article?.id, article?.aiSummary, locale, onSummaryEnriched]);

  useEffect(() => {
    if (!article) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        if (isShareOpen) {
          setIsShareOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [article, onClose, isShareOpen]);

  if (!isMounted || !article) return null;

  const brand = getCompanyBrand(article.lab || article.source?.name);
  const safeArticleLink = toSafeExternalUrl(article.link);
  const safePdfUrl = toSafeExternalUrl(article.pdfUrl);
  const displayTitle = summary?.title || article.title;
  const enrichedArticle: Article = summary
    ? { ...article, title: displayTitle, aiSummary: summary }
    : article;

  const rawSummaryBody = (summary?.tldr || article.contentSnippet || '').trim();
  const summaryParagraphs = rawSummaryBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm select-none animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Reader Sheet */}
      <div
        dir={isRTL(locale) ? 'rtl' : 'ltr'}
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#faf9f6] text-black border border-black z-10 overflow-hidden shadow-2xl animate-modal-in"
      >

        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 font-mono text-[10px] tracking-widest text-black/60">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-black uppercase">[{article.source?.name || 'LATENTSPACE'}]</span>
            {isEnriching ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-black/5 text-black/70 border border-black/15 text-[9px] font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff8000] animate-pulse" />
                {dict.modal.extracting}
              </span>
            ) : summary?.generatedWith === 'gemini' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#00aa66]/10 text-[#00aa66] border border-[#00aa66]/30 text-[9px] font-mono font-bold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00aa66]" />
                {dict.modal.verifiedBrief}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(article.id)}
                className={`cursor-pointer transition-colors uppercase font-mono ${
                  isBookmarked ? 'text-black font-bold' : 'text-black/60 hover:text-black'
                }`}
              >
                [{isBookmarked ? <><span className="text-[#ff8000]">★</span> {dict.modal.saved}</> : dict.modal.save}]
              </button>
            )}

            <button
              onClick={() => setIsShareOpen(true)}
              className="text-black/60 hover:text-black cursor-pointer transition-colors uppercase font-mono flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{dict.modal.share}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="font-bold text-black hover:opacity-60 cursor-pointer uppercase font-mono ml-1"
            >
              {dict.modal.closeBtn}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 select-text">

          <div className="space-y-3">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
              <div
                className="w-4 h-4 border flex items-center justify-center p-0.5 shrink-0"
                style={{ backgroundColor: brand.bgTint, borderColor: brand.borderColor }}
              >
                <CompanyLogo brandId={brand.id} className="w-2.5 h-2.5" />
              </div>
              <span className="font-bold tracking-wider" style={{ color: brand.textColor }}>
                {article.lab || dict.modal.frontierLab}
              </span>
              {article.arxivId && (
                <span className="font-mono text-[9px] font-semibold text-black/40 ml-1">
                  [{article.arxivId}]
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight leading-snug text-black">
              {displayTitle}
            </h2>
          </div>

          {/* 01: Comprehensive Information-Dense Briefing */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                {dict.modal.summaryTitle}
              </span>
              <div className="h-px flex-1 bg-black/10" />
            </div>

            <div className="space-y-4">
              {summaryParagraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  className="font-sans text-base sm:text-[17px] leading-[1.72] text-black/90 font-normal antialiased"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* 02: High-Signal Factual Key Points */}
          {summary?.takeaways && summary.takeaways.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/50 shrink-0">
                  {dict.modal.keyPointsTitle}
                </span>
                <div className="h-px flex-1 bg-black/10" />
              </div>
              <ul className="space-y-3.5">
                {summary.takeaways.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3.5 font-sans text-sm sm:text-[15.5px] leading-[1.62] text-black/85"
                  >
                    <span className="font-mono text-xs font-bold text-[#ff8000] mt-0.5 shrink-0">
                      [{idx + 1}]
                    </span>
                    <span className="antialiased">{renderKeyPointText(point)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px]">
          <div className="flex items-center gap-3 text-black/50">
            <span>
              {dict.modal.recorded}{' '}
              {new Date(article.pubDate).toLocaleDateString(
                locale === 'ar' ? 'ar-EG' : locale === 'zh' ? 'zh-CN' : locale === 'es' ? 'es-ES' : 'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }
              )}
            </span>
            {article.author && article.author !== article.source?.name && (
              <>
                <span>•</span>
                <span>{dict.modal.by} {article.author.toUpperCase()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {safePdfUrl && (
              <a
                href={safePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-bold uppercase text-black border border-black px-3.5 py-2 hover:bg-black hover:text-white transition-colors cursor-pointer text-[11px] tracking-wider"
              >
                <span>{dict.modal.openPdf}</span>
              </a>
            )}

            {safeArticleLink && (
              <a
                href={safeArticleLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-bold uppercase text-white bg-black px-4 py-2 hover:bg-[#ff8000] hover:text-black transition-all cursor-pointer shadow-sm text-[11px] tracking-wider"
              >
                <span>
                  {article.entryType === 'RESEARCH_PAPER'
                    ? dict.modal.viewOnArxiv
                    : `${dict.modal.readOn} ${article.source?.name || 'SOURCE'}`}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

      </div>

      {/* Branded Article Share Modal */}
      <ArticleShareModal
        article={enrichedArticle}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        locale={locale}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}
