import { constantTimeTextEqual, fail, json, readBodyBytesLimited, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import {
  ARCHIVE_LIMIT, createArchivePart, parseRestoreArchive, validBucket, validMediaKey,
} from "../../_lib/image-archive.js";

function sourceBucket(env,name) { return validBucket(name)?env[name]:null; }
function notConfigured() { return fail("Kho IMAGES hoặc ORIGINALS chưa được kết nối trong môi trường này.",503); }

// Authenticated, bounded R2 object listing. No public/private R2 URLs are leaked.
export async function onRequestGet(context) {
  const auth=await requireAdmin(context);
  if(auth.response)return auth.response;
  const {env,request}=context;
  const url=new URL(request.url);
  if(url.searchParams.get("mode")!=="scan")return fail("Thao tác không được hỗ trợ.",400);
  const bucket=url.searchParams.get("bucket");
  if(!validBucket(bucket))return fail("Kho ảnh không hợp lệ.");
  const store=sourceBucket(env,bucket);
  if(!store||typeof store.list!=="function")return notConfigured();
  const cursor=url.searchParams.get("cursor");
  if(cursor&&cursor.length>4096)return fail("Dấu trang ảnh quá dài.");
  try {
    const page=await store.list({limit:250,...(cursor?{cursor}:{})});
    if(!page||!Array.isArray(page.objects)||page.objects.length>250)throw Error("R2 listing invalid");
    const supported=page.objects.filter(o=>validMediaKey(o.key)&&Number.isSafeInteger(o.size)&&
      o.size>0&&o.size<=20*1024*1024&&typeof o.etag==="string");
    return json({bucket,objects:supported.map(({key,size,etag})=>({bucket,key,size,etag})),
      excluded:page.objects.length-supported.length,
      truncated:!!page.truncated,cursor:page.truncated?page.cursor:null});
  }catch{return fail("Không đọc được danh sách ảnh R2.",503);}
}

// Download one <=32 MiB ZIP part, OR restore one validated ZIP part.
// Both operations require a signed Admin session + same-origin request.
// Restore additionally requires a fresh admin password and never overwrites.
export async function onRequestPost(context) {
  const auth=await requireAdmin(context);
  if(auth.response)return auth.response;
  const {env,request}=context;
  const mode=new URL(request.url).searchParams.get("mode");
  if(mode==="download"){
    if(!env.IMAGES||!env.ORIGINALS)return notConfigured();
    const parsed=await readJsonBodyLimited(request,64*1024);
    if(parsed.error)return fail("Danh sách tệp ảnh quá lớn hoặc không hợp lệ.",parsed.error==="too_large"?413:400);
    try{
      const zip=await createArchivePart(env,parsed.value);
      return new Response(zip,{status:200,headers:{
        "Content-Type":"application/zip",
        "Content-Disposition":'attachment; filename="sindarealest-images-part-'+parsed.value.part+'.zip"',
        "Cache-Control":"no-store, private",
        "X-Content-Type-Options":"nosniff",
        "X-Frame-Options":"DENY",
        "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'",
      }});
    }catch(error){return fail(String(error?.message||"Không thể tạo ZIP ảnh.").slice(0,220),400);}
  }
  if(mode==="restore"){
    if(!env.IMAGES||!env.ORIGINALS)return notConfigured();
    const password=request.headers.get("X-SD-Restore-Password")||"";
    if(!password||password.length>1024||!constantTimeTextEqual(password,env.ADMIN_PASSWORD)){
      return fail("Cần xác thực lại mật khẩu quản trị để khôi phục ảnh.",403);
    }
    if(!/^(application\/zip|application\/octet-stream)(?:\s*;.*)?$/i.test(request.headers.get("Content-Type")||""))
      return fail("Chỉ nhận tệp ZIP của SinDarealest.",415);
    const parsed=await readBodyBytesLimited(request,ARCHIVE_LIMIT);
    if(parsed.error)return fail("ZIP trống, lỗi hoặc vượt giới hạn 32 MiB.",parsed.error==="too_large"?413:400);
    let entries;
    try{({entries}=parseRestoreArchive(parsed.bytes));}
    catch(error){return fail(String(error?.message||"ZIP không hợp lệ.").slice(0,250));}
    // FULL validation occurs before the first write. Each R2 key is immutable
    // from the restore action if it already exists.
    let restored=0,skipped=0;
    for(const item of entries){
      try {
        const store=env[item.bucket];
        if(await store.head(item.key)){skipped++;continue;}
        await store.put(item.key,item.bytes,{
          httpMetadata:{
            contentType:item.contentType,
            cacheControl:item.bucket==="IMAGES"?"public, max-age=31536000, immutable":"private, no-store",
          },
          customMetadata:item.customMetadata,
        });
        const verified=await store.head(item.key);
        if(!verified||Number(verified.size)!==item.bytes.length)
          throw Error("Không xác minh được bản ảnh khôi phục.");
        restored++;
      }catch{
        return json({ok:false,restored,skipped,total:entries.length,
          error:"Khôi phục chưa hoàn thành. Đã giữ nguyên các ảnh sẵn có. Có thể tải lại chính ZIP này để tiếp tục."},503);
      }
    }
    return json({ok:true,restored,skipped,total:entries.length,
      message:"Đã khôi phục ảnh thiếu; ảnh hiện có không bị ghi đè. Dữ liệu JSON cần khôi phục riêng nếu cần."});
  }
  return fail("Thao tác không hỗ trợ.",400);
}
