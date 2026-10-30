'use client';

import React, { useState, useEffect, useCallback } from 'react';
import OffWhiteHeader from '@/components/OffWhiteHeader';
import OffWhiteCategoryNav from '@/components/OffWhiteCategoryNav';
import EditorialSpread from '@/components/EditorialSpread';
import ExhibitionGrid from '@/components/ExhibitionGrid';
import LedgerIndex from '@/components/LedgerIndex';
import EditorialModal from '@/components/EditorialModal';
import SourcesModal from '@/components/SourcesModal';
import Footer from '@/components/Footer';
import { Article, Category, RSSFeedSource } from '@/types';
import { RefreshCw, SearchX } from 'lucide-react';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<string>('latest');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // View state: 'spread' | 'exhibition' | 'archive'
  const [activeView, setActiveView] = useState<'spread' | 'exhibition' | 'archive'>('spread');

  // Modals
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // AI & Sources
  const [aiMode, setAiMode] = useState<'gemini' | 'heuristic'>('heuristic');
  const [sources, setSources] = useState<RSSFeedSource[]>([]);

  // Load articles
  const loadArticles = useCallback(async (category = selectedCategory, search = searchQuery, sort = sortOption, bookmarked = showBookmarksOnly) => {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.set('category', category);
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      if (bookmarked) params.set('bookmarked', 'true');

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      if (data.articles) {
        setArticles(data.articles);
        if (data.categoryCounts) {
          setCategoryCounts(data.categoryCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, sortOption, showBookmarksOnly]);

  // Load sources & config
  const loadConfig = useCallback(async () => {
    try {
      const [sourcesRes, keyRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/test-key'),
      ]);
      const sourcesData = await sourcesRes.json();
      if (sourcesData.sources) setSources(sourcesData.sources);
      const keyData = await keyRes.json();
      if (keyData.mode) setAiMode(keyData.mode);
    } catch (err) {
      console.error('Failed to load sources & config:', err);
    }
  }, []);

  useEffect(() => {
    loadArticles();
    loadConfig();
  }, [loadArticles, loadConfig]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadArticles(selectedCategory, searchQuery, sortOption, showBookmarksOnly);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortOption, showBookmarksOnly, loadArticles]);

  // Handle Sync
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncToast('"AI SPECIMEN HARVEST IN PROGRESS..."');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncToast(
          data.articlesAdded > 0 
            ? `"HARVEST COMPLETE: +${data.articlesAdded} NEW SPECIMENS"`
            : '"ALL FEEDS SYNCHRONIZED"'
        );
        await loadArticles();
        await loadConfig();
      } else {
        setSyncToast('"SYNC FAILED"');
      }
    } catch (err: any) {
      setSyncToast(`"ERROR: ${err.message}"`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  // Bookmark toggle
  const handleToggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/bookmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setArticles(prev => prev.map(a => a.id === id ? { ...a, bookmarked: data.bookmarked } : a));
        setCategoryCounts(prev => ({
          ...prev,
          Bookmarks: data.bookmarked ? (prev.Bookmarks || 0) + 1 : Math.max(0, (prev.Bookmarks || 1) - 1),
        }));
      }
    } catch (err) {
      console.error('Bookmark error:', err);
    }
  };

  // Toggle Source
  const handleToggleSource = async (id: string) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      });
      if (res.ok) {
        setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
      }
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  };

  // Add Source
  const handleAddSource = async (newSourceData: { name: string; feedUrl: string; websiteUrl?: string; category: Category; color: string }) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...newSourceData }),
      });
      const data = await res.json();
      if (data.success && data.source) {
        setSources(prev => [...prev, data.source]);
        handleSync();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Delete Source
  const handleDeleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSources(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f3ef] dark:bg-[#0d0d0d] text-black dark:text-white transition-colors selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      
      {/* Industrial Toast Tag */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 font-mono text-xs uppercase tracking-widest px-4 py-2.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white shadow-2xl">
          {syncToast}
        </div>
      )}

      {/* Header */}
      <OffWhiteHeader
        activeView={activeView}
        onChangeView={setActiveView}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSync={handleSync}
        isSyncing={isSyncing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showBookmarksOnly={showBookmarksOnly}
        onToggleBookmarks={() => {
          setShowBookmarksOnly(!showBookmarksOnly);
          setSelectedCategory('All');
        }}
        bookmarkCount={categoryCounts.Bookmarks || 0}
      />

      {/* Category Navigation Bar */}
      <OffWhiteCategoryNav
        selectedCategory={showBookmarksOnly ? 'Bookmarks' : selectedCategory}
        onSelectCategory={(cat) => {
          setShowBookmarksOnly(false);
          setSelectedCategory(cat);
        }}
        categoryCounts={categoryCounts}
        sortOption={sortOption}
        onChangeSort={setSortOption}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 font-mono text-xs uppercase tracking-widest text-black/60 dark:text-white/60">
            <RefreshCw className="w-6 h-6 animate-spin text-black dark:text-white" />
            <span>"LOADING AUTONOMOUS RADAR DATA..."</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center font-mono uppercase text-xs">
            <SearchX className="w-10 h-10 text-black/40 dark:text-white/40 mb-3" />
            <h3 className="font-bold text-sm mb-1">
              "NO SPECIMENS FOUND"
            </h3>
            <p className="text-black/50 dark:text-white/50 max-w-sm mb-4">
              {searchQuery 
                ? `NO RESULTS MATCHING QUERY "${searchQuery}".`
                : showBookmarksOnly
                ? 'NO SAVED SPECIMENS IN ARCHIVE.'
                : 'NO ARTICLES DETECTED IN FEED.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-bold cursor-pointer"
              >
                CLEAR FILTER
              </button>
            )}
          </div>
        ) : (
          <>
            {/* View 1: SPREAD (Editorial Lookbook / Swiss Poetry Layout directly from screenshots) */}
            {activeView === 'spread' && (
              <EditorialSpread
                articles={articles}
                onSelectArticle={setSelectedArticle}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {/* View 2: EXHIBITION (Card Specimens with 4 corner crop handles) */}
            {activeView === 'exhibition' && (
              <ExhibitionGrid
                articles={articles}
                onSelectArticle={setSelectedArticle}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {/* View 3: LEDGER (Minimalist brutalist table manifest) */}
            {activeView === 'archive' && (
              <LedgerIndex
                articles={articles}
                onSelectArticle={setSelectedArticle}
                onToggleBookmark={handleToggleBookmark}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Reader Modal */}
      <EditorialModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Sources & AI Config Drawer */}
      <SourcesModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sources={sources}
        onToggleSource={handleToggleSource}
        onAddSource={handleAddSource}
        onDeleteSource={handleDeleteSource}
        onForceSync={handleSync}
        isSyncing={isSyncing}
        aiMode={aiMode}
        onKeyUpdated={loadConfig}
      />

    </div>
  );
}
