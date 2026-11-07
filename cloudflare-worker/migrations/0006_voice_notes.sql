CREATE TABLE IF NOT EXISTS voice_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transcript TEXT,
  created_at TEXT NOT NULL
);
