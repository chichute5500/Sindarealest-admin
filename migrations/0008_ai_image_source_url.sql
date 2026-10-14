PRAGMA foreign_keys = ON;

-- Persist the verified Taobao/1688 product URL associated with each reviewed image.
ALTER TABLE image_ai_reviews ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
