import { dbOrFail, fail, json, rateLimitPublicRequest, readJsonBodyLimited } from "../_lib.js";
import {verifyLookupChallenge} from "../_lookup-challenge.js";

// Public tracking deliberately returns only order-stage progress, never
// customer identity, items, amounts, references or the Admin audit details.
const phoneExpression="REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(oc.phone,c.phone),' ',''),'-',''),'(',''),')',''),'+',''),'.',''),'/','')";
const requestedPaymentAmount = "(SELECT CAST(json_extract(ac.details_json,'$.selectedPaymentAmount') AS INTEGER) FROM audit_logs ac WHERE ac.entity_type='order' AND ac.entity_id=o.id AND ac.action='order_created' ORDER BY ac.created_at DESC LIMIT 1)";
const paymentOption = "(SELECT json_extract(ac.details_json,'$.selectedPaymentOption') FROM audit_logs ac WHERE ac.entity_type='order' AND ac.entity_id=o.id AND ac.action='order_created' ORDER BY ac.created_at DESC LIMIT 1)";
const deliveryAt="(SELECT MIN(a.created_at) FROM audit_logs a WHERE a.entity_type='order' AND a.entity_id=o.id AND a.action='order_delivery_updated' AND json_extract(a.details_json,'$.to')=o.delivery_status)";
const stageAt = status => "(SELECT MIN(a.created_at) FROM audit_logs a WHERE a.entity_type='order' AND a.entity_id=o.id AND a.action='order_updated' AND json_extract(a.details_json,'$.status')='"+status+"')";
const paymentAt =
 "(SELECT MIN(pt.verified_at) FROM order_payment_transactions pt WHERE pt.order_id=o.id AND pt.direction='received' AND pt.actor<>'admin_cod_completion'"+
 " AND (SELECT COALESCE(SUM(tx.amount),0) FROM order_payment_transactions tx WHERE tx.order_id=o.id AND tx.direction='received' AND tx.actor<>'admin_cod_completion'"+
 " AND (tx.verified_at<pt.verified_at OR (tx.verified_at=pt.verified_at AND tx.rowid<=pt.rowid)))>="+
 " COALESCE("+requestedPaymentAmount+",o.total))";
const select = "SELECT o.id AS id,o.order_number AS orderNumber,o.status AS status,o.delivery_status AS deliveryStatus,o.created_at AS createdAt,"+
 paymentOption+" AS paymentOption,"+
 deliveryAt+" AS deliveryAt,"+
 stageAt('confirmed')+" AS confirmedAt,"+
 paymentAt+" AS paymentAt,"+
 stageAt('processing')+" AS processingAt,"+
 stageAt('shipped')+" AS shippedAt,"+
 stageAt('completed')+" AS completedAt "+
 "FROM orders o JOIN customers c ON c.id=o.customer_id "+
 "LEFT JOIN order_contact_details oc ON oc.order_id=o.id ";

function normalizePhone(raw) {
 let digits=String(raw||"").replace(/\D/g,"");
 if(digits.startsWith("0084")) digits="0"+digits.slice(4);
 else if(digits.startsWith("84")&&digits.length>=11) digits="0"+digits.slice(2);
 return digits;
}
function timestamp(value) {
 const x=String(value||"").trim();
 return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(x)?x.replace(" ","T")+"Z":
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(x)?x:null;
}
const completedProgress = (done,date) => ({state:done?"done":"upcoming",completedAt:done?timestamp(date):null});
export function publicOrderProgress(row, viaPhone) {
 const status=String(row.status||"");
 const deliveryStatus=String(row.deliveryStatus||(["shipped","completed"].includes(status)?status==="completed"?"delivered":"in_transit":"not_shipped"));
 const cancelled=status==="cancelled";
 const confirmed=["confirmed","processing","shipped","completed"].includes(status);
 const processing=["processing","shipped","completed"].includes(status);
 const shipped=["shipped","completed"].includes(status);
 const completed=status==="completed";
 const deposit=row.paymentOption==="deposit";
 const paid=Boolean(row.paymentAt);
 const steps=[
  {title:"Đã gửi đơn",...completedProgress(true,row.createdAt)},
  {title:"Xác nhận đơn",...completedProgress(confirmed||Boolean(row.confirmedAt),row.confirmedAt)},
  {title:deposit?"Đã nhận cọc":"Đã nhận thanh toán",...completedProgress(paid,row.paymentAt)},
  {title:"Đang làm sản phẩm",...completedProgress(shipped,row.shippedAt)},
  {title:"Đã gửi hàng",...completedProgress(shipped||deliveryStatus==="failed_returning"||deliveryStatus==="returned"||Boolean(row.shippedAt),row.shippedAt)},
  {title:deliveryStatus==="failed_returning"?"Giao thất bại / Đang hoàn hàng":deliveryStatus==="returned"?"Đã hoàn hàng về Shop":"Giao thành công",...completedProgress(["delivered","failed_returning","returned"].includes(deliveryStatus),deliveryStatus==="delivered"?row.completedAt:row.deliveryAt)}
 ];
 if(!cancelled){
   // Show exactly one next operational milestone when prior milestones are
   // recorded. Never mark an unperformed milestone "done" to fill a gap.
   const current=steps.findIndex(step=>step.state==="upcoming");
   if(current>=0&&deliveryStatus!=="returned")steps[current].state="current";
 }
 // A phone number can identify many private customer orders. Do not expose
 // full order identifiers through unauthenticated phone-based search.
 const orderNumber=String(row.orderNumber||"");
 const safeNumber=viaPhone?(orderNumber.length>4?"••••"+orderNumber.slice(-4):"••••"):orderNumber;
 return {orderNumber:safeNumber,status:cancelled?"cancelled":completed?"completed":"in_progress",deliveryStatus,deliveryStatusLabel:({not_shipped:"Chờ gửi hàng",in_transit:"Đang giao",delivered:"Giao thành công",failed_returning:"Giao thất bại / Đang hoàn hàng",returned:"Đã hoàn hàng về Shop"})[deliveryStatus]||"Chưa rõ",steps};
}

