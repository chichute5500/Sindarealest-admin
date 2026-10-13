import { clearSessionCookie, fail, json, sameSiteRequest } from "../../_lib.js";

export async function onRequestPost({ request }) {
  if (!sameSiteRequest(request)) return fail("Yêu cầu không hợp lệ.", 403);
  return json({ ok: true, message: "Đã đăng xuất." }, 200, { "Set-Cookie": clearSessionCookie() });
}
