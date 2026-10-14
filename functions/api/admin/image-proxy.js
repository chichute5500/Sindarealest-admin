import { fail, requireAdmin } from "../../_lib.js";

const ALLOWED_HOST = host => host === "alicdn.com" || host.endsWith(".alicdn.com") ||
  host === "1688.com" || host.endsWith(".1688.com") ||
  host === "taobao.com" || host.endsWith(".taobao.com");

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  let source;
  try {
    source = new URL(context.request.url).searchParams.get("url") || "";
    const parsed = new URL(source);
    if (parsed.protocol !== "https:" || !ALLOWED_HOST(parsed.hostname.toLowerCase()) || parsed.username || parsed.password) return fail("Chỉ được tải ảnh HTTPS từ CDN của 1688/Taobao.", 400);
  } catch { return fail("URL ảnh nguồn không hợp lệ.", 400); }

  try {
    let target = source;
    let response;
    for (let redirects = 0; redirects <= 3; redirects++) {
      const parsed = new URL(target);
      if (parsed.protocol !== "https:" || !ALLOWED_HOST(parsed.hostname.toLowerCase()) || parsed.username || parsed.password) return fail("CDN chuyển hướng tới máy chủ không được phép.", 502);
      response = await fetch(target, { method: "GET", redirect: "manual", headers: { Accept: "image/jpeg,image/png,image/webp" }, signal: AbortSignal.timeout(12000) });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location || redirects === 3) return fail("CDN chuyển hướng quá số lần cho phép.", 502);
      target = new URL(location, target).href;
    }
    const finalUrl = new URL(target);
    if (!response?.ok || finalUrl.protocol !== "https:" || !ALLOWED_HOST(finalUrl.hostname.toLowerCase()) || finalUrl.username || finalUrl.password) return fail("Không thể tải ảnh từ CDN được phép.", 502);
    const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return fail("CDN không trả về ảnh JPEG, PNG hoặc WebP hợp lệ.", 415);
    if (Number(response.headers.get("content-length") || 0) > 2_000_000) return fail("Ảnh nguồn vượt giới hạn 2 MB.", 413);
    if (!response.body) return fail("Ảnh nguồn rỗng.", 502);
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 2_000_000) { await reader.cancel(); return fail("Ảnh nguồn vượt giới hạn 2 MB.", 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { status: 200, headers: {
      "Content-Type": type, "Content-Length": String(bytes.byteLength), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"
    } });
  } catch {
    return fail("Không thể tải ảnh nguồn để so sánh. Thử một kết quả khác.", 502);
  }
}
