CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  value TEXT,
  created_at TEXT NOT NULL
);
