PRAGMA foreign_keys = ON;
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
CREATE TABLE IF NOT EXISTS warranty_verifications (
 ticket_id TEXT PRIMARY KEY,
 customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
 warranty_id TEXT REFERENCES warranties(id) ON DELETE CASCADE,
 phone TEXT NOT NULL DEFAULT '', otp_hash TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 expires_at TEXT NOT NULL, verified_at TEXT, access_expires_at TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_warranty_verifications_phone_created ON warranty_verifications(phone,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warranty_verifications_expiry ON warranty_verifications(expires_at);
CREATE TABLE IF NOT EXISTS warranty_claim_uploads (
 upload_key TEXT PRIMARY KEY,
 ticket_id TEXT NOT NULL REFERENCES warranty_verifications(ticket_id) ON DELETE CASCADE,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_upload_ticket ON warranty_claim_uploads(ticket_id,created_at DESC);
CREATE TABLE IF NOT EXISTS warranty_claim_attachments (
 claim_id TEXT PRIMARY KEY REFERENCES warranty_claims(id) ON DELETE CASCADE,
 image_key TEXT NOT NULL UNIQUE
);
