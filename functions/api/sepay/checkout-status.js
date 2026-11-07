import { dbOrFail, fail, json } from "../../_lib.js";
import { hashOrderAccessToken } from "../../_payments.js";
import { paymentDetailsForOrder } from "../order-payment.js";

const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow"};

export async function onRequestGet({request,env}){
  const unavailable=dbOrFail(env);if(unavailable)return unavailable;
  const url=new URL(request.url);
  const intentId=String(url.searchParams.get("intentId")||"").trim();
  const token=String(url.searchParams.get("token")||"");
  if(!/^[0-9a-f-]{36}$/i.test(intentId)||token.length<40||token.length>100)return fail("Thiếu mã phiên thanh toán hợp lệ.",400,headers);
  try{
    const tokenHash=await hashOrderAccessToken(token);
    const intent=await env.DB.prepare("SELECT id,status,order_id,order_number,transfer_reference,amount,expires_at FROM sepay_checkout_intents WHERE id=? AND access_token_hash=? LIMIT 1").bind(intentId,tokenHash).first();
    if(!intent)return fail("Không tìm thấy phiên thanh toán.",404,headers);
    if(intent.status==="paid"&&intent.order_id){
      const order=await env.DB.prepare("SELECT id,order_number,status,delivery_status,payment_status,total,price_confirmation_required,payment_terms_confirmed_at FROM orders WHERE id=? LIMIT 1").bind(intent.order_id).first();
      if(!order)return fail("Đơn thanh toán đang được đồng bộ. Vui lòng kiểm tra lại sau.",503,headers);
      return paymentDetailsForOrder(order,env);
    }
    if(intent.status!=="pending"||Date.parse(intent.expires_at)<=Date.now()){
      if(intent.status==="pending")await env.DB.prepare("UPDATE sepay_checkout_intents SET status='expired',payload_json='{}',updated_at=datetime('now') WHERE id=? AND status='pending'").bind(intentId).run();
      return json({ok:true,paid:false,expired:true,message:"Phiên thanh toán đã hết hạn. Vui lòng tạo yêu cầu mới hoặc liên hệ SinDarealest."},200,headers);
    }
    return json({ok:true,paid:false,paymentProvider:"sepay",paymentReady:true,transferReference:intent.transfer_reference,amount:Number(intent.amount),message:"Đang chờ SePay xác nhận tiền vào tài khoản."},200,headers);
  }catch{return fail("Không đọc được trạng thái thanh toán.",503,headers)}
}

export async function onRequestPost(){return fail("Phương thức không được hỗ trợ.",405,headers)}
