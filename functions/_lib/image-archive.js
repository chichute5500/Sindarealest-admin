/**
 * R2 image ZIP format v1. No third-party ZIP library, no compression, Zip64,
 * external URLs, or cross-bucket copies. Every ZIP file is independently
 * restorable and limited to 32 MiB / 80 media objects for Android downloads.
 */
export const ARCHIVE_LIMIT = 32 * 1024 * 1024;
export const ARCHIVE_MAX_FILES = 80;
const MAX_MEDIA = 20 * 1024 * 1024;
const MAX_MANIFEST = 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function uint32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
function uint16(view, offset, value) { view.setUint16(offset, value, true); }
function normalizedError(message) { return new Error(message); }

export function validMediaKey(value) {
  if (typeof value !== "string" || !value || value.length > 768 || /[\\\u0000-\u001f\u007f]/.test(value) ||
      value.startsWith("/") || value.includes("//") || value.split("/").some(x => !x || x.startsWith("."))) return false;
  return /\.(?:webp|jpg|jpeg|png)$/i.test(value);
}
export function validBucket(name) { return name === "IMAGES" || name === "ORIGINALS"; }

export function sniffMedia(bytes) {
  if (!(bytes instanceof Uint8Array)) return null;
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((n,i)=>bytes[i]===n)) return "image/png";
  if (bytes.length >= 3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return "image/jpeg";
  return null;
}
function mediaExtType(key) {
  if (/\.webp$/i.test(key)) return "image/webp";
  if (/\.png$/i.test(key)) return "image/png";
  if (/\.jpe?g$/i.test(key)) return "image/jpeg";
  return null;
}
let crcTable;
export function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0;}
  }
  let crc=0xffffffff;
  for(const b of bytes) crc=crcTable[(crc^b)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}

export function makeZip(files) {
  if (!Array.isArray(files) || files.length < 1 || files.length > ARCHIVE_MAX_FILES+2) throw normalizedError("Số tệp ZIP không hợp lệ.");
  const sections=[],central=[];
  let offset=0,size=0;
  for(const f of files){
    if(typeof f.name!=="string"||!f.name||f.name.length>850||f.name.startsWith("/")||
       f.name.split("/").some(x=>x===".."||x===".")||/[\\\u0000-\u001f\u007f]/.test(f.name)) throw normalizedError("Tên tệp ZIP không an toàn.");
    const name=encoder.encode(f.name);
    const data=f.data instanceof Uint8Array?f.data:encoder.encode(String(f.data));
    if(name.length>65535||data.byteLength>ARCHIVE_LIMIT)throw normalizedError("Tệp ZIP quá lớn.");
    const crc=crc32(data),header=new Uint8Array(30+name.length),v=new DataView(header.buffer);
    uint32(v,0,0x04034b50);uint16(v,4,20);uint16(v,6,0x800);uint16(v,8,0);
    uint32(v,14,crc);uint32(v,18,data.byteLength);uint32(v,22,data.byteLength);uint16(v,26,name.length);
    header.set(name,30);
    sections.push(header,data);
    const center=new Uint8Array(46+name.length),c=new DataView(center.buffer);
    uint32(c,0,0x02014b50);uint16(c,4,20);uint16(c,6,20);uint16(c,8,0x800);
    uint32(c,16,crc);uint32(c,20,data.byteLength);uint32(c,24,data.byteLength);uint16(c,28,name.length);
    uint32(c,42,offset);center.set(name,46);central.push(center);
    offset+=header.length+data.byteLength;size+=center.length;
    if(offset+size+22>ARCHIVE_LIMIT)throw normalizedError("ZIP vượt giới hạn 32 MiB.");
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);
  uint32(v,0,0x06054b50);uint16(v,8,files.length);uint16(v,10,files.length);
  uint32(v,12,size);uint32(v,16,offset);
  return new Blob([...sections,...central,end],{type:"application/zip"});
}

