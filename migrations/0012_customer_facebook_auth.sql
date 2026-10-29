-- Preview-safe new OAuth identity provider without changing accepted owner sessions.
-- Preserve existing accounts and sessions by copying into replacement tables first.
CREATE TABLE customer_auth_accounts_fb_next (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('zalo','google','facebook','email')),
  provider_subject TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  password_salt TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,provider_subject)
);
INSERT INTO customer_auth_accounts_fb_next
  (id,provider,provider_subject,display_name,email,password_salt,password_hash,created_at)
  SELECT id,provider,provider_subject,display_name,email,password_salt,password_hash,created_at
  FROM customer_auth_accounts;
CREATE TABLE customer_auth_sessions_fb_next (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES customer_auth_accounts_fb_next(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO customer_auth_sessions_fb_next(token_hash,account_id,expires_at,created_at)
  SELECT token_hash,account_id,expires_at,created_at FROM customer_auth_sessions;
DROP TABLE customer_auth_sessions;
DROP TABLE customer_auth_accounts;
ALTER TABLE customer_auth_accounts_fb_next RENAME TO customer_auth_accounts;
ALTER TABLE customer_auth_sessions_fb_next RENAME TO customer_auth_sessions;
CREATE INDEX customer_auth_sessions_account_idx ON customer_auth_sessions(account_id);
CREATE INDEX customer_auth_sessions_expiry_idx ON customer_auth_sessions(expires_at);

-- Single-use OAuth state stored separately from account/session tables.
CREATE TABLE customer_auth_flows_fb_next (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK(provider IN ('zalo','google','facebook')),
  verifier TEXT NOT NULL,
  browser_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
INSERT INTO customer_auth_flows_fb_next
  (state_hash,provider,verifier,browser_hash,expires_at)
  SELECT state_hash,provider,verifier,browser_hash,expires_at FROM customer_auth_flows;
DROP TABLE customer_auth_flows;
ALTER TABLE customer_auth_flows_fb_next RENAME TO customer_auth_flows;
CREATE INDEX customer_auth_flows_expiry_idx ON customer_auth_flows(expires_at);
