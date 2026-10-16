import { fail, json, requireAdmin, storageOrFail } from "../../_lib.js";

const MAX_DERIVATIVE_BYTES = 5 * 1024 * 1024;
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const ORIGINAL_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;

  let form;
  try { form = await context.request.formData(); } catch { return fail("Không đọc được tệp ảnh."); }
  const file = form.get("file");
  const original = form.get("original") || file;

  if (!file || typeof file.arrayBuffer !== "function") return fail("Chưa chọn ảnh.");
  if (file.size <= 0 || file.size > MAX_DERIVATIVE_BYTES) return fail("Ảnh hiển thị sau tối ưu phải nhỏ hơn hoặc bằng 5 MB.");
  if (file.type !== "image/webp") return fail("Ảnh hiển thị cần được tối ưu sang WebP trong trình duyệt.");

  if (!original || typeof original.arrayBuffer !== "function") return fail("Thiếu tệp ảnh gốc cần lưu riêng tư.");
  if (original.size <= 0 || original.size > MAX_ORIGINAL_BYTES) return fail("Ảnh gốc phải nhỏ hơn hoặc bằng 20 MB.");
  const originalType = ORIGINAL_TYPES[original.type];
  if (!originalType) return fail("Ảnh gốc cần là JPEG, PNG hoặc WebP.");

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isWebp = bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!isWebp) return fail("Nội dung tệp hiển thị không phải ảnh WebP hợp lệ.");

    const originalBytes = new Uint8Array(await original.arrayBuffer());
    if (!originalBytes.length) return fail("Tệp ảnh gốc rỗng.");
    const id = crypto.randomUUID();
    const key = `${id}.webp`;
    const privateKey = `private-originals/${id}.${originalType}`;

    await context.env.IMAGES.put(privateKey, originalBytes, {
      httpMetadata: { contentType: original.type, cacheControl: "private, no-store" },
      customMetadata: { visibility: "private-original" },
    });
    try {
      await context.env.IMAGES.put(key, bytes, {
        httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { visibility: "public-optimized-derivative", originalKey: privateKey },
      });
    } catch (error) {
      try { await context.env.IMAGES.delete(privateKey); } catch {}
      throw error;
    }

    return json({
      ok: true,
      url: `/media/${key}`,
      originalStoredPrivately: true,
      message: "Đã lưu ảnh gốc ở vùng riêng tư và tạo bản WebP hiển thị chưa đóng dấu.",
    }, 201);
  } catch {
    return fail("Tải ảnh thất bại. Hãy kiểm tra R2 binding tên IMAGES và thử lại.", 503);
  }
}
