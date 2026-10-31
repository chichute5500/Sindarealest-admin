-- Preview-first: avoid re-reading the entire Admin catalog when no product changed.
-- Compatible with every existing storefront and back-office product writer.
-- A separate index supports Admin ordering without scanning via published first.
CREATE INDEX IF NOT EXISTS idx_products_sort_sku
  ON products(sort_order ASC, sku ASC);

-- The three triggers must exist BEFORE publishing the revision row:
-- an interrupted rollout then safely falls back to full catalog reads.
CREATE TRIGGER IF NOT EXISTS trg_products_revision_insert
AFTER INSERT ON products
BEGIN
  UPDATE settings
     SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT),
         updated_at = datetime('now')
   WHERE key = 'products_revision';
END;

CREATE TRIGGER IF NOT EXISTS trg_products_revision_update
AFTER UPDATE ON products
BEGIN
  UPDATE settings
     SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT),
         updated_at = datetime('now')
   WHERE key = 'products_revision';
END;

CREATE TRIGGER IF NOT EXISTS trg_products_revision_delete
AFTER DELETE ON products
BEGIN
  UPDATE settings
     SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT),
         updated_at = datetime('now')
   WHERE key = 'products_revision';
END;

-- Created last: clients never trust a revision unless all triggers are present.
INSERT OR IGNORE INTO settings(key,value,updated_at)
VALUES ('products_revision','0',datetime('now'));
