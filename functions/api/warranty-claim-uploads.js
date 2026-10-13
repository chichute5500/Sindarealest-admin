import { dbOrFail, fail, json, rateLimitPublicRequest, storageOrFail } from "../_lib.js";
export async function onRequestPost({request,env}){
 if(request.headers.get("Origin")){try{if(new URL(request.headers.get("Origin")).origin!==new URL(request.url).origin)return fail("Yêu cầu không hợp lệ.",403)}catch{return fail("Yêu cầu không hợp lệ.",403)}}
 const unavailable=dbOrFail(env);if(unavailable)return unavailable;const noStorage=storageOrFail(env);if(noStorage)return noStorage;
 try{const lim=await rateLimitPublicRequest(env,request,"warranty_claim_upload",3,900);if(lim.limited)return fail("Bạn đã tải lên quá nhiều ảnh. Vui lòng đợi.",429,{"Retry-After":"900"})}catch{return fail("Dịch vụ tải ảnh chưa sẵn sàng.",503)}
 let form;try{form=await request.formData()}catch{return fail("Không đọc được biểu mẫu ảnh.")}
 const warrantyCode=String(form.get("warrantyCode")||"").trim().toUpperCase(),file=form.get("file");
 if(!/^SDW-[A-Z0-9]{24}$/.test(warrantyCode))return fail("Mã bảo hành không hợp lệ.");
 if(!file||typeof file.arrayBuffer!=="function"||file.size<=0||file.size>5*1024*1024||file.type!=="image/webp")return fail("Ảnh phải là WebP hợp lệ và không vượt quá 5 MB.");
 try{
  const warranty=await env.DB.prepare("SELECT w.warranty_code,w.status,w.ends_at FROM warranties w WHERE upper(w.warranty_code)=? LIMIT 1").bind(warrantyCode).first();
  if(!warranty||warranty.status!=="active"||String(warranty.ends_at)<new Date().toISOString().slice(0,10))return fail("Không tìm thấy bảo hành còn hiệu lực.",404);
  const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length<12||new TextDecoder().decode(bytes.slice(0,4))!=="RIFF"||new TextDecoder().decode(bytes.slice(8,12))!=="WEBP")return fail("Nội dung tệp không phải WebP hợp lệ.");
  const key="warranty-claims/"+crypto.randomUUID().replaceAll("-","")+".webp";
  await env.IMAGES.put(key,bytes,{httpMetadata:{contentType:"image/webp",cacheControl:"private, max-age=300"},customMetadata:{purpose:"warranty-claim",warrantyCode}});
  await env.DB.prepare("INSERT INTO warranty_claim_upload_tokens(upload_key,warranty_code) VALUES(?,?)").bind(key,warrantyCode).run();
  return json({ok:true,imageKey:key},201);
 }catch{return fail("Không thể lưu ảnh lỗi. Vui lòng thử lại.",503)}
}
export async function onRequestGet(){return fail("Phương thức không được hỗ trợ.",405)}
