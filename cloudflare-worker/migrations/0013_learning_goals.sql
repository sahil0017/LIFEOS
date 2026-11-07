CREATE TABLE IF NOT EXISTS learning_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill TEXT NOT NULL,
  progress REAL DEFAULT 0,
  created_at TEXT NOT NULL
);
