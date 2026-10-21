import { dbOrFail, fail, json } from "../_lib.js";
import { hashOrderAccessToken, validPublicQrImageKey } from "../_payments.js";

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
    const base = {
      orderNumber:order.order_number, orderStatus:order.status, paymentStatus:order.payment_status,
      paymentTermsConfirmed:Boolean(order.payment_terms_confirmed_at),
      priceConfirmationRequired:Number(order.price_confirmation_required)===1,
      total:order.total===null?null:Number(order.total)
    };
    if (order.status === "cancelled" || Number(order.price_confirmation_required)===1 ||
        !order.payment_terms_confirmed_at || order.total===null || !Number.isSafeInteger(Number(order.total))) {
      return json({ ok:true, ...base, paymentReady:false, message:"Đơn đang chờ SinDarealest xác nhận giá và điều kiện. Vui lòng chưa chuyển khoản." },200,{"Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"});
    }
    const requestRow = await env.DB.prepare("SELECT id,installment_type,amount,shipping_benefit,transfer_reference,qr_image_key,bank_name,account_number,account_name,status,created_at FROM order_payment_requests WHERE order_id=? AND status='pending' ORDER BY created_at DESC LIMIT 1").bind(order.id).first();
    if (!requestRow || !validPublicQrImageKey(requestRow.qr_image_key)) {
      return json({ ok:true, ...base, paymentReady:false, message:"Chưa có yêu cầu thanh toán được SinDarealest tạo. Vui lòng liên hệ tư vấn." },200,{"Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"});
    }
    return json({
      ok:true, ...base, paymentReady:true, installmentType:requestRow.installment_type,
      amount:Number(requestRow.amount), shippingBenefit:requestRow.shipping_benefit || (requestRow.installment_type === 'full' ? 'free_shipping' : 'standard_shipping'), freeShippingEligible:(requestRow.shipping_benefit || (requestRow.installment_type === 'full' ? 'free_shipping' : 'standard_shipping')) === 'free_shipping', freeShipping:Boolean(order.payment_status === "paid" && (requestRow.shipping_benefit || (requestRow.installment_type === 'full' ? 'free_shipping' : 'standard_shipping')) === 'free_shipping'), transferReference:requestRow.transfer_reference,
      qrImageUrl:"/payment-qr/"+requestRow.qr_image_key, bankName:requestRow.bank_name,
      accountNumber:requestRow.account_number, accountName:requestRow.account_name,
      instructions:"Nhập số tiền hiển thị ngoài QR trong ứng dụng ngân hàng; ghi đúng nội dung chuyển khoản. Mở/quét QR không xác nhận đã thanh toán. Freeship chỉ được áp dụng sau khi Admin xác minh đã nhận đủ toàn bộ số tiền.",
      createdAt:requestRow.created_at
    },200,{"Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"});
  } catch { return fail("Không đọc được hướng dẫn thanh toán.",503); }
}
