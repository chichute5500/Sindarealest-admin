-- Persistent, individually revocable Android Owner sessions (30-day inactivity window).
-- Apply to the correct D1 environment only after review/Owner acceptance.
CREATE TABLE IF NOT EXISTS android_admin_devices (
  token_hash TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  fcm_token TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_android_admin_device_expires ON android_admin_devices(expires_at);
