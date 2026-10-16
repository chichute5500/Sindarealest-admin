PRAGMA foreign_keys = ON;

-- Active storefront/admin schema only.
-- Retired OTP tables (warranty_verifications, warranty_claim_uploads) are
-- intentionally not created in fresh setups. This idempotent SQL does not
-- DROP those tables if they already exist in an older D1 database.
CREATE TABLE IF NOT EXISTS customer_address_details (
 customer_id TEXT PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
 province_code TEXT NOT NULL DEFAULT '', province TEXT NOT NULL DEFAULT '',
 ward_code TEXT NOT NULL DEFAULT '', ward TEXT NOT NULL DEFAULT '',
 street_address TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_shipping_addresses (
 order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 province_code TEXT NOT NULL DEFAULT '', province TEXT NOT NULL DEFAULT '',
 ward_code TEXT NOT NULL DEFAULT '', ward TEXT NOT NULL DEFAULT '',
 street_address TEXT NOT NULL DEFAULT '', full_address TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_item_details (
 item_id TEXT PRIMARY KEY REFERENCES order_items(id) ON DELETE CASCADE,
 size TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS warranty_claim_attachments (
 claim_id TEXT PRIMARY KEY REFERENCES warranty_claims(id) ON DELETE CASCADE,
 image_key TEXT NOT NULL UNIQUE
);
