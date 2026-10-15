PRAGMA foreign_keys = ON;

-- Preserve the marketplace CDN URL separately from the source product page URL.
ALTER TABLE image_ai_reviews ADD COLUMN source_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE image_ai_reviews ADD COLUMN reference_image_ref TEXT NOT NULL DEFAULT '';
