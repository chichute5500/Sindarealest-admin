import { fail, json, requireAdmin } from "../../_lib.js";

const IMAGE_EXTENSIONS = new Map([
  ["webp", "image/webp"], ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"],
  ["png", "image/png"], ["avif", "image/avif"], ["gif", "image/gif"],
  ["bmp", "image/bmp"], ["tif", "image/tiff"], ["tiff", "image/tiff"]
]);
const MAX_CURSOR_LENGTH = 2048;

function rasterMime(object) {
  const key = String(object?.key || "");
  const ext = key.includes(".") ? key.split(".").pop().toLowerCase() : "";
  const expected = IMAGE_EXTENSIONS.get(ext);
  const supplied = String(object?.httpMetadata?.contentType || "").split(";")[0].trim().toLowerCase();
  // Never fall back to the filename extension when R2 explicitly identifies SVG.
  // SVG is active content and this inventory accepts raster images only.
  if (supplied === "image/svg+xml" || supplied === "image/svg") return "";
  if (supplied.startsWith("image/")) return supplied;
  return expected || "";
}

function keyFromReference(reference) {
  const value = String(reference || "").trim();
  if (!value) return "";
  try {
    const pathname = new URL(value, "https://inventory.invalid").pathname;
    const marker = "/media/";
    const position = pathname.indexOf(marker);
    if (position >= 0) return decodeURIComponent(pathname.slice(position + marker.length));
  } catch {}
  if (value.startsWith("media/")) return value.slice(6);
  if (value.startsWith("/media/")) {
    try { return decodeURIComponent(value.slice(7).split(/[?#]/, 1)[0]); } catch { return value.slice(7).split(/[?#]/, 1)[0]; }
  }
  if (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")) return "";
  return value;
}
export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin({ request, env });
  if (auth.response) return auth.response;
  if (!env?.DB || !env?.IMAGES || typeof env.IMAGES.list !== "function") {
    return fail("Thiếu binding D1 DB hoặc R2 IMAGES.", 503);
  }
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 500);
  const limit = Number.isInteger(requestedLimit) ? Math.max(100, Math.min(1000, requestedLimit)) : 500;
  const cursor = url.searchParams.get("cursor") || "";
  if (cursor.length > MAX_CURSOR_LENGTH) return fail("Cursor quét kho không hợp lệ.", 400);
  try {
    const products = await env.DB.prepare("SELECT id,sku,title,images_json FROM products ORDER BY sku ASC LIMIT 2000").all();
    const assignments = new Map();
    for (const product of products.results || []) {
      let refs = [];
      try { refs = JSON.parse(product.images_json || "[]"); } catch {}
      for (const reference of Array.isArray(refs) ? refs : []) {
        const key = keyFromReference(reference);
        if (!key) continue;
        if (!assignments.has(key)) assignments.set(key, []);
        assignments.get(key).push({ id: product.id, sku: product.sku, title: product.title });
      }
    }
    const page = await env.IMAGES.list({ limit, ...(cursor ? { cursor } : {}), include: ["httpMetadata"] });
    const keys = (page.objects || [])
      .map(object => ({ object, key: String(object.key || ""), mimeType: rasterMime(object) }))
      .filter(item => item.key && item.key.length <= 1024 && !item.key.endsWith("/") && item.mimeType);
    const images = [];
    for (const item of keys) {
      images.push({
        key: item.key,
        url: "/api/admin/image-groups-image?key=" + encodeURIComponent(item.key),
        size: Number(item.object.size || 0),
        uploaded: item.object.uploaded ? new Date(item.object.uploaded).toISOString() : "",
        mimeType: item.mimeType,
        assignedTo: assignments.get(item.key) || []
      });
    }
    const scannedObjects = (page.objects || []).length;
    const nonImages = (page.objects || []).filter(object => !rasterMime(object)).length;
    return json({
      images,
      hasMore: Boolean(page.truncated && page.cursor),
      nextCursor: page.truncated && page.cursor ? String(page.cursor) : null,
      pageCount: images.length,
      diagnostics: {
        scannedObjects,
        imageObjects: images.length,
        nonImageObjects: nonImages,
        assignmentsIncomplete: (products.results || []).length >= 2000
      }
    });
  } catch (error) {
    const detail = String(error?.message || error || "Unknown inventory error").replace(/[\r\n]+/g, " ").slice(0, 180);
    return fail("Không thể tiếp tục quét toàn kho R2. Chi tiết: " + detail, 503);
  }
}
