import assert from "node:assert/strict";
import { createSession } from "../functions/_lib.js";
import {
  ARCHIVE_LIMIT, crc32, createArchivePart, makeZip, parseRestoreArchive, readZipStore,
  sniffMedia, validBucket, validMediaKey,
} from "../functions/_lib/image-archive.js";
import {onRequestGet,onRequestPost} from "../functions/api/admin/image-archive.js";

const secret="archive-test-secret-with-more-than-32-characters";
const password="archive-owner-test-password";
const session=await createSession(secret);
const png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
const jpg=Uint8Array.from([0xff,0xd8,0xff,0xee,4,5,6,7]);
const webp=Uint8Array.from([82,73,70,70,4,0,0,0,87,69,66,80,1,2,3,4]);
assert.equal(sniffMedia(webp),"image/webp");
assert.equal(sniffMedia(png),"image/png");
assert.equal(sniffMedia(jpg),"image/jpeg");
assert.equal(crc32(new TextEncoder().encode("123456789")),0xcbf43926);
for(const key of ["x/../a.webp","/root.png","a\\b.webp","x//a.jpg","bad.exe","a/\u0000.jpg","p/.png"]){
 assert.equal(validMediaKey(key),false,"reject unsafe key "+key);
}
assert.ok(validMediaKey("private-originals/abc.jpg"));
assert.ok(validBucket("IMAGES"));
assert.ok(!validBucket("BACKUPS"));
const goodManifest={format:"sindarealest-image-zip-v1",part:1,objects:[
 {bucket:"IMAGES",key:"one.webp",size:webp.length,etag:"a",customMetadata:{visibility:"public-optimized-derivative"}},
 {bucket:"ORIGINALS",key:"private-originals/one.jpg",size:jpg.length,etag:"b"}
]};
const goodZip=await makeZip([
 {name:"manifest.json",data:JSON.stringify(goodManifest)},
 {name:"product-index.json",data:JSON.stringify({items:[]})},
 {name:"IMAGES/one.webp",data:webp},
 {name:"ORIGINALS/private-originals/one.jpg",data:jpg},
]).arrayBuffer();
const valid=parseRestoreArchive(goodZip);
assert.equal(valid.entries.length,2);
assert.deepEqual(valid.entries.map(x=>x.bucket),["IMAGES","ORIGINALS"]);
assert.equal(readZipStore(goodZip).size,4);
const broken=new Uint8Array(goodZip.slice(0));
broken[30+"manifest.json".length+7]^=0x7f;
assert.throws(()=>parseRestoreArchive(broken),/CRC32|ZIP/);
const badManifest={...goodManifest,objects:[{...goodManifest.objects[0],key:"../../danger.webp"}]};
const badZip=await makeZip([{name:"manifest.json",data:JSON.stringify(badManifest)},{name:"IMAGES/one.webp",data:webp}]).arrayBuffer();
assert.throws(()=>parseRestoreArchive(badZip),/không hợp lệ/);
assert.throws(()=>makeZip([{name:"../evil",data:"abc"}]),/không an toàn/);
assert.throws(()=>makeZip([{name:"a",data:new Uint8Array(ARCHIVE_LIMIT)}]),/quá lớn|vượt giới hạn/);

