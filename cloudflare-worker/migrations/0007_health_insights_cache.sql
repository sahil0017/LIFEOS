CREATE TABLE IF NOT EXISTS health_insights_cache (
  user_id TEXT PRIMARY KEY,
  insights TEXT,
  updated_at TEXT NOT NULL
);
