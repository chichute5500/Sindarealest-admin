import { fail, hasSecuritySecrets, json, requireAdmin } from "../../_lib.js";

export async function onRequestGet(context) {
  if (!hasSecuritySecrets(context.env)) return fail("Chưa cấu hình mật khẩu quản trị hoặc SESSION_SECRET.", 503);
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  return json({ ok: true, authenticated: true });
}
