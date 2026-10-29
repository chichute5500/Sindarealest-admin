import {getAccount,json,error,sameOrigin} from "../../_customer-auth.js";
import {hashOrderAccessToken} from "../../_payments.js";
import {readJsonBodyLimited} from "../../_lib.js";
const fail=(msg,status=400)=>error(msg,status);
export async function onRequestGet({request,env}){
 if(!env?.DB)return fail("Dịch vụ tạm không sẵn sàng.",503);
 try{
  const account=await getAccount(env,request);
  if(!account)return fail("Bạn cần đăng nhập Google.",401);
  const joined=await env.DB.prepare("SELECT o.id,o.order_number,o.status,o.total,o.price_confirmation_required,o.created_at FROM customer_account_orders a JOIN orders o ON o.id=a.order_id WHERE a.account_id=? ORDER BY o.created_at DESC LIMIT 30").bind(account.id).all();
  const orders=(joined.results||[]).map(o=>({orderNumber:o.order_number,status:o.status,total:o.total,priceConfirmationRequired:!!o.price_confirmation_required,createdAt:o.created_at,items:[]}));
  if(orders.length){
   const ids=(joined.results||[]).map(o=>o.id);
   const rows=await env.DB.prepare("SELECT order_id,sku,title,quantity FROM order_items WHERE order_id IN ("+ids.map(()=>"?").join(",")+") ORDER BY rowid ASC").bind(...ids).all();
   const byId=new Map((joined.results||[]).map((o,i)=>[o.id,orders[i]]));
   for(const item of rows.results||[])byId.get(item.order_id)?.items.push({sku:item.sku,title:item.title,quantity:item.quantity});
  }
  return json({ok:true,orders});
 }catch{return fail("Chưa tải được đơn hàng tài khoản.",503)}
}
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return fail("Yêu cầu không hợp lệ.",403);
 try{
  const account=await getAccount(env,request);
  if(!account)return fail("Bạn cần đăng nhập Google.",401);
  const parsed=await readJsonBodyLimited(request,2048);
  if(parsed.error||!parsed.value||typeof parsed.value!=="object")return fail("Dữ liệu không hợp lệ.");
  const number=String(parsed.value.orderNumber||"").trim();
  const token=String(parsed.value.orderAccessToken||"").trim();
  if(!/^SD-[A-Z0-9-]{8,48}$/.test(number)||!/^[a-zA-Z0-9_-]{32,200}$/.test(token))return fail("Mã đơn hoặc mã xác thực không hợp lệ.");
  const hash=await hashOrderAccessToken(token);
  const order=await env.DB.prepare("SELECT id FROM orders WHERE order_number=? AND public_access_token_hash=?").bind(number,hash).first();
  if(!order?.id)return fail("Không xác thực được quyền sở hữu đơn hàng.",403);
  const owner=await env.DB.prepare("SELECT account_id FROM customer_account_orders WHERE order_id=?").bind(order.id).first();
  if(owner && owner.account_id!==account.id)return fail("Đơn hàng đã thuộc về tài khoản khác. Liên hệ Shop nếu cần hỗ trợ.",409);
  await env.DB.prepare("INSERT OR IGNORE INTO customer_account_orders(account_id,order_id) VALUES(?,?)").bind(account.id,order.id).run();
  return json({ok:true,orderNumber:number});
 }catch{return fail("Chưa lưu được đơn hàng vào tài khoản.",503)}
}
