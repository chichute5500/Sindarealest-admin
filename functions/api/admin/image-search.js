import { fail, json, requireAdmin } from "../../_lib.js";
import { assessCrocodileMaterial, inventoryImages } from "../../_lib/image-audit.js";

function parseProducts(rows) {
  return (rows || []).map((row) => ({
    id: row.id, sku: row.sku, title: row.title, category: row.category,
    images_json: row.images_json
  }));
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare(
      "SELECT id, sku, title, category, images_json FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000"
    ).all();
    return json({ ok: true, ...inventoryImages(parseProducts(result.results || [])) });
  } catch {
    return fail("Không thể quét kho ảnh trong D1. Hãy kiểm tra cấu hình cơ sở dữ liệu.", 503);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return fail("Yêu cầu tìm ảnh không hợp lệ."); }
  const platform = body?.platform === "1688" ? "1688" : body?.platform === "taobao" ? "taobao" : "";
  if (!platform) return fail("Hãy chọn Taobao hoặc 1688.");
  const material = assessCrocodileMaterial(body?.title || "");
  if (material.status === "reject") return fail(material.reason, 422);
  if (platform === "taobao") {
    return fail("Chưa có API tìm ảnh Taobao được cấu hình. Không tự động thay bằng tìm kiếm giả lập.", 503);
  }
  const apiKey = context.env.NEXSCOPE_API_KEY;
  if (typeof apiKey !== "string" || apiKey.length < 12) {
    return fail("Chưa cấu hình secret NEXSCOPE_API_KEY. Dịch vụ tìm ảnh 1688 cần API key và có thể tính phí theo lượt gọi.", 503);
  }
  const imageBase64 = String(body?.imageBase64 || "").replace(/^data:image\/(?:jpeg|jpg|png);base64,/i, "");
  if (!imageBase64 || imageBase64.length > 1_400_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return fail("Ảnh tham chiếu phải là JPEG/PNG đã chuyển sang Base64 và không vượt giới hạn an toàn.");
  }
  try {
    const response = await fetch("https://api.nexscope.ai/alibaba1688/imageSearch", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, page: 1, pageSize: 20 })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.code !== 0) {
      return fail("Dịch vụ tìm ảnh 1688 không trả về kết quả hợp lệ. Kiểm tra API key, hạn mức và phản hồi dịch vụ.", response.status === 401 ? 503 : 502);
    }
    const payload = data.data || {};
    const products = Array.isArray(payload.products) ? payload.products : [];
    return json({
      ok: true, platform: "1688",
      results: products.map((item) => ({
        title: String(item.title || item.subject || "").slice(0, 300),
        imageUrl: String(item.imageUrl || item.image_url || item.picUrl || item.pic_url || ""),
        productUrl: String(item.productUrl || item.product_url || item.offerUrl || item.offer_url || item.url || (item.offerId ? "https://detail.1688.com/offer/" + encodeURIComponent(String(item.offerId)) + ".html" : "")),
        price: item.price == null ? null : String(item.price),
        materialCheck: assessCrocodileMaterial([item.title, item.description, item.material, item.properties].filter(Boolean).join(" "))
      })).filter((item) => /^https:\/\//i.test(item.imageUrl) && /^https:\/\//i.test(item.productUrl))
    });
  } catch {
    return fail("Không kết nối được dịch vụ tìm ảnh 1688. Vui lòng thử lại.", 502);
  }
}

export async function onRequestPut() { return fail("Phương thức không được hỗ trợ.", 405); }
