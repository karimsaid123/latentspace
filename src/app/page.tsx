'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MinimalNav from '@/components/MinimalNav';
import EditorialSpread from '@/components/EditorialSpread';
import EditorialModal from '@/components/EditorialModal';
import Footer from '@/components/Footer';
import { Article } from '@/types';
import { RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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

  // Load articles
  const loadArticles = useCallback(async (category = selectedCategory, search = searchQuery, isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All' && category !== 'SAVED') params.set('category', category);
      if (search) params.set('search', search);

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      
      if (data.articles) {
        if (isSilent && window.scrollY > 150 && articles.length > 0) {
          // If user is scrolled down, compare to see if new articles were ingested
          const currentIds = new Set(articles.map((a) => a.id));
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
      if (!isSilent) setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, articles]);

  // Initial load
  useEffect(() => {
    loadArticles(selectedCategory, searchQuery, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadArticles(selectedCategory, searchQuery, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, loadArticles]);

  // Autonomous background polling (Every 45 seconds)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      loadArticles(selectedCategory, searchQuery, true);
    }, 45_000);
    return () => clearInterval(pollInterval);
  }, [loadArticles, selectedCategory, searchQuery]);

  // Manual Force Sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      setLastSyncedTime(Date.now());
      setIncomingArticles(null);
      await loadArticles(selectedCategory, searchQuery, false);
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

  // Filter articles for SAVED tab if active
  const displayedArticles = useMemo(() => {
    if (selectedCategory === 'SAVED') {
      return articles.filter((a) => bookmarkedIds.includes(a.id));
    }
    return articles;
  }, [articles, selectedCategory, bookmarkedIds]);

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

      {/* Minimal Top Nav (No bloat, clean Swiss minimalism) */}
      <MinimalNav
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
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

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-3 font-mono text-[10px] tracking-widest uppercase text-black/50">
            <RefreshCw className="w-5 h-5 animate-spin text-black" />
            <span>FETCHING AUTONOMOUS FEEDS...</span>
          </div>
        ) : displayedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 px-4 text-center font-mono text-xs uppercase tracking-widest text-black/60">
            <span className="mb-2 font-bold">
              {selectedCategory === 'SAVED' ? 'NO SAVED ARTICLES YET' : 'NO ARTICLES FOUND'}
            </span>
            <span className="text-[10px] text-black/40">
              {selectedCategory === 'SAVED'
                ? 'CLICK [+ SAVE] ON ANY ARTICLE TO BOOKMARK IT HERE'
                : 'TRY ADJUSTING YOUR FILTER OR SEARCH QUERY'}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-3 py-1 border border-black font-mono text-[10px] cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                [RESET SEARCH]
              </button>
            )}
          </div>
        ) : (
          <div key={selectedCategory} className="animate-fade-in">
            <EditorialSpread
              articles={displayedArticles}
              onSelectArticle={setSelectedArticle}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={toggleBookmark}
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
