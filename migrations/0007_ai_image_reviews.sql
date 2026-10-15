PRAGMA foreign_keys = ON;

-- AI-generated/imported image candidates remain unlisted from product galleries
-- until an administrator explicitly approves them.
CREATE TABLE IF NOT EXISTS image_ai_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_ref TEXT NOT NULL,
  image_kind TEXT NOT NULL CHECK (image_kind IN ('existing','candidate')),
  r2_key TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  analysis_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, image_ref, image_kind)
);
CREATE INDEX IF NOT EXISTS idx_image_ai_reviews_status ON image_ai_reviews(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_ai_reviews_product ON image_ai_reviews(product_id, created_at DESC);
