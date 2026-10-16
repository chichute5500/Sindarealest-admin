import { fail, json, requireAdmin, storageOrFail } from "../../_lib.js";

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;
  let form;
  try { form = await context.request.formData(); } catch { return fail("Không đọc được tệp ảnh."); }
  if (form.get("zipImport") === "1" && context.env.ZIP_IMPORT_ENABLED !== "1") return fail("Nhập ZIP chưa được bật trong môi trường Preview biệt lập.", 403);
  const file = form.get("file");
  if (form.get("watermarkApplied") !== "1") return fail("Ảnh cần được đóng dấu SinDarealest trong trình quản trị trước khi tải lên.");
  if (!file || typeof file.arrayBuffer !== "function") return fail("Chưa chọn ảnh.");
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) return fail("Ảnh sau tối ưu phải nhỏ hơn hoặc bằng 5 MB.");
  if (file.type !== "image/webp") return fail("Ảnh tải lên cần được tối ưu sang định dạng WebP trong trình duyệt.");
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isWebp = bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!isWebp) return fail("Nội dung tệp không phải ảnh WebP hợp lệ.");
    const key = `${crypto.randomUUID()}-wm.webp`;
    await context.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
    return json({ ok: true, url: `/media/${key}`, message: "Đã tối ưu và đóng dấu ảnh trước khi lưu vào R2." }, 201);
  } catch {
    return fail("Tải ảnh thất bại. Hãy kiểm tra R2 binding tên IMAGES và thử lại.", 503);
  }
}
