-- Store owner-reviewed CSV color per gallery image (index-aligned with images_json).
-- Existing products retain an empty array until their colors are classified.
ALTER TABLE products ADD COLUMN image_colors_json TEXT NOT NULL DEFAULT '[]';
