PRAGMA foreign_keys = ON;

-- Standalone warranties are intentionally separate from order-linked warranties.
-- This preserves the existing order/item foreign keys and automatic issuance flow.
CREATE TABLE IF NOT EXISTS manual_warranties (
  id TEXT PRIMARY KEY,
  warranty_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price >= 0),
  policy_name TEXT NOT NULL DEFAULT 'Bảo hành trực tiếp',
  duration_months INTEGER NOT NULL CHECK(duration_months BETWEEN 1 AND 120),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','void')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_manual_warranties_phone_created
  ON manual_warranties(customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_warranties_created
  ON manual_warranties(created_at DESC);
