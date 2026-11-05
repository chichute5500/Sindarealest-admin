-- Historic warranties remain NULL: never backfill old codes with today's terms.
ALTER TABLE warranties ADD COLUMN policy_snapshot_json TEXT DEFAULT NULL
 CHECK(policy_snapshot_json IS NULL OR (json_valid(policy_snapshot_json) AND length(policy_snapshot_json)<=6000));
ALTER TABLE manual_warranties ADD COLUMN policy_snapshot_json TEXT DEFAULT NULL
 CHECK(policy_snapshot_json IS NULL OR (json_valid(policy_snapshot_json) AND length(policy_snapshot_json)<=6000));
CREATE TRIGGER IF NOT EXISTS warranty_policy_snapshot_lock BEFORE UPDATE OF policy_snapshot_json,policy_name,duration_months,starts_at,ends_at ON warranties
WHEN OLD.policy_snapshot_json IS NOT NULL AND
 (NEW.policy_snapshot_json IS NOT OLD.policy_snapshot_json OR NEW.policy_name IS NOT OLD.policy_name OR
  NEW.duration_months IS NOT OLD.duration_months OR NEW.starts_at IS NOT OLD.starts_at OR NEW.ends_at IS NOT OLD.ends_at)
BEGIN SELECT RAISE(ABORT,'issued warranty policy is immutable'); END;
CREATE TRIGGER IF NOT EXISTS manual_warranty_policy_snapshot_lock BEFORE UPDATE OF policy_snapshot_json,policy_name,price,duration_months,starts_at,ends_at ON manual_warranties
WHEN OLD.policy_snapshot_json IS NOT NULL AND
 (NEW.policy_snapshot_json IS NOT OLD.policy_snapshot_json OR NEW.policy_name IS NOT OLD.policy_name OR
  NEW.price IS NOT OLD.price OR NEW.duration_months IS NOT OLD.duration_months OR
  NEW.starts_at IS NOT OLD.starts_at OR NEW.ends_at IS NOT OLD.ends_at)
BEGIN SELECT RAISE(ABORT,'issued manual warranty policy is immutable'); END;
