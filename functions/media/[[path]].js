const MIME_BY_EXTENSION = {
  webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  avif: "image/avif", gif: "image/gif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff"
};
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function resolveKey(context) {
  const pathname = new URL(context.request.url).pathname;
  if (!pathname.startsWith("/media/")) return "";
  const raw = pathname.slice("/media/".length);
  let key;
  try { key = decodeURIComponent(raw); } catch { return ""; }
  if (!key || key.length > 1024 || /[\u0000-\u001f\u007f]/.test(key) || key.split("/").some(part => part === "." || part === "..")) return "";
  return key;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env?.IMAGES || typeof env.IMAGES.get !== "function") {
    return new Response("Ảnh chưa sẵn sàng.", { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
  }
  const key = resolveKey(context);
  if (!key) return new Response("Mã ảnh không hợp lệ.", { status: 400, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
  try {
    const object = await env.IMAGES.get(key);
    if (!object) return new Response("Không tìm thấy ảnh.", { status: 404, headers: { "Cache-Control": "public, max-age=60", "Content-Type": "text/plain; charset=utf-8" } });
    if (Number(object.size || 0) > MAX_IMAGE_BYTES) return new Response("Ảnh vượt giới hạn xem.", { status: 413, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
    const ext = key.includes(".") ? key.split(".").pop().toLowerCase() : "";
    const supplied = String(object.httpMetadata?.contentType || "").split(";")[0].trim().toLowerCase();
    const contentType = supplied.startsWith("image/") && supplied !== "image/svg+xml" && supplied !== "image/svg"
      ? supplied
      : MIME_BY_EXTENSION[ext];
    if (!contentType) return new Response("Object không phải ảnh raster được hỗ trợ.", { status: 415, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin"
    });
    if (object.httpEtag || object.etag) headers.set("ETag", object.httpEtag || object.etag);
    if (request.headers.get("if-none-match") && (request.headers.get("if-none-match") === object.httpEtag || request.headers.get("if-none-match") === object.etag)) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(object.body, { status: 200, headers });
  } catch {
    return new Response("Không thể đọc ảnh từ kho.", { status: 503, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
  }
}
