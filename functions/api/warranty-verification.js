import { dbOrFail, fail, json, rateLimitPublicRequest } from "../_lib.js";
const clean=(v,max=180)=>String(v??"").trim().slice(0,max);
const encoder=new TextEncoder();
function normalizePhone(v){let d=String(v??"").replace(/\D/g,"");if(d.startsWith("84"))d="0"+d.slice(2);return d}
function e164(v){const d=String(v??"").replace(/\D/g,"");if(d.startsWith("84"))return "+"+d;if(d.startsWith("0"))return "+84"+d.slice(1);return ""}
async function hashOtp(ticket,otp){const bytes=new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(ticket+":"+otp)));return [...bytes].map(x=>x.toString(16).padStart(2,"0")).join("")}
function equal(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0}
async function sendSms(env,to,otp){const sid=env.TWILIO_ACCOUNT_SID,token=env.TWILIO_AUTH_TOKEN,from=env.TWILIO_FROM_NUMBER;if(!sid||!token||!from)return false;try{const body=new URLSearchParams({To:to,From:from,Body:"Ma xac thuc SinDarealest: "+otp+". Ma co hieu luc 5 phut. Khong chia se ma nay."});const r=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+encodeURIComponent(sid)+"/Messages.json",{method:"POST",headers:{Authorization:"Basic "+btoa(sid+":"+token),"Content-Type":"application/x-www-form-urlencoded"},body});return r.ok}catch{return false}}
const publicMessage="Nếu thông tin khớp hồ sơ, mã xác thực sẽ được gửi đến số điện thoại đã đăng ký.";
const phoneSql="CASE WHEN substr(replace(replace(replace(replace(replace(replace(phone,' ',''),'-',''),'(',''),')',''),'+',''),'.',''),1,2)='84' THEN '0'||substr(replace(replace(replace(replace(replace(replace(phone,' ',''),'-',''),'(',''),')',''),'+',''),'.',''),3) ELSE replace(replace(replace(replace(replace(replace(phone,' ',''),'-',''),'(',''),')',''),'+',''),'.','') END";
export async function onRequestPost({request,env}){
 if(request.headers.get("Origin")){try{if(new URL(request.headers.get("Origin")).origin!==new URL(request.url).origin)return fail("Yêu cầu không hợp lệ.",403)}catch{return fail("Yêu cầu không hợp lệ.",403)}}
 const unavailable=dbOrFail(env);if(unavailable)return unavailable;
 let body;try{body=await request.json()}catch{return fail("Thông tin xác thực không hợp lệ.")}
 const action=clean(body?.action,20);
 try{const lim=await rateLimitPublicRequest(env,request,action==="verify"?"warranty_otp_verify":"warranty_otp_send",action==="verify"?10:5,900);if(lim.limited)return fail("Bạn đã thao tác quá nhiều lần. Vui lòng đợi trước khi thử lại.",429,{"Retry-After":"900"})}catch{return fail("Dịch vụ xác thực chưa sẵn sàng.",503)}
 if(action==="send"){
  if(!env.TWILIO_ACCOUNT_SID||!env.TWILIO_AUTH_TOKEN||!env.TWILIO_FROM_NUMBER)return fail("Chưa cấu hình dịch vụ SMS. Cần thêm TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN và TWILIO_FROM_NUMBER trong Cloudflare Pages Secrets.",503);
  const method=clean(body?.method,20),value=clean(body?.value,120);
  if(!["phone","code"].includes(method)||!value)return fail("Chọn cách tra cứu và nhập thông tin cần kiểm tra.");
  if(method==="phone"&&normalizePhone(value).length<9)return fail("Số điện thoại chưa hợp lệ.");
  if(method==="code"&&!/^[A-Za-z0-9_-]{4,100}$/.test(value))return fail("Mã bảo hành chưa hợp lệ.");
  const ticketId=crypto.randomUUID();let customer=null,warrantyId=null;
  try{
   if(method==="phone"){const phone=normalizePhone(value);customer=await env.DB.prepare("SELECT c.id,c.phone FROM customers c WHERE "+phoneSql.replaceAll("phone","c.phone")+"=? AND EXISTS(SELECT 1 FROM orders o JOIN warranties w ON w.order_id=o.id WHERE o.customer_id=c.id) LIMIT 1").bind(phone).first()}
   else{const row=await env.DB.prepare("SELECT c.id,c.phone,w.id AS warranty_id FROM warranties w JOIN orders o ON o.id=w.order_id JOIN customers c ON c.id=o.customer_id WHERE upper(w.warranty_code)=upper(?) LIMIT 1").bind(value).first();if(row){customer=row;warrantyId=row.warranty_id}}
   const registeredPhone=customer?.phone?normalizePhone(customer.phone):"",to=customer?.phone?e164(customer.phone):"",matched=Boolean(customer?.id&&registeredPhone&&to);
   let otp=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0");if(!matched)otp=String((Number(otp)+379131)%1000000).padStart(6,"0");
   const otpHash=await hashOtp(ticketId,otp);
   await env.DB.prepare("DELETE FROM warranty_verifications WHERE julianday(expires_at)<julianday('now','-1 day')").run();
   const count=matched?await env.DB.prepare("SELECT COUNT(*) AS count FROM warranty_verifications WHERE phone=? AND julianday(created_at)>julianday('now','-15 minutes')").bind(registeredPhone).first():null;
   const maySend=matched&&Number(count?.count||0)<3;
   await env.DB.prepare("INSERT INTO warranty_verifications(ticket_id,customer_id,warranty_id,phone,otp_hash,attempts,expires_at) VALUES(?,?,?,?,?,0,?)").bind(ticketId,maySend?customer.id:null,maySend?warrantyId:null,registeredPhone,otpHash,new Date(Date.now()+5*60*1000).toISOString()).run();
   if(maySend&&!await sendSms(env,to,otp))await env.DB.prepare("DELETE FROM warranty_verifications WHERE ticket_id=?").bind(ticketId).run();
   return json({ok:true,ticketId,message:publicMessage},202);
  }catch{return fail("Chưa thể bắt đầu xác thực. Vui lòng thử lại.",503)}
 }
 if(action==="verify"){
  const ticketId=clean(body?.ticketId,80),code=clean(body?.code,10);
  if(!/^[0-9a-f-]{32,36}$/i.test(ticketId)||!/^\d{6}$/.test(code))return fail("Mã xác thực không đúng hoặc đã hết hạn.");
  try{
   const ticket=await env.DB.prepare("SELECT ticket_id,customer_id,warranty_id,otp_hash,attempts,expires_at FROM warranty_verifications WHERE ticket_id=? LIMIT 1").bind(ticketId).first();
   if(!ticket||!ticket.customer_id||Number(ticket.attempts)>=5||!(Date.parse(ticket.expires_at)>Date.now()))return fail("Mã xác thực không đúng hoặc đã hết hạn.",400);
   const updated=await env.DB.prepare("UPDATE warranty_verifications SET attempts=attempts+1 WHERE ticket_id=? AND attempts<5 AND julianday(expires_at)>julianday('now')").bind(ticketId).run();
   if(!updated.meta?.changes)return fail("Mã xác thực không đúng hoặc đã hết hạn.",400);
   if(!equal(await hashOtp(ticketId,code),String(ticket.otp_hash||"")))return fail("Mã xác thực không đúng hoặc đã hết hạn.",400);
   await env.DB.prepare("UPDATE warranty_verifications SET verified_at=datetime('now'),access_expires_at=datetime('now','+15 minutes') WHERE ticket_id=?").bind(ticketId).run();
   const result=await env.DB.prepare("SELECT w.id,w.warranty_code AS warrantyCode,w.policy_name AS policyName,w.duration_months AS durationMonths,w.starts_at AS startsAt,w.ends_at AS endsAt,CASE WHEN w.status='active' AND w.ends_at>=date('now') THEN 'active' WHEN w.status='active' THEN 'expired' ELSE w.status END AS status,o.order_number AS orderNumber,o.created_at AS purchasedAt,oi.sku,oi.title,COALESCE(d.size,'') AS size,p.images_json AS imagesJson FROM warranties w JOIN orders o ON o.id=w.order_id JOIN order_items oi ON oi.id=w.order_item_id LEFT JOIN order_item_details d ON d.item_id=oi.id LEFT JOIN products p ON p.id=oi.product_id WHERE o.customer_id=? AND (? IS NULL OR w.id=?) ORDER BY o.created_at DESC,w.created_at DESC").bind(ticket.customer_id,ticket.warranty_id||null,ticket.warranty_id||null).all();
   const warranties=(result.results||[]).map(w=>{let images=[];try{images=JSON.parse(w.imagesJson||"[]")}catch{}const end=Date.parse(String(w.endsAt||"")+"T23:59:59Z");return {id:w.id,warrantyCode:w.warrantyCode,policyName:w.policyName,durationMonths:w.durationMonths,startsAt:w.startsAt,endsAt:w.endsAt,status:w.status,orderNumber:w.orderNumber,purchasedAt:String(w.purchasedAt||"").slice(0,10),sku:w.sku,title:w.title,size:w.size||"",image:Array.isArray(images)?images[0]||"": "",remainingDays:Number.isFinite(end)?Math.max(0,Math.ceil((end-Date.now())/86400000)):null,eligible:w.status==="active"&&String(w.endsAt)>=new Date().toISOString().slice(0,10)}})
   return json({ok:true,warranties,accessExpiresAt:new Date(Date.now()+15*60*1000).toISOString()});
  }catch{return fail("Chưa thể tra cứu hồ sơ bảo hành. Vui lòng thử lại.",503)}
 }
 return fail("Thao tác xác thực không hợp lệ.");
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405)}
