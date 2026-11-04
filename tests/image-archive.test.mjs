import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import {
  ARCHIVE_LIMIT, crc32, makeZip, parseRestoreArchive, readZipStore,
  sniffMedia, validBucket, validMediaKey,
} from "../public/admin/image-archive-client.js";
import {onRequestGet,onRequestPost} from "../functions/api/admin/image-archive.js";

const secret="archive-test-secret-with-more-than-32-characters",password="archive-owner-test-password";
const session=await createSession(secret);
const png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
const jpg=Uint8Array.from([0xff,0xd8,0xff,0xee,4,5,6,7]);
const webp=Uint8Array.from([82,73,70,70,4,0,0,0,87,69,66,80,1,2,3,4]);
assert.equal(sniffMedia(webp),"image/webp");
assert.equal(sniffMedia(png),"image/png");
assert.equal(sniffMedia(jpg),"image/jpeg");
assert.equal(crc32(new TextEncoder().encode("123456789")),0xcbf43926);
for(const key of ["x/../a.webp","/root.png","a\\b.webp","x//a.jpg","bad.exe","a/\u0000.jpg","p/.png"])
 assert.equal(validMediaKey(key),false,"reject unsafe key "+key);
assert.ok(validMediaKey("private-originals/abc.jpg"));
assert.ok(validBucket("IMAGES")&&!validBucket("BACKUPS"));

const manifest={format:"sindarealest-image-zip-v1",part:1,objects:[
 {bucket:"IMAGES",key:"one.webp",size:webp.length,etag:"a",customMetadata:{visibility:"public-optimized-derivative"}},
 {bucket:"ORIGINALS",key:"private-originals/one.jpg",size:jpg.length,etag:"b"}]};
const zipped=await makeZip([
 {name:"manifest.json",data:JSON.stringify(manifest)},
 {name:"product-index.json",data:JSON.stringify({items:[{sku:"SD001",images:["/media/one.webp"]}]})},
 {name:"IMAGES/one.webp",data:webp},{name:"ORIGINALS/private-originals/one.jpg",data:jpg},
]).arrayBuffer();
const archive=parseRestoreArchive(zipped);
assert.equal(archive.entries.length,2);
assert.deepEqual(archive.entries.map(e=>e.bucket),["IMAGES","ORIGINALS"]);
assert.equal(readZipStore(zipped).size,4);
const changed=new Uint8Array(zipped.slice(0));changed[30+"manifest.json".length+7]^=0x7f;
assert.throws(()=>parseRestoreArchive(changed),/CRC32|ZIP/);
const badManifest={...manifest,objects:[{...manifest.objects[0],key:"../../danger.webp"}]};
const badZip=await makeZip([{name:"manifest.json",data:JSON.stringify(badManifest)},{name:"IMAGES/one.webp",data:webp}]).arrayBuffer();
assert.throws(()=>parseRestoreArchive(badZip),/không hợp lệ/);
assert.throws(()=>makeZip([{name:"../evil",data:"abc"}]),/không an toàn/);
assert.throws(()=>makeZip([{name:"a",data:new Uint8Array(ARCHIVE_LIMIT)}]),/quá lớn|vượt giới hạn/);

