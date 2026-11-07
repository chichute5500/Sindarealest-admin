-- SePay checkout and direct bank-transfer QR orders are independent of legacy static QR requests.
CREATE TABLE IF NOT EXISTS sepay_payment_orders (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_invoice_number TEXT NOT NULL UNIQUE,
  installment_type TEXT NOT NULL CHECK (installment_type IN ('deposit','full','balance')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void','cancelled')),
  transaction_id TEXT UNIQUE,
  transaction_reference TEXT NOT NULL DEFAULT '',
  ipn_payload_json TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sepay_payment_orders_order_created
  ON sepay_payment_orders(order_id, created_at DESC);
