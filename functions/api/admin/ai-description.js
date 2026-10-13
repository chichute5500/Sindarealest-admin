import { fail, json, requireAdmin } from "../../_lib.js";
export async function onRequestPost(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const key = context.env.OPENAI_API_KEY;
  if (typeof key !== "string" || key.length < 20) return fail("Chưa cấu hình secret OPENAI_API_KEY trên Cloudflare.",503);
  let body; try { body = await context.request.json(); } catch { return fail("Thông tin sản phẩm không hợp lệ."); }
  const title = String(body?.title || "").trim().slice(0,180);
  const category = String(body?.category || "").trim().slice(0,80);
  const facts = String(body?.facts || "").trim().slice(0,2500);
  if (!title || !category) return fail("Hãy nhập tên và chọn danh mục trước khi tạo mô tả.");
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST", headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" },
      body:JSON.stringify({ model:context.env.OPENAI_MODEL || "gpt-4o-mini", temperature:0.4, max_tokens:450,
        messages:[
          { role:"system", content:"Bạn là copywriter tiếng Việt cho thương hiệu SinDarealest. Viết mô tả sản phẩm ngắn gọn, tinh tế, đúng dữ kiện. Không tự bịa chất liệu, nguồn gốc, kích thước, tính năng, bảo hành, chứng nhận hay công dụng. Nếu dữ kiện còn thiếu, dùng lời văn trung tính và chỉ nêu tên/danh mục đã cho. Chỉ trả về nội dung mô tả, không tiêu đề." },
          { role:"user", content:`Tên sản phẩm: ${title}\nDanh mục: ${category}\nThông tin thực tế được cung cấp: ${facts || "Không có thông tin bổ sung"}\nViết 2–4 câu tiếng Việt, không thêm dữ kiện không có căn cứ.` }
        ] })
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) return fail("Dịch vụ AI chưa sẵn sàng. Kiểm tra OPENAI_API_KEY và hạn mức dịch vụ.",response.status===429?429:502);
    const description = String(data?.choices?.[0]?.message?.content || "").trim().slice(0,10000);
    if (!description) return fail("AI chưa tạo được mô tả. Vui lòng thử lại.",502);
    return json({ ok:true, description });
  } catch { return fail("Không kết nối được dịch vụ AI. Vui lòng thử lại.",502); }
}
export async function onRequestGet() { return fail("Phương thức không được hỗ trợ.",405); }
