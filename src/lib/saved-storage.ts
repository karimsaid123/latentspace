'use client';

import { useState, useEffect, useCallback } from 'react';
import { Article } from '@/types';

export interface SavedArticleItem {
  id: string;
  savedAt: number; // Unix timestamp in ms
  article: Article;
}

const STORAGE_KEY_ITEMS = 'latentspace_saved_items_v2';
const STORAGE_KEY_LEGACY_IDS = 'latentspace_saved_articles';
const EVENT_KEY = 'latentspace_saved_changed';
const MAX_SAVED_ITEMS = 200;

function isSafeHttpUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeStoredItem(raw: any): SavedArticleItem | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 128) return null;
  const art = raw.article;
  if (!art || typeof art !== 'object') return null;
  if (typeof art.id !== 'string' || typeof art.title !== 'string') return null;
  if (!isSafeHttpUrl(art.link)) return null;
  if (art.pdfUrl !== undefined && art.pdfUrl !== null && !isSafeHttpUrl(art.pdfUrl)) {
    art.pdfUrl = undefined;
  }
  const savedAt = typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now();
  return {
    id: raw.id,
    savedAt,
    article: art as Article,
  };
}

/**
 * Read saved article items from localStorage safely (SSR-guarded & schema-validated).
 */
export function getSavedArticleItems(): SavedArticleItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (!raw || raw.length > 2 * 1024 * 1024) {
      return [];
    }
    const parsed = JSON.parse(raw, (key, value) =>
      key === '__proto__' || key === 'constructor' || key === 'prototype' ? undefined : value
    );
    if (Array.isArray(parsed)) {
      const valid: SavedArticleItem[] = [];
      for (const entry of parsed.slice(0, MAX_SAVED_ITEMS)) {
        const clean = sanitizeStoredItem(entry);
        if (clean) valid.push(clean);
      }
      return valid;
    }
  } catch (err) {
    console.error('Failed to parse saved articles:', err);
  }
  return [];
}

/**
 * Read list of saved article IDs for fast O(1) set lookups.
 */
export function getSavedArticleIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const items = getSavedArticleItems();
    if (items.length > 0) {
      return items.map(i => i.id);
    }
    const legacyRaw = localStorage.getItem(STORAGE_KEY_LEGACY_IDS);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

/**
 * Save an article with current timestamp.
 */
export function saveArticle(article: Article): void {
  if (typeof window === 'undefined' || !article || !article.id) return;
  try {
    const existing = getSavedArticleItems();
    const filtered = existing.filter(item => item.id !== article.id);
    const updated: SavedArticleItem[] = [
      {
        id: article.id,
        savedAt: Date.now(),
        article,
      },
      ...filtered,
    ].slice(0, MAX_SAVED_ITEMS);

    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_LEGACY_IDS, JSON.stringify(updated.map(u => u.id)));

    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { action: 'save', id: article.id } }));
  } catch (err) {
    console.error('Failed to save article:', err);
  }
}

/**
 * Remove an article from saved bookmarks.
 */
export function removeSavedArticle(id: string): void {
  if (typeof window === 'undefined' || !id) return;
  try {
    const existing = getSavedArticleItems();
    const updated = existing.filter(item => item.id !== id);

    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
    localStorage.setItem(STORAGE_KEY_LEGACY_IDS, JSON.stringify(updated.map(u => u.id)));

    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { action: 'remove', id } }));
  } catch (err) {
    console.error('Failed to remove saved article:', err);
  }
}

/**
 * Toggle bookmark state of an article.
 * Returns true if now saved, false if removed.
 */
export function toggleSavedArticle(article: Article): boolean {
  if (!article || !article.id) return false;
  const ids = getSavedArticleIds();
  if (ids.includes(article.id)) {
    removeSavedArticle(article.id);
    return false;
  } else {
    saveArticle(article);
    return true;
  }
}

/**
 * Upgrade legacy saved article IDs if article metadata is loaded.
 */
export function reconcileLegacySaved(availableArticles: Article[]): void {
  if (typeof window === 'undefined' || !availableArticles.length) return;
  try {
    const legacyRaw = localStorage.getItem(STORAGE_KEY_LEGACY_IDS);
    if (!legacyRaw) return;
    const legacyIds: string[] = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyIds) || legacyIds.length === 0) return;

    const existingItems = getSavedArticleItems();
    const existingIds = new Set(existingItems.map(i => i.id));
    let hasNew = false;

    for (const id of legacyIds) {
      if (!existingIds.has(id)) {
        const found = availableArticles.find(a => a.id === id);
        if (found) {
          existingItems.push({
            id: found.id,
            savedAt: Date.now(),
            article: found,
          });
          existingIds.add(found.id);
          hasNew = true;
        }
      }
    }

    if (hasNew) {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(existingItems));
      window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { action: 'reconcile' } }));
    }
  } catch (_) {}
}

/**
 * Reactive React hook for saved articles across all views.
 */
export function useSavedArticles() {
  const [savedItems, setSavedItems] = useState<SavedArticleItem[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState<boolean>(false);

  const refresh = useCallback(() => {
    const items = getSavedArticleItems();
    const ids = getSavedArticleIds();
    setSavedItems(items);
    setSavedIds(ids);
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener(EVENT_KEY, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const toggleSave = useCallback((article: Article) => {
    const res = toggleSavedArticle(article);
    refresh();
    return res;
  }, [refresh]);

  const removeSave = useCallback((id: string) => {
    removeSavedArticle(id);
    refresh();
  }, [refresh]);

  const save = useCallback((article: Article) => {
    saveArticle(article);
    refresh();
  }, [refresh]);

  const isSaved = useCallback((id: string) => {
    return savedIds.includes(id);
  }, [savedIds]);

  return {
    savedItems: mounted ? savedItems : [],
    savedIds: mounted ? savedIds : [],
    count: mounted ? savedIds.length : 0,
    isSaved,
    toggleSave,
    removeSave,
    save,
    reconcile: reconcileLegacySaved,
    refresh,
    isMounted: mounted,
  };
}
