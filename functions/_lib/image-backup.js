/**
 * Non-destructive, incremental R2 backups. The backup bucket MUST be a distinct,
 * private bucket. No production object is ever updated or deleted here.
 * Config/progress live in the existing D1 settings table (no migration).
 */
const ENABLED_KEY = "image_backup_enabled_v1";
const CADENCE_KEY = "image_backup_cadence_v1";
const STATE_KEY = "image_backup_state_v1";
const HEARTBEAT_KEY = "image_backup_cron_heartbeat_v1";
const LEASE_KEY = "image_backup_lease_v1";
const BATCH_LIMIT = 64;
const DAY_MS = 86400000;
const SOURCES = ["IMAGES", "ORIGINALS"];

function fallbackState() {
  return {
    phase: "idle", cursor: null, startedAt: null, lastCompletedAt: null,
    lastRunAt: null, scanned: 0, copied: 0, existing: 0, lastError: null,
  };
}

function safeState(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !["idle", ...SOURCES].includes(parsed.phase)) {
      return fallbackState();
    }
    return {
      ...fallbackState(),
      phase: parsed.phase,
      cursor: typeof parsed.cursor === "string" && parsed.cursor.length < 4096 ? parsed.cursor : null,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : null,
      lastCompletedAt: typeof parsed.lastCompletedAt === "string" ? parsed.lastCompletedAt : null,
      lastRunAt: typeof parsed.lastRunAt === "string" ? parsed.lastRunAt : null,
      scanned: Number.isSafeInteger(parsed.scanned) && parsed.scanned >= 0 ? parsed.scanned : 0,
      copied: Number.isSafeInteger(parsed.copied) && parsed.copied >= 0 ? parsed.copied : 0,
      existing: Number.isSafeInteger(parsed.existing) && parsed.existing >= 0 ? parsed.existing : 0,
      lastError: typeof parsed.lastError === "string" ? parsed.lastError.slice(0, 200) : null,
    };
  } catch {
    return fallbackState();
  }
}

async function readSetting(db, key, fallback) {
  const row = await db.prepare("SELECT value FROM settings WHERE key=? LIMIT 1").bind(key).first();
  return row?.value ?? fallback;
}

async function saveSetting(db, key, value) {
  await db.prepare(
    "INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) " +
    "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at"
  ).bind(key, value).run();
}

export function imageBackupBindingsReady(env) {
  return !!(env?.DB && env?.IMAGES && env?.ORIGINALS && env?.IMAGE_BACKUPS &&
    env?.IMAGE_BACKUP_BUCKET_VERIFIED === "true");
}

export async function readImageBackupSettings(env) {
  if (!env?.DB) throw new Error("Thiếu binding DB.");
  const [enabled, cadence, stateRaw, cronHeartbeat] = await Promise.all([
    readSetting(env.DB, ENABLED_KEY, "0"),
    readSetting(env.DB, CADENCE_KEY, "daily"),
    readSetting(env.DB, STATE_KEY, "{}"),
    readSetting(env.DB, HEARTBEAT_KEY, ""),
  ]);
  return {
    enabled: enabled === "1",
    cadence: cadence === "weekly" ? "weekly" : "daily",
    configured: imageBackupBindingsReady(env),
    schedulerLastSeenAt: cronHeartbeat || null,
    state: safeState(stateRaw),
  };
}

export async function markImageBackupCronHeartbeat(env) {
  if (!env?.DB) throw new Error("Thiếu binding DB cho Worker.");
  await saveSetting(env.DB, HEARTBEAT_KEY, new Date().toISOString());
}

export async function setImageBackupSettings(env, { enabled, cadence }) {
  if (typeof enabled !== "boolean" || !["daily", "weekly"].includes(cadence)) {
    throw new Error("Cài đặt sao lưu ảnh không hợp lệ.");
  }
  if (enabled && !imageBackupBindingsReady(env)) {
    throw new Error("Chưa xác minh bucket IMAGE_BACKUPS riêng tư và binding IMAGE_BACKUP_BUCKET_VERIFIED.");
  }
  await saveSetting(env.DB, ENABLED_KEY, enabled ? "1" : "0");
  await saveSetting(env.DB, CADENCE_KEY, cadence);
}

function due(state, cadence, now) {
  if (!state.lastCompletedAt) return true;
  const finished = Date.parse(state.lastCompletedAt);
  return !Number.isFinite(finished) || now - finished >= (cadence === "weekly" ? 7 : 1) * DAY_MS;
}

function backupObjectKey(source, key, etag) {
  // Versioned keys preserve earlier backups if a source object changes.
  // URI encoding also ensures source object names never escape their prefix.
  if (typeof key !== "string" || !key || key.length > 700) throw new Error("Khóa ảnh nguồn quá dài.");
  const version = String(etag || "").replace(/[^a-fA-F0-9-]/g, "");
  if (!version || version.length > 80) throw new Error("Ảnh nguồn thiếu ETag hợp lệ.");
  const result = "image-backup-v1/" + source.toLowerCase() + "/" + encodeURIComponent(key) + "/" + version;
  if (new TextEncoder().encode(result).byteLength > 1024) throw new Error("Khóa bản sao R2 vượt giới hạn.");
  return result;
}

