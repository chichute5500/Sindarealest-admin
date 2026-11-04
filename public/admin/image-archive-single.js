/**
 * SinDarealest single-file streaming ZIP (store/no compression, ZIP32).
 * Browsers write to their Origin Private File System (OPFS) so large image
 * libraries do not accumulate as an enormous RAM Blob.
 * This module is also run by Node regression tests with a memory sink.
 */
import {validBucket,validMediaKey,sniffMedia} from "./image-archive-client.js";
const enc=new TextEncoder(),dec=new TextDecoder("utf-8",{fatal:true});
const MAX_TOTAL=2*1024*1024*1024; // conservative mobile limit; no ZIP64
const MAX_MEDIA=20*1024*1024;
const MAX_FILES=10000;
const MAX_MANIFEST=4*1024*1024;
const MAX_CENTRAL=12*1024*1024;
const MAX_NAME=900;
let TABLE;
function table(){
 if(!TABLE){TABLE=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;TABLE[i]=c>>>0;}}
 return TABLE;
}
function crcUpdate(seed,bytes){
 const t=table();let c=seed;
 for(let i=0;i<bytes.length;i++)c=t[(c^bytes[i])&255]^(c>>>8);
 return c>>>0;
}
function v16(v,p,n){v.setUint16(p,n,true)}
function v32(v,p,n){v.setUint32(p,n>>>0,true)}
function fail(message){throw Error(message)}
function checkName(name){
 if(typeof name!=="string"||!name||name.length>850||/[\\\u0000-\u001f\u007f]/.test(name)||
 name.startsWith("/")||name.includes("//")||name.split("/").some(x=>!x||x==="."||x===".."||x.startsWith(".")))fail("Tên ảnh trong ZIP không an toàn.");
 const b=enc.encode(name);if(b.length>MAX_NAME)fail("Tên ảnh trong ZIP quá dài.");return b;
}
function mediaType(key){
 return /\.webp$/i.test(key)?"image/webp":/\.png$/i.test(key)?"image/png":/\.jpe?g$/i.test(key)?"image/jpeg":null;
}
export class SingleImageZipWriter{
 constructor(writable){
  if(!writable||typeof writable.write!=="function"||typeof writable.seek!=="function"||typeof writable.close!=="function")fail("Thiết bị không hỗ trợ ghi ZIP dung lượng lớn.");
  this.writable=writable;this.offset=0;this.entries=[];this.closed=false;this.names=new Set();
 }
 async _write(bytes){
  if(this.offset+bytes.byteLength>MAX_TOTAL)fail("Bản sao lưu vượt giới hạn ZIP 2 GB.");
  await this.writable.write(bytes);this.offset+=bytes.byteLength;
 }
 async addStream(name,stream,expectedSize,onProgress){
  if(this.closed||this.entries.length>=MAX_FILES||this.names.has(name))fail("ZIP trùng tệp hoặc đã hoàn tất.");
  const label=checkName(name);
  if(!Number.isSafeInteger(expectedSize)||expectedSize<0||expectedSize>MAX_MEDIA&&name!=="manifest.json"&&name!=="product-index.json")fail("Kích thước ảnh không hợp lệ.");
  if(!stream||typeof stream.getReader!=="function")fail("Ảnh không thể truyền dữ liệu.");
  const start=this.offset,header=new Uint8Array(30+label.length),view=new DataView(header.buffer);
  v32(view,0,0x04034b50);v16(view,4,20);v16(view,6,0x800);v16(view,8,0);v16(view,26,label.length);
  header.set(label,30);await this._write(header);
  let total=0,crc=0xffffffff;
  const reader=stream.getReader();
  try{
   while(true){
    const {value,done}=await reader.read();if(done)break;
    if(!(value instanceof Uint8Array)||!value.byteLength)continue;
    total+=value.byteLength;
    if(total>expectedSize)fail("Ảnh R2 lớn hơn kích thước đã xác minh.");
    crc=crcUpdate(crc,value);
    await this._write(value);
    if(onProgress)await onProgress(total);
   }
  }finally{reader.releaseLock()}
  if(total!==expectedSize)fail("Ảnh R2 không đủ byte, ZIP chưa được hoàn tất.");
  crc=(crc^0xffffffff)>>>0;
  const end=this.offset;
  v32(view,14,crc);v32(view,18,total);v32(view,22,total);
  await this.writable.seek(start);await this.writable.write(header);
  await this.writable.seek(end);
  this.entries.push({name,label,crc,size:total,offset:start});
  this.names.add(name);
  return {size:total,crc};
 }
 async addBytes(name,bytes){
  const body=typeof bytes==="string"?enc.encode(bytes):bytes;
  if(!(body instanceof Uint8Array)||body.length>MAX_MANIFEST)fail("Metadata ZIP quá lớn.");
  return this.addStream(name,new Blob([body]).stream(),body.length);
 }
 async finish(){
  if(this.closed||!this.entries.length)fail("ZIP chưa có dữ liệu.");
  if(this.entries.length>65535)fail("ZIP chứa quá nhiều ảnh.");
  const centralStart=this.offset;
  for(const item of this.entries){
   const c=new Uint8Array(46+item.label.length),v=new DataView(c.buffer);
   v32(v,0,0x02014b50);v16(v,4,20);v16(v,6,20);v16(v,8,0x800);
   v32(v,16,item.crc);v32(v,20,item.size);v32(v,24,item.size);
   v16(v,28,item.label.length);v32(v,42,item.offset);
   c.set(item.label,46);await this._write(c);
  }
  const centralSize=this.offset-centralStart;
  if(centralSize>MAX_CENTRAL)fail("Danh mục ZIP vượt giới hạn.");
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  v32(v,0,0x06054b50);v16(v,8,this.entries.length);v16(v,10,this.entries.length);
  v32(v,12,centralSize);v32(v,16,centralStart);
  await this._write(end);
  this.closed=true;await this.writable.close();
  return {bytes:this.offset,files:this.entries.length};
 }
 async abort(){if(!this.closed){this.closed=true;await this.writable.abort?.().catch(()=>{})}}
}
async function bytesFrom(blob,start,length){
 return new Uint8Array(await blob.slice(start,start+length).arrayBuffer());
}
function viewOf(a){return new DataView(a.buffer,a.byteOffset,a.byteLength)}
async function checksum(blob,expected,onProgress){
 let crc=0xffffffff,total=0;const reader=blob.stream().getReader();
 try{
  while(true){
   const {value,done}=await reader.read();if(done)break;
   if(!(value instanceof Uint8Array))fail("ZIP có byte không hợp lệ.");
   total+=value.length;crc=crcUpdate(crc,value);
   if(onProgress)onProgress(total);
  }
 }finally{reader.releaseLock()}
 if(total!==blob.size||((crc^0xffffffff)>>>0)!==expected)fail("Ảnh trong ZIP hỏng mã kiểm tra CRC32.");
}
function checkMetadata(value){
 if(value===undefined)return {};
 if(!value||typeof value!=="object"||Array.isArray(value))fail("Metadata ảnh không hợp lệ.");
 for(const [k,v] of Object.entries(value)){
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,59}$/.test(k)||typeof v!=="string"||v.length>1000)fail("Metadata ảnh không hợp lệ.");
 }
 if(JSON.stringify(value).length>1800)fail("Metadata ảnh quá lớn.");
 return value;
}
/**
 * Inspect complete ZIP before any R2 restore:
 * - parse only bounded central directory into memory;
 * - validate names, local headers, manifest and every image CRC streaming;
 * - return Blob slices, not full file buffers.
 * Accepts both old small ZIP parts and new single huge ZIP.
 */
