import { constantTimeTextEqual, fail, json, requireAdmin } from "../../_lib.js";
import { sniffMedia, validBucket, validMediaKey } from "../../_lib/image-archive.js";

const MAX_IMAGE_BYTES=20*1024*1024;
function sourceBucket(env,name){return validBucket(name)?env[name]:null}
function notConfigured(){return fail("Kho IMAGES hoặc ORIGINALS chưa được kết nối trong môi trường này.",503)}
function typeForKey(key){
 return /\.webp$/i.test(key)?"image/webp":/\.png$/i.test(key)?"image/png":/\.jpe?g$/i.test(key)?"image/jpeg":null;
}
function readMetadata(header){
 if(!header)return {};
 if(header.length>7000)throw Error("Metadata quá lớn.");
 let obj;
 try{obj=JSON.parse(decodeURIComponent(header));}catch{throw Error("Metadata không hợp lệ.");}
 if(!obj||typeof obj!=="object"||Array.isArray(obj)||JSON.stringify(obj).length>1800)throw Error("Metadata không hợp lệ.");
 for(const [key,value] of Object.entries(obj)){
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,59}$/.test(key)||typeof value!=="string"||value.length>1000)throw Error("Metadata không hợp lệ.");
 }
 return obj;
}

// Workers Free 10ms CPU: scanning and streaming objects are server-side;
// ZIP packaging/CRC and ZIP parsing run in the Admin browser instead.
export async function onRequestGet(context){
 const auth=await requireAdmin(context);
 if(auth.response)return auth.response;
 const {env,request}=context,url=new URL(request.url);
 const bucket=url.searchParams.get("bucket");
 if(!validBucket(bucket))return fail("Kho ảnh không hợp lệ.");
 const store=sourceBucket(env,bucket);
 if(!store)return notConfigured();
 const mode=url.searchParams.get("mode");
 if(mode==="scan"){
  const cursor=url.searchParams.get("cursor");
  if(cursor&&cursor.length>4096)return fail("Dấu trang ảnh quá dài.");
  try{
   const page=await store.list({limit:250,...(cursor?{cursor}:{})});
   if(!page||!Array.isArray(page.objects)||page.objects.length>250)throw Error("R2 listing invalid");
   const supported=page.objects.filter(o=>validMediaKey(o.key)&&Number.isSafeInteger(o.size)&&
    o.size>0&&o.size<=MAX_IMAGE_BYTES&&typeof o.etag==="string");
   return json({bucket,objects:supported.map(({key,size,etag})=>({bucket,key,size,etag})),
    excluded:page.objects.length-supported.length,truncated:!!page.truncated,cursor:page.truncated?page.cursor:null});
  }catch{return fail("Không đọc được danh sách ảnh R2.",503);}
 }
 if(mode==="object"){
  const key=url.searchParams.get("key"),expected=url.searchParams.get("etag");
  if(!validMediaKey(key)||!expected||expected.length>160)return fail("Tệp ảnh không hợp lệ.");
  try{
   const obj=await store.get(key);
   if(!obj)return fail("Ảnh không còn tồn tại trong kho R2.",404);
   if(!obj.body||obj.etag!==expected)return fail("Ảnh đã thay đổi. Hãy kiểm tra lại danh sách.",409);
   if(!Number.isSafeInteger(obj.size)||obj.size<1||obj.size>MAX_IMAGE_BYTES)return fail("Ảnh vượt giới hạn 20 MB.",413);
   const meta=obj.customMetadata||{};
   const serialized=encodeURIComponent(JSON.stringify(meta));
   if(serialized.length>7000)return fail("Metadata ảnh vượt giới hạn.",413);
   return new Response(obj.body,{headers:{
    "Content-Type":typeForKey(key),
    "Content-Length":String(obj.size),
    "X-SD-Image-Metadata":serialized,
    "Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"DENY",
    "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'",
   }});
  }catch{return fail("Không tải được ảnh gốc từ R2.",503);}
 }
 return fail("Thao tác không hỗ trợ.",400);
}

/**
 * Inspect only the first media-signature bytes, then stream directly to R2.
 * This avoids buffering 20 MB in Pages Functions, including Workers Free.
 * The stream rejects any payload that exceeds the upload limit.
 */
