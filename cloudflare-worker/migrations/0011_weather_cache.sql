CREATE TABLE IF NOT EXISTS weather_cache (
  user_id TEXT PRIMARY KEY,
  weather_json TEXT,
  updated_at TEXT NOT NULL
);
