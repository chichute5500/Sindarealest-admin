PRAGMA foreign_keys = ON;

-- Keep the contact information submitted for each order independent from the
-- customer profile. Public order placement must never overwrite a profile just
-- because the caller knows its phone number.
CREATE TABLE IF NOT EXISTS order_contact_details (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_contact_phone ON order_contact_details(phone);

-- Preserve existing order displays and warranty lookup behavior for historic
-- orders. At migration time the customer table is the only available source
-- for the original contact fields.
INSERT OR IGNORE INTO order_contact_details(order_id, full_name, phone, email, created_at)
SELECT o.id, c.full_name, c.phone, c.email, o.created_at
FROM orders o
JOIN customers c ON c.id = o.customer_id;
