-- Preview-first: make 10-second Admin audit polling conditional on a database-backed revision.
-- Existing audit-history data, order milestones and notification cadence remain unchanged.
CREATE INDEX IF NOT EXISTS idx_audit_created_id_desc
  ON audit_logs(created_at DESC,id DESC);

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_revision_insert
AFTER INSERT ON audit_logs
BEGIN
  UPDATE settings SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT),updated_at=datetime('now')
   WHERE key='audit_logs_revision';
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_revision_update
AFTER UPDATE ON audit_logs
BEGIN
  UPDATE settings SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT),updated_at=datetime('now')
   WHERE key='audit_logs_revision';
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_revision_delete
AFTER DELETE ON audit_logs
BEGIN
  UPDATE settings SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT),updated_at=datetime('now')
   WHERE key='audit_logs_revision';
END;

-- Never advertise the revision before all three triggers exist.
INSERT OR IGNORE INTO settings(key,value,updated_at)
VALUES('audit_logs_revision','0',datetime('now'));
