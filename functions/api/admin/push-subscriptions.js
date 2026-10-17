import { fail, json, requireAdmin } from "../../_lib.js";
import { isTrustedPushEndpoint } from "../../_notifications.js";
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  return json({ publicKey: context.env.VAPID_PUBLIC_KEY || "" });
}
export async function onRequestPost(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  let sub; try { sub = await context.request.json(); } catch { return fail("Thông tin đăng ký thông báo không hợp lệ."); }
  const endpoint = String(sub?.endpoint || "");
  const p256dh = String(sub?.keys?.p256dh || ""), authKey = String(sub?.keys?.auth || "");
  if (!isTrustedPushEndpoint(endpoint) || endpoint.length > 2048 || p256dh.length > 256 || authKey.length > 256) return fail("Đăng ký thông báo không hợp lệ hoặc không thuộc dịch vụ thông báo đáng tin cậy.");
  if (!context.env.VAPID_PUBLIC_KEY || !context.env.VAPID_PRIVATE_KEY) return fail("Chưa cấu hình VAPID_PUBLIC_KEY và VAPID_PRIVATE_KEY trên Cloudflare.",503);
  try {
    await context.env.DB.prepare("INSERT INTO admin_push_subscriptions(endpoint,keys_json,expiration_time,updated_at) VALUES(?,?,?,datetime('now')) ON CONFLICT(endpoint) DO UPDATE SET keys_json=excluded.keys_json,expiration_time=excluded.expiration_time,updated_at=datetime('now')").bind(endpoint,JSON.stringify({p256dh,auth:authKey}),sub.expirationTime||null).run();
    return json({ok:true});
  } catch { return fail("Không thể lưu đăng ký thông báo. Hãy kiểm tra đã áp dụng migration 0004.",503); }
}
export async function onRequestDelete(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  let body; try { body = await context.request.json(); } catch { return fail("Thông tin hủy đăng ký không hợp lệ."); }
  const endpoint=String(body?.endpoint||""); if(!endpoint.startsWith("https://") || endpoint.length > 2048) return fail("Endpoint không hợp lệ.");
  try { await context.env.DB.prepare("DELETE FROM admin_push_subscriptions WHERE endpoint=?").bind(endpoint).run(); return json({ok:true}); }
  catch { return fail("Không thể hủy đăng ký thông báo.",503); }
}
