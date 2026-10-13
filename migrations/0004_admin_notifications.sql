PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS admin_push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  keys_json TEXT NOT NULL,
  expiration_time TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_push_updated ON admin_push_subscriptions(updated_at DESC);
