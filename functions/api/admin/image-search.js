import { fail, json, requireAdmin } from "../../_lib.js";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages } from "../../_lib/image-audit.js";
import { generateSearchKeywords } from "../../_lib/workers-ai.js";
import { consumeWorkersAiRequest } from "../../_lib/ai-quota.js";

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
  const title = String(body?.title || "").replace(/[<>]/g, "").trim().slice(0, 180);
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

  const query = [title, ...generated.keywords].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 220);
  const searchUrl = platform === "1688"
    ? "https://s.1688.com/selloffer/offer_search.htm?keywords=" + encodeURIComponent(query)
    : "https://s.taobao.com/search?q=" + encodeURIComponent(query);
  const evaluation = evaluateSearchCandidate({ title: [title, ...generated.keywords].join(" "), similarityScore: null });
  return json({
    ok: true,
    platform,
    provider: "Cloudflare Workers AI",
    model: generated.model,
    keywords: generated.keywords,
    visualSummary: generated.visualSummary,
    results: [{
      title: "Trang tìm kiếm " + platform + " — " + generated.keywords[0],
      candidateText: generated.keywords.join(" "),
      imageUrl: "",
      productUrl: searchUrl,
      searchUrl,
      isSearchPage: true,
      price: null,
      similarityScore: null,
      comparisonMethod: null,
      hasKeyword: evaluation.hasKeyword,
      eligible: false,
      eligibilityReason: "Đây là trang kết quả tìm kiếm theo từ khóa, không phải sản phẩm nguồn đã xác minh. Chưa có mô hình so khớp thị giác chuyên biệt đã hiệu chuẩn 90%; không thể lưu như ảnh nguồn đã đạt chuẩn.",
      materialCheck: evaluation.materialCheck
    }],
    message: "Workers AI đã tạo từ khóa tìm kiếm. Mở trang Taobao/1688 để tự kiểm tra sản phẩm; hệ thống chưa xác minh ứng viên ảnh hoặc ngưỡng tương đồng 90%."
  });
}

export async function onRequestPut() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
