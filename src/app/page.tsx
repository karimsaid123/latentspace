'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MinimalNav, { LAB_FILTERS } from '@/components/MinimalNav';
import EditorialSpread from '@/components/EditorialSpread';
import EditorialModal from '@/components/EditorialModal';
import Footer from '@/components/Footer';
import { Article } from '@/types';
import { RefreshCw } from 'lucide-react';
import { useSavedArticles } from '@/lib/saved-storage';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedLab, setSelectedLab] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<'ALL' | 'DISPATCH' | 'RESEARCH_PAPER'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // QoL States
  const [lastSyncedTime, setLastSyncedTime] = useState<number>(() => Date.now());
  const { savedIds, count: savedCount, toggleSave, isSaved, reconcile } = useSavedArticles();
  const [incomingArticles, setIncomingArticles] = useState<Article[] | null>(null);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Set initial client timestamp & read optional ?lab= URL query param on mount
  useEffect(() => {
    setLastSyncedTime(Date.now());
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const labParam = params.get('lab');
      if (labParam && LAB_FILTERS.some((l) => l.id === labParam)) {
        setSelectedLab(labParam);
      }
    }
  }, []);

  // Initial deep-link check (only runs ONCE when articles first load)
  const initialDeepLinkChecked = useRef(false);
  useEffect(() => {
    if (initialDeepLinkChecked.current || articles.length === 0) return;
    initialDeepLinkChecked.current = true;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const articleId = params.get('article');
      if (articleId) {
        const found = articles.find((a) => a.id === articleId);
        if (found) {
          setSelectedArticle(found);
        }
      }
    }
  }, [articles]);

  // Open article modal and update URL
  const handleOpenArticle = useCallback((article: Article) => {
    setSelectedArticle(article);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('article', article.id);
      window.history.pushState({ articleId: article.id }, '', url.toString());
    }
  }, []);

  // Close article modal and cleanly remove URL parameter
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

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
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
  }, []);

  const articlesRef = useRef<Article[]>([]);
  articlesRef.current = articles;

  const toggleBookmark = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const art = articlesRef.current.find((a) => a.id === id);
    if (art) {
      toggleSave(art);
    }
  }, [toggleSave]);

  const handleSelectLabFromDossier = useCallback((lab: string) => {
    setSelectedLab(lab);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

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

  // Global Keyboard Shortcuts (Press '/' to search, 'Esc' to close)
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchArticles = useCallback(async (search: string, isSilent = false, forceBust = false) => {
    if (!isSilent) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      if (articlesRef.current.length === 0) {
        setIsLoading(true);
      }
    }

    const signal = !isSilent ? abortControllerRef.current?.signal : undefined;

    try {
      const params = new URLSearchParams();
      params.set('limit', '400');
      if (search) params.set('search', search);
      if (forceBust) {
        params.set('sync', '1');
        params.set('_t', String(Date.now()));
      }

      const res = await fetch(`/api/news?${params.toString()}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.articles) {
        if (isSilent && typeof window !== 'undefined' && window.scrollY > 150 && articlesRef.current.length > 0) {
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
      setIsLoading(false);
    }
  }, [reconcile]);

  // Initial load ONCE on mount (prevents double-fetching on every search keystroke)
  useEffect(() => {
    fetchArticles('', false);
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchArticles]);

  // Debounced search (only triggers when searchQuery changes after mount)
  const isSearchMounted = useRef(false);
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      fetchArticles(searchQuery, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchArticles]);

  // Visibility-aware background polling (Every 45s ONLY when tab is visible)
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  useEffect(() => {
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      fetchArticles(searchQueryRef.current, true);
    }, 45_000);
    return () => clearInterval(pollInterval);
  }, [fetchArticles]);

  // Manual Force Sync
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      setLastSyncedTime(Date.now());
      setIncomingArticles(null);
      await fetchArticles(searchQueryRef.current, false, true);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchArticles]);

  // Apply pending incoming articles banner
  const applyIncomingArticles = useCallback(() => {
    if (incomingArticles) {
      setArticles(incomingArticles);
      setIncomingArticles(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [incomingArticles]);

  // Filter articles for SAVED tab, LAB sector, and FORMAT type if active
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
    return list;
  }, [articles, selectedLab, selectedType, savedIdSet]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-black">
      
      {/* Floating Incoming Telemetry Badge (Auto-Sync Notice) */}
      {incomingArticles && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in select-none">
          <button
            onClick={applyIncomingArticles}
            className="bg-black text-[#faf9f6] border border-black font-mono text-[9px] tracking-widest uppercase px-5 py-2.5 shadow-2xl cursor-pointer hover:bg-black/85 transition-all flex items-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>NEW TELEMETRY HARVESTED // CLICK TO VIEW LATEST</span>
          </button>
        </div>
      )}

      {/* Minimal Top Nav (Pure Lab Sectors & Publication Types) */}
      <MinimalNav
        selectedLab={selectedLab}
        onSelectLab={setSelectedLab}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSync={handleSync}
        isSyncing={isSyncing}
        totalArticles={displayedArticles.length}
        lastSyncedTime={lastSyncedTime}
        savedCount={savedCount}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-3 font-mono text-[10px] tracking-widest uppercase text-black/50">
            <RefreshCw className="w-5 h-5 animate-spin text-black" />
            <span>FETCHING AUTONOMOUS FEEDS & PUBLICATIONS...</span>
          </div>
        ) : displayedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 px-4 text-center font-mono text-xs uppercase tracking-widest text-black/60">
            <span className="mb-2 font-bold">
              {selectedLab === 'SAVED' ? 'NO SAVED ENTRIES YET' : 'NO TELEMETRY FOUND IN THIS SECTOR'}
            </span>
            <span className="text-[10px] text-black/40">
              {selectedLab === 'SAVED'
                ? 'CLICK [+ SAVE] ON ANY ARTICLE OR RESEARCH PAPER TO BOOKMARK IT HERE'
                : 'TRY ADJUSTING YOUR LAB FILTER, PUBLICATION TYPE OR SEARCH QUERY'}
            </span>
            {(searchQuery || selectedLab !== 'All' || selectedType !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLab('All');
                  setSelectedType('ALL');
                }}
                className="mt-4 px-3 py-1 border border-black font-mono text-[10px] cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                [RESET ALL FILTERS]
              </button>
            )}
          </div>
        ) : (
          <div key={`${selectedLab}_${selectedType}`} className="animate-fade-in">
            <EditorialSpread
              articles={displayedArticles}
              allArticles={articles}
              onSelectArticle={handleOpenArticle}
              bookmarkedIds={savedIds}
              onToggleBookmark={toggleBookmark}
              onSelectLab={handleSelectLabFromDossier}
            />
          </div>
        )}
      </main>

      {/* Floating Back-To-Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 bg-[#faf9f6] border border-black px-3.5 py-2 font-mono text-[9px] tracking-widest uppercase text-black hover:bg-black hover:text-[#faf9f6] transition-colors cursor-pointer shadow-lg animate-fade-in"
          title="Back to top"
        >
          [↑ TOP]
        </button>
      )}

      {/* Footer */}
      <Footer />

      {/* Reader Modal */}
      <EditorialModal
        article={selectedArticle}
        onClose={handleCloseArticle}
        isBookmarked={selectedArticle ? isSaved(selectedArticle.id) : false}
        onToggleBookmark={(id) => toggleBookmark(id)}
      />

    </div>
  );
}