export function readZipStore(input) {
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.length<22||bytes.length>ARCHIVE_LIMIT)throw normalizedError("Tệp ZIP vượt giới hạn hoặc trống.");
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const eocd=bytes.length-22;
  if(v.getUint32(eocd,true)!==0x06054b50||v.getUint16(eocd+20,true)!==0)throw normalizedError("ZIP không đúng định dạng ứng dụng.");
  const count=v.getUint16(eocd+10,true),size=v.getUint32(eocd+12,true),start=v.getUint32(eocd+16,true);
  if(!count||count>ARCHIVE_MAX_FILES+2||start+size!==eocd||count!==v.getUint16(eocd+8,true))
    throw normalizedError("Danh mục ZIP không hợp lệ.");
  const result=new Map();
  let centralPos=start,lastLocalEnd=0;
  for(let i=0;i<count;i++){
    if(centralPos+46>eocd||v.getUint32(centralPos,true)!==0x02014b50)throw normalizedError("Danh mục ZIP bị lỗi.");
    const flag=v.getUint16(centralPos+8,true),method=v.getUint16(centralPos+10,true);
    const crc=v.getUint32(centralPos+16,true),compressed=v.getUint32(centralPos+20,true),length=v.getUint32(centralPos+24,true);
    const nameLen=v.getUint16(centralPos+28,true),extraLen=v.getUint16(centralPos+30,true),commentLen=v.getUint16(centralPos+32,true);
    const localOffset=v.getUint32(centralPos+42,true);
    if(flag!==0x800||method!==0||compressed!==length||centralPos+46+nameLen+extraLen+commentLen>eocd||nameLen>1024)
      throw normalizedError("ZIP chỉ hỗ trợ tệp nguyên bản do Admin tạo.");
    const name=decoder.decode(bytes.subarray(centralPos+46,centralPos+46+nameLen));
    if(result.has(name)||!name||/[\\\u0000-\u001f\u007f]/.test(name)||name.startsWith("/")||
        name.split("/").some(x=>x==="."||x===".."))throw normalizedError("ZIP có đường dẫn không an toàn.");
    if(localOffset!==lastLocalEnd||localOffset+30>start||v.getUint32(localOffset,true)!==0x04034b50)throw normalizedError("ZIP có dữ liệu không khớp.");
    const localNameLen=v.getUint16(localOffset+26,true),localExtraLen=v.getUint16(localOffset+28,true);
    const dataStart=localOffset+30+localNameLen+localExtraLen;
    if(dataStart+length>start||v.getUint16(localOffset+6,true)!==flag||v.getUint16(localOffset+8,true)!==method||
      v.getUint32(localOffset+14,true)!==crc||v.getUint32(localOffset+18,true)!==length||
      v.getUint32(localOffset+22,true)!==length||
      decoder.decode(bytes.subarray(localOffset+30,localOffset+30+localNameLen))!==name)
      throw normalizedError("Dữ liệu ZIP không khớp danh mục.");
    const data=bytes.subarray(dataStart,dataStart+length);
    if(crc32(data)!==crc)throw normalizedError("ZIP hỏng checksum CRC32: "+name);
    result.set(name,data);
    lastLocalEnd=dataStart+length;
    centralPos+=46+nameLen+extraLen+commentLen;
  }
  if(centralPos!==eocd||lastLocalEnd!==start)throw normalizedError("ZIP còn dữ liệu lạ.");
  return result;
}

