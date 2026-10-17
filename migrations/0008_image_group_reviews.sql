CREATE TABLE IF NOT EXISTS image_group_reviews (
 id TEXT PRIMARY KEY,
 image_a TEXT NOT NULL,
 image_b TEXT NOT NULL,
 same_product INTEGER NOT NULL CHECK (same_product IN (0,1)),
 confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
 rationale TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 product_id TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 CHECK (image_a <> image_b)
);
CREATE INDEX IF NOT EXISTS idx_image_group_reviews_status_created ON image_group_reviews(status,created_at DESC);
