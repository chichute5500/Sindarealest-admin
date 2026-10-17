import { clearSessionCookie, constantTimeTextEqual, createSession, dbOrFail, fail, hasSecuritySecrets, json, rateLimitLogin, readJsonBodyLimited, sameSiteRequest, sessionCookie } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  if (!hasSecuritySecrets(env)) return fail("Chưa cấu hình ADMIN_PASSWORD (tối thiểu 12 ký tự) và SESSION_SECRET (tối thiểu 32 ký tự).", 503);
  if (!sameSiteRequest(request)) return fail("Yêu cầu đăng nhập không hợp lệ.", 403);
  const parsedBody = await readJsonBodyLimited(request, 4 * 1024);
  if (parsedBody.error === "too_large") return fail("Dữ liệu đăng nhập vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Dữ liệu đăng nhập không hợp lệ.");
  const body = parsedBody.value;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || password.length > 1024) return fail("Mật khẩu không đúng.", 401);
  try {
    const limit = await rateLimitLogin(env.DB, request, env.SESSION_SECRET);
    if (limit.limited) return fail("Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại.", 429, { "Retry-After": "900" });
    if (!constantTimeTextEqual(password, env.ADMIN_PASSWORD)) return fail("Mật khẩu không đúng.", 401);
    await env.DB.prepare("DELETE FROM admin_login_attempts WHERE ip_hash = ?").bind(limit.ipHash).run();
    const token = await createSession(env.SESSION_SECRET);
    return json({ ok: true, message: "Đăng nhập thành công." }, 200, { "Set-Cookie": sessionCookie(token) });
  } catch {
    return fail("Không thể đăng nhập do dịch vụ dữ liệu chưa sẵn sàng. Hãy kiểm tra D1 và secrets.", 503);
  }
}

export async function onRequestGet() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
