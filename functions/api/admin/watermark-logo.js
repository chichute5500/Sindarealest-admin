import { fail, json, requireAdmin, storageOrFail } from "../../_lib.js";

const MAX_LOGO_BYTES = 1024 * 1024;

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;

  let form;
  try { form = await context.request.formData(); } catch { return fail("Không đọc được tệp logo."); }
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return fail("Chưa chọn logo watermark.");
  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) return fail("Logo phải nhỏ hơn hoặc bằng 1 MB.");
  if (file.type !== "image/webp") return fail("Logo cần được tối ưu sang WebP trong trình duyệt.");

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isWebp = bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!isWebp) return fail("Nội dung tệp logo không phải WebP hợp lệ.");

    const key = `wm-${crypto.randomUUID()}.webp`;
    const url = `/media/${key}`;
    await context.env.IMAGES.put(key, bytes, {
      httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { visibility: "public-watermark-logo" },
    });
    try {
      await context.env.DB.batch([
        context.env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES('watermark_logo',?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(url),
        context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'setting_updated', 'setting', 'watermark_logo', ?)").bind(
          crypto.randomUUID(), JSON.stringify({ key: "watermark_logo", value: url }),
        ),
      ]);
    } catch (error) {
      try { await context.env.IMAGES.delete(key); } catch {}
      throw error;
    }
    return json({ ok: true, watermarkLogoUrl: url, message: "Đã cập nhật logo watermark." }, 201);
  } catch {
    return fail("Không lưu được logo watermark. Hãy kiểm tra D1 và R2 bindings.", 503);
  }
}

export async function onRequestGet() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
