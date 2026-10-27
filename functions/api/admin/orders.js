import { fail, getCurrentDateInVietnam, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { addWarrantyCalendarMonths, shopWarrantyPolicy } from "../../_warranty-policy.js";
import { sendAdminPush } from "../../_notifications.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    // Limit parent orders first, then join all their items in one read. This
    // avoids one D1 request per order when the admin screen loads up to 1,000.
    const result = await context.env.DB.prepare(
      "WITH recent_orders AS (" +
      " SELECT o.id,o.customer_id AS customerId,o.order_number,o.status,o.payment_status,o.subtotal,o.total,o.price_confirmation_required," +
      " o.customer_note,o.payment_terms_confirmed_at,o.payment_terms_confirmed_by,o.payment_terms_note,o.created_at,o.updated_at,COALESCE(oc.full_name,c.full_name) AS full_name," +
      " (SELECT json_extract(details_json,'$.selectedPaymentOption') FROM audit_logs WHERE entity_type='order' AND entity_id=o.id AND action='order_created' ORDER BY created_at DESC LIMIT 1) AS customer_payment_option," +
      " (SELECT json_extract(details_json,'$.selectedPaymentAmount') FROM audit_logs WHERE entity_type='order' AND entity_id=o.id AND action='order_created' ORDER BY created_at DESC LIMIT 1) AS customer_payment_amount," +
      " (SELECT json_extract(details_json,'$.selectedRemainingAmount') FROM audit_logs WHERE entity_type='order' AND entity_id=o.id AND action='order_created' ORDER BY created_at DESC LIMIT 1) AS customer_payment_remaining_amount," +
      " (SELECT json_extract(details_json,'$.selectedDiscountAmount') FROM audit_logs WHERE entity_type='order' AND entity_id=o.id AND action='order_created' ORDER BY created_at DESC LIMIT 1) AS customer_payment_discount_amount," +
      " (SELECT json_extract(details_json,'$.transferReference') FROM audit_logs WHERE entity_type='order' AND entity_id=o.id AND action='order_created' ORDER BY created_at DESC LIMIT 1) AS customer_transfer_reference," +
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
    const existing = await context.env.DB.prepare("SELECT id,status FROM orders WHERE id=?").bind(id).first();
    if (!existing) return fail("Không tìm thấy đơn hàng.", 404);
    if (existing.status === "cancelled" && status !== "cancelled") return fail("Đơn đã hủy không thể mở lại hoặc tiếp tục xử lý.", 409);
    // A cancelled order cannot accept a verified receipt while its QR request remains pending.
    // Require explicit QR cancellation before cancelling the order, then recheck at UPDATE time below.
    if (status === "cancelled") {
      const pendingRequest = await context.env.DB.prepare(
        "SELECT id FROM order_payment_requests WHERE order_id=? AND status='pending' LIMIT 1"
      ).bind(id).first();
      if (pendingRequest) return fail("Không thể hủy đơn khi yêu cầu QR còn chờ. Hãy hủy yêu cầu QR trước rồi thử lại.", 409);
    }
    const itemResult = await context.env.DB.prepare("SELECT id,quantity,unit_price FROM order_items WHERE order_id=?").bind(id).all();
    const items = itemResult.results || [];
    const itemMap = new Map(items.map(item => [item.id, { ...item, unit_price: item.unit_price === null || item.unit_price === undefined ? null : Number(item.unit_price) }]));
    const priceUpdates = [];
    const seenPriceItemIds = new Set();
    let priceChanged = false;
    for (const price of body.prices || []) {
      const itemId = String(price?.itemId || "");
      const unitPrice = price?.unitPrice;
      if (!itemMap.has(itemId)) return fail("Một giá nhập không thuộc đơn hàng này.", 400);
      if (seenPriceItemIds.has(itemId)) return fail("Không được nhập trùng một dòng giá trong cùng lần lưu.", 400);
      seenPriceItemIds.add(itemId);
      if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || unitPrice > 2_000_000_000) return fail("Giá phải là số nguyên không âm.");
      const item = itemMap.get(itemId);
      if (item.unit_price !== unitPrice) priceChanged = true;
      item.unit_price = unitPrice;
      priceUpdates.push({ itemId, unitPrice, lineTotal: unitPrice * Number(item.quantity) });
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
    const confirmationAt = termsConfirmed ? new Date().toISOString() : null;

    // Keep payment amounts and verified ledger history tied to the confirmed order total.
    // The API/UI submits existing values during ordinary saves, so only real price changes
    // must be blocked when a QR request is pending or a verified transaction already exists.
    if (priceChanged) {
      const financialState = await context.env.DB.prepare(
        "SELECT EXISTS (SELECT 1 FROM order_payment_transactions WHERE order_id=?) AS has_transactions, " +
        "EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending') AS has_pending_request, " +
        "EXISTS (SELECT 1 FROM warranties WHERE order_id=?) AS has_warranties"
      ).bind(id,id,id).first();
      if (Number(financialState?.has_transactions) > 0) return fail("Không thể sửa giá khi đơn đã có giao dịch được xác minh. Cần đối soát lịch sử thanh toán trước khi thay đổi giá.",409);
      if (Number(financialState?.has_pending_request) > 0) return fail("Không thể sửa giá khi đơn còn yêu cầu QR đang chờ. Hãy hủy yêu cầu QR trước khi thay đổi giá.",409);
      if (Number(financialState?.has_warranties) > 0) return fail("Không thể sửa giá sau khi đã cấp bảo hành. Hãy xử lý ngoại lệ theo quy trình Shop.",409);
    }

    const statements = [];
    const priceStatements = [];
    const priceGuardSql =
      " AND NOT EXISTS (SELECT 1 FROM order_payment_transactions WHERE order_id=?)" +
      " AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')" +
      " AND NOT EXISTS (SELECT 1 FROM warranties WHERE order_id=?)";
    const terminalStatusGuardSql = " AND EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'cancelled')";
    const cancellationRequestGuardSql =
      " AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')";
    // Saves with unchanged prices must not rewrite order-item prices.
    // Such a write could roll back a concurrently verified price snapshot.
    const unchangedItemGuardSql =
      " AND (SELECT COUNT(*) FROM order_items WHERE order_id=?)=?" +
      items.map(() => " AND EXISTS (SELECT 1 FROM order_items WHERE order_id=? AND id=? AND quantity=? AND unit_price IS ?)").join("");
    const unchangedItemGuardBindings = [
      id, items.length,
      ...items.flatMap(item => [id, item.id, item.quantity, item.unit_price == null ? null : Number(item.unit_price)]),
    ];
    for (const update of (priceChanged ? priceUpdates : [])) {
      const itemGuardSql = priceChanged ? priceGuardSql + (status === "cancelled" ? "" : terminalStatusGuardSql) : (status === "cancelled" ? cancellationRequestGuardSql : "");
      // The guarded parent order UPDATE runs first. changes() chains each
      // following item write to the preceding successful statement.
      const sql = "UPDATE order_items SET unit_price=?,line_total=? WHERE id=? AND order_id=?" +
        itemGuardSql + " AND changes()=1";
      const values = [update.unitPrice,update.lineTotal,update.itemId,id];
      if (priceChanged) {
        values.push(id,id,id);
        if (status !== "cancelled") values.push(id);
      } else if (status === "cancelled") values.push(id);
      priceStatements.push(context.env.DB.prepare(sql).bind(...values));
    }

    // First claim an optimistic snapshot of the original item prices, counts,
    // quantities AND original order status, before modifying any line items.
    // D1 batches execute under one transaction; a zero-row claim gates every
    // later price update and its audit with the SQLite changes() chain.
    const orderUpdateIndex = 0;
    const orderUpdateSql =
      "UPDATE orders SET status=?,subtotal=?,total=?,price_confirmation_required=?," +
      "payment_terms_confirmed_at=CASE WHEN ?=1 THEN ? WHEN ?=1 THEN NULL ELSE payment_terms_confirmed_at END," +
      "payment_terms_confirmed_by=CASE WHEN ?=1 THEN 'admin' WHEN ?=1 THEN '' ELSE payment_terms_confirmed_by END," +
      "payment_terms_note=CASE WHEN ?=1 THEN ? ELSE payment_terms_note END,updated_at=datetime('now') WHERE id=? AND status=?" +
      (priceChanged ? priceGuardSql : "") + unchangedItemGuardSql +
      (status === "cancelled" ? " AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')" : " AND status<>'cancelled'");
    const orderUpdateValues = [
      status,subtotal,subtotal,allPriced?0:1,termsConfirmed?1:0,confirmationAt,
      priceChanged?1:0,termsConfirmed?1:0,priceChanged?1:0,termsConfirmed?1:0,note,id,existing.status
    ];
    if (priceChanged) orderUpdateValues.push(id,id,id);
    orderUpdateValues.push(...unchangedItemGuardBindings);
    // Non-cancelled UPDATE uses a literal status guard with no extra SQL bind.
    // Binding one more ID here previously made every ordinary order save fail (503).
    if (status === "cancelled") orderUpdateValues.push(id);
    statements.push(context.env.DB.prepare(orderUpdateSql).bind(...orderUpdateValues));
    statements.push(...priceStatements);

    const auditDetails = JSON.stringify({
      status, pricesUpdated: priceUpdates.length, priceChanged, priceConfirmed: allPriced,
      paymentTermsConfirmed: termsConfirmed, paymentTermsNoteLength: note.length
    });
    const orderAuditId = crypto.randomUUID();
    if (priceChanged) {
      // Re-check the same invariant inside the atomic batch: if financial activity
      // appeared after the preflight SELECT, all guarded item/order/audit writes are no-ops.
      statements.push(context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?, 'admin', 'order_updated', 'order', ?, ? " +
        "WHERE NOT EXISTS (SELECT 1 FROM order_payment_transactions WHERE order_id=?) " +
        "AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending') " +
        "AND NOT EXISTS (SELECT 1 FROM warranties WHERE order_id=?) " +
        "AND changes()=1"
      ).bind(orderAuditId,id,auditDetails,id,id,id));
    } else if (status === "cancelled") {
      statements.push(context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?, 'admin', 'order_updated', 'order', ?, ? " +
        "WHERE changes()=1 AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')"
      ).bind(orderAuditId,id,auditDetails,id));
    } else {
      statements.push(context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'order_updated', 'order', ?, ? WHERE changes()=1"
      ).bind(orderAuditId,id,auditDetails));
    }

    // First confirmation issues one warranty per order line in the SAME D1
    // batch as the optimistic order status update and audit. Every insert is
    // gated by the unique order-update audit ID from this transaction. If an
    // order-status, item-price, or payment guard rejects the update, NO
    // warranty can be created and the entire operation remains atomic.
    const activateWarranty = existing.status === "pending_confirmation" && status === "confirmed";
    const issueAuditIds = [];
    if (activateWarranty) {
      const policy = shopWarrantyPolicy(subtotal);
      const startsAt = getCurrentDateInVietnam();
      const endsAt = addWarrantyCalendarMonths(startsAt, policy.durationMonths);
      for (const item of items) {
        const warrantyId = crypto.randomUUID();
        const warrantyCode = "SDW-" + crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase();
        const warrantyAuditId = crypto.randomUUID();
        const insertIndex = statements.length;
        statements.push(context.env.DB.prepare(
          "INSERT INTO warranties(id,order_id,order_item_id,warranty_code,policy_name,duration_months,starts_at,ends_at,status) " +
          "SELECT ?,oi.order_id,oi.id,?,?,?,?,?,'active' FROM order_items oi WHERE oi.id=? AND oi.order_id=? " +
          "AND NOT EXISTS (SELECT 1 FROM warranties WHERE order_item_id=oi.id) " +
          "AND EXISTS (SELECT 1 FROM audit_logs WHERE id=? AND entity_type='order' AND entity_id=oi.order_id AND action='order_updated') " +
          "AND EXISTS (SELECT 1 FROM orders o WHERE o.id=oi.order_id AND o.status='confirmed' AND o.total=?)"
        ).bind(warrantyId,warrantyCode,policy.policyName,policy.durationMonths,startsAt,endsAt,item.id,id,orderAuditId,subtotal));
        statements.push(context.env.DB.prepare(
          "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
          "SELECT ?, 'admin', 'warranty_issued', 'warranty', ?, ? WHERE EXISTS (SELECT 1 FROM warranties WHERE id=?)"
        ).bind(warrantyAuditId,warrantyId,JSON.stringify({ orderId:id, orderItemId:item.id, warrantyCode, source:"automatic_order_confirmation", policyName:policy.policyName, months:policy.durationMonths, startsAt, endsAt }),warrantyId));
        issueAuditIds.push(insertIndex);
      }
    }

    // Cancelling a formerly confirmed order must not leave active warranty
    // coverage behind. This is atomic with order cancellation, and leaves
    // previously voided or manually managed warranty records intact.
    if (status === "cancelled" && existing.status !== "cancelled") {
      statements.push(context.env.DB.prepare(
        "UPDATE warranties SET status='void' WHERE order_id=? AND status='active' " +
        "AND EXISTS (SELECT 1 FROM audit_logs WHERE id=? AND entity_type='order' AND entity_id=? AND action='order_updated') " +
        "AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')"
      ).bind(id,orderAuditId,id,id));
      statements.push(context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?, 'admin', 'warranties_voided_on_cancellation', 'order', ?, ? WHERE changes()>0 " +
        "AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')"
      ).bind(crypto.randomUUID(),id,JSON.stringify({ reason:"order_cancelled", source:"automatic_warranty_policy" }),id));
    }
    const batchResults = await context.env.DB.batch(statements);
    if (Number(batchResults?.[orderUpdateIndex]?.meta?.changes || 0) === 0) {
      if (status === "cancelled") return fail("Không thể hủy đơn vì yêu cầu QR đang chờ hoặc đơn vừa thay đổi. Hãy hủy yêu cầu QR trước rồi tải lại đơn.",409);
      if (priceChanged) return fail("Giá không thể thay đổi vì đơn/trạng thái/giá dòng hàng đã thay đổi đồng thời, hoặc đã phát sinh thanh toán. Không ghi đè dữ liệu; hãy tải lại đơn và đối soát trước.",409);
      return fail("Đơn hàng vừa thay đổi hoặc đã hủy. Hãy tải lại đơn trước khi cập nhật trạng thái.",409);
    }
    const warrantiesIssued = issueAuditIds.filter(index => Number(batchResults?.[index]?.meta?.changes || 0) > 0).length;
    await sendAdminPush(context.env, { title: "Đơn hàng được cập nhật", body: "Trạng thái: " + status + (termsConfirmed ? " · Đã xác nhận điều kiện" : ""), url: "/admin/" });
    return json({ ok: true, priceConfirmationRequired: !allPriced, total: subtotal, warrantiesIssued, message: activateWarranty
      ? (warrantiesIssued ? "Đã xác nhận đơn và tự kích hoạt " + warrantiesIssued + " bảo hành." : "Đã xác nhận đơn; sản phẩm đã có bảo hành nên không cấp trùng.")
      : allPriced ? "Đã cập nhật đơn hàng và xác nhận tổng tiền." : "Đã cập nhật trạng thái. Đơn vẫn chờ xác nhận giá." });
  } catch { return fail("Không thể cập nhật đơn hàng.", 503); }
}
