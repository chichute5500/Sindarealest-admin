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

import { consumeGeminiRequest } from "../../_lib/ai-quota.js";

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
  const quota = await consumeGeminiRequest(context.env.DB);
  if (!quota.ok) return fail(quota.error, quota.status);

  const title = cleanText(body?.title || "", 180);
  const site = platform === "1688" ? "1688.com" : "taobao.com";
  const prompt = [
    "Bạn phân tích ảnh sản phẩm và tạo từ khóa tìm kiếm; KHÔNG được truy cập web, KHÔNG được tạo URL sản phẩm giả và KHÔNG được khẳng định đã tìm thấy sản phẩm cụ thể.",
    "Nhìn vào ảnh, xác định loại sản phẩm, kiểu dáng, màu sắc, họa tiết, chi tiết nổi bật. Trả về tối đa 4 cụm từ khóa ngắn bằng tiếng Trung giản thể để người dùng tìm thủ công trên " + site + ".",
    "Nếu ảnh và tiêu đề gợi ý giày da/vân cá sấu, hãy phân biệt 鳄鱼皮 (da cá sấu) với 鳄鱼纹/压纹/PU (vân cá sấu giả); không khẳng định vật liệu là da thật.",
    "Tiêu đề sản phẩm hiện có: " + (title || "không có") + ".",
    "Trả về JSON thuần, không markdown: {\"keywords\":[string,string],\"visualSummary\":string}. Chỉ đưa từ khóa liên quan trực tiếp tới vật thể trong ảnh."
  ].join("\n");
  const imageMimeType = /^data:image\/webp/i.test(String(body?.imageBase64 || "")) ? "image/webp" : /^data:image\/png/i.test(String(body?.imageBase64 || "")) ? "image/png" : "image/jpeg";
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": "2026-05-20" },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        input: [
          { type: "text", text: prompt },
          { type: "image", data: imageBase64, mime_type: imageMimeType }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    });
    const data = await response.json().catch(() => ({}));
    const blocks = (Array.isArray(data?.steps) ? data.steps : [])
      .filter(step => step?.type === "model_output")
      .flatMap(step => Array.isArray(step.content) ? step.content : []);
    const outputText = blocks.filter(block => block?.type === "text").map(block => block.text || "").join("\n").trim();
    if (!response.ok) {
      const apiError = data?.error || {};
      const apiStatus = cleanText(apiError.status || "", 80);
      const rawDetail = cleanText(apiError.message || outputText || "", 400);
      const detail = apiKey ? rawDetail.split(apiKey).join("[đã ẩn API key]") : rawDetail;
      if (response.status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
        return fail("Gemini đã từ chối yêu cầu vì quota/hạn mức của Google (HTTP 429). Không tự động thử lại để tránh tiêu hao thêm quota. Kiểm tra giới hạn thực tế trong Google AI Studio. " + detail, 429);
      }
      if (response.status === 401 || apiStatus === "UNAUTHENTICATED") return fail("Gemini từ chối API key. " + detail, 502);
      if (response.status === 403 || apiStatus === "PERMISSION_DENIED") return fail("Gemini từ chối quyền truy cập. Kiểm tra dự án và quyền API. " + detail, 502);
      if (response.status === 400 || apiStatus === "INVALID_ARGUMENT") return fail("Gemini Interactions API từ chối định dạng yêu cầu (HTTP 400). " + (detail || "INVALID_ARGUMENT"), 502);
      return fail("Gemini Interactions API trả lỗi HTTP " + response.status + (apiStatus ? " (" + apiStatus + ")" : "") + ". " + (detail || "Kiểm tra cấu hình API."), 502);
    }
    if (data?.status && data.status !== "completed") return fail("Gemini chưa hoàn tất tạo từ khóa (status: " + cleanText(data.status, 80) + "). Không tự động gửi lại.", 502);
    if (!outputText) return fail("Gemini không trả về từ khóa tìm kiếm.", 502);

    let parsed;
    try { parsed = JSON.parse(outputText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()); }
    catch { return fail("Gemini trả về từ khóa sai định dạng. Không tạo kết quả giả.", 502); }
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map(value => cleanText(value, 80)).filter(Boolean).slice(0, 4)
      : [];
    if (!keywords.length) return json({ ok: true, platform, results: [], message: "Gemini không tạo được từ khóa đủ rõ; không tạo URL sản phẩm giả." });
    const query = cleanText([title, ...keywords].filter(Boolean).join(" "), 220);
    const searchUrl = platform === "1688"
      ? "https://s.1688.com/selloffer/offer_search.htm?keywords=" + encodeURIComponent(query)
      : "https://s.taobao.com/search?q=" + encodeURIComponent(query);
    const evaluation = evaluateSearchCandidate({ title: keywords.join(" "), similarityScore: null });
    return json({
      ok: true,
      platform,
      results: [{
        title: "Trang tìm kiếm " + platform + " — " + keywords[0],
        candidateText: keywords.join(" "),
        imageUrl: "",
        productUrl: searchUrl,
        searchUrl,
        isSearchPage: true,
        price: null,
        similarityScore: null,
        hasKeyword: evaluation.hasKeyword,
        eligible: false,
        eligibilityReason: "Đây chỉ là trang kết quả tìm kiếm theo từ khóa do AI gợi ý, không phải sản phẩm đã xác minh. Gói miễn phí không dùng Google Search grounding; hãy tự mở trang, chọn sản phẩm thật và đối chiếu ảnh trước khi lưu URL.",
        materialCheck: evaluation.materialCheck,
        keywords,
        visualSummary: cleanText(parsed.visualSummary || "", 300)
      }],
      message: "Đã tạo trang tìm kiếm theo từ khóa hình ảnh bằng một lượt Gemini. Chưa tìm thấy hay xác minh sản phẩm cụ thể; không có URL sản phẩm giả và không thể lưu trang tìm kiếm làm nguồn."
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") return fail("Gemini hết thời gian chờ sau 25 giây. Không tự động thử lại để bảo vệ quota.", 504);
    return fail("Không kết nối được Gemini Interactions API. " + cleanText(error?.message || "", 200), 502);
  }
}

export async function onRequestPut() { return fail("Phương thức không được hỗ trợ.", 405); }
