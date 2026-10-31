-- ─────────────────────────────────────────────────────────────
-- LATENT SPACE: Cloudflare D1 Edge SQLite Schema
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  canonicalUrl TEXT NOT NULL,
  title TEXT NOT NULL,
  publishedAt TEXT NOT NULL,
  publishedAtMs INTEGER NOT NULL,
  fetchedAt TEXT NOT NULL,
  contentHash TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  sourceName TEXT NOT NULL,
  author TEXT,
  contentSnippet TEXT,
  imageUrl TEXT,
  category TEXT NOT NULL,
  lab TEXT NOT NULL,
  entryType TEXT NOT NULL,
  arxivId TEXT,
  pdfUrl TEXT,
  summaryJson TEXT,
  searchBlob TEXT
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(publishedAtMs DESC);
CREATE INDEX IF NOT EXISTS idx_articles_lab ON articles(lab);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_sourceId ON articles(sourceId);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  feedUrl TEXT NOT NULL,
  websiteUrl TEXT NOT NULL,
  category TEXT NOT NULL,
  color TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  consecutiveFailures INTEGER NOT NULL DEFAULT 0,
  lastFetchedAt TEXT
);

CREATE TABLE IF NOT EXISTS sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  runId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  durationMs INTEGER NOT NULL,
  articlesAdded INTEGER NOT NULL,
  articlesModified INTEGER NOT NULL,
  sourcesProcessed INTEGER NOT NULL
);
