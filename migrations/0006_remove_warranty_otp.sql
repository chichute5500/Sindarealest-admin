PRAGMA foreign_keys = ON;
-- Keep legacy OTP tables untouched for production compatibility.
-- The storefront no longer uses OTP. New upload sessions use an independent table
-- so this migration is safe even when warranty_claim_uploads already has ticket_id.
CREATE TABLE IF NOT EXISTS warranty_claim_upload_tokens (
 upload_key TEXT PRIMARY KEY,
 warranty_code TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_upload_tokens_code_created
 ON warranty_claim_upload_tokens(warranty_code,created_at DESC);
