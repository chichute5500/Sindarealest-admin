import { androidSessionCookie, fail, hashAndroidSessionToken, json, makeAndroidSessionToken, readAndroidSessionToken, readJsonBodyLimited, requireAdmin } from "../../_lib.js";

// Only the native WebView calls this endpoint. The header is an intent marker,
// NOT an authentication factor. Password-authenticated owner access is required.
export async function onRequestPost(context) {
  const {request,env}=context;
  if(request.headers.get("X-SD-Android-App")!=="2")return fail("Yêu cầu ứng dụng không hợp lệ.",403);
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
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
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405);}
