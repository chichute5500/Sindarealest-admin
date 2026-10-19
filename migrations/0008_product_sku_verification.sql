-- Explicitly distinguish commercial SKUs from generated internal identifiers.
-- Existing values are conservatively unverified until a human confirms the commercial SKU.
ALTER TABLE products ADD COLUMN sku_verified INTEGER NOT NULL DEFAULT 0 CHECK (sku_verified IN (0,1));
ALTER TABLE order_items ADD COLUMN sku_verified INTEGER NOT NULL DEFAULT 0 CHECK (sku_verified IN (0,1));
