import { fail, json, requireAdmin } from "../../_lib.js";
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    // A single indexed settings lookup avoids loading 200 log entries on every
    // 10-second idle poll. Missing migration => original full-data fallback.
    const marker = await context.env.DB.prepare(
      "SELECT value FROM settings WHERE key='audit_logs_revision' LIMIT 1"
    ).first();
    const revision = typeof marker?.value === "string" && /^\d{1,19}$/.test(marker.value)
      ? marker.value : null;
    const requested = new URL(context.request.url).searchParams.get("revision");
    if (revision !== null && requested === revision) {
      return json({ unchanged:true, revision });
    }
    const result = await context.env.DB.prepare("SELECT id,actor,action,entity_type,entity_id,details_json,created_at FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 200").all();
    return json({ logs: result.results || [], ...(revision !== null ? { revision } : {}) });
  } catch { return fail("Không đọc được nhật ký kiểm toán. Hãy kiểm tra migration 0003.",503); }
}
