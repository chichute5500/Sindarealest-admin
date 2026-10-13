import { fail, json, requireAdmin } from "../../_lib.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    const result = await context.env.DB.prepare(`SELECT o.id,o.order_number,o.status,o.payment_status,o.subtotal,o.total,o.price_confirmation_required,o.customer_note,o.created_at,o.updated_at,c.full_name,c.phone,c.email,c.address FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC LIMIT 1000`).all();
    const orders = await Promise.all((result.results || []).map(async row => {
      const items = await context.env.DB.prepare("SELECT id,product_id AS productId,sku,title,quantity,unit_price AS unitPrice,line_total AS lineTotal FROM order_items WHERE order_id=? ORDER BY rowid").bind(row.id).all();
      return { ...row, items: items.results || [] };
    }));
    return json({ orders });
  } catch { return fail("Không đọc được đơn hàng. Hãy kiểm tra đã áp dụng migration 0003.", 503); }
}

export async function onRequestPatch(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  let body; try { body = await context.request.json(); } catch { return fail("Dữ liệu cập nhật không hợp lệ."); }
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
    return json({ ok: true, priceConfirmationRequired: !allPriced, total: subtotal, message: allPriced ? "Đã cập nhật đơn hàng và xác nhận tổng tiền." : "Đã cập nhật trạng thái. Đơn vẫn chờ xác nhận giá." });
  } catch { return fail("Không thể cập nhật đơn hàng.", 503); }
}
