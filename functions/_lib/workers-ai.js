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
      temperature: 0.1,
      // Both current AI tasks require machine-readable JSON; use the provider's JSON mode
      // instead of relying only on prompt instructions.
      response_format: { type: "json_object" }
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
    const candidates = [
      { field: "result", value: typeof result === "string" ? result : null },
      { field: "response", value: result?.response },
      { field: "response.response", value: result?.response?.response },
      { field: "response.result", value: result?.response?.result },
      { field: "response.text", value: result?.response?.text },
      { field: "response.output_text", value: result?.response?.output_text },
      { field: "result", value: result?.result },
      { field: "result.response", value: result?.result?.response },
      { field: "result.result", value: result?.result?.result },
      { field: "result.text", value: result?.result?.text },
      { field: "output_text", value: result?.output_text },
      { field: "text", value: result?.text },
      // JSON mode may return the generated object directly instead of a string.
      { field: "response (JSON object)", value: result?.response && typeof result.response === "object" && !Array.isArray(result.response) && !("text" in result.response) && !("output_text" in result.response) && !("response" in result.response) ? JSON.stringify(result.response) : null },
      { field: "response.response (JSON object)", value: result?.response?.response && typeof result.response.response === "object" && !Array.isArray(result.response.response) ? JSON.stringify(result.response.response) : null },
      { field: "result (JSON object)", value: result?.result && typeof result.result === "object" && !Array.isArray(result.result) && !("response" in result.result) && !("text" in result.result) && !("output_text" in result.result) ? JSON.stringify(result.result) : null }
    ];
    const selected = candidates.find(candidate => typeof candidate.value === "string" && candidate.value.trim());
    const text = selected?.value.trim() || "";
    diagnostic.selectedTextField = selected?.field || null;
    diagnostic.selectedTextLength = text ? text.length : 0;
    diagnostic.selectedTextPreview = text ? sanitizeAiErrorMessage(text).slice(0, 240) : null;
    console.info("[Workers AI diagnostic]", JSON.stringify(diagnostic));
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
  const text = String(rawText || "").trim().replace(/^\\uFEFF/, "").replace(/^\\x60{3}(?:json)?\\s*/i, "").replace(/\\s*\\x60{3}\\s*$/, "").trim();
  if (!text) return null;

  // Some provider envelopes serialize the generated JSON object as a JSON string.
  // Decode that wrapper once, then parse the contained object without another AI call.
  try {
    const whole = JSON.parse(text);
    if (whole && typeof whole === "object" && !Array.isArray(whole)) return whole;
    if (typeof whole === "string" && whole.trim() && whole.trim() !== text) {
      const nested = parseModelJson(whole);
      if (nested) return nested;
    }
  } catch {}

  // Some model outputs escape all quotes in the JSON payload. Normalize this
  // representation only as a secondary attempt; the result still must pass JSON.parse.
  if (text.includes("\\\\"") && text.includes("{")) {
    const unescaped = text.replace(/\\\\(["\\\\/bfnrt])/g, (_, ch) => {
      const escapes = { '"': '"', "\\\\": "\\\\", "/": "/", b: "\\b", f: "\\f", n: "\\n", r: "\\r", t: "\\t" };
      return escapes[ch] ?? ch;
    });
    if (unescaped !== text) {
      const nested = parseModelJson(unescaped);
      if (nested) return nested;
    }
  }

  // Tolerate harmless prose/fences around a JSON object. Balance braces while
  // respecting quoted strings and escapes so embedded braces do not truncate it.
  for (let start = text.indexOf("{"); start >= 0; start = text.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(text.slice(start, i + 1));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
          } catch {}
          break;
        }
      }
    }
  }
  return null;
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
  if (!parsed) {
    const invalidJsonDiagnostic = {
      event: "workers_ai_invalid_json",
      model: output.model,
      responseLength: output.text.length,
      responsePreview: sanitizeAiErrorMessage(output.text).slice(0, 240),
      hasOpeningBrace: output.text.includes("{"),
      hasClosingBrace: output.text.includes("}"),
      startsWithMarkdownFence: output.text.trimStart().startsWith("\x60\x60\x60")
    };
    console.warn("[Workers AI diagnostic]", JSON.stringify(invalidJsonDiagnostic));
    // Expose only sanitized diagnostics, never the raw model response or image data.
    return {
      error: "Workers AI trả về nội dung nhưng không phải JSON hợp lệ. Không lưu kết quả chưa kiểm tra.",
      status: 502,
      code: "WORKERS_AI_INVALID_JSON",
      diagnostic: {
        responseLength: invalidJsonDiagnostic.responseLength,
        responsePreview: invalidJsonDiagnostic.responsePreview,
        hasOpeningBrace: invalidJsonDiagnostic.hasOpeningBrace,
        hasClosingBrace: invalidJsonDiagnostic.hasClosingBrace,
        startsWithMarkdownFence: invalidJsonDiagnostic.startsWithMarkdownFence
      }
    };
  }
  const allowed = {
    modelAssessment: ["same_model_possible", "different_model_possible", "different_angle_possible", "uncertain"],
    materialAssessment: ["possible_synthetic", "crocodile_claim_unverified", "no_visible_evidence", "uncertain"],
    confidence: ["low", "medium", "high"]
  };
  const validSummary = typeof parsed.summary === "string" &&
    parsed.summary.trim().length >= 20 &&
    !/có thể là một sản phẩm thuộc danh mục|dựa trên hình ảnh|chưa có mô tả/i.test(parsed.summary);
  const validFeatures = Array.isArray(parsed.visibleFeatures) &&
    parsed.visibleFeatures.length >= 3 && parsed.visibleFeatures.length <= 6 &&
    parsed.visibleFeatures.every(value => typeof value === "string" && value.trim().length >= 3);
  const validReasons = Array.isArray(parsed.reasons) &&
    parsed.reasons.length >= 2 && parsed.reasons.length <= 5 &&
    parsed.reasons.every(value => typeof value === "string" && value.trim().length >= 8 &&
      !/lý do không rõ ràng|dựa trên hình ảnh|cần kiểm tra thêm/i.test(value));
  const schemaIssues = [];
  if (typeof parsed.summary !== "string") schemaIssues.push("summary_not_string");
  else {
    if (parsed.summary.trim().length < 20) schemaIssues.push("summary_too_short");
    if (/có thể là một sản phẩm thuộc danh mục|dựa trên hình ảnh|chưa có mô tả/i.test(parsed.summary)) schemaIssues.push("summary_too_generic");
  }
  if (!Array.isArray(parsed.visibleFeatures)) schemaIssues.push("visibleFeatures_not_array");
  else {
    if (parsed.visibleFeatures.length < 3) schemaIssues.push("visibleFeatures_too_few");
    if (parsed.visibleFeatures.length > 6) schemaIssues.push("visibleFeatures_too_many");
    if (!parsed.visibleFeatures.every(value => typeof value === "string" && value.trim().length >= 3)) schemaIssues.push("visibleFeatures_invalid_items");
  }
  if (!Array.isArray(parsed.reasons)) schemaIssues.push("reasons_not_array");
  else {
    if (parsed.reasons.length < 2) schemaIssues.push("reasons_too_few");
    if (parsed.reasons.length > 5) schemaIssues.push("reasons_too_many");
    if (!parsed.reasons.every(value => typeof value === "string" && value.trim().length >= 8 &&
      !/lý do không rõ ràng|dựa trên hình ảnh|cần kiểm tra thêm/i.test(value))) schemaIssues.push("reasons_invalid_items");
  }
  for (const [key, values] of Object.entries(allowed)) {
    if (!values.includes(parsed[key])) schemaIssues.push(key + "_invalid");
  }
  if (typeof parsed.needsHumanReview !== "boolean") schemaIssues.push("needsHumanReview_not_boolean");

  const schemaDiagnostic = {
    event: "workers_ai_invalid_schema",
    model: output.model,
    issues: schemaIssues,
    summary: {
      type: typeof parsed.summary,
      length: typeof parsed.summary === "string" ? parsed.summary.trim().length : null,
      generic: typeof parsed.summary === "string" && /có thể là một sản phẩm thuộc danh mục|dựa trên hình ảnh|chưa có mô tả/i.test(parsed.summary)
    },
    visibleFeatures: {
      type: Array.isArray(parsed.visibleFeatures) ? "array" : typeof parsed.visibleFeatures,
      count: Array.isArray(parsed.visibleFeatures) ? parsed.visibleFeatures.length : null,
      invalidItemCount: Array.isArray(parsed.visibleFeatures)
        ? parsed.visibleFeatures.filter(value => typeof value !== "string" || value.trim().length < 3).length : null
    },
    reasons: {
      type: Array.isArray(parsed.reasons) ? "array" : typeof parsed.reasons,
      count: Array.isArray(parsed.reasons) ? parsed.reasons.length : null,
      invalidItemCount: Array.isArray(parsed.reasons)
        ? parsed.reasons.filter(value => typeof value !== "string" || value.trim().length < 8 ||
          /lý do không rõ ràng|dựa trên hình ảnh|cần kiểm tra thêm/i.test(value)).length : null
    },
    enumValidity: Object.fromEntries(Object.entries(allowed).map(([key, values]) => [key, values.includes(parsed[key])])),
    needsHumanReviewType: typeof parsed.needsHumanReview
  };
  if (schemaIssues.length) {
    const issueMessages = {
      summary_not_string: "summary không phải chuỗi",
      summary_too_short: "summary quá ngắn",
      summary_too_generic: "summary quá chung chung",
      visibleFeatures_not_array: "visibleFeatures không phải danh sách",
      visibleFeatures_too_few: "visibleFeatures có dưới 3 quan sát",
      visibleFeatures_too_many: "visibleFeatures vượt quá 6 quan sát",
      visibleFeatures_invalid_items: "visibleFeatures có mục rỗng hoặc sai kiểu",
      reasons_not_array: "reasons không phải danh sách",
      reasons_too_few: "reasons có dưới 2 lý do",
      reasons_too_many: "reasons vượt quá 5 lý do",
      reasons_invalid_items: "reasons có lý do quá ngắn hoặc chung chung",
      modelAssessment_invalid: "modelAssessment không thuộc giá trị cho phép",
      materialAssessment_invalid: "materialAssessment không thuộc giá trị cho phép",
      confidence_invalid: "confidence không thuộc giá trị cho phép",
      needsHumanReview_not_boolean: "needsHumanReview không phải true/false"
    };
    console.warn("[Workers AI diagnostic]", JSON.stringify(schemaDiagnostic));
    const details = schemaIssues.map(issue => issueMessages[issue] || "cấu trúc không hợp lệ");
    return {
      error: "Workers AI trả về JSON nhưng không đạt kiểm tra: " + details.join("; ") + ". Không lưu kết quả chưa kiểm tra.",
      status: 502,
      code: "WORKERS_AI_INVALID_SCHEMA",
      diagnostic: schemaDiagnostic
    };
  }
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
