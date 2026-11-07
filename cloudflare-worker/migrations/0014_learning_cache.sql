CREATE TABLE IF NOT EXISTS learning_cache (
  user_id TEXT PRIMARY KEY,
  recommendations TEXT,
  updated_at TEXT NOT NULL
);