class R2{
 constructor(objects=[]){
  this.map=new Map(objects.map(x=>[x.key,x]));this.deleted=0;this.putCount=0;this.putOptions=[];
 }
 async list({limit,cursor}={}){
  const all=[...this.map.values()],start=Number(cursor||0),subset=all.slice(start,start+limit);
  return {objects:subset.map(({key,size,etag})=>({key,size,etag})),
   truncated:start+subset.length<all.length,cursor:start+subset.length<all.length?String(start+subset.length):undefined};
 }
 async head(key){return this.map.get(key)||null;}
 async get(key){
  const item=this.map.get(key);
  if(!item)return null;
  return {key,size:item.size,etag:item.etag,customMetadata:item.customMetadata||{},
   body:new ReadableStream({start(c){c.enqueue(item.data);c.close()}}),
   async arrayBuffer(){return item.data.buffer.slice(item.data.byteOffset,item.data.byteOffset+item.data.byteLength);}};
 }
 async put(key,bytes,options){
  if(this.map.has(key))return null; // emulate R2 If-None-Match precondition
  assert.equal(options.onlyIf.get("If-None-Match"),"*");
  this.putCount++;this.putOptions.push(options);
  const data=Uint8Array.from(bytes);
  const item={key,data,size:data.length,etag:"new"};
  this.map.set(key,item);
  return item;
 }
 async delete(){this.deleted++;throw Error("Restore must never delete R2 images");}
}
function item(key,data,etag){
 return {key,data,size:data.length,etag,customMetadata:{visibility:"private-original"}};
}
const images=new R2([item("one.webp",webp,"img-1")]);
const originals=new R2([item("private-originals/one.jpg",jpg,"org-1")]);
const db={prepare(sql){
 assert.match(sql,/SELECT sku,title,images_json FROM products/);
 return {async all(){return {results:[{sku:"SD001",title:"Sản phẩm QA",images_json:'["/media/one.webp"]'}]}}};
}};
const env={DB:db,IMAGES:images,ORIGINALS:originals,ADMIN_PASSWORD:password,SESSION_SECRET:secret};
function req(mode,method="GET",body=null,authed=true,extra={}){
 return new Request("https://qa.invalid/api/admin/image-archive?"+mode,{
  method,headers:{"Origin":"https://qa.invalid","Sec-Fetch-Site":"same-origin",
   ...(authed?{Cookie:"sd_admin_session="+session}:{}),...extra},...(body?{body}:{})
 });
}
const unauthorized=await onRequestGet({request:req("mode=scan&bucket=IMAGES","GET",null,false),env});
assert.equal(unauthorized.status,401,"Private image inventory must require auth");
const cross=await onRequestGet({request:new Request("https://qa.invalid/api/admin/image-archive?mode=scan&bucket=IMAGES",{headers:{Cookie:"sd_admin_session="+session,Origin:"https://evil.invalid","Sec-Fetch-Site":"cross-site"}}),env});
assert.equal(cross.status,403,"Block cross-origin image inventory");
const list=await onRequestGet({request:req("mode=scan&bucket=IMAGES"),env});
assert.equal(list.status,200);
assert.equal((await list.json()).objects[0].key,"one.webp");
const exportBody={part:1,files:[
 {bucket:"IMAGES",key:"one.webp",etag:"img-1",size:webp.length},
 {bucket:"ORIGINALS",key:"private-originals/one.jpg",etag:"org-1",size:jpg.length},
]};
const download=await onRequestPost({request:req("mode=download","POST",JSON.stringify(exportBody),true,{"Content-Type":"application/json"}),env});
assert.equal(download.status,200);
assert.match(download.headers.get("content-disposition"),/\.zip/);
const zipped=await download.arrayBuffer();
const exported=parseRestoreArchive(zipped);
assert.equal(exported.entries.length,2);
assert.equal(images.putCount,0);
assert.equal(originals.putCount,0);
const product=JSON.parse(new TextDecoder().decode(readZipStore(zipped).get("product-index.json")));
assert.equal(product.items[0].sku,"SD001");

const maliciousRequest=req("mode=restore","POST",zipped,true,{"Content-Type":"application/zip"});
const forbidden=await onRequestPost({request:maliciousRequest,env});
assert.equal(forbidden.status,403,"Restore always requires password");

const restoredImages=new R2([item("one.webp",webp,"img-1")]); // existing must never be overwritten
const restoredOriginals=new R2([]);
const restoreEnv={...env,IMAGES:restoredImages,ORIGINALS:restoredOriginals};
const restoreReq=req("mode=restore","POST",zipped,true,{"Content-Type":"application/zip","X-SD-Restore-Password":password});
const restoreResult=await onRequestPost({request:restoreReq,env:restoreEnv});
assert.equal(restoreResult.status,200);
const body=await restoreResult.json();
assert.equal(body.skipped,1);
assert.equal(body.restored,1);
assert.equal(restoredImages.putCount,0,"No overwrite of existing image");
assert.equal(restoredOriginals.putCount,1);
assert.equal(restoredOriginals.deleted,0);
const again=await onRequestPost({request:req("mode=restore","POST",zipped,true,{"Content-Type":"application/zip","X-SD-Restore-Password":password}),env:restoreEnv});
assert.equal((await again.json()).skipped,2,"Replays must not overwrite");
assert.equal(restoredOriginals.putCount,1);
const invalid=await onRequestPost({request:req("mode=restore","POST",broken,true,{"Content-Type":"application/zip","X-SD-Restore-Password":password}),env:restoreEnv});
assert.equal(invalid.status,400,"Corrupt archive must be rejected");
assert.equal(restoredOriginals.putCount,1);
console.log("PASS: ZIP CRC, path validation, manifest, real media bytes, admin auth, same-origin guard, reauthentication, no overwrite and safe retry.");
