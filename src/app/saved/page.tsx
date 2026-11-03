'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Bookmark, 
  BookmarkCheck, 
  Search
} from 'lucide-react';
import { Article } from '@/types';
import { useSavedArticles } from '@/lib/saved-storage';
import EditorialModal from '@/components/EditorialModal';
import { getCompanyBrand, CompanyLogo } from '@/components/CompanyBrand';
import Footer from '@/components/Footer';
import LiveClock from '@/components/LiveClock';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { Locale, DEFAULT_LOCALE, isValidLocale, isRTL, getDictionary } from '@/lib/i18n';

type FormatFilter = 'ALL' | 'DISPATCH' | 'RESEARCH_PAPER';
type SortOption = 'NEWEST_SAVED' | 'OLDEST_SAVED' | 'PUBLISHED_DATE' | 'ALPHABETICAL';

const LAB_FILTER_OPTIONS = [
  'ALL LABS',
  'OpenAI',
  'Google DeepMind',
  'Anthropic',
  'SpaceX & xAI',
  'DeepSeek',
  'Mistral AI',
  'Moonshot AI',
  'Meta AI',
  'NVIDIA',
];

function formatSavedTime(timestamp: number): string {
  if (!timestamp) return 'RECENTLY';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'JUST NOW';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}M AGO`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}H AGO`;
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `${days}D AGO`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

function formatPubDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  } catch {
    return 'RECENT';
  }
}

