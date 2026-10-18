-- One active image-group proposal/approval may own an image at a time.
-- This claim table makes membership uniqueness atomic across concurrent scans.
CREATE TABLE IF NOT EXISTS image_group_image_claims (
  image_key TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','approved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_image_group_claims_group_status
  ON image_group_image_claims(group_id,status);

-- Backfill in a deterministic order: approved history first, then older pending
-- proposals. INSERT OR IGNORE reserves each key only once.
INSERT OR IGNORE INTO image_group_image_claims(image_key,group_id,status)
SELECT m.image_key,g.id,g.status
FROM image_group_sets g
JOIN image_group_set_members m ON m.group_id=g.id
WHERE g.status IN ('approved','pending')
ORDER BY CASE g.status WHEN 'approved' THEN 0 ELSE 1 END,g.created_at ASC,g.id ASC,m.image_key ASC;

-- Keep the first reservation and retire a pending proposal if any of its images
-- are already reserved by another active group. No source image is modified.
UPDATE image_group_sets
SET status='rejected',reviewed_at=datetime('now')
WHERE status='pending'
  AND EXISTS (
    SELECT 1
    FROM image_group_set_members m
    JOIN image_group_image_claims c ON c.image_key=m.image_key
    WHERE m.group_id=image_group_sets.id
      AND c.group_id<>image_group_sets.id
  );
