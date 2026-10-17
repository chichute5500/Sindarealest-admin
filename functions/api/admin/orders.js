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
      " o.customer_note,o.created_at,o.updated_at,COALESCE(oc.full_name,c.full_name) AS full_name," +
      " COALESCE(oc.phone,c.phone) AS phone,COALESCE(oc.email,c.email) AS email," +
      " COALESCE(sa.full_address,c.address) AS address" +
      " FROM orders o JOIN customers c ON c.id=o.customer_id" +
      " LEFT JOIN order_shipping_addresses sa ON sa.order_id=o.id" +
      " LEFT JOIN order_contact_details oc ON oc.order_id=o.id" +
      " ORDER BY o.created_at DESC LIMIT 1000" +
      ") " +
      "SELECT ro.*,oi.id AS itemId,oi.product_id AS itemProductId,oi.sku AS itemSku," +
      " oi.title AS itemTitle,oi.quantity AS itemQuantity,oi.unit_price AS itemUnitPrice," +
      " oi.line_total AS itemLineTotal" +
      " FROM recent_orders ro LEFT JOIN order_items oi ON oi.order_id=ro.id" +
      " ORDER BY ro.created_at DESC,oi.rowid"
    ).all();

    const byId = new Map();
    for (const row of result.results || []) {
      const {
        itemId, itemProductId, itemSku, itemTitle, itemQuantity, itemUnitPrice, itemLineTotal,
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
          title: itemTitle,
          quantity: itemQuantity,
          unitPrice: itemUnitPrice,
          lineTotal: itemLineTotal
        });
      }
    }
    return json({ orders: [...byId.values()] });
  } catch {
    return fail("Không đọc được đơn hàng. Hãy kiểm tra đã áp dụng migration 0003.", 503);
  }
}
export async function onRequestPatch(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 32 * 1024);
  if (parsedBody.error === "too_large") return fail("Dữ liệu cập nhật đơn hàng vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Dữ liệu cập nhật không hợp lệ.");
  const body = parsedBody.value;
  const id = String(body?.id || ""), status = String(body?.status || ""), paymentStatus = body?.paymentStatus;
  const statuses = ["pending_confirmation","confirmed","processing","shipped","completed","cancelled"];
  const payments = ["unpaid","pending","paid","refunded"];
  if (!id || !statuses.includes(status) || (paymentStatus !== undefined && !payments.includes(paymentStatus))) return fail("Trạng thái đơn hàng không hợp lệ.");
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
    if (paymentStatus === "paid" && !allPriced) return fail("Không thể đánh dấu đã thanh toán khi tổng tiền chưa được xác nhận.",409);
    statements.push(context.env.DB.prepare("UPDATE orders SET status=?,payment_status=COALESCE(?,payment_status),subtotal=?,total=?,price_confirmation_required=?,updated_at=datetime('now') WHERE id=?").bind(status,paymentStatus ?? null,subtotal,subtotal,allPriced?0:1,id));
    statements.push(context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'order_updated', 'order', ?, ?)").bind(crypto.randomUUID(),id,JSON.stringify({ status, paymentStatus: paymentStatus ?? null, pricesUpdated: (body.prices || []).length, priceConfirmed: allPriced })));
    await context.env.DB.batch(statements);
    await sendAdminPush(context.env, { title: "Đơn hàng được cập nhật", body: "Trạng thái: " + status + (paymentStatus ? " · Thanh toán: " + paymentStatus : ""), url: "/admin/" });
    return json({ ok: true, priceConfirmationRequired: !allPriced, total: subtotal, message: allPriced ? "Đã cập nhật đơn hàng và xác nhận tổng tiền." : "Đã cập nhật trạng thái. Đơn vẫn chờ xác nhận giá." });
  } catch { return fail("Không thể cập nhật đơn hàng.", 503); }
}