export default function SavedPage() {
  const { savedItems, removeSave, toggleSave, save, reconcile, count, isMounted } = useSavedArticles();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<FormatFilter>('ALL');
  const [selectedLab, setSelectedLab] = useState<string>('ALL LABS');
  const [selectedSort, setSelectedSort] = useState<SortOption>('NEWEST_SAVED');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [translationsByLocale, setTranslationsByLocale] = useState<
    Record<string, Record<string, { title: string; tldr: string }>>
  >({});
  const dict = useMemo(() => getDictionary(locale), [locale]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('latentspace-locale');
      if (stored && isValidLocale(stored)) {
        setLocale(stored);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
    }
  }, [locale]);

  const handleSelectLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    try {
      localStorage.setItem('latentspace-locale', nextLocale);
    } catch {
      // Ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = isRTL(nextLocale) ? 'rtl' : 'ltr';
    }
  }, []);

  useEffect(() => {
    if (locale === 'en' || savedItems.length === 0) return;

    const currentMap = translationsByLocale[locale] || {};
    const missing = savedItems
      .slice(0, 36)
      .filter((item) => !currentMap[item.id]);

    if (missing.length === 0) return;

    const controller = new AbortController();
    const payloadItems = missing.map(({ article }) => ({
      id: article.id,
      title: article.title,
      tldr: (article.aiSummary?.tldr || article.contentSnippet || '').split(/\n{2,}/)[0] || '',
    }));

    fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-latentspace-client': '1',
      },
      body: JSON.stringify({ locale, items: payloadItems }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!controller.signal.aborted && data?.success && data?.translations) {
          setTranslationsByLocale((prev) => ({
            ...prev,
            [locale]: {
              ...(prev[locale] || {}),
              ...data.translations,
            },
          }));
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [locale, savedItems, translationsByLocale]);

  const savedItemsRef = useRef(savedItems);
  savedItemsRef.current = savedItems;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Reconcile legacy bookmarks with latest articles from API
  useEffect(() => {
    async function loadArticlesForReconciliation() {
      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await res.json();
          if (data.articles && data.articles.length > 0) {
            reconcile(data.articles);
          }
        }
      } catch (_) {}
    }
    loadArticlesForReconciliation();
  }, [reconcile]);

  // Handle initial URL deep-linking (?article=...) once
  const initialDeepLinkChecked = useRef(false);
  useEffect(() => {
    if (initialDeepLinkChecked.current || typeof window === 'undefined' || !savedItems.length) return;
    initialDeepLinkChecked.current = true;
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('article');
    if (articleId) {
      const found = savedItems.find((item) => item.id === articleId);
      if (found) {
        setSelectedArticle(found.article);
      }
    }
  }, [savedItems]);

  // Support browser back/forward navigation on /saved
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('article');
      if (articleId) {
        const found = savedItemsRef.current.find((item) => item.id === articleId);
        setSelectedArticle(found?.article || null);
      } else {
        setSelectedArticle(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenArticle = useCallback((article: Article) => {
    setSelectedArticle(article);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('article', article.id);
      window.history.pushState({ articleId: article.id }, '', url.toString());
    }
  }, []);

  const handleCloseArticle = useCallback(() => {
    setSelectedArticle(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('article')) {
        url.searchParams.delete('article');
        const newSearch = url.searchParams.toString();
        window.history.pushState({}, '', url.pathname + (newSearch ? `?${newSearch}` : ''));
      }
    }
  }, []);

  // Filter & search pipeline
  const filteredItems = useMemo(() => {
    let list = [...savedItems];

    // Format filter
    if (selectedFormat === 'DISPATCH') {
      list = list.filter((i) => i.article.entryType !== 'RESEARCH_PAPER');
    } else if (selectedFormat === 'RESEARCH_PAPER') {
      list = list.filter((i) => i.article.entryType === 'RESEARCH_PAPER');
    }

    // Lab filter
    if (selectedLab !== 'ALL LABS') {
      list = list.filter((i) => i.article.lab === selectedLab);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => {
        const art = i.article;
        const inTitle = (art.title || '').toLowerCase().includes(q);
        const inSnippet = (art.contentSnippet || '').toLowerCase().includes(q);
        const inTldr = (art.aiSummary?.tldr || '').toLowerCase().includes(q);
        const inLab = (art.lab || '').toLowerCase().includes(q);
        const inSource = (art.source?.name || '').toLowerCase().includes(q);
        const inAuthor = (art.author || '').toLowerCase().includes(q);
        const inCategory = (art.category || '').toLowerCase().includes(q);
        return inTitle || inSnippet || inTldr || inLab || inSource || inAuthor || inCategory;
      });
    }

    // Sort order
    if (selectedSort === 'NEWEST_SAVED') {
      list.sort((a, b) => b.savedAt - a.savedAt);
    } else if (selectedSort === 'OLDEST_SAVED') {
      list.sort((a, b) => a.savedAt - b.savedAt);
    } else if (selectedSort === 'PUBLISHED_DATE') {
      list.sort((a, b) => new Date(b.article.pubDate).getTime() - new Date(a.article.pubDate).getTime());
    } else if (selectedSort === 'ALPHABETICAL') {
      list.sort((a, b) => a.article.title.localeCompare(b.article.title));
    }

    return list;
  }, [savedItems, selectedFormat, selectedLab, searchQuery, selectedSort]);

  // Count by format for badges
  const newsCount = useMemo(() => {
    return savedItems.filter(i => i.article.entryType !== 'RESEARCH_PAPER').length;
  }, [savedItems]);

  const researchCount = useMemo(() => {
    return savedItems.filter(i => i.article.entryType === 'RESEARCH_PAPER').length;
  }, [savedItems]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-black">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP EDITORIAL NAVIGATION HEADER
      ───────────────────────────────────────────────────────────── */}
      <header className="w-full pt-6 pb-4 px-6 sm:px-12 max-w-[1700px] mx-auto select-none font-mono tracking-widest uppercase">
        <div className="relative z-30 flex items-center justify-between border-b border-black/15 pb-3.5 gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="font-black text-base sm:text-lg tracking-tight text-black flex items-center gap-2 hover:opacity-75 transition-opacity"
            >
              LATENT SPACE
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ff8000] shrink-0" title="Live System" />
            </Link>
            <span className="text-black/30 hidden sm:inline">//</span>
            <span className="font-bold text-black text-xs hidden sm:inline">
              [<span className="text-[#ff8000]">★</span> {dict.savedPage.dossierBadge}]
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3 text-black/70 text-[10px] sm:text-[11px] md:text-xs shrink-0">
            <Link
              href="/benchmarks"
              className="border border-black/35 hover:border-black px-2 sm:px-3 text-black font-mono font-bold tracking-wider hover:bg-black/[0.04] transition-colors whitespace-nowrap h-7 sm:h-8 flex items-center justify-center w-auto sm:min-w-[175px]"
              title="Independent Artificial Analysis Benchmarks & Stats"
            >
              <span className="sm:hidden">[{dict.nav.statsShort}]</span>
              <span className="hidden sm:inline">[{dict.nav.benchmarks}]</span>
            </Link>

            <Link
              href="/"
              className="border border-black/35 hover:border-black px-2 sm:px-3 text-black font-mono font-bold tracking-wider hover:bg-black/[0.04] transition-colors whitespace-nowrap h-7 sm:h-8 flex items-center justify-center w-auto sm:min-w-[155px]"
              title="Return to Frontier Feed"
            >
              <span className="sm:hidden">[{dict.nav.feedShort}]</span>
              <span className="hidden sm:inline">[{dict.nav.returnToFeed}]</span>
            </Link>

            <LanguageSelector currentLocale={locale} onSelectLocale={handleSelectLocale} />

            <ThemeToggle />

            {/* Isolated 1Hz Clock on the inline end */}
            <div className="text-right hidden sm:block font-bold text-[#ff8000] font-mono text-xs sm:text-[13px] tracking-wider ps-3 border-s border-black/20">
              <LiveClock />
            </div>
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN SAVED CONTENT
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-6 sm:px-12 py-8 sm:py-12">
        
        {/* Page Title & Stats Banner */}
        <div className="border-b border-black pb-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[9px] tracking-widest text-black/50 uppercase mb-2 flex items-center gap-2">
                <span>{dict.savedPage.personalDossier}</span>
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[-0.045em] leading-[0.88] text-black">
                {dict.savedPage.savedTelemetry}
              </h1>
            </div>

            <div className="font-mono text-xs tracking-wider uppercase text-black/60 flex flex-wrap items-center gap-4">
              <div className="border border-black/30 px-3 py-1.5 bg-white">
                {dict.savedPage.totalArchived} <span className="font-bold text-black">[{count}]</span>
              </div>
              <div className="border border-black/30 px-3 py-1.5 bg-white">
                {dict.nav.news}: <span className="font-bold text-black">[{newsCount}]</span>
              </div>
              <div className="border border-black/30 px-3 py-1.5 bg-white">
                {dict.nav.research}: <span className="font-bold text-black">[{researchCount}]</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SEARCH & CATEGORIZATION CONTROLS
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#f2efe9] border border-black p-4 sm:p-6 mb-8 select-none font-mono">
          
          {/* Search Input Bar */}
          <div className="relative flex items-center border border-black bg-white mb-4">
            <div className="ps-3.5 pe-2 text-black/40">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dict.savedPage.searchPlaceholder}
              className="w-full py-3 pe-4 bg-transparent font-mono text-xs sm:text-sm uppercase tracking-wider text-black placeholder-black/30 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="pe-3.5 font-mono text-[10px] text-black/60 hover:text-black cursor-pointer font-bold tracking-wider"
              >
                [{dict.nav.clear}]
              </button>
            )}
          </div>

          {/* Categorization & Filter Rows */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs tracking-wider uppercase">
            
            {/* Format Filter (News vs Research) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-black shrink-0 text-[11px]">{dict.savedPage.format}</span>
              <button
                onClick={() => setSelectedFormat('ALL')}
                className={`px-2.5 py-1 border transition-colors cursor-pointer text-[10px] sm:text-[11px] ${
                  selectedFormat === 'ALL'
                    ? 'border-black bg-black text-[#faf9f6] font-bold'
                    : 'border-black/30 hover:border-black bg-white text-black/70'
                }`}
              >
                {dict.savedPage.all} [{count}]
              </button>
              <button
                onClick={() => setSelectedFormat('DISPATCH')}
                className={`px-2.5 py-1 border transition-colors cursor-pointer text-[10px] sm:text-[11px] ${
                  selectedFormat === 'DISPATCH'
                    ? 'border-black bg-black text-[#faf9f6] font-bold'
                    : 'border-black/30 hover:border-black bg-white text-black/70'
                }`}
              >
                {dict.savedPage.newsDispatch} [{newsCount}]
              </button>
              <button
                onClick={() => setSelectedFormat('RESEARCH_PAPER')}
                className={`px-2.5 py-1 border transition-colors cursor-pointer text-[10px] sm:text-[11px] ${
                  selectedFormat === 'RESEARCH_PAPER'
                    ? 'border-black bg-black text-[#faf9f6] font-bold'
                    : 'border-black/30 hover:border-black bg-white text-black/70'
                }`}
              >
                {dict.savedPage.researchPapers} [{researchCount}]
              </button>
            </div>

            {/* Lab & Sorting Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Lab Sector Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black text-[11px]">{dict.feed.lab}</span>
                <select
                  value={selectedLab}
                  onChange={(e) => setSelectedLab(e.target.value)}
                  className="bg-white border border-black/30 hover:border-black px-2.5 py-1 font-mono text-[10px] sm:text-[11px] tracking-wider uppercase text-black cursor-pointer focus:outline-none"
                >
                  {LAB_FILTER_OPTIONS.map((lab) => (
                    <option key={lab} value={lab}>
                      {lab === 'ALL LABS' ? dict.nav.allLabs : lab}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-black text-[11px]">{dict.savedPage.sort}</span>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value as SortOption)}
                  className="bg-white border border-black/30 hover:border-black px-2.5 py-1 font-mono text-[10px] sm:text-[11px] tracking-wider uppercase text-black cursor-pointer focus:outline-none"
                >
                  <option value="NEWEST_SAVED">{dict.savedPage.newestSaved}</option>
                  <option value="OLDEST_SAVED">{dict.savedPage.oldestSaved}</option>
                  <option value="PUBLISHED_DATE">{dict.savedPage.pubDateSort}</option>
                  <option value="ALPHABETICAL">{dict.savedPage.alphabetical}</option>
                </select>
              </div>
            </div>

          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            HORIZONTAL BARS LIST (Simple Bars Stacked Vertically)
        ───────────────────────────────────────────────────────────── */}
        {savedItems.length === 0 ? (
          /* Completely Empty State */
          <div className="border border-black p-12 sm:p-20 text-center bg-white relative">
            <div className="absolute top-0 left-0 w-2 h-2 bg-black" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-black" />
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-black" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-black" />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 mx-auto border border-black flex items-center justify-center bg-[#faf9f6]">
                <Bookmark className="w-6 h-6 text-black/40" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
                {dict.feed.noSaved}
              </h2>
              <p className="font-mono text-xs uppercase text-black/60 tracking-wider leading-relaxed">
                {dict.feed.noSavedDesc}
              </p>
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 border border-black bg-black text-[#faf9f6] font-mono text-xs font-bold tracking-widest uppercase hover:bg-black/85 transition-colors"
                >
                  {dict.savedPage.browseTelemetry}
                </Link>
              </div>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          /* Filter Returned 0 Results */
          <div className="border border-black/30 p-12 text-center bg-white font-mono">
            <div className="text-xs uppercase tracking-widest text-black/60 mb-2 font-bold">
              {dict.savedPage.noMatchingFilter}
            </div>
            <div className="text-[10px] text-black/40 uppercase mb-4">
              &quot;{searchQuery}&quot; | {selectedLab} | {selectedFormat}
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFormat('ALL');
                setSelectedLab('ALL LABS');
              }}
              className="px-3.5 py-1.5 border border-black font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {dict.feed.resetFilters}
            </button>
          </div>
        ) : (
          /* Stack of Simple Horizontal Bars */
          <div className="space-y-3">
            {filteredItems.map(({ id, savedAt, article }, index) => {
              const isResearch = article.entryType === 'RESEARCH_PAPER';
              const labBrand = getCompanyBrand(article.lab || article.source?.name);
              const tr = locale !== 'en' ? translationsByLocale[locale]?.[article.id] : undefined;
              const displayTitle = tr?.title || article.title;
              const displaySnippet = tr?.tldr || article.aiSummary?.tldr || article.contentSnippet;

              return (
                <div
                  key={`${id}_${savedAt}_${index}`}
                  className="relative border border-black bg-white hover:border-black p-4 sm:p-5 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md"
                >
                  {/* Left Column: Metadata + Title + Snippet */}
                  <div className="flex-1 min-w-0 pe-0 md:pe-4">
                    
                    {/* Top Metadata Row: News vs Publication badge + Lab + Source */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-[9px] tracking-widest uppercase text-black/50 mb-2">
                      
                      {/* Simple Clear Badge: News vs Publication */}
                      <span 
                        className={`px-2 py-0.5 border font-bold text-[9px] tracking-wider ${
                          isResearch
                            ? 'border-black bg-black text-[#faf9f6]'
                            : 'border-black/50 text-black bg-[#faf9f6]'
                        }`}
                      >
                        {isResearch ? dict.feed.researchBadge : dict.feed.newsBadge}
                      </span>

                      {/* Lab Branding with Logo */}
                      <span className="flex items-center gap-1.5 font-bold text-black">
                        <CompanyLogo brandId={labBrand.id} className="w-3 h-3 shrink-0" />
                        <span>[{article.lab || 'FRONTIER'}]</span>
                      </span>

                      <span className="text-black/30">•</span>

                      {/* Source Name */}
                      <span className="truncate max-w-[150px] sm:max-w-none">
                        {dict.savedPage.source} {article.source?.name || 'TELEMETRY'}
                      </span>

                      {article.arxivId && (
                        <>
                          <span className="text-black/30">•</span>
                          <span className="font-bold text-black">ARXIV: {article.arxivId}</span>
                        </>
                      )}

                      <span className="text-black/30">•</span>

                      {/* Original Published Date */}
                      <span>{dict.savedPage.pub} {formatPubDate(article.pubDate)}</span>
                    </div>

                    {/* Article Headline */}
                    <h2
                      onClick={() => handleOpenArticle(article)}
                      className="text-base sm:text-lg md:text-xl font-black uppercase tracking-tight text-black group-hover:underline underline-offset-4 cursor-pointer leading-snug mb-2"
                    >
                      {displayTitle}
                    </h2>

                    {/* Summary / Snippet */}
                    <p className="font-mono text-[10px] text-black/60 line-clamp-1 sm:line-clamp-2 uppercase leading-relaxed">
                      {displaySnippet}
                    </p>

                  </div>

                  {/* Right Column: Saved Timestamp & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between shrink-0 gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-black/10">
                    
                    {/* When it was saved */}
                    <div 
                      className="font-mono text-start md:text-end" 
                      title={`Archived: ${new Date(savedAt).toLocaleString()}`}
                    >
                      <div className="text-[10px] sm:text-[11px] font-bold text-black tracking-wider flex items-center gap-1.5 md:justify-end">
                        <BookmarkCheck className="w-3.5 h-3.5 text-black" />
                        <span>{dict.modal.saved} {formatSavedTime(savedAt)}</span>
                      </div>
                      <div className="text-[9px] text-black/40 uppercase hidden sm:block">
                        {new Date(savedAt).toLocaleDateString(
                          locale === 'ar' ? 'ar-EG' : locale === 'zh' ? 'zh-CN' : locale === 'es' ? 'es-ES' : 'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenArticle(article)}
                        className="px-3 py-1.5 border border-black bg-white hover:bg-black hover:text-[#faf9f6] font-mono text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                        title="Read full article"
                      >
                        [{dict.feed.read} {isRTL(locale) ? '←' : '→'}]
                      </button>

                      <button
                        onClick={() => removeSave(article.id)}
                        className="px-2.5 py-1.5 border border-black/30 hover:border-black hover:bg-black hover:text-white font-mono text-[10px] tracking-wider uppercase transition-colors cursor-pointer text-black/50"
                        title="Remove from saved dossier"
                      >
                        [{dict.savedPage.remove}]
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer locale={locale} />

      {/* Editorial Reader Modal */}
      <EditorialModal
        article={selectedArticle}
        onClose={handleCloseArticle}
        isBookmarked={selectedArticle ? isMounted && savedItems.some(i => i.id === selectedArticle.id) : false}
        onToggleBookmark={() => {
          if (selectedArticle) {
            toggleSave(selectedArticle);
          }
        }}
        onSummaryEnriched={(articleId, enrichedSummary) => {
          setSelectedArticle((prev) =>
            prev && prev.id === articleId ? { ...prev, aiSummary: enrichedSummary } : prev
          );
          const existing = savedItemsRef.current.find((i) => i.id === articleId);
          if (existing) {
            save({ ...existing.article, aiSummary: enrichedSummary });
          }
        }}
        locale={locale}
      />

    </div>
  );
}