export function parseRestoreArchive(buffer) {
  const files=readZipStore(buffer);
  const raw=files.get("manifest.json");
  if(!raw||raw.byteLength>MAX_MANIFEST)throw normalizedError("ZIP thiếu manifest.json hợp lệ.");
  let manifest;
  try{manifest=JSON.parse(decoder.decode(raw));}catch{throw normalizedError("Manifest ZIP không đọc được.");}
  if(manifest?.format!=="sindarealest-image-zip-v1"||!Array.isArray(manifest.objects)||manifest.objects.length>ARCHIVE_MAX_FILES)
    throw normalizedError("Manifest sao lưu ảnh không hợp lệ.");
  const expected=new Set(["manifest.json"]);
  if(files.has("product-index.json"))expected.add("product-index.json");
  const entries=[];
  for(const item of manifest.objects){
    if(!item||!validBucket(item.bucket)||!validMediaKey(item.key))throw normalizedError("Manifest chứa khóa ảnh không hợp lệ.");
    const path=item.bucket+"/"+item.key,body=files.get(path);
    if(expected.has(path)||!body||body.byteLength>MAX_MEDIA||body.byteLength!==item.size||
      sniffMedia(body)!==mediaExtType(item.key))throw normalizedError("Ảnh trong ZIP bị thiếu hoặc sai định dạng.");
    expected.add(path);
    let metadata={};
    if(item.customMetadata!==undefined){
      if(!item.customMetadata||typeof item.customMetadata!=="object"||Array.isArray(item.customMetadata))throw normalizedError("Metadata không hợp lệ.");
      for(const [key,value] of Object.entries(item.customMetadata)){
        if(!/^[A-Za-z][A-Za-z0-9_-]{0,59}$/.test(key)||typeof value!=="string"||value.length>1000)throw normalizedError("Metadata không hợp lệ.");
      }
      if(JSON.stringify(item.customMetadata).length>1800)throw normalizedError("Metadata quá lớn.");
      metadata=item.customMetadata;
    }
    entries.push({bucket:item.bucket,key:item.key,bytes:body,contentType:mediaExtType(item.key),customMetadata:metadata});
  }
  if(files.size!==expected.size)throw normalizedError("ZIP chứa dữ liệu không khai báo.");
  return {manifest,entries};
}

export async function createArchivePart(env, request) {
  const items=request?.files,part=request?.part;
  if(!Array.isArray(items)||!items.length||items.length>ARCHIVE_MAX_FILES||
    !Number.isInteger(part)||part<1||part>1000)throw normalizedError("Danh sách ZIP không hợp lệ.");
  const unique=new Set(),rows=[];
  let total=0;
  for(const obj of items){
    if(!obj||!validBucket(obj.bucket)||!validMediaKey(obj.key)||!Number.isSafeInteger(obj.size)||
       obj.size<1||obj.size>MAX_MEDIA||typeof obj.etag!=="string"||obj.etag.length>160)
      throw normalizedError("Dữ liệu ảnh yêu cầu không hợp lệ.");
    const id=obj.bucket+"/"+obj.key;if(unique.has(id))throw normalizedError("Ảnh bị trùng trong ZIP.");
    unique.add(id);total+=obj.size;
  }
  if(total>ARCHIVE_LIMIT-2*1024*1024)throw normalizedError("Một phần ZIP vượt giới hạn dung lượng.");
  const meta=[];
  for(const obj of items){
    const original=await env[obj.bucket].get(obj.key);
    if(!original||!original.body||original.etag!==obj.etag||original.size!==obj.size)
      throw normalizedError("Ảnh đã thay đổi hoặc không còn tồn tại, hãy kiểm tra lại danh sách.");
    const bytes=new Uint8Array(await original.arrayBuffer());
    if(bytes.byteLength!==obj.size||sniffMedia(bytes)!==mediaExtType(obj.key))
      throw normalizedError("Ảnh lưu trong R2 không hợp lệ: "+obj.key);
    rows.push({name:obj.bucket+"/"+obj.key,data:bytes});
    const customMetadata=original.customMetadata||{};
    meta.push({bucket:obj.bucket,key:obj.key,size:obj.size,etag:original.etag,customMetadata});
  }
  let productIndex;
  if(part===1){
    const query=await env.DB.prepare("SELECT sku,title,images_json FROM products ORDER BY sku LIMIT 2000").all();
    productIndex={createdAt:new Date().toISOString(),items:(query.results||[]).map(p=>({
      sku:p.sku,title:p.title,images:(()=>{try{return JSON.parse(p.images_json||"[]")}catch{return []}})(),
    }))};
  }
  const manifest={format:"sindarealest-image-zip-v1",createdAt:new Date().toISOString(),part,
    warning:"JSON dữ liệu đơn hàng/khách hàng phải tải riêng bằng nút Sao lưu JSON.",objects:meta};
  const files=[{name:"manifest.json",data:JSON.stringify(manifest)}];
  if(productIndex)files.push({name:"product-index.json",data:JSON.stringify(productIndex)});
  files.push(...rows);
  return makeZip(files);
}
