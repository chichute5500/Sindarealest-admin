const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

export async function analyzeProductImage({ apiKey, imageBase64, mimeType = "image/webp", title = "", category = "", sku = "" }) {
  if (typeof apiKey !== "string" || apiKey.length < 12) {
    return { error: "Chưa cấu hình Secret GEMINI_API_KEY trong môi trường Production.", status: 503 };
  }
  const normalizedMime = ["image/webp", "image/jpeg", "image/png"].includes(mimeType) ? mimeType : "";
  const base64 = String(imageBase64 || "").replace(/^data:image\/(?:webp|jpeg|jpg|png);base64,/i, "");
  if (!normalizedMime || !base64 || base64.length > MAX_IMAGE_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { error: "Ảnh không hợp lệ hoặc vượt giới hạn 5 MB.", status: 400 };
  }
  const prompt = [
    "Bạn là trợ lý kiểm duyệt ảnh sản phẩm giày và phụ kiện cho cửa hàng.",
    "Chỉ phân tích bằng chứng nhìn thấy được; không khẳng định da cá sấu thật từ ảnh.",
    "Kiểm tra từ khóa da cá sấu/giày cá sấu/cá sấu và từ khóa tương đương tiếng Trung; phân biệt da thật chưa xác minh với giả da, PU, vân dập hoặc vật liệu tổng hợp.",
    "Không tự đặt phần trăm tương đồng ảnh. Độ tin cậy của Gemini không phải điểm tương đồng; không được xem ảnh là đạt ngưỡng 90% nếu không có điểm số từ bộ so khớp ảnh đáng tin cậy.",
    "Phân biệt: ảnh trùng/gần trùng, cùng một mẫu ở góc khác, có khả năng là mẫu khác, hoặc không đủ chắc chắn.",
    "Ghi rõ dấu hiệu giả da/PU/vân cá sấu nhân tạo nếu nhìn thấy; hình ảnh không thể xác thực nguồn gốc vật liệu.",
    "Trả về JSON đúng schema, không markdown: {summary:string, visibleFeatures:string[], modelAssessment:'same_model_possible'|'different_model_possible'|'different_angle_possible'|'uncertain', materialAssessment:'possible_synthetic'|'crocodile_claim_unverified'|'no_visible_evidence'|'uncertain', confidence:'low'|'medium'|'high', reasons:string[], needsHumanReview:boolean}.",
    "Nếu thiếu bằng chứng, đặt confidence low hoặc medium, needsHumanReview true. Không đề xuất tự động xóa ảnh.",
    `Thông tin sản phẩm: SKU ${String(sku).slice(0,60)}, tên ${String(title).slice(0,180)}, danh mục ${String(category).slice(0,80)}.`
  ].join("\n");
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": "2026-05-20" },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        input: [
          { type: "text", text: prompt },
          { type: "image", data: base64, mime_type: normalizedMime }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    });
    const data = await response.json().catch(() => ({}));
    const blocks = (Array.isArray(data?.steps) ? data.steps : [])
      .filter(step => step?.type === "model_output")
      .flatMap(step => Array.isArray(step.content) ? step.content : []);
    const rawText = blocks.filter(block => block?.type === "text").map(block => block.text || "").join("\n").trim();
    if (!response.ok) {
      const apiError = data?.error || {};
      const apiStatus = String(apiError.status || "");
      const detail = String(apiError.message || "").split(apiKey).join("[đã ẩn API key]").slice(0, 400);
      if (response.status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
        return { error: "Gemini đã từ chối yêu cầu vì hạn mức/quota của Google (HTTP 429). Không tự động thử lại để tránh tiêu hao thêm quota. Kiểm tra giới hạn đang áp dụng trong Google AI Studio. " + detail, status: 429 };
      }
      if (response.status === 401 || apiStatus === "UNAUTHENTICATED") return { error: "Gemini từ chối API key. " + detail, status: 502 };
      if (response.status === 403 || apiStatus === "PERMISSION_DENIED") return { error: "Gemini từ chối quyền truy cập. Kiểm tra dự án, quyền API và gói đang dùng. " + detail, status: 502 };
      return { error: "Gemini Interactions API trả lỗi HTTP " + response.status + ". " + detail, status: 502 };
    }
    if (data?.status && data.status !== "completed") return { error: "Gemini chưa hoàn tất phân tích (status: " + String(data.status).slice(0, 80) + "). Không tự động gửi lại.", status: 502 };
    if (!rawText) return { error: "Gemini không trả về kết quả phân tích.", status: 502 };
    let parsed;
    try { parsed = JSON.parse(rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()); }
    catch { return { error: "Phản hồi Gemini không đúng định dạng JSON.", status: 502 }; }
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
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") return { error: "Gemini hết thời gian chờ sau 25 giây. Không tự động thử lại để bảo vệ quota.", status: 504 };
    return { error: "Không kết nối được Gemini Interactions API. " + String(error?.message || "").slice(0, 200), status: 502 };
  }
}
