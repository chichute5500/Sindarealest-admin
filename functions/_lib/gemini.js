const MAX_IMAGE_BASE64_LENGTH = 7_000_000;
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

function parseImage(imageBase64, mimeType) {
  const normalizedMime = ["image/webp", "image/jpeg", "image/png"].includes(mimeType) ? mimeType : "";
  const base64 = String(imageBase64 || "").replace(/^data:image\/(?:webp|jpeg|jpg|png);base64,/i, "");
  if (!normalizedMime || !base64 || base64.length > MAX_IMAGE_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  return { normalizedMime, image: "data:" + normalizedMime + ";base64," + base64 };
}

async function runVision(ai, prompt, image) {
  if (!ai || typeof ai.run !== "function") {
    return { error: "Chưa cấu hình Workers AI binding AI cho môi trường Preview/Production.", status: 503 };
  }
  try {
    const result = await ai.run(VISION_MODEL, {
      messages: [
        { role: "system", content: "You analyze product photos carefully and return only the requested output." },
        { role: "user", content: prompt }
      ],
      image,
      temperature: 0.1,
      max_tokens: 700
    });
    const raw = extractResponseText(result).trim();
    if (!raw) return { error: "Workers AI không trả về nội dung phân tích ảnh.", status: 502 };
    return { raw };
  } catch (error) {
    const message = String(error?.message || "");
    if (/license|acceptable use|prompt.*agree/i.test(message)) {
      return { error: "Workers AI yêu cầu chấp nhận điều khoản Meta cho mô hình Llama 3.2 Vision trước khi sử dụng. Mở trang mô hình trong Cloudflare Workers AI và hoàn tất bước chấp nhận điều khoản.", status: 503 };
    }
    if (/404|not found|unknown model|model.*does not exist/i.test(message)) {
      return { error: "Workers AI trả HTTP 404 hoặc không tìm thấy mô hình. Kiểm tra mã mô hình và binding AI ở đúng môi trường Preview/Production.", status: 503 };
    }
    if (/limit|quota|capacity|429/i.test(message)) {
      return { error: "Workers AI đang giới hạn lượt xử lý hoặc chưa đủ dung lượng. Không tự động thử lại.", status: 429 };
    }
    if (/401|403|unauthorized|permission denied/i.test(message)) {
      return { error: "Workers AI từ chối quyền truy cập. Kiểm tra binding AI và quyền Workers AI của tài khoản Cloudflare.", status: 503 };
    }
    return { error: "Workers AI không phân tích được ảnh. Kiểm tra binding AI và trạng thái dịch vụ.", status: 502 };
  }
}

function extractResponseText(value, depth = 0) {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => extractResponseText(item, depth + 1)).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    for (const key of ["response", "generated_text", "output_text", "text", "content", "result", "output"]) {
      if (value[key] !== undefined && value[key] !== value) {
        const text = extractResponseText(value[key], depth + 1);
        if (text) return text;
      }
    }
  }
  return "";
}

