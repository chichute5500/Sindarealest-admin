import { fail, json, requireAdmin } from "../../../_lib.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  if (context.env.ZIP_IMPORT_ENABLED !== "1") {
    return json({ ok: true, enabled: false, reason: "ZIP_IMPORT_ENABLED chưa được bật trong môi trường này." });
  }
  if (!context.env.IMAGES) {
    return json({ ok: true, enabled: false, reason: "Thiếu R2 binding IMAGES trong môi trường Preview." });
  }
  try {
    await context.env.DB.prepare("SELECT product_id FROM product_source_imports LIMIT 0").all();
    return json({ ok: true, enabled: true });
  } catch {
    return json({ ok: true, enabled: false, reason: "Bảng product_source_imports chưa được tạo trong D1 của môi trường này." });
  }
}
