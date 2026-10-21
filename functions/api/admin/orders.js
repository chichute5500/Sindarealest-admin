import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { sendAdminPush } from "../../_notifications.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    // Limit parent orders first, then join all their items in one read. This
    // avoids one D1 request per order when the admin screen loads up to 1,000.
    const result = await context.env.DB.prepare(
      "WITH recent_orders AS (" +
      " SELECT o.id,o.order_number,o.status,o.payment_status,o.subtotal,o.total,o.price_confirmation_required," +
      " o.customer_note,o.payment_terms_confirmed_at,o.payment_terms_confirmed_by,o.payment_terms_note,o.created_at,o.updated_at,COALESCE(oc.full_name,c.full_name) AS full_name," +
      " COALESCE(oc.phone,c.phone) AS phone,COALESCE(oc.email,c.email) AS email," +
      " COALESCE(sa.full_address,c.address) AS address" +
      " ,(SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=o.id) AS received_amount" +
      " ,(SELECT COALESCE(SUM(CASE WHEN direction='refunded' THEN amount ELSE 0 END),0) FROM order_payment_transactions WHERE order_id=o.id) AS refunded_amount" +
      " ,(SELECT id FROM order_payment_requests WHERE order_id=o.id AND status='pending' ORDER BY created_at DESC LIMIT 1) AS pending_payment_request_id" +
      " ,(SELECT amount FROM order_payment_requests WHERE order_id=o.id AND status='pending' ORDER BY created_at DESC LIMIT 1) AS pending_payment_amount" +
      " ,(SELECT installment_type FROM order_payment_requests WHERE order_id=o.id AND status='pending' ORDER BY created_at DESC LIMIT 1) AS pending_payment_type" +
      " ,(SELECT transfer_reference FROM order_payment_requests WHERE order_id=o.id AND status='pending' ORDER BY created_at DESC LIMIT 1) AS pending_payment_reference" +
      " ,(SELECT shipping_benefit FROM order_payment_requests WHERE order_id=o.id AND status='pending' ORDER BY created_at DESC LIMIT 1) AS pending_payment_shipping_benefit" +
      " FROM orders o JOIN customers c ON c.id=o.customer_id" +
      " LEFT JOIN order_shipping_addresses sa ON sa.order_id=o.id" +
      " LEFT JOIN order_contact_details oc ON oc.order_id=o.id" +
      " ORDER BY o.created_at DESC LIMIT 1000" +
      ") " +
      "SELECT ro.*,oi.id AS itemId,oi.product_id AS itemProductId,oi.sku AS itemSku,oi.sku_verified AS itemSkuVerified," +
      " oi.title AS itemTitle,oi.quantity AS itemQuantity,oi.unit_price AS itemUnitPrice," +
      " oi.line_total AS itemLineTotal,oi.fulfillment_type AS itemFulfillmentType" +
      " FROM recent_orders ro LEFT JOIN order_items oi ON oi.order_id=ro.id" +
      " ORDER BY ro.created_at DESC,oi.rowid"
    ).all();

    const byId = new Map();
    for (const row of result.results || []) {
      const {
        itemId, itemProductId, itemSku, itemSkuVerified, itemTitle, itemQuantity, itemUnitPrice, itemLineTotal, itemFulfillmentType,
        ...orderFields
      } = row;
      let order = byId.get(row.id);
      if (!order) {
        order = { ...orderFields, items: [] };
        byId.set(row.id, order);
      }
      if (itemId !== null && itemId !== undefined) {
        order.items.push({
          id: itemId,
          productId: itemProductId,
          sku: itemSku,
          skuVerified: Number(itemSkuVerified) === 1,
          title: itemTitle,
          quantity: itemQuantity,
          unitPrice: itemUnitPrice,
          lineTotal: itemLineTotal,
          fulfillmentType: itemFulfillmentType || "unclassified"
        });
      }
    }
    return json({ orders: [...byId.values()] });
  } catch {
    return fail("Không đọc được đơn hàng. Hãy kiểm tra các migration 0003, 0005 và 0007.", 503);
  }
}
export async function onRequestPatch(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 32 * 1024);
  if (parsedBody.error === "too_large") return fail("Dữ liệu cập nhật đơn hàng vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Dữ liệu cập nhật không hợp lệ.");
  const body = parsedBody.value;
  const id = String(body?.id || ""), status = String(body?.status || "");
  const statuses = ["pending_confirmation","confirmed","processing","shipped","completed","cancelled"];
  if (body?.paymentStatus !== undefined) return fail("Không được tự đặt trạng thái thanh toán. Chỉ giao dịch đã được Admin đối chiếu thực tế mới thay đổi trạng thái.",409);
  if (!id || !statuses.includes(status)) return fail("Trạng thái đơn hàng không hợp lệ.");
  if (body?.prices !== undefined && (!Array.isArray(body.prices) || body.prices.length > 50)) return fail("Danh sách giá cần xác nhận không hợp lệ.");
  try {
    const existing = await context.env.DB.prepare("SELECT id FROM orders WHERE id=?").bind(id).first();
    if (!existing) return fail("Không tìm thấy đơn hàng.", 404);
    const itemResult = await context.env.DB.prepare("SELECT id,quantity,unit_price FROM order_items WHERE order_id=?").bind(id).all();
    const items = itemResult.results || [];
    const itemMap = new Map(items.map(item => [item.id, { ...item, unit_price: item.unit_price === null ? null : Number(item.unit_price) }]));
    const statements = [];
    for (const price of body.prices || []) {
      const itemId = String(price?.itemId || "");
      const unitPrice = price?.unitPrice;
      if (!itemMap.has(itemId)) return fail("Một giá nhập không thuộc đơn hàng này.", 400);
      if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || unitPrice > 2_000_000_000) return fail("Giá phải là số nguyên không âm.");
      const item = itemMap.get(itemId); item.unit_price = unitPrice;
      statements.push(context.env.DB.prepare("UPDATE order_items SET unit_price=?,line_total=? WHERE id=? AND order_id=?").bind(unitPrice,unitPrice*Number(item.quantity),itemId,id));
    }
    const pricedItems = [...itemMap.values()];
    const allPriced = pricedItems.length > 0 && pricedItems.every(item => item.unit_price !== null && Number.isSafeInteger(item.unit_price) && item.unit_price >= 0);
    const subtotal = allPriced ? pricedItems.reduce((sum,item) => sum + item.unit_price * Number(item.quantity),0) : null;
    if (subtotal !== null && !Number.isSafeInteger(subtotal)) return fail("Tổng giá trị đơn vượt giới hạn số nguyên an toàn.");
    if (["confirmed","processing","shipped","completed"].includes(status) && !allPriced) return fail("Hãy xác nhận giá của tất cả sản phẩm trước khi xác nhận hoặc xử lý đơn.",409);
    if (body.termsConfirmed === true && !allPriced) return fail("Cần xác nhận giá của tất cả dòng hàng trước khi chốt điều kiện thanh toán.",409);
    const note = String(body.paymentTermsNote || "").trim();
    if (note.length > 1000) return fail("Ghi chú điều kiện thanh toán tối đa 1.000 ký tự.");
    const termsConfirmed = body.termsConfirmed === true;
    const priceChanged = (body.prices || []).length > 0;
    const confirmationAt = termsConfirmed ? new Date().toISOString() : null;
    statements.push(context.env.DB.prepare("UPDATE orders SET status=?,subtotal=?,total=?,price_confirmation_required=?,payment_terms_confirmed_at=CASE WHEN ?=1 THEN ? WHEN ?=1 THEN NULL ELSE payment_terms_confirmed_at END,payment_terms_confirmed_by=CASE WHEN ?=1 THEN 'admin' WHEN ?=1 THEN '' ELSE payment_terms_confirmed_by END,payment_terms_note=CASE WHEN ?=1 THEN ? ELSE payment_terms_note END,updated_at=datetime('now') WHERE id=?").bind(status,subtotal,subtotal,allPriced?0:1,termsConfirmed?1:0,confirmationAt,priceChanged?1:0,termsConfirmed?1:0,priceChanged?1:0,termsConfirmed?1:0,note,id));
    statements.push(context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'order_updated', 'order', ?, ?)").bind(crypto.randomUUID(),id,JSON.stringify({ status, pricesUpdated: (body.prices || []).length, priceConfirmed: allPriced, paymentTermsConfirmed:termsConfirmed, paymentTermsNoteLength:note.length })));
    await context.env.DB.batch(statements);
    await sendAdminPush(context.env, { title: "Đơn hàng được cập nhật", body: "Trạng thái: " + status + (termsConfirmed ? " · Đã xác nhận điều kiện" : ""), url: "/admin/" });
    return json({ ok: true, priceConfirmationRequired: !allPriced, total: subtotal, message: allPriced ? "Đã cập nhật đơn hàng và xác nhận tổng tiền." : "Đã cập nhật trạng thái. Đơn vẫn chờ xác nhận giá." });
  } catch { return fail("Không thể cập nhật đơn hàng.", 503); }
}
