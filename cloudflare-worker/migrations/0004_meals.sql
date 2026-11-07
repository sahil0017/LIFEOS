CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  created_at TEXT NOT NULL
);
