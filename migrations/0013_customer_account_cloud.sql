-- Customer-owned cloud data. Never infer ownership from phone/email alone.
CREATE TABLE IF NOT EXISTS customer_account_favorites(
 account_id TEXT NOT NULL REFERENCES customer_auth_accounts(id) ON DELETE CASCADE,
 product_key TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(account_id,product_key)
);
CREATE TABLE IF NOT EXISTS customer_account_shipping(
 account_id TEXT PRIMARY KEY REFERENCES customer_auth_accounts(id) ON DELETE CASCADE,
 full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
 province_code TEXT NOT NULL, province TEXT NOT NULL,
 ward_code TEXT NOT NULL, ward TEXT NOT NULL, street_address TEXT NOT NULL,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customer_account_orders(
 account_id TEXT NOT NULL REFERENCES customer_auth_accounts(id) ON DELETE CASCADE,
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
 linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(account_id,order_id)
);
CREATE INDEX IF NOT EXISTS customer_account_orders_by_account ON customer_account_orders(account_id,linked_at DESC);
