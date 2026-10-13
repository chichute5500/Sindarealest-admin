import { dbOrFail, fail, json, rateLimitPublicRequest } from "../_lib.js";
const clean = (v, max = 1000) => String(v ?? "").trim().slice(0, max);
export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin")) { try { if (new URL(request.headers.get("Origin")).origin !== new URL(request.url).origin) return fail("Yêu cầu không hợp lệ.", 403); } catch { return fail("Yêu cầu không hợp lệ.", 403); } }
  const unavailable = dbOrFail(env); if (unavailable) return unavailable;
  try { const limit = await rateLimitPublicRequest(env, request, "warranty_claim", 3, 900); if (limit.limited) return fail("Bạn đã gửi quá nhiều yêu cầu hỗ trợ. Vui lòng đợi 15 phút.", 429, { "Retry-After": "900" }); } catch { return fail("Dịch vụ tiếp nhận yêu cầu chưa sẵn sàng.", 503); }
  let body; try { body = await request.json(); } catch { return fail("Thông tin yêu cầu bảo hành không hợp lệ."); }
  const orderNumber = clean(body?.orderNumber, 80).toUpperCase(), phone = clean(body?.phone, 24), warrantyCode = clean(body?.warrantyCode, 100), message = clean(body?.message, 1600);
  if (!orderNumber || !/^[+0-9() .-]{9,20}$/.test(phone) || message.length < 8) return fail("Vui lòng nhập mã đơn, số điện thoại và mô tả yêu cầu (ít nhất 8 ký tự).");
  try {
    const order = await env.DB.prepare("SELECT o.id,o.customer_id FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.order_number=? AND c.phone=? LIMIT 1").bind(orderNumber,phone).first();
    if (!order) return fail("Không tìm thấy đơn hàng khớp với thông tin đã nhập. Vui lòng kiểm tra lại hoặc liên hệ cửa hàng.", 404);
    if (warrantyCode) {
      const warranty = await env.DB.prepare("SELECT id FROM warranties WHERE warranty_code=? AND order_id=? AND status='active' AND ends_at>=date('now') LIMIT 1").bind(warrantyCode,order.id).first();
      if (!warranty) return fail("Mã bảo hành không khớp đơn hàng. Bạn vẫn có thể gửi yêu cầu hỗ trợ bằng cách để trống mã bảo hành.");
    }
    const id = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO warranty_claims(id,order_id,customer_id,warranty_code,message) VALUES(?,?,?,?,?)").bind(id,order.id,order.customer_id,warrantyCode,message),
      env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'customer', 'warranty_claim_created', 'warranty_claim', ?, ?)").bind(crypto.randomUUID(),id,JSON.stringify({ orderNumber }))
    ]);
    return json({ ok: true, claimId: id, message: "Đã tiếp nhận yêu cầu hỗ trợ. Cửa hàng sẽ kiểm tra điều kiện bảo hành và liên hệ lại." }, 201);
  } catch { return fail("Chưa thể lưu yêu cầu hỗ trợ. Vui lòng liên hệ SinDarealest qua Zalo.", 503); }
}
export async function onRequestGet() { return fail("Phương thức không được hỗ trợ.", 405); }
