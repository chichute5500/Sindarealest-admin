import {dbOrFail,fail} from "../../_lib.js";
import {getAccount} from "../../_customer-auth.js";
import {paymentDetailsForOrder} from "../order-payment.js";

// Bank details may only be read for an order explicitly linked to THIS login.
// Neither a phone number nor knowledge of another order code authorizes access.
export async function onRequestGet({request,env}){
 const unavailable=dbOrFail(env);if(unavailable)return unavailable;
 const orderNumber=String(new URL(request.url).searchParams.get("orderNumber")||"").trim();
 if(!/^(?:SD[A-Z0-9]{8,48}|SD-[A-Z0-9-]{8,48})$/.test(orderNumber))return fail("Mã đơn không hợp lệ.",400);
 try {
  const account=await getAccount(env,request);
  if(!account)return fail("Cần đăng nhập để xem thanh toán đơn đã liên kết.",401);
  const order=await env.DB.prepare(
   "SELECT o.id,o.order_number,o.status,o.delivery_status,o.payment_status,o.total,o.price_confirmation_required,o.payment_terms_confirmed_at "+
   "FROM customer_account_orders a JOIN orders o ON o.id=a.order_id "+
   "WHERE a.account_id=? AND o.order_number=? LIMIT 1"
  ).bind(account.id,orderNumber).first();
  if(!order)return fail("Không tìm thấy đơn hàng đã liên kết với tài khoản này.",404);
  return await paymentDetailsForOrder(order,env);
 }catch{return fail("Không tải được hướng dẫn thanh toán.",503)}
}
export async function onRequestPost(){return fail("Phương thức không được hỗ trợ.",405)}
