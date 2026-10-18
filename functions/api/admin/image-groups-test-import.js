import { fail, json, requireAdmin } from "../../_lib.js";

const SOURCE_API = "https://api.github.com/repos/chichute5500/Sindarealest-admin/contents/public/images?ref=main";
const SOURCE_RAW = "https://raw.githubusercontent.com/chichute5500/Sindarealest-admin/main/public/images/";
const SOURCE_NAME = /^[a-f0-9]{16}\.webp$/i;
const MAX_IMAGE_BYTES = 500 * 1024;
const TARGET_COUNT = 50;

// Isolated, admin-only test helper. It writes ONLY to the bound R2 bucket for this deployment.
// It never deletes objects and only imports hash-named WebP product images from this fixed public repo path.
export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin({ request, env });
  if (auth.response) return auth.response;
  if (!env.IMAGES || typeof env.IMAGES.put !== "function") {
    return fail("Thiếu binding R2 IMAGES.", 503);
  }

  try {
    const listResponse = await fetch(SOURCE_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "SinDarealest-AI-image-test" }
    });
    if (!listResponse.ok) return fail("Không đọc được danh sách ảnh GitHub nguồn.", 502);
    const entries = await listResponse.json();
    if (!Array.isArray(entries)) return fail("Danh sách ảnh nguồn không hợp lệ.", 502);

    const sources = entries
      .filter((entry) => entry && entry.type === "file" && SOURCE_NAME.test(String(entry.name || "")))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 500);
    if (sources.length < TARGET_COUNT) {
      return fail("Nguồn chỉ có " + sources.length + " ảnh WebP sản phẩm phù hợp; cần ít nhất 50.", 422);
    }

    const existing = new Set();
    let cursor;
    do {
      const page = await env.IMAGES.list({ limit: 1000, ...(cursor ? { cursor } : {}) });
      for (const object of page.objects || []) existing.add(String(object.key || ""));
      if (!page.truncated) break;
      cursor = page.cursor;
    } while (cursor);

    const imported = [];
    const skippedExisting = [];
    const failures = [];
    for (const source of sources) {
      if (imported.length >= TARGET_COUNT) break;
      // Duplicate the 16-character source hash to create a valid 32-character flat R2 key
      // accepted by the current inventory API, while preserving a deterministic mapping.
      const base = source.name.slice(0, -5).toLowerCase();
      const key = base + base + ".webp";
      if (existing.has(key)) {
        skippedExisting.push(source.name);
        continue;
      }
      try {
        const response = await fetch(SOURCE_RAW + encodeURIComponent(source.name), {
          headers: { "User-Agent": "SinDarealest-AI-image-test" }
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength < 16 || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Kích thước ảnh ngoài giới hạn");
        if (contentType && !contentType.includes("image/webp") && !contentType.includes("application/octet-stream")) throw new Error("Content-Type không phải WebP");
        const view = new Uint8Array(bytes);
        if (String.fromCharCode(...view.slice(0, 4)) !== "RIFF" || String.fromCharCode(...view.slice(8, 12)) !== "WEBP") throw new Error("Chữ ký file không phải WebP");
        await env.IMAGES.put(key, bytes, { httpMetadata: { contentType: "image/webp" }, customMetadata: { testSource: source.name, testOnly: "ai-image-grouping" } });
        existing.add(key);
        imported.push({ source: source.name, key, size: bytes.byteLength });
      } catch (error) {
        failures.push({ source: source.name, error: String(error && error.message || error).slice(0, 120) });
      }
    }

    return json({
      ok: imported.length === TARGET_COUNT,
      target: TARGET_COUNT,
      imported: imported.length,
      skippedExisting: skippedExisting.length,
      failures: failures.slice(0, 10),
      images: imported,
      message: imported.length === TARGET_COUNT
        ? "Đã nhập đủ 50 ảnh WebP thật vào R2 của môi trường hiện tại; không xóa ảnh nào."
        : "Chưa đủ 50 ảnh. Không xóa ảnh nào; xem danh sách lỗi để xử lý tiếp."
    }, imported.length === TARGET_COUNT ? 200 : 502);
  } catch {
    return fail("Không thể nhập ảnh thử nghiệm. Không có thao tác xóa nào được thực hiện.", 502);
  }
}
