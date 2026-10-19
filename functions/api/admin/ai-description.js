import { fail, json, rateLimitPublicRequest, readJsonBodyLimited, requireAdmin } from "../../_lib.js";

const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const SYSTEM_PROMPT = "Bạn là copywriter tiếng Việt cho thương hiệu SinDarealest. Viết mô tả sản phẩm ngắn gọn, tinh tế, đúng dữ kiện. Không tự bịa chất liệu, nguồn gốc, kích thước, tính năng, bảo hành, chứng nhận hay công dụng. Nếu dữ kiện còn thiếu, dùng lời văn trung tính và chỉ nêu tên/danh mục đã cho. Chỉ trả về nội dung mô tả, không tiêu đề.";

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;

  const env = context.env || {};
  try {
    const limit = await rateLimitPublicRequest(env, context.request, "admin_ai_description", 20, 3600);
    if (limit.limited) return fail("Đã vượt giới hạn tạo mô tả AI trong giờ này. Vui lòng thử lại sau.", 429, { "Retry-After": "3600" });
  } catch {
    return fail("Không thể kiểm tra giới hạn sử dụng AI.", 503);
  }
  const hasWorkersAI = typeof env.AI?.run === "function";
  const openAIKey = typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.length >= 20
    ? env.OPENAI_API_KEY
    : "";

  if (!hasWorkersAI && !openAIKey) {
    return fail("Chưa cấu hình Workers AI binding tên AI hoặc secret OPENAI_API_KEY cho tính năng tạo mô tả.", 503);
  }

  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Thông tin sản phẩm vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Thông tin sản phẩm không hợp lệ.");
  const body = parsedBody.value;

  const title = String(body?.title || "").trim().slice(0, 180);
  const category = String(body?.category || "").trim().slice(0, 80);
  const facts = String(body?.facts || "").trim().slice(0, 2500);
  if (!title || !category) return fail("Hãy nhập tên và chọn danh mục trước khi tạo mô tả.");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Tên sản phẩm: ${title}\nDanh mục: ${category}\nThông tin thực tế được cung cấp: ${facts || "Không có thông tin bổ sung"}\nViết 2–4 câu tiếng Việt, không thêm dữ kiện không có căn cứ.`,
    },
  ];

  try {
    let description = "";
    if (hasWorkersAI) {
      const configuredModel = typeof env.WORKERS_AI_MODEL === "string" && /^@cf\/[A-Za-z0-9._/-]{1,100}$/.test(env.WORKERS_AI_MODEL)
        ? env.WORKERS_AI_MODEL
        : DEFAULT_WORKERS_AI_MODEL;
      const result = await env.AI.run(configuredModel, { messages, temperature: 0.4, max_tokens: 450 });
      description = String(result?.response || result?.choices?.[0]?.message?.content || "").trim();
    } else {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: { "Authorization": `Bearer ${openAIKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.4,
          max_tokens: 450,
          messages,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return fail("Dịch vụ AI chưa sẵn sàng. Kiểm tra cấu hình AI và hạn mức dịch vụ.", response.status === 429 ? 429 : 502);
      description = String(data?.choices?.[0]?.message?.content || "").trim();
    }

    description = description.slice(0, 10000);
    if (!description) return fail("AI chưa tạo được mô tả. Vui lòng thử lại.", 502);
    return json({ ok: true, description });
  } catch (error) {
    // Return a useful, sanitized category without exposing provider payloads,
    // tokens, request headers, or internal account details.
    const detail = String(error?.message || error || "").toLowerCase();
    if (/timeout|timed out|deadline exceeded|aborted/.test(detail)) {
      return fail("Dịch vụ AI phản hồi quá thời gian cho phép. Vui lòng thử lại sau.", 504);
    }
    if (/\b4006\b|daily free allocation|used up.{0,60}allocation.{0,40}neurons?|allocation of [\d,]+ neurons?/i.test(detail)) {
      return fail("Workers AI đã hết hạn mức neuron miễn phí hằng ngày. Chưa thay đổi dữ liệu; hãy chờ quota được cấp lại hoặc kiểm tra gói Workers AI.", 429, { "Retry-After": "3600" });
    }
    if (/quota|rate.?limit|too many requests|resource exhausted/.test(detail)) {
      return fail("Dịch vụ AI đã đạt hạn mức. Vui lòng kiểm tra quota và thử lại sau.", 429, { "Retry-After": "60" });
    }
    if (/403|401|unauthori[sz]ed|forbidden|permission|authentication|not authorized/.test(detail)) {
      return fail("Workers AI từ chối quyền truy cập. Kiểm tra binding AI, quyền tài khoản Cloudflare và model được cấu hình trong môi trường Preview.", 503);
    }
    return fail("Không kết nối được dịch vụ AI. Kiểm tra binding AI hoặc khóa dịch vụ; chi tiết nội bộ đã được giữ kín.", 502);
  }
}

export async function onRequestGet() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
