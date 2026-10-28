import { clearSessionCookie, clearAndroidSessionCookie, hashAndroidSessionToken, readAndroidSessionToken, fail, json, sameSiteRequest } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!sameSiteRequest(request)) return fail("Yêu cầu không hợp lệ.", 403);
  const token = readAndroidSessionToken(request);
  if (token) {
    try {
      const hash = await hashAndroidSessionToken(token);
      await env.DB.prepare("DELETE FROM android_admin_devices WHERE token_hash=?").bind(hash).run();
    } catch { return fail("Không thể thu hồi thiết bị. Hãy thử đăng xuất lại.", 503); }
  }
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", clearSessionCookie());
  headers.append("Set-Cookie", clearAndroidSessionCookie());
  return new Response(JSON.stringify({ ok:true, message:"Đã đăng xuất." }), { status:200, headers });
}
