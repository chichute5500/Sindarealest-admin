import assert from "node:assert/strict";
import {SingleImageZipWriter,openSingleImageArchive} from "../public/admin/image-archive-single.js";

class FakeWritable {
 constructor(){this.bytes=new Uint8Array(1024);this.position=0;this.length=0;this.closed=false}
 async write(chunk){
  if(this.closed)throw Error("closed");
  const b=chunk instanceof Uint8Array?chunk:new Uint8Array(chunk);
  const end=this.position+b.length;
  if(end>this.bytes.length){const next=new Uint8Array(Math.max(end,this.bytes.length*2));next.set(this.bytes);this.bytes=next}
  this.bytes.set(b,this.position);this.position=end;this.length=Math.max(this.length,end);
 }
 async seek(position){assert.ok(position>=0&&position<=this.length);this.position=position}
 async close(){this.closed=true}
 async abort(){this.closed=true}
 toBlob(){return new Blob([this.bytes.subarray(0,this.length)])}
}
const fakeWebp=Uint8Array.from([82,73,70,70,4,0,0,0,87,69,66,80,1,2,3,4]);
const fakeJpg=Uint8Array.from([255,216,255,240,1,2,3,4]);
const sink=new FakeWritable(),writer=new SingleImageZipWriter(sink);
const objects=[];
for(let i=0;i<85;i++){
 const isJpg=i%2===1;
 const bucket=isJpg?"ORIGINALS":"IMAGES",key=isJpg?("private-originals/"+i+".jpg"):("catalog/"+i+".webp"),body=isJpg?fakeJpg:fakeWebp;
 await writer.addStream(bucket+"/"+key,new Blob([body]).stream(),body.length);
 objects.push({bucket,key,size:body.length,etag:"etag"+i,customMetadata:{visibility:"private-original"}});
}
await writer.addBytes("product-index.json",JSON.stringify({items:[{sku:"SD-SN-001",title:"Ảnh kiểm thử"}]}));
await writer.addBytes("manifest.json",JSON.stringify({format:"sindarealest-image-zip-v1",part:1,objects}));
const report=await writer.finish();
assert.equal(report.files,87);
assert.equal(sink.closed,true);
const zip=sink.toBlob();
let tick=0;
const parsed=await openSingleImageArchive(zip,(done,total)=>{tick++;assert.ok(done<=total)});
assert.equal(parsed.files.length,85,"One ZIP must support >80 images");
assert.equal(tick,85,"All image CRCs verified");
assert.equal(parsed.files[1].contentType,"image/jpeg");
assert.deepEqual(new Uint8Array(await parsed.files[0].blob.arrayBuffer()),fakeWebp);
assert.equal(parsed.manifest.objects[20].etag,"etag20");
await assert.rejects(()=>writer.addBytes("other.json","fail"),/hoàn tất/);
const tampered=new Uint8Array(await zip.arrayBuffer());
const loc=tampered.findIndex((n,i)=>i>80&&n===0xff);
assert.ok(loc>=0);
tampered[loc]^=0x23;
await assert.rejects(()=>openSingleImageArchive(new Blob([tampered])),/CRC32|ZIP|header|định dạng/);
const noManifest=new FakeWritable();
const w2=new SingleImageZipWriter(noManifest);
await w2.addBytes("product-index.json","{}");
await w2.finish();
await assert.rejects(()=>openSingleImageArchive(noManifest.toBlob()),/manifest/);
const duplicate=new FakeWritable();
const w3=new SingleImageZipWriter(duplicate);
await w3.addBytes("manifest.json","{}");
await assert.rejects(()=>w3.addBytes("manifest.json","{}"),/trùng/);
await w3.abort();
console.log("PASS: one-click single ZIP containing 85 images, bounded streaming writer, central directory, large-archive restore parsing, CRC tamper detection and invalid manifest gates.");
