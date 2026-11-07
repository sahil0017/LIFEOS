PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS goals (
  user_id TEXT NOT NULL,
  id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, id)
);
CREATE TABLE IF NOT EXISTS study_sessions (
  user_id TEXT NOT NULL,
  id INTEGER NOT NULL,
  goal_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, id),
  FOREIGN KEY(user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS twin_observations (
  user_id TEXT NOT NULL,
  id INTEGER NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('routine', 'interest', 'preference', 'behavior')),
  label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 240),
  occurred_at TEXT NOT NULL,
  PRIMARY KEY(user_id, id)
);
CREATE INDEX IF NOT EXISTS twin_observations_user_time_idx ON twin_observations(user_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS twin_scenarios (
  user_id TEXT NOT NULL,
  id INTEGER NOT NULL,
  title TEXT NOT NULL,
  horizon_months INTEGER NOT NULL CHECK(horizon_months IN (3, 6, 12)),
  weekly_hours_change REAL NOT NULL,
  monthly_cashflow_change REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, id)
);
CREATE TABLE IF NOT EXISTS twin_embeddings (
  user_id TEXT NOT NULL,
  observation_id INTEGER NOT NULL,
  model TEXT NOT NULL,
  vector_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, observation_id),
  FOREIGN KEY(user_id, observation_id) REFERENCES twin_observations(user_id, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS privacy_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN ('assistant_ai', 'assistant_context', 'twin_ai', 'visual_ai')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, permission)
);
CREATE TABLE IF NOT EXISTS vision_captures (
  user_id TEXT NOT NULL,
  id TEXT NOT NULL,
  image_blob BLOB,
  question TEXT NOT NULL,
  answer TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, id)
);
CREATE INDEX IF NOT EXISTS vision_captures_user_time_idx ON vision_captures(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS module_context_events (
  user_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('created', 'updated', 'deleted')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, event_id, module_id)
);
