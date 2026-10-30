'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MinimalNav from '@/components/MinimalNav';
import EditorialSpread from '@/components/EditorialSpread';
import EditorialModal from '@/components/EditorialModal';
import BenchmarkRadar from '@/components/BenchmarkRadar';
import Footer from '@/components/Footer';
import { Article } from '@/types';
import { RefreshCw } from 'lucide-react';

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
  const [lastSyncedTime, setLastSyncedTime] = useState<number>(0);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string>('JUST NOW');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [incomingArticles, setIncomingArticles] = useState<Article[] | null>(null);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Set initial client timestamp after mount
  useEffect(() => {
    setLastSyncedTime(Date.now());
  }, []);

  // Initialize saved bookmarks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('latentspace_saved_articles');
      if (stored) {
        setBookmarkedIds(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

  const toggleBookmark = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('latentspace_saved_articles', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Update relative time label (e.g. "JUST NOW", "30S AGO", "2M AGO")
  useEffect(() => {
    const updateLabel = () => {
      if (!lastSyncedTime) {
        setLastSyncedLabel('JUST NOW');
        return;
      }
      const diffSec = Math.floor((Date.now() - lastSyncedTime) / 1000);
      if (diffSec < 15) setLastSyncedLabel('JUST NOW');
      else if (diffSec < 60) setLastSyncedLabel(`${diffSec}S AGO`);
      else {
        const mins = Math.floor(diffSec / 60);
        setLastSyncedLabel(`${mins}M AGO`);
      }
    };

    updateLabel();
    const interval = setInterval(updateLabel, 10_000);
    return () => clearInterval(interval);
  }, [lastSyncedTime]);

  // Track window scroll for Back-To-Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
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
        setSelectedArticle(null);
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load articles with stable ref to prevent infinite re-render loops
  const articlesRef = React.useRef<Article[]>([]);
  articlesRef.current = articles;

  const fetchArticles = useCallback(async (search: string, isSilent = false) => {
    if (!isSilent && articlesRef.current.length === 0) {
      setIsLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/news?${params.toString()}`);
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
        }
        if (data.lastSyncedAt) {
          setLastSyncedTime(data.lastSyncedAt);
        }
      }
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchArticles(searchQuery, false);
  }, [fetchArticles, searchQuery]);

  // Debounced search (only triggers when searchQuery changes)
  const isSearchMounted = React.useRef(false);
  useEffect(() => {
    if (!isSearchMounted.current) {
      isSearchMounted.current = true;
      return;
    }
    const timer = setTimeout(() => {
      fetchArticles(searchQuery, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchArticles]);

  // Autonomous background polling (Every 45 seconds)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchArticles(searchQuery, true);
    }, 45_000);
    return () => clearInterval(pollInterval);
  }, [searchQuery, fetchArticles]);

  // Manual Force Sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      setLastSyncedTime(Date.now());
      setIncomingArticles(null);
      await fetchArticles(searchQuery, false);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Apply pending incoming articles banner
  const applyIncomingArticles = () => {
    if (incomingArticles) {
      setArticles(incomingArticles);
      setIncomingArticles(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter articles for SAVED tab, LAB sector, and FORMAT type if active
  const displayedArticles = useMemo(() => {
    let list = articles;
    if (selectedLab === 'SAVED') {
      list = list.filter((a) => bookmarkedIds.includes(a.id));
    } else if (selectedLab !== 'All') {
      list = list.filter((a) => a.lab === selectedLab);
    }
    if (selectedType !== 'ALL') {
      list = list.filter((a) => a.entryType === selectedType);
    }
    return list;
  }, [articles, selectedLab, selectedType, bookmarkedIds]);

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
        lastSyncedText={lastSyncedLabel}
        savedCount={bookmarkedIds.length}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
      />

      {/* 00 // Artificial Analysis Independent Benchmarks */}
      <BenchmarkRadar onSelectLab={setSelectedLab} />

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
              onSelectArticle={setSelectedArticle}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
              onSelectLab={setSelectedLab}
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
        onClose={() => setSelectedArticle(null)}
        isBookmarked={selectedArticle ? bookmarkedIds.includes(selectedArticle.id) : false}
        onToggleBookmark={(id) => toggleBookmark(id)}
      />

    </div>
  );
}
