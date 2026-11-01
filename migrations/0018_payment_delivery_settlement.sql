-- Keep delivery outcomes separate from payment receipt. COD is only considered
-- received after the Shop verifies the carrier remittance into its account.
ALTER TABLE orders ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'not_shipped'
  CHECK (delivery_status IN ('not_shipped','in_transit','delivered','failed_returning','returned'));
UPDATE orders SET delivery_status=CASE status WHEN 'shipped' THEN 'in_transit' WHEN 'completed' THEN 'delivered' ELSE 'not_shipped' END;

CREATE TABLE order_cod_settlements (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  transaction_reference TEXT NOT NULL COLLATE NOCASE UNIQUE,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT 'admin',
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_order_cod_settlements_order ON order_cod_settlements(order_id, verified_at DESC);
