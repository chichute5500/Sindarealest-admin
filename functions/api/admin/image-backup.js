import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import {
  readImageBackupSettings,
  runImageBackup,
  setImageBackupSettings,
} from "../../_lib/image-backup.js";

function errorResponse(err) {
  const message = String(err?.message || "Không thể thao tác sao lưu ảnh.").slice(0, 250);
  return fail(message, message.includes("cấu hình") || message.includes("binding") ? 503 : 400);
}

// Read-only status endpoint. Requires a valid admin session.
export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    return json(await readImageBackupSettings(context.env));
  } catch {
    return fail("Không đọc được trạng thái sao lưu ảnh từ D1.", 503);
  }
}

// Enable/disable schedule and select frequency. Never changes source R2 objects.
export async function onRequestPut(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const body = await readJsonBodyLimited(context.request, 2048);
  if (body.error || !body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return fail("Cài đặt sao lưu ảnh không hợp lệ.", body.error === "too_large" ? 413 : 400);
  }
  try {
    await setImageBackupSettings(context.env, {
      enabled: body.value.enabled,
      cadence: body.value.cadence,
    });
    await context.env.DB.prepare(
      "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
      "VALUES(?, 'admin', 'setting_updated', 'setting', 'image_backup', ?)"
    ).bind(crypto.randomUUID(), JSON.stringify({
      enabled: body.value.enabled, cadence: body.value.cadence,
    })).run();
    return json({ ok: true, ...(await readImageBackupSettings(context.env)) });
  } catch (err) {
    return errorResponse(err);
  }
}

// Manually process a bounded batch. Repeated clicks never overwrite source images.
export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const outcome = await runImageBackup(context.env, { force: true });
    if (outcome.busy) return json({ ok: false, busy: true, ...outcome }, 409);
    return json(outcome);
  } catch (err) {
    return errorResponse(err);
  }
}