export async function onRequestPost({request,env}) {
 const origin=request.headers.get("Origin");
 if(origin) {
  try {if(new URL(origin).origin!==new URL(request.url).origin)return fail("Yêu cầu không hợp lệ.",403);}
  catch{return fail("Yêu cầu không hợp lệ.",403);}
 }
 const unavailable=dbOrFail(env);
 if(unavailable)return unavailable;
 try {
  const limit=await rateLimitPublicRequest(env,request,"public_order_tracking",5,900);
  if(limit.limited)return fail("Bạn đã tra cứu nhiều lần. Vui lòng thử lại sau 15 phút.",429,{"Retry-After":"900"});
 }catch{return fail("Tra cứu tạm thời không khả dụng.",503);}
 const body=await readJsonBodyLimited(request,2048);
 if(body.error==="too_large")return fail("Dữ liệu tra cứu vượt kích thước cho phép.",413);
 if(body.error||!body.value||typeof body.value!=="object"||Array.isArray(body.value))return fail("Dữ liệu tra cứu không hợp lệ.",400);
 const raw=body.value.lookup;
 if(typeof raw!=="string")return fail("Vui lòng nhập mã đơn hoặc số điện thoại.",400);
 const value=raw.trim();
 if(!value||value.length>64)return fail("Mã đơn hoặc số điện thoại không hợp lệ.",400);
 const couldBePhone=/^[+0-9().\s/-]+$/.test(value);
 const phone=couldBePhone?normalizePhone(value):"";
 const byPhone=couldBePhone&&/^\d{9,12}$/.test(phone);
 if(!byPhone&&!/^[A-Za-z0-9-]{5,64}$/.test(value))return fail("Vui lòng nhập mã đơn hoặc số điện thoại hợp lệ.",400);
 if(byPhone){
  const proof=await verifyLookupChallenge(request,env,body.value.turnstileToken,"order_lookup");
  if(!proof.ok)return fail(proof.status===503?
    "Tra cứu theo số điện thoại tạm chưa sẵn sàng. Vui lòng dùng mã đơn hàng.":
    "Vui lòng hoàn thành xác minh trước khi tra cứu.",proof.status);
 }
 const conditions=byPhone?
 "WHERE ("+phoneExpression+"=? OR (substr("+phoneExpression+",1,2)='84' AND '0'||substr("+phoneExpression+",3)=?) OR (substr("+phoneExpression+",1,4)='0084' AND '0'||substr("+phoneExpression+",5)=?))":
 "WHERE upper(o.order_number)=?";
 const args=byPhone?[phone,phone,phone]:[value.toUpperCase()];
 try {
  const data=await env.DB.prepare(select+conditions+" ORDER BY o.created_at DESC LIMIT "+(byPhone?10:1)).bind(...args).all();
  const rows=Array.isArray(data?.results)?data.results:[];
  if(!rows.length)return fail("Không tìm thấy đơn hàng phù hợp. Hãy kiểm tra mã đơn hoặc số điện thoại đã đặt.",404);
  return json({ok:true,viaPhone:byPhone,orders:rows.map(row=>publicOrderProgress(row,byPhone))});
 }catch{return fail("Không thể tra cứu đơn hàng. Vui lòng thử lại.",503);}
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405);}