async function copyIfMissing(env, source, item) {
  const targetKey = backupObjectKey(source, item.key, item.etag);
  const current = await env.IMAGE_BACKUPS.head(targetKey);
  if (current) {
    if (Number(current.size) !== Number(item.size)) {
      throw new Error("Bản sao hiện có khác kích thước nguồn: " + source);
    }
    return "existing";
  }
  const original = await env[source].get(item.key);
  if (!original || !original.body || String(original.etag) !== String(item.etag)) {
    throw new Error("Ảnh nguồn đã thay đổi trong khi sao lưu. Sẽ thử lại.");
  }
  await env.IMAGE_BACKUPS.put(targetKey, original.body, {
    httpMetadata: {
      contentType: original.httpMetadata?.contentType || "application/octet-stream",
      cacheControl: "private, no-store",
    },
    customMetadata: {
      sourceBucket: source,
      sourceKey: item.key,
      sourceEtag: String(original.etag),
      copiedAt: new Date().toISOString(),
    },
  });
  const verified = await env.IMAGE_BACKUPS.head(targetKey);
  if (!verified || Number(verified.size) !== Number(item.size)) {
    throw new Error("Bản sao R2 chưa được xác minh dung lượng.");
  }
  return "copied";
}

async function acquireLease(db) {
  const timestamp = Math.floor(Date.now() / 1000);
  const lock = String(timestamp + 900) + ":" + crypto.randomUUID();
  await db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)").bind(LEASE_KEY, "0").run();
  const result = await db.prepare(
    "UPDATE settings SET value=?,updated_at=datetime('now') " +
    "WHERE key=? AND CAST(substr(value,1,10) AS INTEGER) < ?"
  ).bind(lock, LEASE_KEY, timestamp).run();
  if (Number(result?.meta?.changes) !== 1) return null;
  return lock;
}

async function releaseLease(db, lease) {
  await db.prepare("DELETE FROM settings WHERE key=? AND value=?").bind(LEASE_KEY, lease).run();
}

/**
 * Safe to call from authenticated Admin or from a dedicated cron Worker.
 * Each invocation processes at most 64 objects so Pages is not blocked.
 * Errors leave the cursor at the last committed page, so retries are idempotent.
 */
export async function runImageBackup(env, { force = false } = {}) {
  if (!imageBackupBindingsReady(env)) throw new Error("Chưa cấu hình kho sao lưu ảnh riêng tư.");
  const lease = await acquireLease(env.DB);
  if (!lease) return { busy: true, ...(await readImageBackupSettings(env)) };
  try {
    const config = await readImageBackupSettings(env);
    const state = config.state;
    const now = Date.now();
    if (!force && !config.enabled) return { skipped: "disabled", ...config };
    if (!force && state.phase === "idle" && !due(state, config.cadence, now)) {
      return { skipped: "not-due", ...config };
    }
    if (state.phase === "idle") {
      const priorCompletedAt = state.lastCompletedAt;
      Object.assign(state, fallbackState(), {
        phase: "IMAGES",
        startedAt: new Date(now).toISOString(),
        lastCompletedAt: priorCompletedAt,
      });
    }
    state.lastRunAt = new Date(now).toISOString();
    state.lastError = null;
    let remaining = BATCH_LIMIT;
    try {
      while (state.phase !== "idle" && remaining > 0) {
        const source = state.phase;
        const opts = { limit: remaining };
        if (state.cursor) opts.cursor = state.cursor;
        const page = await env[source].list(opts);
        if (!page || !Array.isArray(page.objects)) throw new Error("R2 không trả danh sách ảnh hợp lệ.");
        if (page.objects.length > remaining) throw new Error("R2 trả quá số lượng ảnh cho phép.");
        for (const item of page.objects) {
          const result = await copyIfMissing(env, source, item);
          state.scanned++;
          state[result]++;
          remaining--;
        }
        if (page.truncated) {
          if (!page.cursor || page.cursor === state.cursor) {
            throw new Error("R2 không trả cursor hợp lệ để tiếp tục sao lưu.");
          }
          state.cursor = page.cursor;
        } else {
          state.cursor = null;
          if (source === "IMAGES") state.phase = "ORIGINALS";
          else {
            state.phase = "idle";
            state.lastCompletedAt = new Date().toISOString();
          }
        }
        // Persist a completed list-page before the next list; a failed page can
        // safely replay earlier copies without overwriting them.
        await saveSetting(env.DB, STATE_KEY, JSON.stringify(state));
      }
      await saveSetting(env.DB, STATE_KEY, JSON.stringify(state));
      return { ok: true, ...(await readImageBackupSettings(env)) };
    } catch (err) {
      state.lastError = String(err?.message || "Sao lưu R2 thất bại").slice(0, 200);
      await saveSetting(env.DB, STATE_KEY, JSON.stringify(state));
      throw err;
    }
  } finally {
    await releaseLease(env.DB, lease);
  }
}
