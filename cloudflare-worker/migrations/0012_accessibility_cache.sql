CREATE TABLE IF NOT EXISTS accessibility_cache (
  text_hash TEXT PRIMARY KEY,
  simplified TEXT,
  updated_at TEXT NOT NULL
);
