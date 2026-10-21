PRAGMA foreign_keys = ON;

-- Historical type is unknown by default; never infer it from stock, price, SKU, or title.
ALTER TABLE products ADD COLUMN fulfillment_type TEXT NOT NULL DEFAULT 'unclassified' CHECK (fulfillment_type IN ('in_stock','made_to_order','unclassified'));
ALTER TABLE order_items ADD COLUMN fulfillment_type TEXT NOT NULL DEFAULT 'unclassified' CHECK (fulfillment_type IN ('in_stock','made_to_order','unclassified'));
ALTER TABLE orders ADD COLUMN payment_terms_confirmed_at TEXT;
ALTER TABLE orders ADD COLUMN payment_terms_confirmed_by TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN payment_terms_note TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN public_access_token_hash TEXT;

CREATE TABLE order_payment_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  installment_type TEXT NOT NULL CHECK (installment_type IN ('deposit','balance','full')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  shipping_benefit TEXT NOT NULL DEFAULT 'standard_shipping' CHECK (shipping_benefit IN ('standard_shipping','free_shipping')),
  transfer_reference TEXT NOT NULL UNIQUE,
  qr_image_key TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','cancelled','settled')),
  created_by TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_order_payment_requests_order_created ON order_payment_requests(order_id, created_at DESC);
CREATE UNIQUE INDEX idx_order_payment_requests_one_pending ON order_payment_requests(order_id) WHERE status = 'pending';

CREATE TABLE order_payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_request_id TEXT REFERENCES order_payment_requests(id),
  direction TEXT NOT NULL CHECK (direction IN ('received','refunded')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  transaction_reference TEXT NOT NULL COLLATE NOCASE UNIQUE,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT 'admin',
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_order_payment_transactions_order_created ON order_payment_transactions(order_id, created_at DESC);
CREATE INDEX idx_order_payment_transactions_request ON order_payment_transactions(payment_request_id, created_at DESC);
