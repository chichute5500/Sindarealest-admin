import { fail, requireAdmin } from "../../_lib.js";

const MIME_BY_EXTENSION = {
  webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  avif: "image/avif", gif: "image/gif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff"
};
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin({ request, env });
  if (auth.response) return auth.response;
  if (!env?.IMAGES || typeof env.IMAGES.get !== "function") return fail("Thiếu binding R2 IMAGES.", 503);
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  if (!key || key.length > 1024 || key.includes("\0")) return fail("Mã ảnh không hợp lệ.", 400);
  try {
    const object = await env.IMAGES.get(key);
    if (!object) return fail("Ảnh không còn tồn tại trong kho.", 404);
    if (Number(object.size || 0) > MAX_IMAGE_BYTES) return fail("Ảnh vượt giới hạn xem trước 20 MB.", 413);
    const ext = key.includes(".") ? key.split(".").pop().toLowerCase() : "";
    const supplied = String(object.httpMetadata?.contentType || "").split(";")[0].trim().toLowerCase();
    if (supplied === "image/svg+xml" || supplied === "image/svg") return fail("SVG không được hỗ trợ trong hàng chờ ảnh raster.", 415);
    const contentType = supplied.startsWith("image/") ? supplied : MIME_BY_EXTENSION[ext];
    if (!contentType) return fail("Object trong kho không phải định dạng ảnh raster được hỗ trợ.", 415);
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin"
    });
    if (object.httpMetadata?.contentLanguage) headers.set("Content-Language", object.httpMetadata.contentLanguage);
    if (object.etag) headers.set("ETag", object.httpEtag || object.etag);
    return new Response(object.body, { status: 200, headers });
  } catch (error) {
    const detail = String(error?.message || error || "Unknown image read error").replace(/[\r\n]+/g, " ").slice(0, 140);
    return fail("Không thể đọc ảnh từ R2: " + detail, 503);
  }
}
