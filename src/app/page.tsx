'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Load articles
  const loadArticles = useCallback(async (category = selectedCategory, search = searchQuery) => {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'All') params.set('category', category);
      if (search) params.set('search', search);

      const res = await fetch(`/api/news?${params.toString()}`);
      const data = await res.json();
      if (data.articles) {
        setArticles(data.articles);
      }
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadArticles(selectedCategory, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, loadArticles]);

  // Handle Sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/sync', { method: 'POST' });
      await loadArticles();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-black">
      
      {/* Minimal Top Nav (No bloat, clean Swiss minimalism) */}
      <MinimalNav
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        onSync={handleSync}
        isSyncing={isSyncing}
        totalArticles={articles.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-3 font-mono text-[10px] tracking-widest uppercase text-black/50">
            <RefreshCw className="w-5 h-5 animate-spin text-black" />
            <span>LOADING...</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 px-4 text-center font-mono text-xs uppercase tracking-widest text-black/60">
            <span className="mb-2 font-bold">NO SPECIMENS FOUND</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-3 py-1 border border-black font-mono text-[10px] cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                [RESET FILTER]
              </button>
            )}
          </div>
        ) : (
          <EditorialSpread
            articles={articles}
            onSelectArticle={setSelectedArticle}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Reader Modal */}
      <EditorialModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />

    </div>
  );
}