async function verifiedMediaStream(body, expectedType) {
 if(!body)throw Error("Ảnh không có dữ liệu.");
 const reader=body.getReader(),initial=[];
 let checked=0,transferred=0;
 const signature=new Uint8Array(12);
 while(checked<12){
  const item=await reader.read();
  if(item.done)break;
  const value=item.value;
  if(!(value instanceof Uint8Array)||!value.byteLength)continue;
  transferred+=value.byteLength;
  if(transferred>MAX_IMAGE_BYTES)throw Error("Ảnh vượt giới hạn 20 MB.");
  initial.push(value);
  const take=Math.min(12-checked,value.byteLength);
  signature.set(value.subarray(0,take),checked);checked+=take;
 }
 if(sniffMedia(signature.subarray(0,checked))!==expectedType)
  throw Error("Tệp ảnh không khớp phần mở rộng hoặc bị hỏng.");
 const stream=new ReadableStream({
  start(controller){for(const chunk of initial)controller.enqueue(chunk)},
  async pull(controller){
   try{
    const {value,done}=await reader.read();
    if(done){controller.close();return}
    if(!(value instanceof Uint8Array)||!value.byteLength)return;
    transferred+=value.byteLength;
    if(transferred>MAX_IMAGE_BYTES)throw Error("Ảnh vượt giới hạn 20 MB.");
    controller.enqueue(value);
   }catch(error){controller.error(error);await reader.cancel(error).catch(()=>{});}
  },
  cancel(reason){return reader.cancel(reason)},
 });
 return {stream,bytesTransferred:()=>transferred};
}

// Restore ONE already-validated, user-approved media object per request.
// Browser validates the whole ZIP (including its CRC and manifest) BEFORE
// calling this endpoint. Server independently validates key + image magic.
// Atomic R2 conditional write guarantees no overwrite under concurrent calls.
export async function onRequestPost(context){
 const auth=await requireAdmin(context);
 if(auth.response)return auth.response;
 const {request,env}=context,url=new URL(request.url);
 if(url.searchParams.get("mode")!=="restore-object")return fail("Thao tác không hỗ trợ.",400);
 const bucket=url.searchParams.get("bucket"),key=url.searchParams.get("key");
 if(!validBucket(bucket)||!validMediaKey(key))return fail("Khóa ảnh không hợp lệ.");
 const store=sourceBucket(env,bucket);
 if(!store)return notConfigured();
 const password=request.headers.get("X-SD-Restore-Password")||"";
 if(!password||password.length>1024||!constantTimeTextEqual(password,env.ADMIN_PASSWORD))
  return fail("Cần xác thực lại mật khẩu quản trị để khôi phục ảnh.",403);
 if(!/^(application\/octet-stream)(?:\s*;.*)?$/i.test(request.headers.get("Content-Type")||""))
  return fail("Chỉ nhận dữ liệu ảnh nguyên bản.",415);
 let metadata;
 try{metadata=readMetadata(request.headers.get("X-SD-Image-Metadata")||"");}
 catch{return fail("Metadata khôi phục không hợp lệ.",400);}
 const declared=Number(request.headers.get("Content-Length")||0);
 if(!Number.isSafeInteger(declared)||declared>MAX_IMAGE_BYTES)return fail("Ảnh vượt giới hạn 20 MB.",413);
 let media;
 try{media=await verifiedMediaStream(request.body,typeForKey(key));}
 catch(error){return fail(String(error?.message||"Ảnh không hợp lệ.").slice(0,200),400);}
 try{
  if(await store.head(key))return json({ok:true,skipped:1,restored:0});
  const result=await store.put(key,media.stream,{
   onlyIf:new Headers({"If-None-Match":"*"}),
   httpMetadata:{contentType:typeForKey(key),
    cacheControl:bucket==="IMAGES"?"public, max-age=31536000, immutable":"private, no-store"},
   customMetadata:metadata,
  });
  if(result===null)return json({ok:true,skipped:1,restored:0});
  const verified=await store.head(key);
  if(!verified||Number(verified.size)!==media.bytesTransferred()||verified.size>MAX_IMAGE_BYTES)throw Error("Size verify failed");
  return json({ok:true,restored:1,skipped:0});
 }catch{return fail("Không xác minh được ảnh đã khôi phục. Ảnh hiện có không bị xóa.",503);}
}
