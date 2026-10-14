export const WORKERS_AI_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;
const ALLOWED_MIME_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

function normalizeMimeType(value) {
  const mime = String(value || "").toLowerCase();
  return mime === "image/jpg" ? "image/jpeg" : mime;
}

function decodeImage(imageBase64, mimeType) {
  const mime = normalizeMimeType(mimeType);
  const base64 = String(imageBase64 || "").replace(/^data:image\/(?:webp|jpeg|jpg|png);base64,/i, "");
  if (!ALLOWED_MIME_TYPES.has(mime) || !base64 || base64.length > MAX_IMAGE_BASE64_LENGTH ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 === 1) {
    return { error: "Ảnh không hợp lệ hoặc vượt giới hạn 5 MB.", status: 400 };
  }
  let bytes;
  try {
    const binary = atob(base64);
    if (!binary.length || binary.length > 5 * 1024 * 1024) return { error: "Ảnh phải nhỏ hơn hoặc bằng 5 MB.", status: 413 };
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch {
    return { error: "Không giải mã được dữ liệu ảnh.", status: 400 };
  }
  return { bytes, mimeType: mime, base64 };
}

function getAiErrorMessage(error) {
  const values = [error?.message, error?.cause?.message, error?.error?.message, error?.error, error?.cause];
  return values.filter(value => typeof value === "string" || typeof value === "number")
    .map(value => String(value)).filter(Boolean).join(" | ").slice(0, 2000);
}

function sanitizeAiErrorMessage(value) {
  return String(value || "")
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi, "[image-data-redacted]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/(?:api[_-]?key|token|secret|password)(\s*[=:]\s*)[^\s,;]+/gi, "$1[redacted]")
    .replace(/[A-Za-z0-9+/]{160,}={0,2}/g, "[long-data-redacted]")
    .slice(0, 600);
}

function classifyAiError(error) {
  const message = getAiErrorMessage(error);
  if (/429|quota|rate.?limit|too many requests/i.test(message)) return { error: "Workers AI đã trả về giới hạn sử dụng hoặc quota. Không tự động thử lại; hãy kiểm tra Usage/Workers AI trong Cloudflare.", status: 429, code: "WORKERS_AI_QUOTA" };
  if (/license|acceptable use|must agree|agreement|prompt.*agree/i.test(message)) return { error: "Mô hình thị giác yêu cầu chấp thuận điều khoản sử dụng trước lần chạy đầu. Hãy kiểm tra và chấp thuận giấy phép mô hình trong Cloudflare Workers AI rồi thử lại thủ công.", status: 503, code: "WORKERS_AI_LICENSE_REQUIRED" };
  if (/binding|not configured|undefined.*run|not a function/i.test(message)) return { error: "Chưa cấu hình binding Workers AI có tên AI cho Cloudflare Pages/Workers.", status: 503, code: "WORKERS_AI_BINDING_MISSING" };
  if (/401|403|unauthorized|forbidden|permission denied/i.test(message)) return { error: "Cloudflare từ chối quyền gọi Workers AI. Kiểm tra quyền tài khoản, model access và binding AI.", status: 502, code: "WORKERS_AI_ACCESS_DENIED" };
  return { error: "Workers AI không hoàn thành yêu cầu phân tích. Kiểm tra trạng thái model và log của Cloudflare; hệ thống không tự gọi lại.", status: 502, code: "WORKERS_AI_REQUEST_FAILED" };
}

export async function runWorkersAiVision({ ai, prompt, imageBase64, mimeType = "image/webp", maxTokens = 768 }) {
  if (!ai || typeof ai.run !== "function") return { error: "Chưa cấu hình binding Workers AI có tên AI cho Cloudflare Pages/Workers.", status: 503, code: "WORKERS_AI_BINDING_MISSING" };
  const image = decodeImage(imageBase64, mimeType);
  if (image.error) return image;
  try {
    const result = await ai.run(WORKERS_AI_VISION_MODEL, {
      prompt: String(prompt || "").slice(0, 12000),
      image: `data:${image.mimeType};base64,${image.base64}`,
      max_tokens: Math.max(64, Math.min(1024, Number(maxTokens) || 768)),
      temperature: 0.1
    });
    // Safe diagnostics: log response shape only, never prompts, image bytes, or field contents.
    const diagnostic = {
      event: "workers_ai_vision_result",
      model: WORKERS_AI_VISION_MODEL,
      resultType: typeof result,
      resultIsArray: Array.isArray(result),
      resultKeys: result && typeof result === "object" ? Object.keys(result).slice(0, 30) : [],
      resultStringLength: typeof result === "string" ? result.length : null,
      responseType: typeof result?.response,
      responseLength: typeof result?.response === "string" ? result.response.length : null,
      responseKeys: result?.response && typeof result.response === "object" ? Object.keys(result.response).slice(0, 20) : [],
      responseNestedTextLength: typeof result?.response?.response === "string" ? result.response.response.length : null,
      responseTextLength: typeof result?.response?.text === "string" ? result.response.text.length : null,
      responseOutputTextLength: typeof result?.response?.output_text === "string" ? result.response.output_text.length : null,
      responsePreview: typeof result?.response === "string" && result.response.trim() ? sanitizeAiErrorMessage(result.response).slice(0, 180) : null,
      resultFieldType: typeof result?.result,
      resultFieldLength: typeof result?.result === "string" ? result.result.length : null,
      nestedResultKeys: result?.result && typeof result.result === "object" ? Object.keys(result.result).slice(0, 30) : [],
      nestedResponseType: typeof result?.result?.response,
      nestedResponseLength: typeof result?.result?.response === "string" ? result.result.response.length : null
    };
    console.info("[Workers AI diagnostic]", JSON.stringify(diagnostic));
    const candidates = [
      typeof result === "string" ? result : null,
      result?.response,
      result?.response?.response,
      result?.response?.result,
      result?.response?.text,
      result?.response?.output_text,
      result?.result,
      result?.result?.response,
      result?.result?.result,
      result?.result?.text,
      result?.output_text,
      result?.text
    ];
    const text = candidates.find(value => typeof value === "string" && value.trim())?.trim() || "";
    if (!text) return { error: "Workers AI đã phản hồi nhưng không có nội dung phân tích ảnh. Hãy kiểm tra model output trong Cloudflare; không tự động gọi lại.", status: 502, code: "WORKERS_AI_EMPTY_RESPONSE" };
    return { text, model: WORKERS_AI_VISION_MODEL };
  } catch (error) {
    const classified = classifyAiError(error);
    console.warn("[Workers AI diagnostic]", JSON.stringify({
      event: "workers_ai_vision_error",
      model: WORKERS_AI_VISION_MODEL,
      errorName: String(error?.name || "Error").slice(0, 80),
      errorCode: classified.code,
      errorStatus: classified.status,
      providerMessage: sanitizeAiErrorMessage(getAiErrorMessage(error))
    }));
    return classified;
  }
}

export function parseModelJson(rawText) {
  const text = String(rawText || "").trim().replace(/^\uFEFF/, "").replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}\s*$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

export async function analyzeProductImage({ ai, imageBase64, mimeType = "image/webp", title = "", category = "", sku = "" }) {
  const prompt = [
    "Bạn là chuyên gia kiểm tra ảnh sản phẩm giày và phụ kiện cho quản trị viên cửa hàng.",
    "Mục tiêu: tạo bản ghi kiểm tra hữu ích, cụ thể, dễ đối chiếu bằng mắt. Chỉ dùng chi tiết thực sự nhìn thấy trong ảnh; tên/SKU/danh mục chỉ là metadata, không phải bằng chứng thị giác.",
    "summary phải mô tả trực tiếp vật thể nhìn thấy trong ảnh bằng tiếng Việt, không lặp nguyên tên sản phẩm và không viết câu chung kiểu 'có thể là một sản phẩm thuộc danh mục...'. Nêu loại giày, màu sắc, dáng mũi, kiểu cổ/đế và đặc điểm bề mặt chỉ khi nhìn rõ.",
    "visibleFeatures phải có 3-6 quan sát ngắn, cụ thể, độc lập, ví dụ màu, hình dáng mũi, kiểu dây/khóa, cấu trúc đế, kiểu vân bề mặt. Không dùng ví dụ nếu không thấy trong ảnh. Nếu ảnh mờ hoặc chỉ thấy một phần, ghi rõ điều đó thay vì suy đoán.",
    "reasons phải có 2-5 lý do cụ thể nối trực tiếp tới quan sát trên ảnh. Không dùng lý do rỗng như 'dựa trên hình ảnh', 'cần kiểm tra thêm' hoặc lặp lại nhãn kết luận. Nếu không đủ chi tiết để biện minh, chọn modelAssessment='uncertain' và confidence='low'.",
    "modelAssessment mô tả mức độ có thể đối chiếu hình dạng/model từ một ảnh đơn: same_model_possible chỉ khi có ít nhất hai chi tiết tạo hình nhìn rõ; different_model_possible chỉ khi thấy khác biệt rõ; different_angle_possible chỉ khi thật sự có bằng chứng về góc chụp khác nhau; nếu không thì uncertain. Đây không phải điểm tương đồng được đo bằng thuật toán.",
    "Với một ảnh đơn, không thể xác minh nó trùng với ảnh sản phẩm khác nếu không có ảnh đối chiếu. Đừng tuyên bố đã so khớp với ảnh tồn kho hay tìm thấy sản phẩm nguồn.",
    "materialAssessment: possible_synthetic chỉ khi thấy dấu hiệu trực quan cụ thể của vật liệu tổng hợp; crocodile_claim_unverified khi có vân giống cá sấu nhưng không thể xác nhận chất liệu thật; no_visible_evidence khi không thấy dấu hiệu liên quan; uncertain khi ảnh không đủ rõ. Không khẳng định da cá sấu thật chỉ dựa trên ảnh.",
    "Return exactly one valid JSON object and nothing else. No Markdown fences, no preamble, no explanation, and no text after the JSON.",
    'Required JSON schema: {"summary":"short concrete Vietnamese description","visibleFeatures":["specific visible observation"],"modelAssessment":"same_model_possible|different_model_possible|different_angle_possible|uncertain","materialAssessment":"possible_synthetic|crocodile_claim_unverified|no_visible_evidence|uncertain","confidence":"low|medium|high","reasons":["specific reason grounded in visible detail"],"needsHumanReview":true}.',
    "All fields are required and must have correct types. visibleFeatures: 3-6 strings. reasons: 2-5 strings. summary must describe visible form/features, not repeat product title. confidence='high' is forbidden for material authenticity and image identity from one image. Set needsHumanReview=true whenever material authenticity or model identity cannot be verified.",
    "Metadata for context only (do not treat as visual evidence): SKU " + String(sku).slice(0, 60) + "; tên " + String(title).slice(0, 180) + "; danh mục " + String(category).slice(0, 80) + "."
  ].join("\n");
  const output = await runWorkersAiVision({ ai, prompt, imageBase64, mimeType, maxTokens: 768 });
  if (output.error) return output;
  const parsed = parseModelJson(output.text);
  if (!parsed) return { error: "Workers AI trả về nội dung nhưng không phải JSON hợp lệ. Không lưu kết quả chưa kiểm tra.", status: 502, code: "WORKERS_AI_INVALID_JSON" };
  const allowed = {
    modelAssessment: ["same_model_possible", "different_model_possible", "different_angle_possible", "uncertain"],
    materialAssessment: ["possible_synthetic", "crocodile_claim_unverified", "no_visible_evidence", "uncertain"],
    confidence: ["low", "medium", "high"]
  };
  const validSchema = typeof parsed.summary === "string" && parsed.summary.trim().length > 0 &&
    Array.isArray(parsed.visibleFeatures) && parsed.visibleFeatures.every(value => typeof value === "string") &&
    Array.isArray(parsed.reasons) && parsed.reasons.every(value => typeof value === "string") &&
    typeof parsed.needsHumanReview === "boolean" &&
    Object.entries(allowed).every(([key, values]) => values.includes(parsed[key]));
  if (!validSchema) return { error: "Workers AI trả về JSON nhưng sai cấu trúc hoặc thiếu trường bắt buộc. Không lưu kết quả chưa kiểm tra.", status: 502, code: "WORKERS_AI_INVALID_SCHEMA" };
  return { analysis: {
    summary: String(parsed.summary || "Chưa có mô tả").slice(0, 800),
    visibleFeatures: Array.isArray(parsed.visibleFeatures) ? parsed.visibleFeatures.slice(0, 12).map(x => String(x).slice(0, 160)) : [],
    modelAssessment: parsed.modelAssessment, materialAssessment: parsed.materialAssessment, confidence: parsed.confidence,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 12).map(x => String(x).slice(0, 200)) : [],
    needsHumanReview: parsed.needsHumanReview !== false, provider: "Cloudflare Workers AI", model: output.model
  } };
}

