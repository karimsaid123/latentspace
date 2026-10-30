'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Ticker from '@/components/Ticker';
import HeroFeatured from '@/components/HeroFeatured';
import CategoryFilter from '@/components/CategoryFilter';
import ArticleCard from '@/components/ArticleCard';
import ArticleModal from '@/components/ArticleModal';
import SourcesModal from '@/components/SourcesModal';
import NewsletterBanner from '@/components/NewsletterBanner';
import Footer from '@/components/Footer';
import { Article, Category, RSSFeedSource } from '@/types';
import { Sparkles, RefreshCw, SearchX } from 'lucide-react';

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

  // Modals
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // AI & Sources state
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

  // Load sources & AI config status
  const loadConfig = useCallback(async () => {
    try {
      const [sourcesRes, keyRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/test-key'),
      ]);
      const sourcesData = await sourcesRes.json();
      if (sourcesData.sources) {
        setSources(sourcesData.sources);
      }
      const keyData = await keyRes.json();
      if (keyData.mode) {
        setAiMode(keyData.mode);
      }
    } catch (err) {
      console.error('Failed to load sources & config:', err);
    }
  }, []);

  useEffect(() => {
    loadArticles();
    loadConfig();
  }, [loadArticles, loadConfig]);

  // Handle Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadArticles(selectedCategory, searchQuery, sortOption, showBookmarksOnly);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, sortOption, showBookmarksOnly, loadArticles]);

  // Sync Trigger
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncToast('Feeds ophalen en analyseren met AI...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncToast(
          data.articlesAdded > 0 
            ? `Voltooid! ${data.articlesAdded} nieuwe artikelen toegevoegd en samengevat.` 
            : 'Voltooid! Alle feeds zijn up-to-date.'
        );
        await loadArticles();
        await loadConfig();
      } else {
        setSyncToast('Synchronisatie mislukt.');
      }
    } catch (err: any) {
      setSyncToast(`Fout bij synchroniseren: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Bookmark Toggle
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
        handleSync(); // trigger sync for new feed
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

  const isBrowsingAll = selectedCategory === 'All' && !searchQuery && !showBookmarksOnly;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors selection:bg-violet-500 selection:text-white">
      
      {/* Toast notification */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white border border-violet-500/50 shadow-2xl animate-bounce">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold">{syncToast}</span>
        </div>
      )}

      {/* Header */}
      <Header
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
        aiMode={aiMode}
      />

      {/* Breaking Ticker */}
      <Ticker
        articles={articles}
        onSelectArticle={setSelectedArticle}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              AI Feeds synchroniseren en artikelen laden...
            </p>
          </div>
        ) : (
          <>
            {/* Spotlight / Hero Featured Section (shown only on All view with no search) */}
            {isBrowsingAll && articles.length > 0 && (
              <HeroFeatured
                articles={articles}
                onSelectArticle={setSelectedArticle}
                onToggleBookmark={handleToggleBookmark}
              />
            )}

            {/* Category Filter and Sorting Bar */}
            <CategoryFilter
              selectedCategory={showBookmarksOnly ? 'Bookmarks' : selectedCategory}
              onSelectCategory={(cat) => {
                setShowBookmarksOnly(false);
                setSelectedCategory(cat);
              }}
              categoryCounts={categoryCounts}
              sortOption={sortOption}
              onChangeSort={setSortOption}
            />

            {/* Articles Grid */}
            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
                <SearchX className="w-12 h-12 text-slate-400 mb-3" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Geen artikelen gevonden
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  {searchQuery 
                    ? `Geen resultaten gevonden voor "${searchQuery}". Probeer een andere zoekterm.`
                    : showBookmarksOnly
                    ? 'Je hebt nog geen artikelen opgeslagen als bladwijzer. Klik op het bladwijzer-icoontje bij een artikel om het hier te bewaren.'
                    : 'Er zijn nog geen artikelen gesynchroniseerd.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors cursor-pointer"
                  >
                    Wis zoekopdracht
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* When on 'All' view without search, skip first 3 items because they are in the hero section */}
                {(isBrowsingAll ? articles.slice(3) : articles).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    onSelectArticle={setSelectedArticle}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </div>
            )}

            {/* Daily Newsletter Section */}
            <NewsletterBanner />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Reader Modal */}
      <ArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Sources & AI Settings Modal */}
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
