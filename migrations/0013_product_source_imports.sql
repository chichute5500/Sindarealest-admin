PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS product_source_imports (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  export_id TEXT NOT NULL,
  export_folder TEXT NOT NULL DEFAULT '',
  source_product_id TEXT NOT NULL DEFAULT '',
  source_title TEXT NOT NULL DEFAULT '',
  source_category TEXT NOT NULL DEFAULT '',
  source_description TEXT NOT NULL DEFAULT '',
  source_price TEXT NOT NULL DEFAULT '',
  source_currency TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_record_json TEXT NOT NULL DEFAULT '{}',
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_product_source_imports_export_id ON product_source_imports(export_id);
CREATE INDEX IF NOT EXISTS idx_product_source_imports_source_product_id ON product_source_imports(source_product_id);

-- Prevent repeat imports of the same source listing across separate ZIP exports.
-- Empty identifiers are allowed because some exports omit source metadata.
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_source_imports_source_product_id_unique
  ON product_source_imports(source_product_id) WHERE length(trim(source_product_id)) > 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_source_imports_source_url_unique
  ON product_source_imports(source_url) WHERE length(trim(source_url)) > 0;
