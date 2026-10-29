-- Customer authentication is isolated from admin sessions, orders and existing customer records.
CREATE TABLE IF NOT EXISTS customer_auth_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('zalo','google','email')),
  provider_subject TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  password_salt TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,provider_subject)
);
CREATE TABLE IF NOT EXISTS customer_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_auth_accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS customer_auth_sessions_account_idx ON customer_auth_sessions(account_id);
CREATE INDEX IF NOT EXISTS customer_auth_sessions_expiry_idx ON customer_auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS customer_auth_flows (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('zalo','google')),
  verifier TEXT NOT NULL,
  browser_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_auth_flows_expiry_idx ON customer_auth_flows(expires_at);
