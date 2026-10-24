const MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const META_PREFIX = "[[AI_IDENTITY_V1]]";

const DESCRIPTOR_FIELDS = [
  "product_type", "dominant_colors", "visible_material", "texture_pattern",
  "silhouette", "toe_or_edge_shape", "sole_or_edge_profile", "stitching",
  "logo_placement", "hardware_or_closure", "distinctive_details", "visible_uncertainty"
];

export function normalizeIdentityDescriptor(value) {
  let text = "";
  if (typeof value === "string") {
    text = value;
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    text = DESCRIPTOR_FIELDS
      .filter(key => value[key] !== undefined && value[key] !== null && String(value[key]).trim())
      .map(key => key + "=" + String(value[key]))
      .join("; ");
  }
  return String(text || "")
    .replace(/\s*[|｜]\s*/g, "; ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 1100);
}

export function isIdentityDescriptorValid(value) {
  const text = normalizeIdentityDescriptor(value);
  const fields = text.split(/[;|]/).map(part => part.trim()).filter(Boolean);
  return text.length >= 48 && fields.length >= 5 &&
    !/^(?:unknown|unclear|not visible|không rõ|khong ro)$/i.test(text);
}

export function stripAIIdentityRationale(rationale) {
  const text = String(rationale || "");
  if (!text.startsWith(META_PREFIX)) return text.trim();
  const newline = text.indexOf("\n");
  return newline < 0 ? "" : text.slice(newline + 1).trim();
}

export function parseAIIdentityRationale(rationale) {
  const text = String(rationale || "");
  if (!text.startsWith(META_PREFIX)) return null;
  const newline = text.indexOf("\n");
  if (newline < 0) return null;
  try {
    const value = JSON.parse(text.slice(META_PREFIX.length, newline));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const status = ["verified", "review_required", "unverified"].includes(value.status) ? value.status : "unverified";
    let confidence = value.confidence === null || value.confidence === undefined ? null : Number(value.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) confidence = null;
    return {
      status,
      confidence,
      reason: String(value.reason || "").replace(/[\r\n]+/g, " ").slice(0, 700),
      checkedAt: String(value.checkedAt || "").slice(0, 40)
    };
  } catch {
    return null;
  }
}

export function encodeAIIdentityRationale(meta, rationale) {
  const status = ["verified", "review_required", "unverified"].includes(meta?.status) ? meta.status : "unverified";
  let confidence = meta?.confidence === null || meta?.confidence === undefined ? null : Number(meta.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) confidence = null;
  const safe = {
    status,
    confidence: confidence === null ? null : Math.round(confidence),
    reason: String(meta?.reason || "").replace(/[\r\n]+/g, " ").slice(0, 700),
    checkedAt: String(meta?.checkedAt || new Date().toISOString()).slice(0, 40)
  };
  const human = stripAIIdentityRationale(rationale).slice(0, 700);
  return META_PREFIX + JSON.stringify(safe) + "\n" + human;
}

function dailyAllocationExhausted(value) {
  return /\b(?:4006|3036)\b|daily free allocation|used up.{0,60}allocation.{0,40}neurons?|allocation of [\d,]+ neurons?/i.test(String(value || ""));
}

function quotaError(status, value) {
  return Number(status) === 429 || dailyAllocationExhausted(value) ||
    /\b429\b|too many requests|rate.?limit|quota exceeded/i.test(String(value || ""));
}

function failureResult(error) {
  const detail = String(error?.message || error || "Workers AI error").replace(/[\r\n]+/g, " ").slice(0, 160);
  const status = Number(error?.status || error?.statusCode || error?.status_code || 0);
  if (quotaError(status, detail)) {
    return {
      status: "unverified",
      confidence: null,
      reason: "Workers AI hết hạn mức hoặc bị giới hạn truy vấn. Không có kết luận cùng sản phẩm; hãy kiểm tra lại khi dịch vụ sẵn sàng.",
      httpStatus: 429
    };
  }
  if ([500, 502, 503, 504].includes(status) || /\b(500|502|503|504)\b|time.?out|temporar|unavailable|overloaded|network error|internal server error/i.test(detail)) {
    return {
      status: "unverified",
      confidence: null,
      reason: "Workers AI tạm thời không khả dụng. Không có kết luận cùng sản phẩm; hãy thử lại.",
      httpStatus: 503
    };
  }
  return {
    status: "unverified",
    confidence: null,
    reason: "Không thể xác minh bằng AI: " + detail,
    httpStatus: 502
  };
}

function parseEnvelope(value, depth = 0, seen = new Set()) {
  if (depth > 8 || value === null || value === undefined) return null;
  if (typeof value === "string") {
    const text = value.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
    if (!text) return null;
    try { return parseEnvelope(JSON.parse(text), depth + 1, seen); } catch {}
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return parseEnvelope(JSON.parse(match[0]), depth + 1, seen); } catch {}
    }
    return null;
  }
  if (Array.isArray(value)) {
    if (value.every(item => item && typeof item === "object" && !Array.isArray(item))) return value;
    for (const item of value.slice(0, 12)) {
      const found = parseEnvelope(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value.pairs)) return value.pairs;
  for (const key of ["response", "output_text", "generated_text", "text", "content", "message", "choices", "result", "data", "output", "json", "parsed", "structured_output"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const found = parseEnvelope(value[key], depth + 1, seen);
      if (found) return found;
    }
  }
  return null;
}

