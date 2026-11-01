import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { validPublicQrImageKey, summarizePaymentRows, discountedCheckoutFullAmount, calculateCheckoutQuote, summarizeOrderPayment } from "../../_payments.js";

function referenceCode() {
  return "SD" + Date.now().toString(36).toUpperCase() + crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase();
}
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  const orderId = String(new URL(context.request.url).searchParams.get("orderId") || "");
  if (!orderId) return fail("Thiếu mã đơn.");
  try {
    const db=context.env.DB;
    const requests=await db.prepare("SELECT id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by,created_at,updated_at FROM order_payment_requests WHERE order_id=? ORDER BY created_at DESC LIMIT 50").bind(orderId).all();
    const transactions=await db.prepare("SELECT id,payment_request_id,direction,amount,transaction_reference,note,actor,verified_at,created_at FROM order_payment_transactions WHERE order_id=? ORDER BY created_at DESC LIMIT 100").bind(orderId).all();
    // Keep the display list bounded, but compute financial totals across the complete ledger.
    const totals=await db.prepare("SELECT COALESCE(SUM(CASE WHEN direction='received' THEN amount ELSE 0 END),0) AS received_amount, COALESCE(SUM(CASE WHEN direction='refunded' THEN amount ELSE 0 END),0) AS refunded_amount FROM order_payment_transactions WHERE order_id=?").bind(orderId).first();
    const order=await db.prepare("SELECT total FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    const activeFull=(requests.results||[]).find(row=>row.installment_type==="full"&&row.status!=="cancelled");
    const payableTotal=activeFull?Number(activeFull.amount):order?.total;
    const summary=summarizePaymentRows([
      {direction:"received",amount:totals?.received_amount},
      {direction:"refunded",amount:totals?.refunded_amount}
    ],payableTotal);
    if(activeFull){summary.originalTotal=Number(order?.total);summary.fullDiscountAmount=Number(order?.total)-Number(activeFull.amount);}
    return json({requests:requests.results||[],transactions:transactions.results||[],summary});
  } catch { return fail("Không đọc được lịch sử thanh toán.",503); }
}
export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const parsed = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsed.error) return fail(parsed.error === "too_large" ? "Yêu cầu thanh toán vượt giới hạn." : "Dữ liệu yêu cầu thanh toán không hợp lệ.", parsed.error === "too_large" ? 413 : 400);
  const body = parsed.value || {};
  const orderId = String(body.orderId || "");
  const paymentOption = String(body.paymentOption || "");
  if (Object.hasOwn(body, "amount")) return fail("Số tiền do máy chủ tự tính; không gửi amount từ trình duyệt.");
  if (!orderId || !["deposit", "balance", "full"].includes(paymentOption)) return fail("Lựa chọn thanh toán không hợp lệ.");
  try {
    const db = context.env.DB;
    const order = await db.prepare("SELECT id,order_number,status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1").bind(orderId).first();
    if (!order) return fail("Không tìm thấy đơn hàng.", 404);
    if (order.status === "cancelled") return fail("Đơn đã hủy không thể tạo yêu cầu thanh toán.", 409);
    if (Number(order.price_confirmation_required) !== 0 || order.total === null || !order.payment_terms_confirmed_at) return fail("Cần xác nhận giá và điều kiện đơn trước khi yêu cầu chuyển khoản.", 409);
    const total = Number(order.total);
    if (!Number.isSafeInteger(total) || total <= 0 || total > 2000000000) return fail("Tổng tiền đã xác nhận không hợp lệ.", 409);

    const itemRows = await db.prepare("SELECT quantity,line_total FROM order_items WHERE order_id=?").bind(orderId).all();
    const items = itemRows.results || [];
    if (!items.length || items.some(item => item.line_total === null || item.line_total === undefined || (typeof item.line_total === "string" && !item.line_total.trim()) || !Number.isSafeInteger(Number(item.line_total)) || Number(item.line_total) < 0)) return fail("Một hoặc nhiều dòng hàng chưa có giá được xác nhận.", 409);
    const itemTotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);
    if (!Number.isSafeInteger(itemTotal) || itemTotal !== total) return fail("Tổng đơn chưa khớp tổng các dòng hàng đã xác nhận; cần kiểm tra thủ công.", 409);
    const fulfillmentType = "all_shipped";

    const settings = await db.prepare("SELECT key,value FROM settings WHERE key IN (?,?,?,?,?)").bind("payment_qr_active","payment_qr_active_key","payment_qr_bank_name","payment_qr_account_number","payment_qr_account_name").all();
    const cfg = Object.fromEntries((settings.results || []).map(row => [row.key, row.value]));
    if (cfg.payment_qr_active !== "1" || !validPublicQrImageKey(cfg.payment_qr_active_key) || !cfg.payment_qr_bank_name || !cfg.payment_qr_account_number || !cfg.payment_qr_account_name) return fail("Chưa kích hoạt cấu hình QR ngân hàng hợp lệ.", 409);
    if (!context.env.IMAGES?.head) return fail("Dịch vụ ảnh QR chưa sẵn sàng; chưa thể tạo yêu cầu chuyển khoản.", 503);
    const activeQrObject = await context.env.IMAGES.head(cfg.payment_qr_active_key);
    if (!activeQrObject) return fail("Ảnh QR đang kích hoạt không còn truy cập được; chưa thể tạo yêu cầu chuyển khoản.", 409);

    const transactionRows = await db.prepare("SELECT direction,amount,actor FROM order_payment_transactions WHERE order_id=?").bind(orderId).all();
    const transactions = transactionRows.results || [];
    const summary = summarizePaymentRows(transactions, total);
    const selectedAudit = await db.prepare(
      "SELECT details_json FROM audit_logs WHERE entity_type='order' AND entity_id=? AND action='order_created' ORDER BY created_at DESC LIMIT 1"
    ).bind(orderId).first();
    let selected={};try{selected=JSON.parse(selectedAudit?.details_json||'{}')}catch{}
    const selectedOption=["deposit","full"].includes(selected.selectedPaymentOption)?selected.selectedPaymentOption:null;
    if(paymentOption==="full"&&selectedOption!=="full")return fail("Chỉ áp dụng giảm 5% khi khách đã chọn thanh toán toàn bộ tại checkout.",409);
    if(["deposit","full"].includes(paymentOption)&&selectedOption&&paymentOption!==selectedOption)return fail("Yêu cầu thanh toán phải khớp phương thức khách đã chọn. Không tự đổi phương thức khi khách chuyển thiếu.",409);
    const selectedTerms=selectedOption?summarizeOrderPayment({total,paymentOption:selectedOption,transactions,termsConfirmed:true}):null;
    let amount;
    const installmentType = paymentOption;
    let shippingBenefit = "standard_shipping";
    if (paymentOption === "deposit") {
      if (transactions.length) return fail("Đơn đã có lịch sử giao dịch; hãy chọn thanh toán số dư sau khi Admin đối chiếu.", 409);
      amount = calculateCheckoutQuote([{unitPrice:total,quantity:1}]).options[0].amount;
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > total) return fail("Khoản đặt cọc theo quy định lớn hơn tổng tiền đơn; cần tư vấn thủ công.", 409);
    } else if (paymentOption === "full") {
      if (transactions.length) return fail("Đơn đã có lịch sử giao dịch; không tạo lại yêu cầu thanh toán đủ. Hãy chọn thanh toán số dư.", 409);
      amount = discountedCheckoutFullAmount(total);
      shippingBenefit = "free_shipping";
    } else {
      if (selectedTerms && selectedTerms.shortfall !== null && selectedTerms.shortfall <= 0) return fail("Đơn đã đủ khoản chuyển theo phương thức khách chọn; không cần tạo yêu cầu bổ sung.",409);
      const received=selectedTerms?.netReceivedAmount ?? summary.netReceivedAmount;
      if (received <= 0) return fail("Thanh toán bổ sung chỉ được tạo sau khi Admin xác nhận đã nhận một phần tiền.",409);
      amount = selectedTerms?.shortfall ?? summary.remainingBalance;
      if (!Number.isSafeInteger(amount) || amount <= 0) return fail("Đơn không còn khoản thanh toán cần thu.",409);
    }

    const id = crypto.randomUUID();
    const reference=String(order.order_number||'').trim().toUpperCase()||referenceCode();

    // Re-check the validated order and financial snapshot in the same atomic write
    // that creates the QR request. An order price/terms edit or verified transaction
    // may race with the preflight reads above.
    const excludePriorTransactions = paymentOption === "balance"
      ? ""
      : " AND NOT EXISTS (SELECT 1 FROM order_payment_transactions WHERE order_id=?)";
    const insertRequestSql =
      "INSERT INTO order_payment_requests(id,order_id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_by) " +
      "SELECT ?,?,?,?,?,?,?,?,?,?,'pending','admin' " +
      "WHERE EXISTS (SELECT 1 FROM orders WHERE id=? AND status<>'cancelled' AND total=? " +
      "AND price_confirmation_required=0 AND payment_terms_confirmed_at=?) " +
      "AND (SELECT COUNT(*) FROM order_items WHERE order_id=?)=? " +
      "AND COALESCE((SELECT SUM(line_total) FROM order_items WHERE order_id=?),-1)=? " +
      "AND NOT EXISTS (SELECT 1 FROM order_items WHERE order_id=? AND line_total IS NULL)" +
      excludePriorTransactions +
      " AND (SELECT COUNT(*) FROM order_payment_transactions WHERE order_id=?)=? " +
      "AND COALESCE((SELECT SUM(CASE WHEN direction='received' THEN amount ELSE -amount END) " +
      "FROM order_payment_transactions WHERE order_id=?),0)=? " +
      "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_active' AND value='1') " +
      "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_active_key' AND value=?) " +
      "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_bank_name' AND value=?) " +
      "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_account_number' AND value=?) " +
      "AND EXISTS (SELECT 1 FROM settings WHERE key='payment_qr_account_name' AND value=?) " +
      "AND NOT EXISTS (SELECT 1 FROM order_payment_requests WHERE order_id=? AND status='pending')";
    const insertBindings = [
      id,orderId,installmentType,amount,shippingBenefit,reference,
      cfg.payment_qr_active_key,cfg.payment_qr_bank_name,cfg.payment_qr_account_number,cfg.payment_qr_account_name,
      orderId,total,order.payment_terms_confirmed_at,
      orderId,items.length,
      orderId,itemTotal,
      orderId,
      ...(paymentOption === "balance" ? [] : [orderId]),
      orderId,transactions.length,
      orderId,summary.netReceivedAmount,
      cfg.payment_qr_active_key,cfg.payment_qr_bank_name,cfg.payment_qr_account_number,cfg.payment_qr_account_name,
      orderId
    ];
    const requestDetails = JSON.stringify({requestId:id,installmentType,fulfillmentType,amount,shippingBenefit,reference});
    const results = await db.batch([
      db.prepare(insertRequestSql).bind(...insertBindings),
      db.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) " +
        "SELECT ?,'admin','payment_request_created','order',?,? " +
        "WHERE EXISTS (SELECT 1 FROM order_payment_requests WHERE id=?)"
      ).bind(crypto.randomUUID(),orderId,requestDetails,id)
    ]);
    if (Number(results?.[0]?.meta?.changes || 0) === 0) {
      return fail("Đơn hàng hoặc thông tin thanh toán vừa thay đổi. Hãy tải lại đơn, kiểm tra giao dịch/yêu cầu QR hiện tại rồi thử lại.",409);
    }
    return json({ok:true,id,installmentType,fulfillmentType,amount,shippingBenefit,freeShippingEligible:shippingBenefit==="free_shipping",freeShippingApplied:false,transferReference:reference,message:shippingBenefit==="free_shipping"?"Đã tạo yêu cầu thanh toán đủ; miễn phí giao hàng theo chính sách.":"Đã tạo yêu cầu thanh toán theo loại hàng và giá đã xác nhận."},201);
  } catch(error) {
    if (/UNIQUE constraint|idx_order_payment_requests_one_pending/i.test(String(error?.message || ""))) return fail("Đơn đang có yêu cầu thanh toán chờ xử lý. Hãy hủy yêu cầu cũ trước.", 409);
    return fail("Không tạo được yêu cầu thanh toán.", 503);
  }
}
export async function onRequestPatch(context) {
  const auth=await requireAdmin(context);if(auth.response)return auth.response;
  const parsed=await readJsonBodyLimited(context.request,4*1024);
  if(parsed.error||!parsed.value||parsed.value.action!=="cancel")return fail("Thao tác hủy yêu cầu không hợp lệ.");
  const id=String(parsed.value.id||"");if(!id)return fail("Thiếu mã yêu cầu thanh toán.");
  try {
    const row=await context.env.DB.prepare("SELECT id,order_id,status FROM order_payment_requests WHERE id=? LIMIT 1").bind(id).first();
    if(!row)return fail("Không tìm thấy yêu cầu thanh toán.",404);
    if(row.status!=="pending")return fail("Chỉ hủy yêu cầu đang chờ.",409);
    const results=await context.env.DB.batch([
      context.env.DB.prepare("UPDATE order_payment_requests SET status='cancelled',updated_at=datetime('now') WHERE id=? AND status='pending'").bind(id),
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?,'admin','payment_request_cancelled','order',?,? WHERE changes()=1").bind(crypto.randomUUID(),row.order_id,JSON.stringify({requestId:id}))
    ]);
    if(Number(results?.[0]?.meta?.changes)!==1)return fail("Yêu cầu đã được xử lý hoặc không còn chờ; không thể hủy.",409);
    return json({ok:true,message:"Đã hủy yêu cầu thanh toán đang chờ."});
  } catch { return fail("Không hủy được yêu cầu thanh toán.",503); }
}