class R2{
 constructor(objects=[]){this.map=new Map(objects.map(x=>[x.key,x]));this.deleted=0;this.putCount=0;this.putOptions=[];}
 async list({limit,cursor}={}){const all=[...this.map.values()],start=Number(cursor||0),slice=all.slice(start,start+limit);
  return {objects:slice.map(({key,size,etag})=>({key,size,etag})),truncated:start+slice.length<all.length,
   cursor:start+slice.length<all.length?String(start+slice.length):undefined};}
 async head(key){return this.map.get(key)||null;}
 async get(key){
  const x=this.map.get(key);if(!x)return null;
  return {key,size:x.size,etag:x.etag,customMetadata:x.customMetadata||{},
   body:new ReadableStream({start(controller){controller.enqueue(x.data);controller.close()}}),
   async arrayBuffer(){return x.data.buffer.slice(x.data.byteOffset,x.data.byteOffset+x.data.byteLength);}};
 }
 async put(key,data,options){
  if(this.map.has(key))return null; // emulate conditional atomic If-None-Match
  assert.equal(options.onlyIf.get("If-None-Match"),"*");
  this.putCount++;this.putOptions.push(options);
  const bytes=Uint8Array.from(data),x={key,data:bytes,size:bytes.length,etag:"new"};
  this.map.set(key,x);return x;
 }
 async delete(){this.deleted++;throw Error("Restore must never delete R2 originals");}
}
function item(key,data,etag){return {key,data,size:data.length,etag,customMetadata:{visibility:"private-original"}};}
const sourceImages=new R2([item("one.webp",webp,"img-1")]);
const sourceOriginals=new R2([item("private-originals/one.jpg",jpg,"org-1")]);
const env={DB:{},IMAGES:sourceImages,ORIGINALS:sourceOriginals,ADMIN_PASSWORD:password,SESSION_SECRET:secret};
function request(q,method="GET",body=null,authenticated=true,extra={}){
 return new Request("https://qa.invalid/api/admin/image-archive?"+q,{method,
  headers:{Origin:"https://qa.invalid","Sec-Fetch-Site":"same-origin",
   ...(authenticated?{Cookie:"sd_admin_session="+session}:{}),...extra},...(body?{body}:{})});
}
const unauth=await onRequestGet({request:request("mode=scan&bucket=IMAGES","GET",null,false),env});
assert.equal(unauth.status,401,"Inventory requires signed Admin session");
const cross=new Request("https://qa.invalid/api/admin/image-archive?mode=scan&bucket=IMAGES",{
 headers:{Cookie:"sd_admin_session="+session,Origin:"https://evil.invalid","Sec-Fetch-Site":"cross-site"}});
assert.equal((await onRequestGet({request:cross,env})).status,403,"Reject cross-origin inventory");
const listed=await onRequestGet({request:request("mode=scan&bucket=IMAGES"),env});
assert.equal(listed.status,200);
assert.equal((await listed.json()).objects[0].key,"one.webp");
const object=await onRequestGet({request:request("mode=object&bucket=IMAGES&key=one.webp&etag=img-1"),env});
assert.equal(object.status,200);
assert.deepEqual(new Uint8Array(await object.arrayBuffer()),webp);
assert.match(decodeURIComponent(object.headers.get("X-SD-Image-Metadata")),/private-original/);
const stale=await onRequestGet({request:request("mode=object&bucket=IMAGES&key=one.webp&etag=old"),env});
assert.equal(stale.status,409);
assert.equal(sourceImages.putCount,0,"Download must not write R2");
const missingPass=await onRequestPost({request:request("mode=restore-object&bucket=IMAGES&key=new.webp","POST",webp,true,{"Content-Type":"application/octet-stream"}),env});
assert.equal(missingPass.status,403,"Reauthentication required to restore");
const invalidContent=await onRequestPost({request:request("mode=restore-object&bucket=IMAGES&key=new.webp","POST",png,true,
 {"Content-Type":"application/octet-stream","X-SD-Restore-Password":password}),env});
assert.equal(invalidContent.status,400,"Reject mismatched image extension");
assert.equal(sourceImages.putCount,0,"No writes for bad image");
const uploadHeaders={"Content-Type":"application/octet-stream","X-SD-Restore-Password":password,
 "X-SD-Image-Metadata":encodeURIComponent(JSON.stringify({visibility:"private-original"}))};
const restored=await onRequestPost({request:request("mode=restore-object&bucket=ORIGINALS&key=private-originals/new.jpg","POST",jpg,true,uploadHeaders),env});
assert.equal(restored.status,200);assert.equal((await restored.json()).restored,1);
assert.equal(sourceOriginals.putCount,1);
const repeat=await onRequestPost({request:request("mode=restore-object&bucket=ORIGINALS&key=private-originals/new.jpg","POST",jpg,true,uploadHeaders),env});
assert.equal(repeat.status,200);assert.equal((await repeat.json()).skipped,1);
assert.equal(sourceOriginals.putCount,1,"Never overwrite existing file");
assert.equal(sourceOriginals.deleted,0);
const badMeta=await onRequestPost({request:request("mode=restore-object&bucket=IMAGES&key=some.webp","POST",webp,true,
 {...uploadHeaders,"X-SD-Image-Metadata":encodeURIComponent(JSON.stringify({"__proto__":"danger",a:{b:1}}))}),env});
assert.equal(badMeta.status,400,"Reject hostile metadata");
assert.equal(sourceImages.putCount,0);
console.log("PASS: browser ZIP CRC/paths, streamed R2 download, Admin auth + CSRF, stale ETag, password, media validation, conditional no-overwrite restore.");