function normalizedPairList(raw, count) {
  const pairs = parseEnvelope(raw);
  if (!Array.isArray(pairs)) return null;
  const expected = new Set();
  for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) expected.add(a + ":" + b);
  if (pairs.length !== expected.size) return null;
  const seen = new Set();
  const normalized = [];
  for (const pair of pairs) {
    const a = Number(pair?.a ?? pair?.image_a ?? pair?.imageA ?? pair?.left_index ?? pair?.left);
    const b = Number(pair?.b ?? pair?.image_b ?? pair?.imageB ?? pair?.right_index ?? pair?.right);
    const same = pair?.same_product ?? pair?.sameProduct ?? pair?.match;
    let confidence = Number(pair?.confidence ?? pair?.score ?? pair?.confidence_score);
    if (confidence > 0 && confidence <= 1) confidence *= 100;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= count || b >= count || a === b ||
        typeof same !== "boolean" || !Number.isFinite(confidence) || confidence < 0 || confidence > 100) return null;
    const low = Math.min(a, b), high = Math.max(a, b), id = low + ":" + high;
    if (!expected.has(id) || seen.has(id)) return null;
    seen.add(id);
    normalized.push({
      a: low, b: high, sameProduct: same, confidence: Math.round(confidence),
      rationale: String(pair?.rationale || pair?.reason || pair?.explanation || "").replace(/[\r\n]+/g, " ").trim().slice(0, 240)
    });
  }
  return seen.size === expected.size ? normalized : null;
}

/**
 * Uses vision-derived per-image identity descriptors plus a live Workers AI
 * pairwise judgment. It never persists data. Consumers must explicitly decide
 * whether an unverified/review-required result can proceed.
 */
