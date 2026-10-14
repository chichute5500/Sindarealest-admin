import { fail, json, requireAdmin } from "../../_lib.js";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages, normalizeImageRef } from "../../_lib/image-audit.js";
import { generateSearchKeywords } from "../../_lib/workers-ai.js";
import { consumeWorkersAiRequest } from "../../_lib/ai-quota.js";
import { searchElimapiProducts } from "../../_lib/elimapi.js";

const MAX_IMAGE_BASE64 = 7_000_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseImage(value, fallbackBase64 = "") {
  let mimeType = "";
  let imageBase64 = "";
  const raw = String(value || "");
  const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (match) {
    mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    imageBase64 = match[2];
  } else {
    imageBase64 = String(fallbackBase64 || "").replace(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, "");
    mimeType = /^data:image\/webp/i.test(String(fallbackBase64 || "")) ? "image/webp"
      : /^data:image\/png/i.test(String(fallbackBase64 || "")) ? "image/png" : "image/jpeg";
  }
  if (!ALLOWED_MIME.has(mimeType) || !imageBase64 || imageBase64.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return null;
  return { mimeType, imageBase64 };
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare("SELECT id, sku, title, category, images_json FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000").all();
    return json({ ok: true, ...inventoryImages((result.results || []).map(row => ({ id: row.id, sku: row.sku, title: row.title, category: row.category, images_json: row.images_json }))) });
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
  const image = parseImage(body?.dataUrl, body?.imageBase64);
  if (!image) return fail("Ảnh tham chiếu phải là JPEG/PNG/WebP hợp lệ và không vượt giới hạn 5 MB.");
  const productId = String(body?.productId || "").trim().slice(0, 100);
  const imageRef = normalizeImageRef(body?.imageRef);
  if (!productId || !imageRef || imageRef.length > 300) return fail("Thiếu sản phẩm hoặc tham chiếu ảnh gốc.");
  let product;
  try {
    product = await context.env.DB.prepare("SELECT id,sku,title,category,images_json FROM products WHERE id=? LIMIT 1").bind(productId).first();
  } catch {
    return fail("Không thể xác minh sản phẩm và ảnh gốc trong D1.", 503);
  }
  if (!product) return fail("Không tìm thấy sản phẩm được chọn.", 404);
  let ownedImages = [];
  try { ownedImages = JSON.parse(product.images_json || "[]"); } catch {}
  if (!Array.isArray(ownedImages) || !ownedImages.some(ref => normalizeImageRef(ref) === imageRef)) {
    return fail("Ảnh tham chiếu không thuộc bộ ảnh của sản phẩm đã chọn.", 422);
  }
  const title = String(product.title || "").replace(/[<>]/g, "").trim().slice(0, 180);
  const material = assessCrocodileMaterial(title);
  if (material.status === "reject") return fail(material.reason, 422);
  const quota = await consumeWorkersAiRequest(context.env.DB);
  if (!quota.ok) return fail(quota.error, quota.status);

  const generated = await generateSearchKeywords({
    ai: context.env.AI,
    imageBase64: image.imageBase64,
    mimeType: image.mimeType,
    title,
    platform
  });
  if (generated.error) return fail(generated.error, generated.status || 502);

  const query = generated.keywords.join(" ").replace(/\s+/g, " ").trim().slice(0, 220);
  const upstream = await searchElimapiProducts({
    apiKey: context.env.ELIMAPI_API_KEY,
    platform,
    query
  });
  if (upstream.error) return fail(upstream.error, upstream.status || 502, { "X-Error-Code": upstream.code || "ELIMAPI_ERROR" });
  const results = upstream.products.map(product => {
    const evaluation = evaluateSearchCandidate({ title: product.title, description: product.candidateText, similarityScore: null });
    return {
      ...product,
      hasKeyword: evaluation.hasKeyword,
      eligible: false,
      eligibilityReason: "Sản phẩm thật do Elimapi trả về, nhưng chưa có mô hình so khớp thị giác chuyên biệt đã hiệu chuẩn ngưỡng 90%. Admin phải kiểm tra ảnh, giá và chất liệu thủ công.",
      materialCheck: evaluation.materialCheck
    };
  });
  return json({
    ok: true,
    productId: product.id,
    sourceImageRef: imageRef,
    platform,
    provider: "Elimapi",
    keywordProvider: "Cloudflare Workers AI",
    model: generated.model,
    keywords: generated.keywords,
    visualSummary: generated.visualSummary,
    total: upstream.total,
    results,
    message: results.length
      ? "Đã nhận sản phẩm và giá từ Elimapi. Giá do API trả về tính bằng CNY; hãy mở nguồn và kiểm tra thủ công. Điểm tương đồng ảnh chưa được hiệu chuẩn, vì vậy không có kết quả nào tự động đủ điều kiện lưu."
      : "Elimapi không trả về sản phẩm cho các từ khóa này. Thử điều chỉnh từ khóa; hệ thống không tạo sản phẩm hoặc giá giả."
  });
}
