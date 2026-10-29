-- New Email credentials are not trusted until mailbox ownership is proven.
-- Existing Preview Email accounts remain unverified and must request a new code.
CREATE TABLE IF NOT EXISTS customer_auth_email_state (
 account_id TEXT PRIMARY KEY REFERENCES customer_auth_accounts(id) ON DELETE CASCADE,
 verified_at INTEGER,
 last_sent_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS customer_auth_email_challenges (
 account_id TEXT NOT NULL REFERENCES customer_auth_accounts(id) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')),
 code_hash TEXT NOT NULL,
 link_hash TEXT NOT NULL,
 expires_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 consumed_at INTEGER,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,purpose)
);
CREATE INDEX IF NOT EXISTS customer_auth_email_challenges_expiry ON customer_auth_email_challenges(expires_at);
