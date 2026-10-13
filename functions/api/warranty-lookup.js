import { dbOrFail, fail, json, rateLimitPublicRequest } from "../_lib.js";
const clean=(v,max=100)=>String(v??"").trim().toUpperCase().slice(0,max);
export async function onRequestPost({request,env}){
 if(request.headers.get("Origin")){try{if(new URL(request.headers.get("Origin")).origin!==new URL(request.url).origin)return fail("Yêu cầu không hợp lệ.",403)}catch{return fail("Yêu cầu không hợp lệ.",403)}}
 const unavailable=dbOrFail(env);if(unavailable)return unavailable;
 try{const lim=await rateLimitPublicRequest(env,request,"warranty_lookup",10,900);if(lim.limited)return fail("Bạn đã tra cứu quá nhiều lần. Vui lòng đợi 15 phút.",429,{"Retry-After":"900"})}catch{return fail("Dịch vụ tra cứu chưa sẵn sàng.",503)}
 let body;try{body=await request.json()}catch{return fail("Mã bảo hành không hợp lệ.")}
 const code=clean(body?.warrantyCode);
 if(!/^SDW-[A-Z0-9]{24}$/.test(code))return fail("Vui lòng nhập đúng mã bảo hành được cấp.");
 try{
  const row=await env.DB.prepare("SELECT w.warranty_code,w.duration_months,w.starts_at,w.ends_at,w.status,oi.sku,oi.title,COALESCE(d.size,'') AS size,o.created_at AS purchasedAt,p.images_json AS imagesJson FROM warranties w JOIN orders o ON o.id=w.order_id JOIN order_items oi ON oi.id=w.order_item_id LEFT JOIN order_item_details d ON d.item_id=oi.id LEFT JOIN products p ON p.id=oi.product_id WHERE upper(w.warranty_code)=? LIMIT 1").bind(code).first();
  if(!row)return fail("Không tìm thấy mã bảo hành. Hãy kiểm tra lại mã được cấp.",404);
  let images=[];try{images=JSON.parse(row.imagesJson||"[]")}catch{}
  const today=new Date().toISOString().slice(0,10),expired=row.status==="active"&&String(row.ends_at)<today,status=expired?"expired":row.status,eligible=status==="active"&&String(row.ends_at)>=today;
  const remainingDays=eligible?Math.max(0,Math.ceil((Date.parse(row.ends_at+"T00:00:00Z")-Date.parse(today+"T00:00:00Z"))/86400000)):0;
  return json({ok:true,warranty:{warrantyCode:row.warranty_code,maskedWarrantyCode:"••••"+row.warranty_code.slice(-4),title:row.title,sku:row.sku,size:row.size,image:Array.isArray(images)?images[0]||"": "",purchasedAt:String(row.purchasedAt||"").slice(0,10),startsAt:row.starts_at,endsAt:row.ends_at,durationMonths:row.duration_months,status,eligible,remainingDays}});
 }catch{return fail("Chưa thể tra cứu bảo hành. Vui lòng thử lại.",503)}
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405)}
