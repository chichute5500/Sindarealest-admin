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
  if (!context.env.ORIGINALS) {
    return json({ ok: true, enabled: false, reason: "Thiếu R2 binding ORIGINALS riêng tư; chưa thể nhập ảnh an toàn." });
  }
  try {
    const sources = await context.env.DB.prepare(
      "SELECT source_product_id,source_url,source_title,product_id FROM product_source_imports ORDER BY imported_at DESC LIMIT 5000"
    ).all();
    return json({ ok: true, enabled: true, existingSources: (sources.results || []).map(row => ({
      sourceProductId: String(row.source_product_id || ""),
      sourceUrl: String(row.source_url || ""),
      sourceTitle: String(row.source_title || ""),
      productId: String(row.product_id || "")
    })) });
  } catch {
    return json({ ok: true, enabled: false, reason: "Bảng product_source_imports chưa được tạo trong D1 của môi trường này." });
  }
}
