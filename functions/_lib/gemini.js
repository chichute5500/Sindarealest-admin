const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

export async function analyzeProductImage({ apiKey, imageBase64, mimeType = "image/webp", title = "", category = "", sku = "" }) {
  if (typeof apiKey !== "string" || apiKey.length < 12) {
    return { error: "Chưa cấu hình Secret GEMINI_API_KEY trong môi trường Production." };
  }
  const normalizedMime = ["image/webp", "image/jpeg", "image/png"].includes(mimeType) ? mimeType : "";
  const base64 = String(imageBase64 || "").replace(/^data:image\/(?:webp|jpeg|jpg|png);base64,/i, "");
  if (!normalizedMime || !base64 || base64.length > MAX_IMAGE_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { error: "Ảnh không hợp lệ hoặc vượt giới hạn 5 MB." };
  }
  const prompt = [
    "Bạn là trợ lý kiểm duyệt ảnh sản phẩm giày và phụ kiện cho cửa hàng.",
    "Chỉ phân tích bằng chứng nhìn thấy được; không khẳng định da cá sấu thật từ ảnh.",
    "Kiểm tra từ khóa da cá sấu/giày cá sấu/cá sấu và từ khóa tương đương tiếng Trung; phân biệt da thật chưa xác minh với giả da, PU, vân dập hoặc vật liệu tổng hợp.",
    "Không tự đặt phần trăm tương đồng ảnh. Độ tin cậy của Gemini không phải điểm tương đồng; không được xem ảnh là đạt ngưỡng 90% nếu không có điểm số từ bộ so khớp ảnh đáng tin cậy.",
    "Phân biệt: ảnh trùng/ gần trùng, cùng một mẫu ở góc khác, có khả năng là mẫu khác, hoặc không đủ chắc chắn.",
    "Ghi rõ dấu hiệu giả da/PU/vân cá sấu nhân tạo nếu nhìn thấy; hình ảnh không thể xác thực nguồn gốc vật liệu.",
    "Trả về JSON đúng schema, không markdown: {summary:string, visibleFeatures:string[], modelAssessment:'same_model_possible'|'different_model_possible'|'different_angle_possible'|'uncertain', materialAssessment:'possible_synthetic'|'crocodile_claim_unverified'|'no_visible_evidence'|'uncertain', confidence:'low'|'medium'|'high', reasons:string[], needsHumanReview:boolean}.",
    "Nếu thiếu bằng chứng, đặt confidence low hoặc medium, needsHumanReview true. Không đề xuất tự động xóa ảnh.",
    `Thông tin sản phẩm: SKU ${String(sku).slice(0,60)}, tên ${String(title).slice(0,180)}, danh mục ${String(category).slice(0,80)}.`
  ].join("\n");
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: normalizedMime, data: base64 } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status === 401 || response.status === 403 ? 503 : 502;
      return { error: status === 429 ? "Gemini đang giới hạn lượt gọi. Hãy chờ rồi thử lại." : "Gemini không phân tích được ảnh. Kiểm tra API key, quyền API và hạn mức.", status };
    }
    const raw = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!raw) return { error: "Gemini không trả về kết quả phân tích.", status: 502 };
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return { error: "Phản hồi Gemini không đúng định dạng JSON.", status: 502 }; }
    const enums = {
      modelAssessment: ["same_model_possible", "different_model_possible", "different_angle_possible", "uncertain"],
      materialAssessment: ["possible_synthetic", "crocodile_claim_unverified", "no_visible_evidence", "uncertain"],
      confidence: ["low", "medium", "high"]
    };
    for (const [key, allowed] of Object.entries(enums)) if (!allowed.includes(parsed[key])) parsed[key] = key === "confidence" ? "low" : "uncertain";
    return { analysis: {
      summary: String(parsed.summary || "Chưa có mô tả").slice(0, 800),
      visibleFeatures: Array.isArray(parsed.visibleFeatures) ? parsed.visibleFeatures.slice(0, 12).map(x => String(x).slice(0, 160)) : [],
      modelAssessment: parsed.modelAssessment,
      materialAssessment: parsed.materialAssessment,
      confidence: parsed.confidence,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 12).map(x => String(x).slice(0, 200)) : [],
      needsHumanReview: parsed.needsHumanReview !== false
    }};
  } catch {
    return { error: "Không kết nối được Gemini. Vui lòng thử lại.", status: 502 };
  }
}


export async function suggestMarketplaceImageKeywords({ apiKey, imageBase64, mimeType = "image/jpeg", title = "", category = "" }) {
  if (typeof apiKey !== "string" || apiKey.length < 12) {
    return { error: "Chưa cấu hình Secret GEMINI_API_KEY trong môi trường Preview/Production.", status: 503 };
  }
  const normalizedMime = ["image/webp", "image/jpeg", "image/png"].includes(mimeType) ? mimeType : "";
  const base64 = String(imageBase64 || "").replace(/^data:image\/(?:webp|jpeg|jpg|png);base64,/i, "");
  if (!normalizedMime || !base64 || base64.length > MAX_IMAGE_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { error: "Ảnh tham chiếu không hợp lệ để phân tích từ khóa.", status: 400 };
  }
  const prompt = [
    "Phân tích ảnh sản phẩm để hỗ trợ tìm nguồn hàng trên Taobao hoặc 1688.",
    "Chỉ mô tả những gì nhìn thấy. Không đoán thương hiệu, mã sản phẩm, cửa hàng, URL hay giá.",
    "Tạo 2 đến 4 từ khóa tiếng Trung giản thể ngắn mô tả đúng loại sản phẩm, kiểu dáng, màu sắc và chi tiết đặc trưng; không thêm thuộc tính không thấy rõ.",
    "Nếu tiêu đề nói đến da cá sấu, phân biệt 鳄鱼皮 (da cá sấu) với 鳄鱼纹/压纹/PU (vân giả); không khẳng định vật liệu thật từ ảnh.",
    "Trả về JSON thuần: {keywords:string[], visualSummary:string}.",
    "Tiêu đề hiện có: " + String(title || "không có").slice(0, 180),
    "Danh mục: " + String(category || "không có").slice(0, 80)
  ].join("\n");
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: normalizedMime, data: base64 } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      }),
      signal: AbortSignal.timeout(30000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) return { error: "Gemini đang giới hạn lượt gọi (HTTP 429). Không tự động thử lại để bảo vệ quota.", status: 429 };
      return { error: "Gemini không phân tích được ảnh tìm nguồn hàng (HTTP " + response.status + "). Kiểm tra API key, quyền và hạn mức.", status: response.status === 401 || response.status === 403 ? 503 : 502 };
    }
    const raw = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!raw) return { error: "Gemini không trả về từ khóa ảnh.", status: 502 };
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return { error: "Gemini trả về từ khóa sai định dạng JSON.", status: 502 }; }
    const keywords = Array.isArray(parsed.keywords)
      ? [...new Set(parsed.keywords.map((value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80).replace(/[<>]/g, "")))]
          .filter((value) => value && /[\u3400-\u9fff]/.test(value)).slice(0, 4)
      : [];
    return {
      keywords,
      visualSummary: String(parsed.visualSummary || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
    };
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return { error: "Gemini hết thời gian chờ khi phân tích ảnh. Không tự động thử lại.", status: 504 };
    }
    return { error: "Không kết nối được Gemini để phân tích ảnh tìm nguồn hàng. Không tự động thử lại.", status: 502 };
  }
}
