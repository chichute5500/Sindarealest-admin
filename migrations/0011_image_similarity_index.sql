CREATE TABLE IF NOT EXISTS image_group_index (
  image_key TEXT PRIMARY KEY,
  p_hash TEXT NOT NULL CHECK(length(p_hash) = 16),
  features_json TEXT NOT NULL,
  width INTEGER NOT NULL CHECK(width > 0),
  height INTEGER NOT NULL CHECK(height > 0),
  source_size INTEGER NOT NULL DEFAULT 0 CHECK(source_size >= 0),
  source_uploaded TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_image_group_index_updated ON image_group_index(updated_at DESC);

CREATE TABLE IF NOT EXISTS image_group_sets (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  similarity INTEGER NOT NULL CHECK(similarity BETWEEN 0 AND 100),
  rationale TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
  product_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_image_group_sets_status_created ON image_group_sets(status, created_at DESC);

CREATE TABLE IF NOT EXISTS image_group_set_members (
  group_id TEXT NOT NULL,
  image_key TEXT NOT NULL,
  similarity INTEGER NOT NULL CHECK(similarity BETWEEN 0 AND 100),
  PRIMARY KEY(group_id, image_key)
);
CREATE INDEX IF NOT EXISTS idx_image_group_set_members_image ON image_group_set_members(image_key);
