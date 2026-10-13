import { dbOrFail, fail, json, rateLimitPublicRequest } from "../_lib.js";
const clean=(v,max=1600)=>String(v??"").trim().slice(0,max);
export async function onRequestPost({request,env}){
 if(request.headers.get("Origin")){try{if(new URL(request.headers.get("Origin")).origin!==new URL(request.url).origin)return fail("Yêu cầu không hợp lệ.",403)}catch{return fail("Yêu cầu không hợp lệ.",403)}}
 const unavailable=dbOrFail(env);if(unavailable)return unavailable;
 try{const lim=await rateLimitPublicRequest(env,request,"warranty_claim",3,900);if(lim.limited)return fail("Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi 15 phút.",429,{"Retry-After":"900"})}catch{return fail("Dịch vụ tiếp nhận yêu cầu chưa sẵn sàng.",503)}
 let body;try{body=await request.json()}catch{return fail("Thông tin yêu cầu bảo hành không hợp lệ.")}
 const ticketId=clean(body?.ticketId,80),warrantyCode=clean(body?.warrantyCode,100).toUpperCase(),issueType=clean(body?.issueType,30),contactPhone=clean(body?.contactPhone,24),description=clean(body?.message,1400),imageKey=clean(body?.imageKey,100);
 if(!/^[0-9a-f-]{32,36}$/i.test(ticketId)||!warrantyCode||!["defect","seam","material","other"].includes(issueType)||description.length<8)return fail("Phiên xác thực, mã bảo hành, loại vấn đề hoặc mô tả chưa hợp lệ.");
 if(contactPhone&&!/^[+0-9() .-]{9,24}$/.test(contactPhone))return fail("Số điện thoại liên hệ chưa hợp lệ.");
 const issueLabels={defect:"Lỗi sản phẩm",seam:"Đường may / hoàn thiện",material:"Chất liệu",other:"Vấn đề khác"};
 const message="Loại vấn đề: "+issueLabels[issueType]+"\n"+(contactPhone?"Số liên hệ khác: "+contactPhone+"\n":"")+"Mô tả: "+description;
 if(imageKey&&!/^warranty-claims\/[0-9a-f]{32}\.webp$/.test(imageKey))return fail("Ảnh đính kèm không hợp lệ.");
 try{
  const ticket=await env.DB.prepare("SELECT ticket_id,customer_id,warranty_id FROM warranty_verifications WHERE ticket_id=? AND customer_id IS NOT NULL AND verified_at IS NOT NULL AND julianday(access_expires_at)>julianday('now') LIMIT 1").bind(ticketId).first();
  if(!ticket)return fail("Phiên xác thực đã hết hạn. Hãy tra cứu và xác thực lại.",401);
  const warranty=await env.DB.prepare("SELECT w.id,w.order_id,o.customer_id,o.order_number FROM warranties w JOIN orders o ON o.id=w.order_id WHERE upper(w.warranty_code)=? AND o.customer_id=? AND w.status='active' AND w.ends_at>=date('now') AND (? IS NULL OR w.id=?) LIMIT 1").bind(warrantyCode,ticket.customer_id,ticket.warranty_id||null,ticket.warranty_id||null).first();
  if(!warranty)return fail("Không tìm thấy bảo hành còn hiệu lực phù hợp với hồ sơ đã xác thực.",409);
  if(imageKey){const uploaded=await env.DB.prepare("SELECT upload_key FROM warranty_claim_uploads WHERE upload_key=? AND ticket_id=? AND julianday(created_at)>julianday('now','-15 minutes') LIMIT 1").bind(imageKey,ticketId).first();if(!uploaded)return fail("Ảnh không thuộc phiên xác thực hiện tại hoặc đã hết hạn.",400)}
  const id=crypto.randomUUID(),statements=[env.DB.prepare("INSERT INTO warranty_claims(id,order_id,customer_id,warranty_code,message) VALUES(?,?,?,?,?)").bind(id,warranty.order_id,ticket.customer_id,warrantyCode,message)];
  if(imageKey){statements.push(env.DB.prepare("INSERT INTO warranty_claim_attachments(claim_id,image_key) VALUES(?,?)").bind(id,imageKey));statements.push(env.DB.prepare("DELETE FROM warranty_claim_uploads WHERE upload_key=?").bind(imageKey))}
  statements.push(env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'customer', 'warranty_claim_created', 'warranty_claim', ?, ?)").bind(crypto.randomUUID(),id,JSON.stringify({orderNumber:warranty.order_number,warrantyCode,hasImage:Boolean(imageKey)})));
  await env.DB.batch(statements);
  return json({ok:true,claimId:id,message:"Đã tiếp nhận yêu cầu bảo hành. SinDarealest sẽ kiểm tra và liên hệ lại."},201);
 }catch{return fail("Chưa thể lưu yêu cầu bảo hành. Vui lòng thử lại hoặc liên hệ SinDarealest qua Zalo.",503)}
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405)}