export async function verifyIdentityGroup(env, indexedRows, keys) {
  if (!Array.isArray(keys) || keys.length < 2 || keys.length > 8 || new Set(keys).size !== keys.length) {
    return { status: "unverified", confidence: null, reason: "Nhóm AI cần từ 2 đến 8 ảnh khác nhau.", httpStatus: 400 };
  }
  if (typeof env?.AI?.run !== "function") {
    return { status: "unverified", confidence: null, reason: "Chưa cấu hình Workers AI binding AI; chưa thể xác minh danh tính sản phẩm.", httpStatus: 503 };
  }
  const byKey = new Map((Array.isArray(indexedRows) ? indexedRows : []).map(row => [String(row?.image_key || ""), row]));
  const ordered = keys.map(key => {
    const row = byKey.get(key);
    let features = {};
    try { features = JSON.parse(row?.features_json || "{}"); } catch {}
    return { key, row, features };
  });
  if (ordered.some(item => !item.row || !isIdentityDescriptorValid(item.features.identityDescriptor))) {
    return { status: "unverified", confidence: null, reason: "Thiếu mô tả nhận diện chi tiết do AI tạo cho một hoặc nhiều ảnh. Cần phân tích lại ảnh trước khi xác minh cùng sản phẩm.", httpStatus: 409 };
  }
  const categories = ordered.map(item => String(item.features.category || "").toLowerCase());
  if (categories.some(category => !category || category !== categories[0]) ||
      ordered.some(item => item.features.categoryStatus !== "classified" || Number(item.features.categoryConfidence) < 70)) {
    return { status: "unverified", confidence: null, reason: "Danh mục hoặc độ tin cậy phân loại của các ảnh chưa nhất quán.", httpStatus: 409 };
  }
  const hashes = ordered.map(item => String(item.features.contentHash || "").toLowerCase());
  if (hashes.some(hash => /^[0-9a-f]{64}$/.test(hash)) && new Set(hashes).size !== hashes.length) {
    return { status: "review_required", confidence: 100, reason: "Có ảnh trùng nội dung byte-for-byte. Xem trong mục ảnh trùng; không coi bản sao là bằng chứng cùng mẫu sản phẩm.", httpStatus: 200 };
  }
  const allPairs = [];
  for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) allPairs.push({ a, b });
  const descriptorText = ordered.map((item, index) => "Ảnh " + index + " — danh mục " + categories[index] + "\nĐặc trưng nhận diện quan sát được: " + normalizeIdentityDescriptor(item.features.identityDescriptor)).join("\n\n");
  const system = "Bạn là chuyên gia xác minh danh tính mẫu sản phẩm qua ảnh. Bạn phải phân biệt cùng một mẫu/biến thể cụ thể với sản phẩm khác chỉ cùng loại, màu, chất liệu chung hoặc silhouette. Không được xác nhận chỉ vì cùng loại giày, cùng màu, cùng dáng hoặc cùng vân giả da. Đối chiếu các dấu hiệu bền vững: họa tiết/vân cụ thể, cách bố trí đường may, logo và vị trí, mũi/đế, lỗ dây, khóa/phụ kiện, panel và điểm riêng. Khác góc chụp, crop, nền, ánh sáng, watermark có thể vẫn cùng sản phẩm. Mô tả mơ hồ hoặc thiếu dấu hiệu riêng phải trả same_product=false và giải thích sự không chắc chắn. Trả đúng JSON duy nhất có mảng pairs; phải có đúng một verdict cho TỪNG cặp được liệt kê, không bỏ cặp nào. confidence là mức chắc chắn của verdict, số 0–100.";
  const user = "Hãy đối chiếu tất cả cặp không thứ tự dưới đây và không suy luận thêm ngoài mô tả được cung cấp. Cặp cần đánh giá: " + JSON.stringify(allPairs) +
    "\nTrả JSON theo schema: {\"pairs\":[{\"a\":0,\"b\":1,\"same_product\":true,\"confidence\":95,\"rationale\":\"lý do ngắn bằng tiếng Việt\"}]}. " +
    "Bắt buộc có " + allPairs.length + " cặp chính xác; nếu không chắc cùng một mẫu cụ thể, hãy trả false.\n\n" + descriptorText;
  const request = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0,
    max_tokens: Math.min(2048, 480 + allPairs.length * 100)
  };
  let lastText = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    let result;
    try {
      result = await env.AI.run(MODEL, request);
    } catch (error) {
      return failureResult(error);
    }
    const raw = result?.response ?? result?.choices?.[0]?.message?.content ?? result?.output_text ?? result?.generated_text ?? result?.text ?? result?.content;
    const pairs = normalizedPairList(raw, keys.length);
    if (pairs) {
      const minimum = Math.min(...pairs.map(pair => pair.confidence));
      const firstNegative = pairs.find(pair => !pair.sameProduct);
      const belowThreshold = pairs.find(pair => pair.confidence < 91);
      if (!firstNegative && !belowThreshold) {
        return {
          status: "verified",
          confidence: minimum,
          reason: "AI đã đưa ra verdict cho toàn bộ " + pairs.length + " cặp; mọi cặp đều được đánh giá cùng mẫu cụ thể với confidence từ 91/100. " +
            pairs.slice(0, 3).map(pair => pair.rationale).filter(Boolean).join(" · ").slice(0, 500),
          httpStatus: 200
        };
      }
      const issue = firstNegative
        ? "AI nhận thấy ít nhất một cặp có dấu hiệu khác mẫu: ảnh " + firstNegative.a + " và ảnh " + firstNegative.b + (firstNegative.rationale ? " — " + firstNegative.rationale : ".")
        : "Có ít nhất một cặp dưới ngưỡng confidence 91/100: ảnh " + belowThreshold.a + " và ảnh " + belowThreshold.b + (belowThreshold.rationale ? " — " + belowThreshold.rationale : ".");
      return {
        status: "review_required",
        confidence: minimum,
        reason: issue + " Không tự động coi nhóm là cùng sản phẩm.",
        httpStatus: 200
      };
    }
    lastText = raw;
    if (attempt === 0) {
      request.messages = [
        { role: "system", content: "Return only valid JSON with exactly one top-level pairs array. It must include exactly one verdict for every unordered pair listed, numeric indices a and b, boolean same_product, confidence number 0-100 and short rationale. No markdown or prose." },
        { role: "user", content: "The previous response was malformed or incomplete. Return the complete verdict list with exactly " + allPairs.length + " pairs in the required schema. Do not omit negative or uncertain pairs.\n\n" + user }
      ];
    }
  }
  const shape = typeof lastText === "string"
    ? "phản hồi văn bản dài " + lastText.length + " ký tự"
    : lastText && typeof lastText === "object"
      ? "phản hồi dạng object với trường " + Object.keys(lastText).slice(0, 8).join(", ")
      : "phản hồi rỗng/không đúng định dạng";
  return { status: "unverified", confidence: null, reason: "AI không trả đủ verdict hợp lệ sau một lần thử lại định dạng (" + shape + "). Không tự xác nhận cùng sản phẩm.", httpStatus: 502 };
}