export async function openSingleImageArchive(file,onProgress){
 if(!(file instanceof Blob)||file.size<22||file.size>MAX_TOTAL)fail("ZIP trống hoặc vượt giới hạn 2 GB.");
 const tail=viewOf(await bytesFrom(file,file.size-22,22));
 if(tail.getUint32(0,true)!==0x06054b50||tail.getUint16(20,true)!==0)fail("ZIP không hợp lệ hoặc chưa tải đầy đủ.");
 const count=tail.getUint16(10,true),countOnDisk=tail.getUint16(8,true),centralSize=tail.getUint32(12,true),centralStart=tail.getUint32(16,true);
 if(!count||count!==countOnDisk||count>MAX_FILES||centralSize>MAX_CENTRAL||centralStart+centralSize!==file.size-22)fail("Danh mục ZIP không hợp lệ.");
 const raw=await bytesFrom(file,centralStart,centralSize),v=viewOf(raw);
 const entries=new Map();let position=0;
 for(let i=0;i<count;i++){
  if(position+46>raw.length||v.getUint32(position,true)!==0x02014b50)fail("ZIP có danh mục lỗi.");
  const flags=v.getUint16(position+8,true),method=v.getUint16(position+10,true);
  const crc=v.getUint32(position+16,true),compressed=v.getUint32(position+20,true),size=v.getUint32(position+24,true);
  const nameLen=v.getUint16(position+28,true),extra=v.getUint16(position+30,true),comment=v.getUint16(position+32,true),local=v.getUint32(position+42,true);
  if(flags!==0x800||method!==0||compressed!==size||!nameLen||nameLen>MAX_NAME||position+46+nameLen+extra+comment>raw.length)
   fail("ZIP không thuộc định dạng sao lưu SinDarealest.");
  const name=dec.decode(raw.subarray(position+46,position+46+nameLen));
  checkName(name);
  if(entries.has(name))fail("ZIP chứa tệp trùng.");
  entries.set(name,{name,size,crc,local});
  position+=46+nameLen+extra+comment;
 }
 if(position!==raw.length||!entries.has("manifest.json"))fail("ZIP thiếu manifest.json.");
 // Validate all local headers and reject overlapping/unaccounted data.
 const localRecords=[...entries.values()].sort((a,b)=>a.local-b.local);
 let next=0;
 for(const item of localRecords){
  if(item.local!==next||item.local+30>centralStart)fail("ZIP có byte ngoài danh mục.");
  const header=await bytesFrom(file,item.local,30),h=viewOf(header);
  const nameLen=h.getUint16(26,true),extra=h.getUint16(28,true);
  if(h.getUint32(0,true)!==0x04034b50||h.getUint16(6,true)!==0x800||h.getUint16(8,true)!==0||
     h.getUint32(14,true)!==item.crc||h.getUint32(18,true)!==item.size||h.getUint32(22,true)!==item.size||nameLen>MAX_NAME)
    fail("ZIP có header không khớp.");
  const name=dec.decode(await bytesFrom(file,item.local+30,nameLen));
  if(name!==item.name)fail("ZIP chứa đường dẫn khác nhau giữa các header.");
  const dataStart=item.local+30+nameLen+extra;
  if(dataStart+item.size>centralStart)fail("ZIP có dữ liệu ảnh bị cắt.");
  item.blob=file.slice(dataStart,dataStart+item.size);
  next=dataStart+item.size;
 }
 if(next!==centralStart)fail("ZIP có dữ liệu không khai báo.");
 const manifestRec=entries.get("manifest.json");
 if(manifestRec.size>MAX_MANIFEST)fail("Manifest quá lớn.");
 await checksum(manifestRec.blob,manifestRec.crc);
 let manifest;
 try{manifest=JSON.parse(await manifestRec.blob.text())}catch{fail("Manifest ảnh không đọc được.");}
 if(manifest?.format!=="sindarealest-image-zip-v1"||!Array.isArray(manifest.objects)||
    manifest.objects.length>MAX_FILES-2)fail("Manifest ảnh sai định dạng.");
 const allowed=new Set(["manifest.json"]);
 if(entries.has("product-index.json")){
  const index=entries.get("product-index.json");
  if(index.size>MAX_MANIFEST)fail("Danh mục sản phẩm vượt giới hạn.");
  await checksum(index.blob,index.crc);
  allowed.add("product-index.json");
 }
 const files=[];let processed=0;
 for(const item of manifest.objects){
  if(!item||!validBucket(item.bucket)||!validMediaKey(item.key)||!Number.isSafeInteger(item.size)||item.size<=0||item.size>MAX_MEDIA)fail("Manifest có ảnh không an toàn.");
  const name=item.bucket+"/"+item.key,info=entries.get(name);
  if(allowed.has(name)||!info||info.size!==item.size)fail("ZIP thiếu ảnh hoặc sai dung lượng.");
  allowed.add(name);
  const type=mediaType(item.key);
  if(sniffMedia(await bytesFrom(info.blob,0,12))!==type)fail("Ảnh trong ZIP không đúng định dạng.");
  await checksum(info.blob,info.crc);
  processed++;
  if(onProgress)onProgress(processed,manifest.objects.length);
  files.push({bucket:item.bucket,key:item.key,blob:info.blob,size:item.size,contentType:type,
    customMetadata:checkMetadata(item.customMetadata)});
 }
 if(entries.size!==allowed.size)fail("ZIP có tệp không nằm trong manifest.");
 return {files,manifest};
}
