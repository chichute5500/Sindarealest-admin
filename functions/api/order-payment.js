import { dbOrFail, fail, json } from "../_lib.js";
import { hashOrderAccessToken, validPublicQrImageKey } from "../_payments.js";

const PRIVATE_PAYMENT_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow"
});

export async function onRequestGet({ request, env }) {
  const unavailable = dbOrFail(env); if (unavailable) return unavailable;
  const url = new URL(request.url);
  const orderNumber = String(url.searchParams.get("orderNumber") || "").trim();
  const token = String(url.searchParams.get("token") || "");
  if (!orderNumber || orderNumber.length > 80 || token.length < 40 || token.length > 100) return fail("Thiếu mã đơn hoặc mã truy cập hợp lệ.");
  try {
    const tokenHash = await hashOrderAccessToken(token);
    const order = await env.DB.prepare("SELECT id,order_number,status,payment_status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE order_number=? AND public_access_token_hash=? LIMIT 1").bind(orderNumber,tokenHash).first();
    if (!order) return fail("Không tìm thấy đơn hàng hoặc mã truy cập không hợp lệ.",404);
    const rawOrderTotal = order.total === null || order.total === undefined || (typeof order.total === "string" && !order.total.trim()) ? null : Number(order.total);
    const payableOrderTotalReady = Number(order.price_confirmation_required) === 0
      && Boolean(order.payment_terms_confirmed_at)
      && Number.isSafeInteger(rawOrderTotal) && rawOrderTotal > 0 && rawOrderTotal <= 2_000_000_000;
    const base = {
      orderNumber:order.order_number, orderStatus:order.status, paymentStatus:order.payment_status,
      paymentTermsConfirmed:Boolean(order.payment_terms_confirmed_at),
      priceConfirmationRequired:Number(order.price_confirmation_required)===1,
      total:payableOrderTotalReady ? rawOrderTotal : null
    };
    if (order.status === "cancelled" || !payableOrderTotalReady) {
      return json({ ok:true, ...base, paymentReady:false, message:"Đơn đang chờ SinDarealest xác nhận giá và điều kiện. Vui lòng chưa chuyển khoản." },200,PRIVATE_PAYMENT_HEADERS);
    }
    const requestRow = await env.DB.prepare("SELECT id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_at FROM order_payment_requests WHERE order_id=? ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END, created_at DESC, id DESC LIMIT 1").bind(order.id).first();
    if (!requestRow || !validPublicQrImageKey(requestRow.qr_image_key)) {
      return json({ ok:true, ...base, paymentReady:false, message:"Chưa có yêu cầu thanh toán được SinDarealest tạo. Vui lòng liên hệ tư vấn." },200,PRIVATE_PAYMENT_HEADERS);
    }
    const shippingBenefit = requestRow.shipping_benefit || (requestRow.installment_type === "full" ? "free_shipping" : "standard_shipping");
    const freeShippingEligible = shippingBenefit === "free_shipping";
    const freeShipping = order.payment_status === "paid" && freeShippingEligible;
    if (order.payment_status === "paid" || requestRow.status !== "pending") {
      return json({
        ok:true, ...base, paymentReady:false, installmentType:requestRow.installment_type,
        shippingBenefit, freeShippingEligible, freeShipping,
        amount:null, transferReference:requestRow.transfer_reference,
        message:freeShipping ? "Đã xác minh thanh toán đủ. Đơn đủ điều kiện miễn phí giao hàng." :
          (order.payment_status === "paid" ? "Admin đã xác minh đơn được thanh toán đủ." : "Yêu cầu thanh toán trước đã kết thúc; hãy chờ SinDarealest tạo đợt tiếp theo."),
        createdAt:requestRow.created_at
      },200,PRIVATE_PAYMENT_HEADERS);
    }
    const qrSettingsResult = await env.DB.prepare("SELECT key,value FROM settings WHERE key IN ('payment_qr_active','payment_qr_active_key')").all();
    const qrSettings = Object.fromEntries((qrSettingsResult.results || []).map(row => [row.key, row.value]));
    const qrSnapshotIsCurrent = qrSettings.payment_qr_active === "1"
      && qrSettings.payment_qr_active_key === requestRow.qr_image_key
      && typeof env.IMAGES?.head === "function"
      && Boolean(await env.IMAGES.head(requestRow.qr_image_key));
    if (!qrSnapshotIsCurrent) {
      return json({
        ok:true, ...base, paymentReady:false, installmentType:requestRow.installment_type,
        shippingBenefit, freeShippingEligible, freeShipping:false,
        amount:null, transferReference:null,
        message:"Mã QR của yêu cầu này không còn hoạt động. Vui lòng chưa chuyển khoản; liên hệ SinDarealest để được cập nhật yêu cầu thanh toán.",
        createdAt:requestRow.created_at
      },200,PRIVATE_PAYMENT_HEADERS);
    }
    return json({
      ok:true, ...base, paymentReady:true, installmentType:requestRow.installment_type,
      amount:Number(requestRow.amount), shippingBenefit, freeShippingEligible, freeShipping,
      transferReference:requestRow.transfer_reference,
      qrImageUrl:"/payment-qr/"+requestRow.qr_image_key, bankName:requestRow.bank_name,
      accountNumber:requestRow.account_number, accountName:requestRow.account_name,
      instructions:"Nhập số tiền hiển thị ngoài QR trong ứng dụng ngân hàng; ghi đúng nội dung chuyển khoản. Mở/quét QR không xác nhận đã thanh toán. Freeship chỉ được áp dụng sau khi Admin xác minh đã nhận đủ toàn bộ số tiền.",
      createdAt:requestRow.created_at
    },200,PRIVATE_PAYMENT_HEADERS);
  } catch { return fail("Không đọc được hướng dẫn thanh toán.",503); }
}
