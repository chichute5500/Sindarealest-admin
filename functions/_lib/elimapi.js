const ELIMAPI_SEARCH_URL = "https://openapi.elim.asia/v2/products/search";
const ALLOWED_PRODUCT_HOSTS = {
  taobao: ["taobao.com", "tmall.com", "alicdn.com", "tbcdn.cn"],
  alibaba: ["1688.com", "alicdn.com"]
};

function isAllowedHost(host, platform) {
  const value = String(host || "").toLowerCase();
  return (ALLOWED_PRODUCT_HOSTS[platform] || []).some(domain => value === domain || value.endsWith("." + domain));
}

function safeProductUrl(value, platform, id) {
  if (typeof value === "string" && value.trim()) {
    try {
      const url = new URL(value.trim());
      if (url.protocol === "https:" && isAllowedHost(url.hostname, platform)) return url.href;
    } catch {}
  }
  const safeId = String(id || "").trim();
  if (!safeId || !/^[A-Za-z0-9_-]{1,100}$/.test(safeId)) return "";
  return platform === "alibaba"
    ? "https://detail.1688.com/offer/" + encodeURIComponent(safeId) + ".html"
    : "https://item.taobao.com/item.htm?id=" + encodeURIComponent(safeId);
}

function imageFrom(item) {
  const candidates = [
    ...(Array.isArray(item?.img_urls) ? item.img_urls : []),
    item?.white_image,
    item?.image_url,
    item?.image,
    item?.pic_url
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const url = new URL(raw.trim().startsWith("//") ? "https:" + raw.trim() : raw.trim());
      if (url.protocol === "https:" && /(^|\.)(alicdn\.com|tbcdn\.cn|taobaocdn\.com)$/i.test(url.hostname)) return url.href;
    } catch {}
  }
  return "";
}

function priceValue(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return String(value);
  if (typeof value === "string" && value.trim() && value.trim().length <= 100) return value.trim();
  return null;
}

function productPrice(item, platform) {
  const candidates = platform === "taobao"
    ? [item?.promotion_price, item?.price]
    : [item?.retail_price, item?.dropship_price, item?.promotion_price, item?.price, item?.price_range];
  for (const candidate of candidates) {
    const value = priceValue(candidate);
    if (value !== null) return value;
  }
  return null;
}

function unwrapItems(payload) {
  if (Array.isArray(payload)) return payload;
  const options = [payload?.items, payload?.data?.items, payload?.result?.items, payload?.data?.data?.items];
  return options.find(Array.isArray) || [];
}

export function normalizeElimapiProducts(payload, platform) {
  const apiPlatform = platform === "1688" ? "alibaba" : "taobao";
  return unwrapItems(payload).slice(0, 20).map((item, index) => {
    const id = item?.id ?? item?.offer_id ?? item?.offerId ?? item?.mi_id ?? item?.item_id ?? "";
    const title = String(item?.title_en || item?.title || item?.name || "Sản phẩm nguồn " + (index + 1)).slice(0, 240);
    const price = productPrice(item, platform);
    const rawUrl = item?.original_product_url || item?.promotion_url || item?.item_url || item?.product_url || item?.url || "";
    return {
      id: String(id || ""),
      title,
      candidateText: [title, item?.description, item?.category_name, item?.selling_point].filter(x => typeof x === "string").join(" ").slice(0, 1200),
      imageUrl: imageFrom(item),
      productUrl: safeProductUrl(rawUrl, apiPlatform, id),
      searchUrl: "",
      isSearchPage: false,
      price,
      currency: "CNY",
      similarityScore: null,
      comparisonMethod: null,
      eligible: false,
      eligibilityReason: "Sản phẩm do Elimapi trả về; độ tương đồng hình ảnh và chất liệu chưa được mô hình chuyên biệt hiệu chuẩn xác minh. Admin phải kiểm tra thủ công.",
      materialCheck: { status: "review", reason: "Cần kiểm tra thủ công thông tin chất liệu và ảnh nguồn." },
      shopName: String(item?.shop_name || "").slice(0, 160),
      minimumOrderQuantity: item?.moq ?? null,
      sold: item?.sold ?? null
    };
  });
}

export async function searchElimapiProducts({ apiKey, platform, query, fetchImpl = fetch }) {
  const key = String(apiKey || "").trim();
  if (!key) return { error: "Chưa cấu hình Secret ELIMAPI_API_KEY trong môi trường Preview của Cloudflare.", status: 503, code: "ELIMAPI_KEY_MISSING" };
  if (!["taobao", "1688"].includes(platform)) return { error: "Nền tảng tìm kiếm không hợp lệ.", status: 400, code: "ELIMAPI_PLATFORM_INVALID" };
  const q = String(query || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 220);
  if (!q) return { error: "Không có từ khóa hợp lệ để tìm sản phẩm.", status: 422, code: "ELIMAPI_QUERY_EMPTY" };
  const apiPlatform = platform === "1688" ? "alibaba" : "taobao";
  let response;
  try {
    response = await fetchImpl(ELIMAPI_SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ platform: apiPlatform, q, lang: "vi", sort: "SALE_QTY_DESC", page: 1, size: 20, keywordTranslate: true }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") return { error: "Elimapi quá thời gian phản hồi. Không tự động gọi lại để tránh tiêu hao lượt API.", status: 504, code: "ELIMAPI_TIMEOUT" };
    return { error: "Không kết nối được Elimapi. Kiểm tra trạng thái dịch vụ và cấu hình Preview.", status: 502, code: "ELIMAPI_NETWORK_ERROR" };
  }
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) return { error: "Elimapi từ chối xác thực. Kiểm tra Secret ELIMAPI_API_KEY trong Preview.", status: 502, code: "ELIMAPI_AUTH_FAILED" };
    if (response.status === 429) return { error: "Elimapi báo hết hạn mức hoặc giới hạn yêu cầu. Không tự động gọi lại.", status: 429, code: "ELIMAPI_QUOTA" };
    return { error: "Elimapi trả lỗi HTTP " + response.status + ". Kiểm tra gói API và tham số yêu cầu.", status: 502, code: "ELIMAPI_UPSTREAM_ERROR" };
  }
  if (!payload || typeof payload !== "object") return { error: "Elimapi trả về dữ liệu không đúng định dạng JSON.", status: 502, code: "ELIMAPI_INVALID_RESPONSE" };
  const items = unwrapItems(payload);
  if (payload.ok === false || payload.success === false || payload.error) return { error: "Elimapi không hoàn thành tìm kiếm. Kiểm tra hạn mức và tham số API.", status: 502, code: "ELIMAPI_SEARCH_FAILED" };
  return { products: normalizeElimapiProducts(items, platform), total: payload?.paginate?.total ?? payload?.data?.paginate?.total ?? items.length };
}