function extractJsonObject(raw) {
  const cleaned = String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/\x60{3}\s*(?:json)?/gi, "")
    .replace(/\x60{3}/g, "")
    .replace(/[“”]/g, '"')
    .trim();
  const candidates = [cleaned];

  // Find balanced JSON objects even when the model adds prose around them.
  for (let start = cleaned.indexOf("{"); start >= 0; start = cleaned.indexOf("{", start + 1)) {
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char.charCodeAt(0) === 92) escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) { candidates.push(cleaned.slice(start, i + 1)); break; }
      }
    }
  }

  for (const candidate of candidates) {
    const noTrailingCommas = candidate.replace(/,\s*([}\]])/g, "$1");
    const singleQuotes = noTrailingCommas.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, value) =>
      '"' + value.replace(/"/g, '\\"') + '"'
    );
    const variants = [
      candidate,
      noTrailingCommas,
      noTrailingCommas.replace(/([{,]\s*)([A-Za-z][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3'),
      singleQuotes,
      singleQuotes.replace(/([{,]\s*)([A-Za-z][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    ];
    for (const variant of variants) {
      try {
        const parsed = JSON.parse(variant);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      } catch {}
    }
  }
  return null;
}

function normalizeKeywordList(value) {
  const rows = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\r\n,，、;；|]+/)
      : value && typeof value === "object"
        ? Object.values(value)
        : [];
  return [...new Set(rows.map((entry) => {
    const text = entry && typeof entry === "object"
      ? entry.keyword || entry.text || entry.value || ""
      : entry;
    return String(text || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/[“”"'\x60{}\[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80)
      .replace(/[<>]/g, "");
  }))]
    .filter((entry) => entry && /[\u3400-\u9fff]/.test(entry))
    .slice(0, 4);
}

function recoverKeywordsFromText(raw) {
  const text = String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/\x60{3}\s*(?:json)?/gi, "")
    .replace(/\x60{3}/g, "")
    .replace(/[“”]/g, '"')
    .replace(/\r/g, "\n");
  const candidates = text.split(/[\n,，、。；;|/]+|\s+/);
  const recovered = [];
  for (let candidate of candidates) {
    candidate = candidate.replace(/^[\s"'\x60{}\[\]:：=]+|[\s"'\x60{}\[\]:：=]+$/g, "");
    candidate = candidate
      .replace(/^(?:根据图片(?:分析)?|从图片(?:中)?(?:看)?|图片(?:中|里)?(?:展示|显示)?|这是一双|这是一款|这是一件|这是一条|这是|看起来像|建议(?:搜索)?关键词|推荐关键词|我认为|可能是|关键词(?:是|为)?|搜索词(?:是|为)?|产品(?:是|为)?|商品(?:是|为)?)[\s:：，,]*/u, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!candidate) continue;
    if (/(?:无法|不能按|抱歉|JSON格式|JSON\s*输出|格式错误|无法解析)/i.test(candidate)) continue;
    if (!/[\u3400-\u9fff]/.test(candidate)) continue;
    candidate = candidate.slice(0, 32);
    if (/^(?:的|和|以及|这个|那个|图片|产品|商品|看起来|用于|适合|分析结果|以上是分析结果|搜索关键词|关键词)$/u.test(candidate)) continue;
    recovered.push(candidate);
  }
  return normalizeKeywordList(recovered);
}

function fallbackMarketplaceKeywords(title, category) {
  const text = String(category || "") + " " + String(title || "");
  const value = text.toLowerCase();
  if (/crocodile|cá sấu|鳄鱼/.test(value)) {
    if (/belt|thắt lưng|皮带/.test(value)) return ["鳄鱼纹皮带", "压纹皮带"];
    if (/wallet|ví da|ví tiền|钱包/.test(value)) return ["鳄鱼纹钱包", "压纹钱包"];
    if (/case|ốp điện thoại|手机壳/.test(value)) return ["鳄鱼纹手机壳", "压纹手机壳"];
    return ["鳄鱼纹皮鞋", "压纹皮鞋"];
  }
  if (/sneaker|运动鞋|giày thể thao/.test(value)) return ["男士运动鞋", "休闲运动鞋"];
  if (/loafer|giày lười|乐福鞋/.test(value)) return ["男士乐福鞋", "休闲皮鞋"];
  if (/dress-shoes|oxford|derby|giày tây|皮鞋/.test(value)) return ["男士皮鞋", "商务皮鞋"];
  if (/belt|thắt lưng|皮带/.test(value)) return ["男士皮带", "真皮腰带"];
  if (/wallet|ví da|ví tiền|钱包/.test(value)) return ["男士钱包", "皮夹"];
  if (/sandals|sandal|dép|凉鞋/.test(value)) return ["男士凉鞋", "休闲凉鞋"];
  if (/watch-straps|dây đồng hồ|表带/.test(value)) return ["皮质表带", "手表表带"];
  if (/phone-cases|ốp điện thoại|手机壳/.test(value)) return ["手机壳", "保护套"];
  return ["男士鞋子", "休闲皮鞋"];
}

function parseJson(raw, fallbackMessage) {
  return extractJsonObject(raw) || { error: fallbackMessage };
}

export async function analyzeProductImage({ ai, imageBase64, mimeType = "image/webp", title = "", category = "", sku = "" }) {
  const parsedImage = parseImage(imageBase64, mimeType);
  if (!parsedImage) return { error: "Ảnh không hợp lệ hoặc vượt giới hạn 5 MB.", status: 400 };
  const prompt = [
    "Bạn là trợ lý kiểm duyệt ảnh sản phẩm giày và phụ kiện cho cửa hàng.",
    "Phân tích ảnh đính kèm, chỉ nêu bằng chứng nhìn thấy; không khẳng định da cá sấu thật từ ảnh.",
    "Phân biệt da thật chưa xác minh với giả da, PU, vân dập hoặc vật liệu tổng hợp.",
    "Không tự đặt phần trăm tương đồng ảnh. Không xem ảnh là đạt ngưỡng 90% nếu không có điểm số từ bộ so khớp ảnh đáng tin cậy.",
    "Phân biệt ảnh trùng/gần trùng, cùng mẫu ở góc khác, có khả năng là mẫu khác, hoặc không đủ chắc chắn.",
    "Trả về JSON thuần theo schema: {summary:string, visibleFeatures:string[], modelAssessment:'same_model_possible'|'different_model_possible'|'different_angle_possible'|'uncertain', materialAssessment:'possible_synthetic'|'crocodile_claim_unverified'|'no_visible_evidence'|'uncertain', confidence:'low'|'medium'|'high', reasons:string[], needsHumanReview:boolean}.",
    "Nếu thiếu bằng chứng, chọn confidence low hoặc medium và needsHumanReview true. Không đề xuất tự động xóa ảnh.",
    `Thông tin sản phẩm: SKU ${String(sku).slice(0,60)}, tên ${String(title).slice(0,180)}, danh mục ${String(category).slice(0,80)}.`
  ].join("\n");
  const response = await runVision(ai, prompt, parsedImage.image);
  if (response.error) return response;
  const data = parseJson(response.raw, "Workers AI trả về kết quả không đúng định dạng JSON.");
  if (data.error) return { error: data.error, status: 502 };
  const enums = {
    modelAssessment: ["same_model_possible", "different_model_possible", "different_angle_possible", "uncertain"],
    materialAssessment: ["possible_synthetic", "crocodile_claim_unverified", "no_visible_evidence", "uncertain"],
    confidence: ["low", "medium", "high"]
  };
  for (const [key, allowed] of Object.entries(enums)) if (!allowed.includes(data[key])) data[key] = key === "confidence" ? "low" : "uncertain";
  return { analysis: {
    summary: String(data.summary || "Chưa có mô tả").slice(0, 800),
    visibleFeatures: Array.isArray(data.visibleFeatures) ? data.visibleFeatures.slice(0, 12).map(x => String(x).slice(0, 160)) : [],
    modelAssessment: data.modelAssessment,
    materialAssessment: data.materialAssessment,
    confidence: data.confidence,
    reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 12).map(x => String(x).slice(0, 200)) : [],
    needsHumanReview: data.needsHumanReview !== false
  }};
}

export async function suggestMarketplaceImageKeywords({ ai, imageBase64, mimeType = "image/jpeg", title = "", category = "" }) {
  const parsedImage = parseImage(imageBase64, mimeType);
  if (!parsedImage) return { error: "Ảnh tham chiếu không hợp lệ để phân tích từ khóa.", status: 400 };
  const prompt = [
    "Phân tích ảnh sản phẩm để hỗ trợ tìm nguồn hàng trên Taobao hoặc 1688.",
    "Chỉ mô tả những gì nhìn thấy. Không đoán thương hiệu, mã sản phẩm, cửa hàng, URL hay giá.",
    "Tạo 2 đến 4 từ khóa tiếng Trung giản thể NGẮN, mỗi từ khóa là một cụm tìm kiếm thực tế trên sàn thương mại điện tử; chỉ mô tả đúng loại sản phẩm, kiểu dáng, màu sắc và chi tiết nhìn thấy.",
    "Không thêm lời dẫn, không giải thích, không Markdown, không dùng dấu ``` và không đặt JSON trong câu văn.",
    "Nếu tiêu đề nói đến da cá sấu, phân biệt 鳄鱼皮 (da cá sấu) với 鳄鱼纹/压纹/PU (vân giả); không khẳng định vật liệu thật từ ảnh.",
    'Chỉ trả về MỘT đối tượng JSON hợp lệ, đúng cú pháp, không có dấu phẩy cuối, theo schema: {"keywords":["中文关键词1","中文关键词2"],"visualSummary":"简短描述"}.',
    "Tự kiểm tra JSON có thể được JSON.parse phân tích và mọi giá trị keywords đều là chuỗi.",
    "Tiêu đề hiện có: " + String(title || "không có").slice(0, 180),
    "Danh mục: " + String(category || "không có").slice(0, 80)
  ].join("\n");
  const response = await runVision(ai, prompt, parsedImage.image);
  if (response.error) return response;
  const data = parseJson(response.raw, "Workers AI trả về từ khóa sai định dạng JSON.");
  const keywordValue = data.error
    ? null
    : data.keywords ?? data.searchKeywords ?? data.search_keywords ?? data.keywords_zh ?? data.data?.keywords;
  let keywords = normalizeKeywordList(keywordValue);
  if (!keywords.length) keywords = recoverKeywordsFromText(response.raw);
  if (keywords.length < 2) {
    for (const fallback of fallbackMarketplaceKeywords(title, category)) {
      if (!keywords.includes(fallback)) keywords.push(fallback);
      if (keywords.length >= 2) break;
    }
  }
  keywords = [...new Set(keywords)].slice(0, 4);
  if (!keywords.length) return { error: "Không thể tạo từ khóa tìm nguồn hàng từ ảnh này. Hãy thử ảnh rõ hơn hoặc chọn lại sản phẩm.", status: 502 };
  const visualSummary = String(data.visualSummary || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  return { keywords, visualSummary };
}
