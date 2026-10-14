import { fail, json, requireAdmin } from "../../_lib.js";
import { assessCrocodileMaterial, evaluateSearchCandidate, inventoryImages } from "../../_lib/image-audit.js";

const MAX_IMAGE_BASE64 = 1_400_000;
const isMarketplaceHost = (host) => {
  const h = String(host || "").toLowerCase();
  return h === "taobao.com" || h.endsWith(".taobao.com") ||
    h === "tmall.com" || h.endsWith(".tmall.com") ||
    h === "1688.com" || h.endsWith(".1688.com");
};
const isImageHost = (host) => {
  const h = String(host || "").toLowerCase();
  return isMarketplaceHost(h) || h === "alicdn.com" || h.endsWith(".alicdn.com");
};
function isProductUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !isMarketplaceHost(url.hostname)) return false;
    return /\/offer\//i.test(url.pathname) || /\/item\.htm/i.test(url.pathname) || /\/item\//i.test(url.pathname);
  } catch { return false; }
}
function parseProducts(rows) {
  return (rows || []).map((row) => ({ id: row.id, sku: row.sku, title: row.title, category: row.category, images_json: row.images_json }));
}
function cleanText(value, max = 300) {
  return String(value || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim().slice(0, max);
}
function meta(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp("<meta[^>]+(?:property|name)=[\"']" + escaped + "[\"'][^>]+content=[\"']([^\"']+)", "i"),
    new RegExp("<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+(?:property|name)=[\"']" + escaped + "[\"']", "i")
  ];
  for (const pattern of patterns) { const match = html.match(pattern); if (match) return cleanText(match[1], 2000); }
  return "";
}
async function productMetadata(sourceUrl) {
  let target;
  try {
    const parsed = new URL(sourceUrl);
    if (!isProductUrl(parsed.href) || parsed.username || parsed.password) return {};
    target = parsed.href;
  } catch { return {}; }
  try {
    let response;
    for (let redirects = 0; redirects <= 2; redirects++) {
      const url = new URL(target);
      if (!isProductUrl(url.href)) return {};
      response = await fetch(target, { redirect: "manual", headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; SinDarealestImageAudit/1.0)" }, signal: AbortSignal.timeout(4500) });
      if (![301,302,303,307,308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location || redirects === 2) return {};
      target = new URL(location, target).href;
    }
    if (!response?.ok || !(response.headers.get("content-type") || "").includes("text/html")) return {};
    const reader = response.body?.getReader();
    if (!reader) return {};
    const chunks = []; let total = 0;
    while (total < 600_000) {
      const { done, value } = await reader.read();
      if (done) break;
      const part = value.subarray(0, Math.min(value.length, 600_000 - total));
      chunks.push(part); total += part.length;
      if (part.length < value.length) { await reader.cancel(); break; }
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const html = new TextDecoder().decode(bytes);
    const rawImage = meta(html, "og:image") || meta(html, "twitter:image");
    let imageUrl = "";
    try { const image = new URL(rawImage, target); if (image.protocol === "https:" && isImageHost(image.hostname)) imageUrl = image.href; } catch {}
    return { title: meta(html, "og:title") || meta(html, "twitter:title"), imageUrl };
  } catch { return {}; }
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare("SELECT id, sku, title, category, images_json FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000").all();
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
  const apiKey = context.env.GEMINI_API_KEY;
  if (typeof apiKey !== "string" || apiKey.length < 12) return fail("Chưa cấu hình Secret GEMINI_API_KEY trong môi trường Production.", 503);
  const imageBase64 = String(body?.imageBase64 || "").replace(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, "");
  if (!imageBase64 || imageBase64.length > MAX_IMAGE_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return fail("Ảnh tham chiếu phải là JPEG/PNG/WebP hợp lệ và không vượt giới hạn an toàn.");
  }
  const title = cleanText(body?.title || "", 180);
  const site = platform === "1688" ? "1688.com" : "taobao.com";
  const prompt = [
    "Bạn là công cụ tìm kiếm sản phẩm thật trên web. Dùng ảnh đính kèm làm tham chiếu hình ảnh và tìm trang sản phẩm đang tồn tại trên sàn được chỉ định.",
    "Sàn được chỉ định: " + site + ". Chỉ tìm trang chi tiết sản phẩm thuộc miền " + site + " hoặc tên miền con chính thức của nó.",
    "Ưu tiên mẫu giày/phụ kiện có hình dáng, đường may, đế, màu và họa tiết gần ảnh tham chiếu. Tìm kiếm web thực tế bằng Google Search grounding; không suy đoán URL, tên hàng, giá hoặc kết quả.",
    "Từ khóa sản phẩm hiện có: " + (title || "không có") + ". Ưu tiên từ khóa Trung văn liên quan như 鳄鱼皮鞋 / 真鳄鱼皮 nếu phù hợp; không gán từ khóa thật cho hàng giả/vân dập.",
    "Chỉ liệt kê các trang sản phẩm mà công cụ tìm kiếm thực sự trả về. Nếu không tìm thấy trang đủ căn cứ trên sàn đó, hãy nói không tìm thấy; tuyệt đối không tạo dữ liệu giả.",
    "Trả lời ngắn bằng tiếng Việt. Metadata grounding sẽ được dùng để lấy URL nguồn thực tế."
  ].join("\n");
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: /^data:image\/webp/i.test(String(body?.imageBase64 || "")) ? "image/webp" : /^data:image\/png/i.test(String(body?.imageBase64 || "")) ? "image/png" : "image/jpeg", data: imageBase64 } }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1 }
      }),
      signal: AbortSignal.timeout(25000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiError = data?.error || {};
      const apiStatus = cleanText(apiError.status || "", 80);
      const rawDetail = cleanText(apiError.message || "", 500);
      // Include Google's actual diagnostic while ensuring the configured secret can never be echoed.
      const detail = apiKey ? rawDetail.split(apiKey).join("[đã ẩn API key]") : rawDetail;
      if (response.status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
        return fail("Gemini Search bị giới hạn hạn mức (HTTP 429). " + (detail || "Kiểm tra RPM/RPD, hạn mức Grounding và billing trong AI Studio."), 429);
      }
      if (response.status === 401 || apiStatus === "UNAUTHENTICATED" || /API.?KEY_INVALID|invalid api key|api key.*invalid|reported as leaked|blocked/i.test(detail)) {
        return fail("Gemini từ chối API key (HTTP " + response.status + "). " + (detail || "Tạo/kiểm tra key trong Google AI Studio và giới hạn key cho Gemini API."), 502);
      }
      if (response.status === 403 || apiStatus === "PERMISSION_DENIED") {
        return fail("Gemini từ chối quyền truy cập (HTTP 403). Kiểm tra key restriction, project/API access, billing và quyền sử dụng Grounding with Google Search. " + detail, 502);
      }
      if (response.status === 400 || apiStatus === "INVALID_ARGUMENT") {
        return fail("Gemini từ chối định dạng yêu cầu (HTTP 400). Chi tiết Google: " + (detail || "INVALID_ARGUMENT"), 502);
      }
      return fail("Gemini Search trả lỗi HTTP " + response.status + (apiStatus ? " (" + apiStatus + ")" : "") + ". " + (detail || "Kiểm tra trạng thái dịch vụ và thử lại."), 502);
    }
    const candidate = data?.candidates?.[0];
    if (!candidate) {
      const blockReason = cleanText(data?.promptFeedback?.blockReason || data?.prompt_feedback?.block_reason || "", 100);
      return fail("Gemini không trả về kết quả" + (blockReason ? " (blockReason: " + blockReason + ")" : "") + ". Kiểm tra nội dung ảnh/yêu cầu và thử lại.", 502);
    }
    const chunks = candidate?.groundingMetadata?.groundingChunks || candidate?.grounding_metadata?.grounding_chunks || [];
    const seen = new Set();
    const grounded = [];
    for (const chunk of chunks) {
      const web = chunk?.web || chunk?.web?.uri ? (chunk.web || chunk) : null;
      const uri = web?.uri || "";
      let parsed;
      try { parsed = new URL(uri); } catch { continue; }
      if (!isProductUrl(parsed.href) || seen.has(parsed.href)) continue;
      seen.add(parsed.href);
      grounded.push({ productUrl: parsed.href, groundedTitle: cleanText(web.title || "", 300) });
      if (grounded.length >= 10) break;
    }
    const results = await Promise.all(grounded.slice(0, 6).map(async (item) => {
      const metadata = await productMetadata(item.productUrl);
      const resultTitle = metadata.title || item.groundedTitle || title || "Sản phẩm từ kết quả tìm kiếm";
      const candidateText = [resultTitle, item.groundedTitle].filter(Boolean).join(" ").slice(0, 1000);
      const evaluation = evaluateSearchCandidate({ title: candidateText, similarityScore: null });
      return {
        title: resultTitle, candidateText, imageUrl: metadata.imageUrl || "", productUrl: item.productUrl, price: null,
        similarityScore: null, hasKeyword: evaluation.hasKeyword, eligible: false,
        eligibilityReason: metadata.imageUrl ? "Chưa đo pHash; cần đối chiếu ảnh trước khi lưu URL." : "Trang nguồn chưa cung cấp ảnh sản phẩm đọc được; chưa thể đo pHash.",
        materialCheck: evaluation.materialCheck
      };
    }));
    return json({
      ok: true, platform, results,
      message: results.length ? "Gemini Search trả về các trang nguồn thực tế. Chỉ kết quả có ảnh tải được mới có thể đo pHash; không có điểm tương đồng nào được giả lập." : "Gemini Search không trả về trang sản phẩm Taobao/1688 đủ căn cứ. Không có kết quả giả được tạo."
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return fail("Gemini Search hết thời gian chờ sau 25 giây. Thử lại; nếu lặp lại, kiểm tra tình trạng dịch vụ hoặc hạn mức.", 504);
    }
    return fail("Không kết nối được Gemini Search từ Cloudflare Worker. Kiểm tra kết nối ra generativelanguage.googleapis.com. " + cleanText(error?.message || "", 240), 502);
  }
}

export async function onRequestPut() { return fail("Phương thức không được hỗ trợ.", 405); }
