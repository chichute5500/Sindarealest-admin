PRAGMA foreign_keys = ON;

-- The active customer warranty flow uses short-lived, one-time tokens in
-- the existing settings table; it does not use SMS/OTP verification.
-- Retired warranty_verifications and warranty_claim_uploads tables are not
-- created by migration 0005 on a fresh setup. They are deliberately not
-- dropped here: older D1 databases may contain historical data, and a
-- destructive cleanup requires a verified backup and explicit approval.
