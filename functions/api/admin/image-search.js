import { fail, json, requireAdmin } from "../../_lib.js";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages, normalizeImageRef } from "../../_lib/image-audit.js";
import { generateSearchKeywords } from "../../_lib/workers-ai.js";
import { consumeWorkersAiRequest } from "../../_lib/ai-quota.js";
import { searchElimapiProductsByImage } from "../../_lib/elimapi.js";

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
  if (!ALLOWED_MIME.has(mimeType) || !imageBase64 || imageBase64.length > MAX_IMAGE_BASE64 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return null;
  let binary;
  try { binary = atob(imageBase64); } catch { return null; }
  if (!binary.length || binary.length > 5 * 1024 * 1024) return null;
  const isJpeg = mimeType === "image/jpeg" && binary.length >= 3 &&
    binary.charCodeAt(0) === 0xff && binary.charCodeAt(1) === 0xd8 && binary.charCodeAt(2) === 0xff;
  const isPng = mimeType === "image/png" && binary.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => binary.charCodeAt(i) === byte);
  const isWebp = mimeType === "image/webp" && binary.length >= 12 &&
    binary.slice(0, 4) === "RIFF" && binary.slice(8, 12) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) return null;
  return { mimeType, imageBase64 };
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare("SELECT id, sku, title, category, images_json FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000").all();
    let quotaTableConfigured = false;
    try {
      await context.env.DB.prepare("SELECT scope FROM ai_request_limits LIMIT 1").first();
      quotaTableConfigured = true;
    } catch {}
    const readiness = {
      workersAiBindingConfigured: Boolean(context.env.AI && typeof context.env.AI.run === "function"),
      elimapiApiKeyConfigured: Boolean(String(context.env.ELIMAPI_API_KEY || "").trim()),
      elimapiImageSearchEnabled: String(context.env.ELIMAPI_IMAGE_SEARCH_ENABLED || "").trim().toLowerCase() === "true",
      quotaTableConfigured,
      externalApiVerified: false,
      workersAiLicenseVerified: false
    };
    return json({ ok: true, readiness, ...inventoryImages((result.results || []).map(row => ({ id: row.id, sku: row.sku, title: row.title, category: row.category, images_json: row.images_json }))) });
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
  if (!String(context.env.ELIMAPI_API_KEY || "").trim()) {
    return json({ ok: false, error: "Chưa cấu hình Secret ELIMAPI_API_KEY trong môi trường Preview của Cloudflare. Đã chặn yêu cầu trước khi gọi Workers AI để không tiêu hao quota vô ích.", code: "ELIMAPI_KEY_MISSING" }, 503);
  }
  if (String(context.env.ELIMAPI_IMAGE_SEARCH_ENABLED || "").trim().toLowerCase() !== "true") {
    return json({
      ok: false,
      error: "Tìm kiếm bằng ảnh đang tắt an toàn. Chỉ đặt biến Preview ELIMAPI_IMAGE_SEARCH_ENABLED=true sau khi đã xác nhận gói ElimAPI hỗ trợ tìm kiếm bằng ảnh và cho phép sử dụng quota.",
      code: "ELIMAPI_IMAGE_SEARCH_DISABLED"
    }, 503);
  }
  if (!context.env.AI || typeof context.env.AI.run !== "function") {
    return json({ ok: false, error: "Chưa cấu hình binding Workers AI có tên AI cho môi trường Preview. Không tiêu hao quota khi thiếu binding.", code: "WORKERS_AI_BINDING_MISSING" }, 503);
  }

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
  const upstream = await searchElimapiProductsByImage({
    apiKey: context.env.ELIMAPI_API_KEY,
    platform,
    imageBase64: image.imageBase64,
    mimeType: image.mimeType,
    query
  });
  if (upstream.error) {
    return json({ ok: false, error: upstream.error, code: upstream.code || "ELIMAPI_IMAGE_SEARCH_ERROR" }, upstream.status || 502);
  }
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
    provider: "Elimapi image search",
    searchMode: upstream.searchMode || "image",
    keywordProvider: "Cloudflare Workers AI",
    model: generated.model,
    keywords: generated.keywords,
    visualSummary: generated.visualSummary,
    total: upstream.total,
    results,
    message: results.length
      ? "ElimAPI đã trả về ứng viên qua tìm kiếm bằng ảnh kèm từ khóa. Giá lấy từ phản hồi API, đơn vị CNY; hãy mở trang nguồn và kiểm tra thủ công. Kết quả chưa được xác minh cùng mẫu hoặc hiệu chuẩn ngưỡng 90%, nên không có ảnh nào tự động được duyệt."
      : "ElimAPI không trả về ứng viên cho ảnh và từ khóa này. Hệ thống không tự tạo sản phẩm hoặc giá giả, cũng không tự gửi yêu cầu khác."
  });
}
