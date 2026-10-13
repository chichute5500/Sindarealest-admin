import { fail, json, requireAdmin } from "../../_lib.js";
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare("SELECT id,actor,action,entity_type,entity_id,details_json,created_at FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 200").all();
    return json({ logs: result.results || [] });
  } catch { return fail("Không đọc được nhật ký kiểm toán. Hãy kiểm tra migration 0003.",503); }
}
