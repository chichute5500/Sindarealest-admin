PRAGMA foreign_keys = ON;
-- Remove temporary OTP sessions and replace upload association with a warranty-code association.
DROP TABLE IF EXISTS warranty_claim_uploads;
DROP TABLE IF EXISTS warranty_verifications;
DROP INDEX IF EXISTS idx_warranty_verifications_phone_created;
DROP INDEX IF EXISTS idx_warranty_verifications_expiry;
CREATE TABLE IF NOT EXISTS warranty_claim_uploads (
 upload_key TEXT PRIMARY KEY,
 warranty_code TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_warranty_claim_upload_code_created ON warranty_claim_uploads(warranty_code,created_at DESC);
