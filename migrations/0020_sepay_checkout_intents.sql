PRAGMA foreign_keys = ON;

-- Checkout is not an order until the bank confirms the chosen amount.
-- This short-lived row contains the server-priced checkout snapshot needed
-- to create the real order after an authenticated SePay bank webhook.
CREATE TABLE sepay_checkout_intents (
  id TEXT PRIMARY KEY,
  transfer_reference TEXT NOT NULL UNIQUE,
  payment_option TEXT NOT NULL CHECK (payment_option IN ('deposit','full')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled')),
  payload_json TEXT NOT NULL,
  access_token_hash TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id) DEFERRABLE INITIALLY DEFERRED,
  order_number TEXT UNIQUE,
  expires_at TEXT NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sepay_checkout_intents_status_expiry
  ON sepay_checkout_intents(status, expires_at);

CREATE TABLE sepay_checkout_transactions (
  id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL REFERENCES sepay_checkout_intents(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  transaction_reference TEXT NOT NULL UNIQUE COLLATE NOCASE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sepay_checkout_transactions_intent
  ON sepay_checkout_transactions(intent_id, created_at);
