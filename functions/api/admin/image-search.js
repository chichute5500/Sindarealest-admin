import { fail, json, requireAdmin } from "../../_lib.js";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages } from "../../_lib/image-audit.js";

const MAX_IMAGE_BASE64 = 1_400_000;
const API_BASE = "https://openapi.elim.asia";
const MAX_DETAIL_LOOKUPS = 5;

export function isSupportedSourceUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (
      host === "taobao.com" || host.endsWith(".taobao.com") ||
      host === "tmall.com" || host.endsWith(".tmall.com") ||
      host === "1688.com" || host.endsWith(".1688.com")
    );
  } catch { return false; }
}
function supportedImageUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (
      host === "alicdn.com" || host.endsWith(".alicdn.com") ||
      host === "taobaocdn.com" || host.endsWith(".taobaocdn.com") ||
      host === "tbcdn.cn" || host.endsWith(".tbcdn.cn")
    );
  } catch { return false; }
}
function normalizeImageUrls(value) {
  const rows = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(rows.map((entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") return entry.url || entry.img_url || entry.image_url || "";
    return "";
  }).filter((url) => typeof url === "string" && supportedImageUrl(url)))].slice(0, 30);
}
function productUrl(item, platform) {
  const supplied = item?.item_url || item?.product_url || item?.url || item?.original_product_url || "";
  if (isSupportedSourceUrl(supplied)) return supplied;
  const id = String(item?.id || item?.mi_id || item?.item_id || item?.offer_id || "");
  if (!/^\d{5,30}$/.test(id)) return "";
  return platform === "taobao"
    ? "https://item.taobao.com/item.htm?id=" + encodeURIComponent(id)
    : "https://detail.1688.com/offer/" + encodeURIComponent(id) + ".html";
}
function safeText(value, max = 500) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
async function apiJson(path, apiKey, body) {
  const response = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    body: body instanceof FormData ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("API tìm ảnh trả về HTTP " + response.status);
    error.status = response.status;
    throw error;
  }
  return data;
}
function imageBytes(base64) {
  const normalized = String(base64 || "").replace(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, "");
  if (!normalized || normalized.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) return null;
  try {
    const bytes = Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0));
    if (!bytes.length || bytes.length > 1_050_000) return null;
    return bytes;
  } catch { return null; }
}
async function uploadReferenceImage(bytes, platform, apiKey, mimeType) {
  const form = new FormData();
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  form.append("platform", platform === "1688" ? "alibaba" : "taobao");
  form.append("file", new Blob([bytes], { type: mimeType }), "reference." + extension);
  const data = await apiJson("/v2/products/upload-image", apiKey, form);
  const id = data?.imageId || data?.image_id || data?.data?.imageId || data?.data?.image_id;
  if (!id || typeof id !== "string") throw new Error("API không trả về imageId sau khi tải ảnh tham chiếu lên.");
  return id;
}
async function findImageProducts(imageId, platform, apiKey, title) {
  return apiJson("/v2/products/search-by-image", apiKey, {
    platform: platform === "1688" ? "alibaba" : "taobao",
    imgId: imageId,
    lang: "vi",
    page: 1,
    size: 20,
    ...(title ? { keyword: title.slice(0, 100) } : {})
  });
}
async function detailFor(item, platform, apiKey) {
  const id = String(item?.id || item?.mi_id || item?.item_id || item?.offer_id || "");
  if (!id || id.length > 100) return {};
  try {
    const data = await apiJson("/v2/products/detail", apiKey, {
      platform: platform === "1688" ? "alibaba" : "taobao",
      id,
      lang: "vi"
    });
    return data?.product || data?.data?.product || data?.data || data || {};
  } catch {
    // Search-result images are still useful if the detail endpoint is unavailable.
    return {};
  }
}
function parseProducts(rows) {
  return (rows || []).map((row) => ({
    id: row.id, sku: row.sku, title: row.title, category: row.category, images_json: row.images_json
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
  const title = safeText(body?.title, 180);
  const material = assessCrocodileMaterial(title);
  if (material.status === "reject") return fail(material.reason, 422);

  const apiKey = context.env.ELIMAPI_API_KEY;
  if (typeof apiKey !== "string" || apiKey.length < 12) {
    return fail("Chưa cấu hình secret ELIMAPI_API_KEY. Cần API key Elimapi để tìm ảnh thật trên Taobao/1688; Gemini vẫn dùng riêng để phân tích ảnh.", 503);
  }
  const bytes = imageBytes(body?.imageBase64);
  if (!bytes) return fail("Ảnh tham chiếu phải là JPEG/PNG/WebP hợp lệ và không vượt giới hạn an toàn.");
  const rawMime = String(body?.imageBase64 || "").match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,/i)?.[1]?.toLowerCase();
  const mimeType = rawMime === "image/png" || rawMime === "image/webp" ? rawMime : "image/jpeg";

  try {
    const imageId = await uploadReferenceImage(bytes, platform, apiKey, mimeType);
    const response = await findImageProducts(imageId, platform, apiKey, title);
    const rows = Array.isArray(response?.items) ? response.items
      : Array.isArray(response?.data?.items) ? response.data.items
      : Array.isArray(response?.data?.data?.items) ? response.data.data.items : [];
    const results = [];
    for (const item of rows.slice(0, 20)) {
      const titleText = safeText(item?.title_en || item?.title || item?.subject, 300);
      const description = safeText(item?.description || "", 1000);
      const url = productUrl(item, platform);
      if (!url) continue;
      let galleryUrls = normalizeImageUrls(item?.img_urls || item?.images || item?.image_urls || []);
      // Fetch product details only for the first few candidates to obtain the complete gallery without
      // burning quota on every search result.
      if (results.length < MAX_DETAIL_LOOKUPS) {
        const detail = await detailFor(item, platform, apiKey);
        galleryUrls = [...new Set([...galleryUrls, ...normalizeImageUrls(detail?.img_urls || detail?.images || detail?.image_urls || [])])].slice(0, 30);
      }
      const imageUrl = normalizeImageUrls([item?.white_image, item?.image_url, item?.pic_url, ...(galleryUrls || [])])[0] || galleryUrls[0] || "";
      const similarityScore = null; // Never trust provider scores; client pHash must compare actual pixels before eligibility.\n      const evaluation = evaluateSearchCandidate({ title: titleText, description, similarityScore });
      results.push({
        title: titleText || "Sản phẩm Taobao/1688",
        candidateText: [titleText, description].filter(Boolean).join(" ").slice(0, 3000),
        imageUrl,
        galleryUrls,
        productUrl: url,
        price: item?.promotion_price ?? item?.price ?? null,
        similarityScore: null,
        hasKeyword: evaluation.hasKeyword,
        eligible: false,
        eligibilityReason: "Ảnh tìm được chưa được so khớp pHash với ảnh gốc. Chỉ được lưu/bổ sung khi điểm so khớp thực tế đạt ít nhất 90% và qua kiểm tra từ khóa bắt buộc.",
        materialCheck: evaluation.materialCheck,
        sourceProductId: String(item?.id || item?.mi_id || item?.item_id || item?.offer_id || "")
      });
    }
    return json({
      ok: true,
      platform,
      results,
      message: results.length
        ? "Đã tìm sản phẩm thật bằng ảnh và lấy thêm ảnh góc từ bộ ảnh nguồn khi API trả về. Chưa tự thêm ảnh vào website: cần đối chiếu pHash đạt ít nhất 90% và kiểm tra từ khóa trước."
        : "API tìm ảnh không trả về sản phẩm có URL nguồn hợp lệ. Không tạo kết quả giả."
    });
  } catch (error) {
    const status = error?.status === 401 || error?.status === 403 ? 503 : error?.status === 429 ? 429 : 502;
    if (error?.status === 429) return fail("API tìm ảnh đang giới hạn lượt gọi. Không tự động thử lại để tránh tiêu hao quota.", 429);
    if (error?.status === 401 || error?.status === 403) return fail("API key Elimapi không hợp lệ, hết hạn hoặc chưa có quyền tìm ảnh. Kiểm tra gói và quyền API.", 503);
    return fail("Không hoàn tất được tìm kiếm ảnh thật trên " + platform + ". " + safeText(error?.message || "", 180), status);
  }
}

export async function onRequestPut() { return fail("Phương thức không được hỗ trợ.", 405); }
