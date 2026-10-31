-- SinDarealest: read-only query performance indexes; no product/order/customer rows are modified.
-- Optimize the existing 6-stage Admin order query and public order tracking by
-- locating one order's creation and status audits without scanning unrelated logs.
CREATE INDEX IF NOT EXISTS idx_audit_entity_action_created
  ON audit_logs(entity_type, entity_id, action, created_at DESC);

-- Respect the existing public catalog sort order exactly (newest first).
CREATE INDEX IF NOT EXISTS idx_products_published_created
  ON products(published, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_products_published_type_created
  ON products(published, fulfillment_type, created_at DESC, id DESC);

-- The live product detail route currently compares case-normalized fields with
-- OR. Index each predicate to allow SQLite's multi-index OR optimization.
CREATE INDEX IF NOT EXISTS idx_products_lower_slug ON products(lower(slug));
CREATE INDEX IF NOT EXISTS idx_products_lower_id ON products(lower(id));
CREATE INDEX IF NOT EXISTS idx_products_upper_sku ON products(upper(sku));

-- Speeds order-items joins while preserving order and all existing constraints.
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
