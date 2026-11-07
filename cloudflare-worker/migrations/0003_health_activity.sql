ALTER TABLE privacy_permissions RENAME TO privacy_permissions_legacy;
CREATE TABLE privacy_permissions (
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN ('assistant_ai', 'assistant_context', 'twin_ai', 'visual_ai', 'health_activity')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, permission)
);
INSERT INTO privacy_permissions (user_id, permission, enabled, updated_at)
  SELECT user_id, permission, enabled, updated_at FROM privacy_permissions_legacy;
DROP TABLE privacy_permissions_legacy;
CREATE TABLE IF NOT EXISTS daily_activity (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  steps INTEGER NOT NULL CHECK(steps >= 0 AND steps <= 150000),
  source TEXT NOT NULL CHECK(source = 'ios_pedometer'),
  recorded_at TEXT NOT NULL,
  PRIMARY KEY(user_id, day)
);
CREATE INDEX IF NOT EXISTS daily_activity_user_day_idx ON daily_activity(user_id, day DESC);
