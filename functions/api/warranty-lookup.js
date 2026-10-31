import { dbOrFail, fail, getCurrentDateInVietnam, isWarrantyEligibleOnDate, json, parseImages, rateLimitPublicRequest, readJsonBodyLimited, warrantyStatusOnDate } from "../_lib.js";
import { isWarrantyCode } from "../_warranty-policy.js";
import {verifyLookupChallenge} from "../_lookup-challenge.js";

const clean = (value, max = 120) => String(value ?? "").trim().slice(0, max);
const normalizePhone = value => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0084")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("84") && digits.length >= 11) digits = "0" + digits.slice(2);
  return digits;
};
const phoneSql = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(oc.phone,c.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.',''),'/','')";
function maskPhone(value) {
  const digits = normalizePhone(value);
  return digits.length >= 7 ? digits.slice(0, 3) + "••••" + digits.slice(-2) : "••••";
}
function maskName(value) {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean).map(part => part.slice(0, 1) + "•••").join(" ");
}
function maskAddress(value) {
  const parts = String(value ?? "").split(",").map(part => part.trim()).filter(Boolean);
  if (!parts.length) return "Chưa có dữ liệu";
  return parts.length > 1 ? ["••••", ...parts.slice(-2)].join(", ") : parts[0].slice(0, 3) + "•••";
}
function maskOrderNumber(value) {
  const order = String(value ?? "");
  return order.length > 6 ? order.slice(0, 3) + "••••" + order.slice(-3) : "••••";
}
function shapeWarranty(row, today, claimToken) {
  const code = String(row.warranty_code || "");
  const images = parseImages(row.imagesJson);
  const status = warrantyStatusOnDate(row.status, row.starts_at, row.ends_at, today);
  const eligible = isWarrantyEligibleOnDate(row.status, row.starts_at, row.ends_at, today);
  const remainingDays = eligible ? Math.max(0, Math.ceil((Date.parse(row.ends_at + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000)) : 0;
  return {
    claimToken,
    maskedWarrantyCode: code ? "••••" + code.slice(-4).slice(code.length<=8 ? 2 : 0) : "••••",
    title: String(row.title || "Sản phẩm"),
    sku: Number(row.skuVerified) === 1 ? String(row.sku || "") : "",
    size: String(row.size || ""),
    image: images[0] || "",
    purchasedAt: String(row.purchasedAt || "").slice(0, 10),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    durationMonths: row.duration_months,
    status,
    eligible,
    remainingDays,
    maskedName: maskName(row.fullName),
    maskedPhone: maskPhone(row.customerPhone),
    maskedAddress: maskAddress(row.purchaseAddress),
    maskedOrderNumber: maskOrderNumber(row.orderNumber)
  };
}
const selectSql = "SELECT w.id AS warrantyId,w.warranty_code,w.duration_months,w.starts_at,w.ends_at,w.status,oi.sku,oi.sku_verified AS skuVerified,oi.title,COALESCE(d.size,'') AS size,o.created_at AS purchasedAt,o.order_number AS orderNumber,COALESCE(oc.full_name,c.full_name) AS fullName,COALESCE(oc.phone,c.phone) AS customerPhone,COALESCE(sa.full_address,c.address,'') AS purchaseAddress,p.images_json AS imagesJson FROM warranties w JOIN orders o ON o.id=w.order_id JOIN customers c ON c.id=o.customer_id LEFT JOIN order_contact_details oc ON oc.order_id=o.id JOIN order_items oi ON oi.id=w.order_item_id LEFT JOIN order_shipping_addresses sa ON sa.order_id=o.id LEFT JOIN order_item_details d ON d.item_id=oi.id LEFT JOIN products p ON p.id=oi.product_id";

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin) return fail("Yêu cầu không hợp lệ.", 403); }
    catch { return fail("Yêu cầu không hợp lệ.", 403); }
  }
  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  try {
    const limit = await rateLimitPublicRequest(env, request, "warranty_lookup", 6, 900);
    if (limit.limited) return fail("Bạn đã tra cứu quá nhiều lần. Vui lòng đợi 15 phút.", 429, { "Retry-After": "900" });
  } catch { return fail("Dịch vụ tra cứu chưa sẵn sàng.", 503); }
  const parsedBody = await readJsonBodyLimited(request, 4 * 1024);
  if (parsedBody.error === "too_large") return fail("Thông tin tra cứu vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Thông tin tra cứu không hợp lệ.");
  const body = parsedBody.value;
  const raw = clean(body?.lookup ?? body?.warrantyCode ?? body?.phone);
  if (!raw) return fail("Nhập mã bảo hành hoặc số điện thoại dùng khi mua hàng.");
  const today = getCurrentDateInVietnam();
  try {
    const isCode = isWarrantyCode(raw);
    let rows = [];
    if (isCode) {
      const row = await env.DB.prepare(selectSql + " WHERE upper(w.warranty_code)=? LIMIT 1").bind(raw.toUpperCase()).first();
      if (!row) return fail("Không tìm thấy thông tin phù hợp. Hãy kiểm tra lại mã hoặc số điện thoại.", 404);
      rows = [row];
    } else {
      if (!/^[+0-9().\s/-]+$/.test(raw)) return fail("Nhập mã bảo hành hợp lệ hoặc số điện thoại đã dùng khi mua hàng.");
      const phone = normalizePhone(raw);
      if (!/^\d{9,12}$/.test(phone)) return fail("Số điện thoại chưa hợp lệ.");
      const proof=await verifyLookupChallenge(request,env,body.turnstileToken,"warranty_lookup");
      if(!proof.ok)return fail(proof.status===503?
        "Tra cứu theo số điện thoại tạm chưa sẵn sàng. Vui lòng dùng mã bảo hành.":
        "Vui lòng hoàn thành xác minh trước khi tra cứu.",proof.status);
      const sql = selectSql + " WHERE " + phoneSql + "=? OR (substr(" + phoneSql + ",1,2)='84' AND '0'||substr(" + phoneSql + ",3)=?) OR (substr(" + phoneSql + ",1,4)='0084' AND '0'||substr(" + phoneSql + ",5)=?) ORDER BY o.created_at DESC LIMIT 25";
      const result = await env.DB.prepare(sql).bind(phone, phone, phone).all();
      rows = result.results || [];
      if (!rows.length) return fail("Không tìm thấy thông tin phù hợp. Hãy kiểm tra lại mã hoặc số điện thoại.", 404);
    }
    const tokenRows = rows.map(row => ({ ...row, claimToken: crypto.randomUUID().replaceAll("-", "") }));
    const statements = [env.DB.prepare("DELETE FROM settings WHERE key LIKE 'warranty_lookup:%' AND julianday(updated_at)<julianday('now','-15 minutes')")];
    for (const row of tokenRows) {
      statements.push(env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind("warranty_lookup:" + row.claimToken, JSON.stringify({ warrantyId: row.warrantyId, warrantyCode: row.warranty_code })));
    }
    await env.DB.batch(statements);
    const warranties = tokenRows.map(row => shapeWarranty(row, today, row.claimToken));
    return json({ ok: true, warranties, warranty: isCode ? warranties[0] : null });
  } catch { return fail("Chưa thể tra cứu bảo hành. Hãy kiểm tra các migration 0003, 0005 và 0007 rồi thử lại.", 503); }
}
export async function onRequestGet() { return fail("Phương thức không được hỗ trợ.", 405); }
