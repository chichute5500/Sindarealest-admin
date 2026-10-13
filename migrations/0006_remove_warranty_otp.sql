PRAGMA foreign_keys = ON;
-- Intentionally no schema changes: the active warranty flow stores short-lived
-- upload tokens in the existing settings key/value table. Legacy OTP/upload
-- tables remain untouched; the customer-facing flow does not use OTP.
