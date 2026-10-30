import fs from 'fs/promises';
import path from 'path';
import { Article, RSSFeedSource } from '@/types';
import { DEFAULT_SOURCES } from './default-sources';

const DATA_DIR = path.join(process.cwd(), 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const SOURCES_FILE = path.join(DATA_DIR, 'sources.json');

// Ensure data folder exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Ignore if exists
  }
}

// Atomic file write to prevent corruption
async function atomicWriteJson(filePath: string, data: unknown) {
  await ensureDataDir();
  const tmpPath = `${filePath}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

export async function getSources(): Promise<RSSFeedSource[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(SOURCES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    // Initialize with defaults if not found
    await atomicWriteJson(SOURCES_FILE, DEFAULT_SOURCES);
    return DEFAULT_SOURCES;
  }
}

export async function saveSources(sources: RSSFeedSource[]): Promise<void> {
  await atomicWriteJson(SOURCES_FILE, sources);
}

export async function getArticles(): Promise<Article[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(ARTICLES_FILE, 'utf8');
    const articles: Article[] = JSON.parse(raw);
    return articles;
  } catch {
    // Empty initial array
    return [];
  }
}

export async function saveArticles(articles: Article[]): Promise<void> {
  await atomicWriteJson(ARTICLES_FILE, articles);
}

export async function toggleArticleBookmark(id: string): Promise<boolean> {
  const articles = await getArticles();
  const index = articles.findIndex(a => a.id === id);
  if (index === -1) return false;

  articles[index].bookmarked = !articles[index].bookmarked;
  await saveArticles(articles);
  return !!articles[index].bookmarked;
}