function normalizeKeywordValues(parsed) {
  const candidates = [
    parsed?.keywords, parsed?.searchKeywords, parsed?.search_keywords,
    parsed?.keywordList, parsed?.keyword_list, parsed?.queries, parsed?.data?.keywords,
    parsed?.result?.keywords, parsed?.keyword
  ];
  const source = candidates.find(value => Array.isArray(value) || typeof value === "string");
  if (Array.isArray(source)) return source;
  if (typeof source === "string") return source.split(/[\n\r,，、;；|]+/);
  return [];
}

export async function generateSearchKeywords({ ai, imageBase64, mimeType = "image/webp", title = "", platform = "1688" }) {
  const site = platform === "taobao" ? "Taobao" : "1688";
  const prompt = [
    "你是商品图片搜索关键词生成器。只根据图片中可见的商品类型、外形、颜色和细节生成关键词。",
    "生成最多4个简体中文短语，每个短语适合在" + site + "搜索。不要声称已找到商品、价格或商品链接。",
    "如果无法确认真鳄鱼皮，请区分鳄鱼皮、鳄鱼纹/压纹、PU/合成革，不要把纹路当成真皮证据。",
    "现有商品标题（仅供参考）：" + String(title || "无").slice(0, 180) + "。",
    "Return exactly one valid JSON object and nothing else. Do not use Markdown fences, explanations, headings, or prose before/after the JSON.",
    "The JSON must have exactly these fields: keywords (an array of 1 to 4 short Simplified Chinese search phrases) and visualSummary (a short visible-feature summary of at most 100 Chinese characters).",
    'Example shape only: {"keywords":["棕色男士皮鞋","鳄鱼纹压花皮鞋"],"visualSummary":"棕色皮鞋，圆头，压纹鞋面"}. Never copy the example unless those details are actually visible in the provided image.'
  ].join("\n");
  const output = await runWorkersAiVision({ ai, prompt, imageBase64, mimeType, maxTokens: 384 });
  if (output.error) return output;
  let parsed = parseModelJson(output.text);
  if (!parsed) {
    const cleaned = String(output.text || "").trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}\s*$/, "").trim();
    try {
      const array = JSON.parse(cleaned);
      if (Array.isArray(array)) parsed = { keywords: array };
    } catch {}
  }
  if (!parsed) return { error: "Workers AI không trả về JSON hợp lệ cho từ khóa tìm kiếm. Không tạo kết quả giả.", status: 502, code: "WORKERS_AI_INVALID_KEYWORDS" };
  const keywords = [...new Set(normalizeKeywordValues(parsed)
    .filter(value => typeof value === "string" || typeof value === "number")
    .map(value => String(value || "").replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80))
    .filter(value => value && !/^(?:关键词|keywords?|搜索词)\s*[:：]?$/i.test(value)))].slice(0, 4);
  if (!keywords.length) return { error: "Workers AI trả về JSON nhưng danh sách từ khóa rỗng hoặc sai định dạng.", status: 502, code: "WORKERS_AI_EMPTY_KEYWORDS" };
  const summary = parsed.visualSummary ?? parsed.visual_summary ?? parsed.summary ?? "";
  return { keywords, visualSummary: String(summary || "").slice(0, 300), model: output.model };
}

// Cloudflare Workers AI exposes vision-understanding models, but this project has not
// verified a dedicated image-matching/embedding model or a calibrated 90% threshold.
// Fail closed rather than treating an LLM's guessed percentage as an actual match.
export function compareProductImages() {
  return { available: false, similarityScore: null, comparisonMethod: null, eligible: false,
    reason: "Chưa có mô hình so khớp thị giác chuyên biệt đã được kiểm chứng và hiệu chuẩn. Không thể xác nhận ngưỡng 90%." };
}
