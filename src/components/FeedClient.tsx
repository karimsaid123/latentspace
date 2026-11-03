'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MinimalNav, { LAB_FILTERS } from '@/components/MinimalNav';
import EditorialSpread from '@/components/EditorialSpread';
import EditorialModal from '@/components/EditorialModal';
import Footer from '@/components/Footer';
import { Article, AISummary, VectorPulseSnapshot } from '@/types';
import { RefreshCw } from 'lucide-react';
import { useSavedArticles } from '@/lib/saved-storage';
import { articleMatchesVector, isValidVectorId } from '@/lib/vector-pulse';
import { Locale, DEFAULT_LOCALE, isValidLocale, isRTL, getDictionary } from '@/lib/i18n';

interface FeedClientProps {
  initialArticles: Article[];
  initialVectorPulse?: VectorPulseSnapshot;
}

export default function FeedClient({ initialArticles, initialVectorPulse }: FeedClientProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [vectorPulse, setVectorPulse] = useState<VectorPulseSnapshot | undefined>(
    initialVectorPulse
  );
  const [selectedLab, setSelectedLab] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<'ALL' | 'DISPATCH' | 'RESEARCH_PAPER'>('ALL');
  const [selectedVector, setSelectedVector] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const dict = useMemo(() => getDictionary(locale), [locale]);

  // Sync locale with localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('latentspace-locale');
      if (stored && isValidLocale(stored)) {
        setLocale(stored);
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Update html lang and dir attributes whenever locale changes
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

  const [lastSyncedTime, setLastSyncedTime] = useState<number>(0);
  const { savedIds, count: savedCount, toggleSave, save, isSaved, reconcile } = useSavedArticles();
  const [incomingArticles, setIncomingArticles] = useState<Article[] | null>(null);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const hasFetchedLiveRef = useRef<boolean>(false);

  const articlesRef = useRef<Article[]>(articles);
  articlesRef.current = articles;
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);
  const selectedLabRef = useRef(selectedLab);
  selectedLabRef.current = selectedLab;
  const selectedTypeRef = useRef(selectedType);
  selectedTypeRef.current = selectedType;
  const selectedVectorRef = useRef<string | null>(selectedVector);
  selectedVectorRef.current = selectedVector;
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const fetchArticles = useCallback(
    async (
      search: string,
      lab?: string,
      entryType?: 'ALL' | 'DISPATCH' | 'RESEARCH_PAPER',
      isSilent = false,
      bustCache = false,
      vectorId?: string | null
    ) => {
      const activeLab = lab !== undefined ? lab : selectedLabRef.current;
      const activeType = entryType !== undefined ? entryType : selectedTypeRef.current;
      const activeVector = vectorId !== undefined ? vectorId : selectedVectorRef.current;

      let controller: AbortController | null = null;
      let mySeq = requestSeqRef.current;

      if (!isSilent) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        controller = new AbortController();
        abortControllerRef.current = controller;
        mySeq = ++requestSeqRef.current;
        if (articlesRef.current.length === 0) {
          setIsLoading(true);
        }
      }

      const signal = controller?.signal;

      try {
        const params = new URLSearchParams();
        params.set('limit', '150');
        if (search.trim()) params.set('search', search.trim());
        if (activeLab && activeLab !== 'All' && activeLab !== 'SAVED') {
          params.set('lab', activeLab);
        }
        if (activeType && activeType !== 'ALL') {
          params.set('entryType', activeType);
        }
        if (activeVector) {
          params.set('vector', activeVector);
        }
        if (bustCache) {
          params.set('_v', String(Date.now()));
        }

        const res = await fetch(`/api/news?${params.toString()}`, { signal });
        if (!res.ok) {
          if (articlesRef.current.length === 0 && !isSilent && mySeq === requestSeqRef.current) {
            setTimeout(
              () => fetchArticles(search, activeLab, activeType, false, false, activeVector),
              1500
            );
          }
          return;
        }

        const data = await res.json();

        // Guard against out-of-order responses overwriting newer filter selections
        if (mySeq !== requestSeqRef.current) {
          return;
        }

        hasFetchedLiveRef.current = true;

        if (data.vectorPulse && Array.isArray(data.vectorPulse.vectors)) {
          setVectorPulse(data.vectorPulse);
        }

        if (data.articles && Array.isArray(data.articles)) {
          if (activeLab === 'All' && activeType === 'ALL' && !activeVector && !search.trim()) {
            try {
              sessionStorage.setItem(
                'latentspace_articles_cache',
                JSON.stringify(data.articles.slice(0, 80))
              );
            } catch {
              // Ignore quota errors
            }
          }

          if (
            isSilent &&
            typeof window !== 'undefined' &&
            window.scrollY > 150 &&
            articlesRef.current.length > 0
          ) {
            const currentIds = new Set(articlesRef.current.map((a) => a.id));
            const newItems = data.articles.filter((a: Article) => !currentIds.has(a.id));
            if (newItems.length > 0) {
              setIncomingArticles(data.articles);
            }
          } else {
            setArticles(data.articles);
            setIncomingArticles(null);
            reconcile(data.articles);
          }

          if (data.lastSyncedAt && data.lastSyncedAt > 0) {
            setLastSyncedTime(data.lastSyncedAt);
          } else {
            setLastSyncedTime(Date.now());
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Failed to load articles:', err);
      } finally {
        if (!signal || !signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [reconcile]
  );

  const handleSelectLab = useCallback(
    (lab: string) => {
      setSelectedLab(lab);
      selectedLabRef.current = lab;
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (lab === 'All') {
          url.searchParams.delete('lab');
        } else {
          url.searchParams.set('lab', lab);
        }
        window.history.pushState({}, '', url.toString());
      }
      if (lab !== 'SAVED') {
        fetchArticles(searchQueryRef.current, lab, selectedTypeRef.current, false);
      }
    },
    [fetchArticles]
  );

  const handleSelectType = useCallback(
    (nextType: 'ALL' | 'DISPATCH' | 'RESEARCH_PAPER') => {
      setSelectedType(nextType);
      selectedTypeRef.current = nextType;
      if (selectedLabRef.current !== 'SAVED') {
        fetchArticles(
          searchQueryRef.current,
          selectedLabRef.current,
          nextType,
          false,
          false,
          selectedVectorRef.current
        );
      }
    },
    [fetchArticles]
  );

  const handleSelectVector = useCallback(
    (nextVectorId: string | null) => {
      const normalized = isValidVectorId(nextVectorId) ? nextVectorId : null;
      setSelectedVector(normalized);
      selectedVectorRef.current = normalized;

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (!normalized) {
          url.searchParams.delete('vector');
        } else {
          url.searchParams.set('vector', normalized);
        }
        window.history.pushState({}, '', url.toString());
      }

      if (selectedLabRef.current !== 'SAVED') {
        fetchArticles(
          searchQueryRef.current,
          selectedLabRef.current,
          selectedTypeRef.current,
          false,
          false,
          normalized
        );
      }
    },
    [fetchArticles]
  );

  // Hydrate warm session cache & read ?lab= / ?vector= params once on mount
  useEffect(() => {
    queueMicrotask(() => {
      setLastSyncedTime(Date.now());

      const params = new URLSearchParams(window.location.search);
      const labParam = params.get('lab');
      const vectorParam = params.get('vector');
      const resolvedVector = isValidVectorId(vectorParam) ? vectorParam : null;

      if (resolvedVector) {
        setSelectedVector(resolvedVector);
        selectedVectorRef.current = resolvedVector;
      }

      if (!labParam && !resolvedVector) {
        try {
          const cached = sessionStorage.getItem('latentspace_articles_cache');
          if (cached && !hasFetchedLiveRef.current) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const validCached = parsed.filter(
                (item): item is Article =>
                  Boolean(
                    item &&
                      typeof item === 'object' &&
                      typeof item.id === 'string' &&
                      typeof item.title === 'string' &&
                      typeof item.link === 'string' &&
                      /^https?:\/\//i.test(item.link)
                  )
              );
              if (validCached.length > 0) {
                setArticles(validCached);
              }
            }
          }
        } catch {
          // Fallback to network
        }
      }

      if (labParam && LAB_FILTERS.some((l) => l.id === labParam)) {
        setSelectedLab(labParam);
        selectedLabRef.current = labParam;
        fetchArticles('', labParam, 'ALL', false, false, resolvedVector);
      } else {
        fetchArticles('', 'All', 'ALL', false, false, resolvedVector);
      }
    });

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchArticles]);

  // Initial deep-link check (?article=...)
  const initialDeepLinkChecked = useRef(false);
  useEffect(() => {
    if (initialDeepLinkChecked.current || articles.length === 0) return;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('article');
      if (!articleId) {
        initialDeepLinkChecked.current = true;
        return;
      }
      const found = articles.find((a) => a.id === articleId);
      if (found) {
        initialDeepLinkChecked.current = true;
        queueMicrotask(() => setSelectedArticle(found));
      } else if (hasFetchedLiveRef.current) {
        initialDeepLinkChecked.current = true;
      }
    }
  }, [articles]);

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

  const handleSummaryEnriched = useCallback(
    (articleId: string, enrichedSummary: AISummary) => {
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, aiSummary: enrichedSummary } : a))
      );
      setSelectedArticle((prev) =>
        prev && prev.id === articleId ? { ...prev, aiSummary: enrichedSummary } : prev
      );
      if (isSaved(articleId)) {
        const found = articlesRef.current.find((a) => a.id === articleId);
        if (found) {
          save({ ...found, aiSummary: enrichedSummary });
        }
      }
    },
    [isSaved, save]
  );

  // Browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const labParam = params.get('lab');
      const resolvedLab =
        labParam && LAB_FILTERS.some((l) => l.id === labParam) ? labParam : 'All';
      const vectorParam = params.get('vector');
      const resolvedVector = isValidVectorId(vectorParam) ? vectorParam : null;

      let shouldRefetch = false;
      if (resolvedLab !== selectedLabRef.current) {
        setSelectedLab(resolvedLab);
        selectedLabRef.current = resolvedLab;
        shouldRefetch = true;
      }
      if (resolvedVector !== selectedVectorRef.current) {
        setSelectedVector(resolvedVector);
        selectedVectorRef.current = resolvedVector;
        shouldRefetch = true;
      }
      if (shouldRefetch) {
        fetchArticles(
          searchQueryRef.current,
          resolvedLab,
          selectedTypeRef.current,
          false,
          false,
          resolvedVector
        );
      }

      const articleId = params.get('article');
      if (articleId) {
        const found = articlesRef.current.find((a) => a.id === articleId);
        setSelectedArticle(found || null);
      } else {
        setSelectedArticle(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fetchArticles]);

  const toggleBookmark = useCallback(
    (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const art = articlesRef.current.find((a) => a.id === id);
      if (art) {
        toggleSave(art);
      }
    },
    [toggleSave]
  );

  // Track window scroll for Back-To-Top button (rAF throttled)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          setShowBackToTop(window.scrollY > 400);
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global Keyboard Shortcuts ('/' to search, 'Esc' to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
          setIsSearchOpen(false);
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        handleCloseArticle();
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseArticle]);

  // Debounced search
  const isSearchMounted = useRef(false);
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      fetchArticles(searchQuery, selectedLabRef.current, selectedTypeRef.current, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchArticles]);

  // Rolling batch sync & background polling every 60s (only when document is visible)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      let hasFresh = false;
      try {
        const syncRes = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'x-latentspace-client': '1' },
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          hasFresh = Boolean(
            (syncData?.articlesAdded || 0) > 0 || (syncData?.articlesModified || 0) > 0
          );
          if (syncData?.lastSyncedAt > 0) {
            setLastSyncedTime(syncData.lastSyncedAt);
          }
        }
      } catch {
        // Ignore background sync errors
      }

      fetchArticles(
        searchQueryRef.current,
        selectedLabRef.current,
        selectedTypeRef.current,
        true,
        hasFresh
      );
    }, 60_000);

    return () => clearInterval(pollInterval);
  }, [fetchArticles]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync?force=1', {
        method: 'POST',
        headers: { 'x-latentspace-client': '1' },
      });
      setLastSyncedTime(Date.now());
      setIncomingArticles(null);
      await fetchArticles(
        searchQueryRef.current,
        selectedLabRef.current,
        selectedTypeRef.current,
        false,
        true
      );
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchArticles]);

  const applyIncomingArticles = useCallback(() => {
    if (incomingArticles) {
      setArticles(incomingArticles);
      setIncomingArticles(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [incomingArticles]);

  const savedIdSet = useMemo(() => new Set(savedIds), [savedIds]);
  const displayedArticles = useMemo(() => {
    let list = articles;
    if (selectedLab === 'SAVED') {
      list = list.filter((a) => savedIdSet.has(a.id));
    } else if (selectedLab !== 'All') {
      list = list.filter((a) => a.lab === selectedLab);
    }
    if (selectedType !== 'ALL') {
      list = list.filter((a) => a.entryType === selectedType);
    }
    if (selectedVector) {
      list = list.filter((a) => articleMatchesVector(a, selectedVector));
    }
    return list;
  }, [articles, selectedLab, selectedType, selectedVector, savedIdSet]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-black">
      {incomingArticles && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in select-none">
          <button
            onClick={applyIncomingArticles}
            className="bg-black text-[#faf9f6] border border-black font-mono text-[9px] tracking-widest uppercase px-5 py-2.5 shadow-2xl cursor-pointer hover:bg-black/85 transition-all flex items-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff8000]" />
            <span>{dict.feed.newTelemetryNotice}</span>
          </button>
        </div>
      )}

      <MinimalNav
        selectedLab={selectedLab}
        onSelectLab={handleSelectLab}
        selectedType={selectedType}
        onSelectType={handleSelectType}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSync={handleSync}
        isSyncing={isSyncing}
        totalArticles={displayedArticles.length}
        lastSyncedTime={lastSyncedTime}
        savedCount={savedCount}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        vectorPulse={vectorPulse}
        selectedVectorId={selectedVector}
        onSelectVector={handleSelectVector}
        locale={locale}
        onSelectLocale={handleSelectLocale}
      />

      <main className="flex-1 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-3 font-mono text-[10px] tracking-widest uppercase text-black/50">
            <RefreshCw className="w-5 h-5 animate-spin text-black" />
            <span>{dict.feed.fetching}</span>
          </div>
        ) : displayedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 px-4 text-center font-mono text-xs uppercase tracking-widest text-black/60">
            <span className="mb-2 font-bold">
              {selectedLab === 'SAVED' ? dict.feed.noSaved : dict.feed.noTelemetry}
            </span>
            <span className="text-[10px] text-black/40">
              {selectedLab === 'SAVED'
                ? dict.feed.noSavedDesc
                : dict.feed.adjustFilter}
            </span>
            {(searchQuery || selectedLab !== 'All' || selectedType !== 'ALL' || selectedVector) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('ALL');
                  selectedTypeRef.current = 'ALL';
                  setSelectedVector(null);
                  selectedVectorRef.current = null;
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('vector');
                    window.history.replaceState({}, '', url.toString());
                  }
                  handleSelectLab('All');
                }}
                className="mt-4 px-3 py-1 border border-black font-mono text-[10px] cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                {dict.feed.resetFilters}
              </button>
            )}
          </div>
        ) : (
          <div key={`${selectedLab}_${selectedType}_${selectedVector || 'ALL'}_${locale}`} className="animate-fade-in">
            <EditorialSpread
              articles={displayedArticles}
              onSelectArticle={handleOpenArticle}
              bookmarkedIds={savedIds}
              onToggleBookmark={toggleBookmark}
              locale={locale}
            />
          </div>
        )}
      </main>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 bg-[#faf9f6] border border-black px-3.5 py-2 font-mono text-[9px] tracking-widest uppercase text-black hover:bg-black hover:text-[#faf9f6] transition-colors cursor-pointer shadow-lg animate-fade-in"
          title="Back to top"
        >
          {dict.feed.top}
        </button>
      )}

      <Footer />

      <EditorialModal
        article={selectedArticle}
        onClose={handleCloseArticle}
        isBookmarked={selectedArticle ? isSaved(selectedArticle.id) : false}
        onToggleBookmark={(id) => toggleBookmark(id)}
        onSummaryEnriched={handleSummaryEnriched}
        locale={locale}
      />
    </div>
  );
}
