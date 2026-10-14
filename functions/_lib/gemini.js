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
    const raw = String(result?.response || result?.result || result?.output || "").trim();
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

function extractJsonObject(raw) {
  const cleaned = String(raw || "").replace(/^\uFEFF/, "").replace(/```(?:json)?/gi, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}

  // Models may add prose around JSON. Find a balanced object without
  // accidentally including braces that occur inside quoted strings.
  for (let start = cleaned.indexOf("{"); start >= 0; start = cleaned.indexOf("{", start + 1)) {
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(cleaned.slice(start, i + 1));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
          } catch {}
          break;
        }
      }
    }
  }
  return null;
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
    "Chỉ trả về MỘT đối tượng JSON hợp lệ, đúng cú pháp, không có dấu phẩy cuối, theo schema: {\\"keywords\\":[\\"中文关键词1\\",\\"中文关键词2\\"],\\"visualSummary\\":\\"简短描述\\"}.",
    "Tự kiểm tra JSON có thể được JSON.parse phân tích và mọi giá trị keywords đều là chuỗi.",
    "Tiêu đề hiện có: " + String(title || "không có").slice(0, 180),
    "Danh mục: " + String(category || "không có").slice(0, 80)
  ].join("\n");
  const response = await runVision(ai, prompt, parsedImage.image);
  if (response.error) return response;
  const data = parseJson(response.raw, "Workers AI trả về từ khóa sai định dạng JSON.");
  if (data.error) return { error: data.error, status: 502 };
  const keywords = Array.isArray(data.keywords)
    ? [...new Set(data.keywords.map(value => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80).replace(/[<>]/g, "")))]
        .filter(value => value && /[\u3400-\u9fff]/.test(value)).slice(0, 4)
    : [];
  if (!keywords.length) return { error: "Workers AI không tạo được từ khóa tiếng Trung hợp lệ.", status: 502 };
  return {
    keywords,
    visualSummary: String(data.visualSummary || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
  };
}
