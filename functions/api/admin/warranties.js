import { fail, getCurrentDateInVietnam, json, readJsonBodyLimited, requireAdmin, warrantyStatusOnDate } from "../../_lib.js";
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare(`SELECT wc.id,wc.order_id AS orderId,o.order_number AS orderNumber,COALESCE(oc.full_name,c.full_name) AS fullName,COALESCE(oc.phone,c.phone) AS phone,wc.warranty_code AS warrantyCode,wc.message,wc.status,wc.admin_note AS adminNote,wc.created_at AS createdAt,a.image_key AS imageKey FROM warranty_claims wc JOIN orders o ON o.id=wc.order_id JOIN customers c ON c.id=wc.customer_id LEFT JOIN order_contact_details oc ON oc.order_id=wc.order_id LEFT JOIN warranty_claim_attachments a ON a.claim_id=wc.id ORDER BY wc.created_at DESC LIMIT 1000`).all();
    const issued = await context.env.DB.prepare(`SELECT w.id,w.warranty_code AS warrantyCode,w.policy_name AS policyName,w.duration_months AS durationMonths,w.starts_at AS startsAt,w.ends_at AS endsAt,w.status AS status,o.order_number AS orderNumber,oi.sku,oi.sku_verified AS skuVerified,oi.title,COALESCE(oc.full_name,c.full_name) AS fullName,COALESCE(oc.phone,c.phone) AS phone FROM warranties w JOIN orders o ON o.id=w.order_id JOIN order_items oi ON oi.id=w.order_item_id JOIN customers c ON c.id=o.customer_id LEFT JOIN order_contact_details oc ON oc.order_id=o.id ORDER BY w.created_at DESC LIMIT 1000`).all();
    const today = getCurrentDateInVietnam();
    const warranties = (issued.results || []).map((warranty) => ({
      ...warranty,
      status: warrantyStatusOnDate(warranty.status, warranty.startsAt, warranty.endsAt, today),
    }));
    return json({ claims: result.results || [], warranties });
  } catch { return fail("Không đọc được dữ liệu bảo hành. Hãy kiểm tra các migration 0003, 0005 và 0007.", 503); }
}
export async function onRequestPatch(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Dữ liệu cập nhật bảo hành vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Dữ liệu cập nhật không hợp lệ.");
  const body = parsedBody.value;
  const id = String(body?.id || ""), status = String(body?.status || ""), note = String(body?.adminNote || "").trim().slice(0,1600);
  if (!id || !["received","reviewing","approved","rejected","resolved"].includes(status)) return fail("Trạng thái yêu cầu không hợp lệ.");
  try {
    const result = await context.env.DB.batch([
      context.env.DB.prepare("UPDATE warranty_claims SET status=?,admin_note=?,updated_at=datetime('now') WHERE id=?").bind(status,note,id),
      context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?, 'admin', 'warranty_claim_updated', 'warranty_claim', ?, ? " +
        "WHERE EXISTS (SELECT 1 FROM warranty_claims WHERE id=?)",
      ).bind(crypto.randomUUID(),id,JSON.stringify({ status }),id),
    ]);
    if (!result[0]?.meta?.changes) return fail("Không tìm thấy yêu cầu bảo hành.",404);
    return json({ ok:true,message:"Đã cập nhật yêu cầu hỗ trợ." });
  } catch { return fail("Không thể cập nhật yêu cầu hỗ trợ.",503); }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Thông tin cấp bảo hành vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Thông tin cấp bảo hành không hợp lệ.");
  const body = parsedBody.value;
  const orderNumber = String(body?.orderNumber || "").trim().toUpperCase();
  const sku = String(body?.sku || "").trim().toUpperCase();
  const policyName = String(body?.policyName || "").trim().slice(0,160);
  // Browser FormData sends decimal strings. Accept those and numeric JSON integers,
  // but reject arrays/booleans that JavaScript Number() would silently coerce.
  const rawMonths = body?.durationMonths;
  const months = (typeof rawMonths === "number" ||
    (typeof rawMonths === "string" && /^\d+$/.test(rawMonths)))
    ? Number(rawMonths) : NaN;
  const startsAt = String(body?.startsAt || "").trim();
  if (!orderNumber || !sku || policyName.length < 3 || !Number.isInteger(months) || months < 1 || months > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(startsAt)) return fail("Cần nhập mã đơn, SKU, tên chính sách, thời hạn 1–120 tháng và ngày bắt đầu hợp lệ.");
  const startDate = new Date(`${startsAt}T00:00:00.000Z`);
  if (Number.isNaN(startDate.getTime()) || startDate.toISOString().slice(0,10) !== startsAt) return fail("Ngày bắt đầu bảo hành không hợp lệ.");
  const endDate = new Date(startDate); const day = endDate.getUTCDate(); endDate.setUTCDate(1); endDate.setUTCMonth(endDate.getUTCMonth()+months); const lastDay = new Date(Date.UTC(endDate.getUTCFullYear(),endDate.getUTCMonth()+1,0)).getUTCDate(); endDate.setUTCDate(Math.min(day,lastDay));
  try {
    const item = await context.env.DB.prepare(`SELECT o.id AS orderId,o.status,oi.id AS itemId,w.id AS existingWarrantyId FROM orders o JOIN order_items oi ON oi.order_id=o.id LEFT JOIN warranties w ON w.order_item_id=oi.id WHERE o.order_number=? AND upper(oi.sku)=? LIMIT 1`).bind(orderNumber,sku).first();
    if (!item) return fail("Không tìm thấy SKU trong đơn hàng.",404);
    if (item.existingWarrantyId) return fail("Sản phẩm này trong đơn đã có mã bảo hành.",409);
    if (item.status !== "completed") return fail("Chỉ phát hành bảo hành sau khi đơn hàng đã được đánh dấu hoàn tất.",409);
    const id = crypto.randomUUID(), warrantyCode = `SDW-${crypto.randomUUID().replaceAll("-","").slice(0,24).toUpperCase()}`;
    const issued = await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO warranties(id,order_id,order_item_id,warranty_code,policy_name,duration_months,starts_at,ends_at,status) " +
        "SELECT ?,?,?,?,?,?,?,?,'active' WHERE NOT EXISTS (SELECT 1 FROM warranties WHERE order_item_id=?) " +
        "AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status='completed')",
      ).bind(id,item.orderId,item.itemId,warrantyCode,policyName,months,startsAt,endDate.toISOString().slice(0,10),item.itemId,item.orderId),
      context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?, 'admin', 'warranty_issued', 'warranty', ?, ? WHERE EXISTS (SELECT 1 FROM warranties WHERE id=?)",
      ).bind(crypto.randomUUID(),id,JSON.stringify({ orderNumber,sku,policyName,months,startsAt,endsAt:endDate.toISOString().slice(0,10) }),id),
    ]);
    if (!issued[0]?.meta?.changes) return fail("Sản phẩm này trong đơn đã được cấp mã bảo hành.",409);
    return json({ ok:true,warrantyCode,message:"Đã phát hành mã bảo hành. Hãy cung cấp mã này cho khách hàng qua kênh liên hệ an toàn." },201);
  } catch { return fail("Không thể phát hành bảo hành. Hãy kiểm tra migration 0003 và dữ liệu đơn hàng.",503); }
}
