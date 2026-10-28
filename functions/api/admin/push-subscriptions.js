import { androidSessionCookie, fail, hashAndroidSessionToken, json, makeAndroidSessionToken, readAndroidSessionToken, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { isTrustedPushEndpoint } from "../../_notifications.js";
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  return json({ publicKey: context.env.VAPID_PUBLIC_KEY || "" });
}
export async function onRequestPost(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Thông tin đăng ký thông báo vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Thông tin đăng ký thông báo không hợp lệ.");
  const sub = parsedBody.value;
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
  const parsedDeleteBody = await readJsonBodyLimited(context.request, 4 * 1024);
  if (parsedDeleteBody.error === "too_large") return fail("Thông tin hủy đăng ký vượt giới hạn kích thước.", 413);
  if (parsedDeleteBody.error || !parsedDeleteBody.value || typeof parsedDeleteBody.value !== "object" || Array.isArray(parsedDeleteBody.value)) return fail("Thông tin hủy đăng ký không hợp lệ.");
  const body = parsedDeleteBody.value;
  const endpoint=String(body?.endpoint||""); if(!endpoint.startsWith("https://") || endpoint.length > 2048) return fail("Endpoint không hợp lệ.");
  try { await context.env.DB.prepare("DELETE FROM admin_push_subscriptions WHERE endpoint=?").bind(endpoint).run(); return json({ok:true}); }
  catch { return fail("Không thể hủy đăng ký thông báo.",503); }
}


// Only the native WebView calls this endpoint. The header is an intent marker,
// NOT an authentication factor. Password-authenticated owner access is required.
export async function onRequestPut(context) {
  const {request,env}=context;
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
  if(request.headers.get("X-SD-Android-App")!=="2")return fail("Yêu cầu ứng dụng không hợp lệ.",403);
  const parsed=await readJsonBodyLimited(request,4*1024);
  if(parsed.error)return fail(parsed.error==="too_large"?"Vượt kích thước đăng ký.":"Thông tin thiết bị không hợp lệ.",parsed.error==="too_large"?413:400);
  const body=parsed.value;
  if(!body||typeof body!=="object"||Array.isArray(body))return fail("Dữ liệu thiết bị không hợp lệ.");
  const deviceId=String(body.deviceId||"");
  const fcmToken=String(body.fcmToken||"");
  if(!/^[a-f0-9-]{36}$/i.test(deviceId)||fcmToken.length>2048||(fcmToken&&!/^[A-Za-z0-9_:.-]{30,2048}$/.test(fcmToken)))return fail("Mã thiết bị hoặc FCM token không hợp lệ.");
  try {
    // Remove expired grants; an explicit logout revokes this row instantly.
    await env.DB.prepare("DELETE FROM android_admin_devices WHERE expires_at<=datetime('now')").run();
    const existing=readAndroidSessionToken(request);
    if(existing){
      const hash=await hashAndroidSessionToken(existing);
      const result=await env.DB.prepare("UPDATE android_admin_devices SET fcm_token=?,updated_at=datetime('now'),expires_at=datetime('now','+30 days') WHERE token_hash=? AND device_id=? AND expires_at>datetime('now')").bind(fcmToken,hash,deviceId).run();
      if(result?.meta?.changes===1)return json({ok:true,pushConfigured:Boolean(env.FCM_SERVICE_ACCOUNT_JSON)},200,{"Set-Cookie":androidSessionCookie(existing)});
    }
    // This request already passed requireAdmin: either a fresh password-backed
    // 10-minute session or an enrolled Android session. A new grant is bound
    // to this installation UUID, not the caller's User-Agent.
    const raw=makeAndroidSessionToken(),hash=await hashAndroidSessionToken(raw);
    await env.DB.prepare("INSERT INTO android_admin_devices(token_hash,device_id,fcm_token,expires_at) VALUES(?,?,?,datetime('now','+30 days'))").bind(hash,deviceId,fcmToken).run();
    return json({ok:true,pushConfigured:Boolean(env.FCM_SERVICE_ACCOUNT_JSON)},201,{"Set-Cookie":androidSessionCookie(raw)});
  }catch{return fail("Chưa thể đăng ký thiết bị. Cần áp dụng migration 0010.",503);}
}
