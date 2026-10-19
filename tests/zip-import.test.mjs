import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/admin/zip-import.js', import.meta.url), 'utf8');
const context = {
  window: { __SD_IMPORT_TEST__: true },
  document: { readyState: 'loading', addEventListener() {} },
  setTimeout() {},
  TextEncoder, TextDecoder, Uint8Array, DataView, Map, Set, Blob, URL,
  console
};
vm.runInNewContext(source, context, { filename: 'zip-import.js' });
const core = context.window.__SD_IMPORT_CORE__;
assert.ok(core, 'test-only ZIP helpers should be available in isolated test context');

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries, corruptName = '') {
  const enc = new TextEncoder(), local = [], central = [];
  let offset = 0;
  for (const item of entries) {
    const name = enc.encode(item.name), data = typeof item.data === 'string' ? enc.encode(item.data) : item.data;
    let crc = crc32(data); if (item.name === corruptName) crc ^= 0xff;
    const lh = new Uint8Array(30 + name.length), lv = new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true); lv.setUint16(4,20,true); lv.setUint16(6,0x0800,true); lv.setUint16(8,0,true);
    lv.setUint32(14,crc,true); lv.setUint32(18,data.length,true); lv.setUint32(22,data.length,true); lv.setUint16(26,name.length,true); lh.set(name,30);
    local.push(lh,data);
    const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,0x0800,true); cv.setUint16(10,0,true);
    cv.setUint32(16,crc,true); cv.setUint32(20,data.length,true); cv.setUint32(24,data.length,true); cv.setUint16(28,name.length,true); cv.setUint32(42,offset,true); ch.set(name,46);
    central.push(ch); offset += lh.length + data.length;
  }
  const centralSize = central.reduce((n,b)=>n+b.length,0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true); ev.setUint16(8,entries.length,true); ev.setUint16(10,entries.length,true); ev.setUint32(12,centralSize,true); ev.setUint32(16,offset,true);
  const parts = [...local,...central,end], total=parts.reduce((n,b)=>n+b.length,0), out=new Uint8Array(total);
  let p=0; for(const b of parts){out.set(b,p);p+=b.length;} return out;
}
function fakeWebp() { const b=new Uint8Array(16); b.set(new TextEncoder().encode('RIFF'),0); b.set(new TextEncoder().encode('WEBP'),8); return b; }
function fakeFile(bytes, name='fixture.zip') { return { name, size: bytes.length, arrayBuffer: async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) }; }

{
  const record={export_id:'0001-A',export_folder:'images/0001-A/',title_vi:'Giày A',category_vi:'Sneaker',image_files:['images/0001-A/01.webp','images/0001-A/02.webp'],image_manifest:[],image_export_failed:0};
  const files=await core.readZip(fakeFile(zip([{name:'products.json',data:JSON.stringify([record])},{name:record.image_files[0],data:fakeWebp()},{name:record.image_files[1],data:fakeWebp()}])));
  const p=core.normalize(record,0,files);
  assert.equal(p.images.length,2); assert.equal(p.images[0],'images/0001-A/01.webp'); assert.equal(p.images[1],'images/0001-A/02.webp'); assert.equal(p.errs.length,0);
  const sameIdSecondRow=core.normalize(record,1,files); assert.notEqual(p.key,sameIdSecondRow.key,'row keys must remain unique even when a malformed ZIP repeats export_id');
}
{
  const products=[], entries=[{name:'products.json',data:''}];
  for(let i=1;i<=100;i++){const id=String(i).padStart(4,'0')+'-P'+i, folder='images/'+id+'/', path=folder+'01.webp';products.push({export_id:id,export_folder:folder,title_vi:'Sản phẩm '+i,category_vi:'Sneaker',image_files:[path],image_manifest:[],image_export_failed:0});entries.push({name:path,data:fakeWebp()});}
  entries[0].data=JSON.stringify(products);
  const files=await core.readZip(fakeFile(zip(entries)));
  const parsed=JSON.parse(new TextDecoder().decode(files.get('products.json')));
  assert.equal(parsed.length,100);
  for(let i=0;i<parsed.length;i++){const p=core.normalize(parsed[i],i,files);assert.equal(p.images.length,1);assert.equal(p.images[0],parsed[i].image_files[0]);assert.equal(p.errs.length,0);}
}
{
  const record={export_id:'x',export_folder:'images/x/',title_vi:'X',category_vi:'Sneaker',image_files:['images/x/missing.webp'],image_manifest:[],image_export_failed:0};
  const p=core.normalize(record,0,new Map());
  assert.ok(p.errs.some(e=>e.includes('Thiếu file ảnh')));
}
{
  const record={export_id:'x',export_folder:'images/x/',title_vi:'X',category_vi:'Sneaker',image_files:[],image_manifest:[{status:'failed',file_path:null}],image_export_failed:1};
  const p=core.normalize(record,0,new Map());
  assert.ok(p.errs.some(e=>e.includes('ảnh lỗi')));
}
{
  const csv='export_id,export_folder,title_vi,category_vi,image_files\r\n"0001-A","images/0001-A/","Giày, A","Sneaker","[]";';
  const rows=core.csvRows(csv);
  assert.equal(rows[0].export_id,'0001-A'); assert.equal(rows[0].title_vi,'Giày, A');
}
{
  await assert.rejects(()=>core.readZip(fakeFile(zip([{name:'../escape.webp',data:fakeWebp()}]))),/không an toàn/i);
}
{
  await assert.rejects(()=>core.readZip(fakeFile(zip([{name:'bad.webp',data:fakeWebp()}],'bad.webp'))),/CRC không khớp/i);
}
{
  const html=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
  const api=readFileSync(new URL('../functions/api/admin/products.js',import.meta.url),'utf8');
  const migration=readFileSync(new URL('../migrations/0013_product_source_imports.sql',import.meta.url),'utf8');
  const upload=readFileSync(new URL('../functions/api/admin/upload.js',import.meta.url),'utf8');
  const readiness=readFileSync(new URL('../functions/api/admin/zip-import/status.js',import.meta.url),'utf8');
  assert.ok(html.includes('/admin/zip-import.js'));
  assert.ok(source.includes('products:100'), 'ZIP import must enforce the 100-product preview limit');
  assert.ok(source.includes("if(!confirm(") && source.includes("published:false"),'writes must require confirmation and create hidden products');
  assert.ok(api.includes('product_source_imports') && api.includes('context.env.DB.batch(statements)'),'product and source metadata must be written in the same D1 batch');
  assert.ok(api.includes('ZIP_IMPORT_ENABLED !== "1"'),'product creation must be gated by an explicit environment flag');
  assert.ok(upload.includes('form.get("zipImport") === "1"') && upload.includes('ZIP_IMPORT_ENABLED !== "1"'),'ZIP image uploads must be gated before writing to R2');
  assert.ok(readiness.includes('product_source_imports') && readiness.includes('ZIP_IMPORT_ENABLED'),'Preview readiness must verify the flag and migrated table');
  assert.ok(readiness.includes('context.env.ORIGINALS'),'Preview readiness must require the private originals bucket, not only public IMAGES');
  assert.ok(readiness.includes('existingSources'),'ZIP readiness must return imported source identifiers for repeat-import detection');
  assert.ok(readiness.includes('source_product_id') && readiness.includes('source_url'),'repeat-import lookup must include stable source product IDs and source URLs');
  assert.ok(readiness.includes('LIMIT 5000'),'the preview list of known sources must be bounded');
  assert.ok(source.includes('sourceDuplicate(p)') && source.includes('Đã nhập nguồn này'),'the UI must flag exact source duplicates separately from title-only warnings');
  assert.ok(source.includes('disabled title="Nguồn này đã được nhập"'),'already-imported source items must not be manually reselected in the preview');
  assert.ok(source.includes('product_id nguồn bị trùng trong ZIP') && source.includes('URL nguồn bị trùng trong ZIP'),'duplicate source IDs/URLs within one ZIP must be detected');
  assert.ok(migration.includes('idx_product_source_imports_source_product_id_unique') && migration.includes('idx_product_source_imports_source_url_unique'),'migration must enforce source deduplication atomically');

  assert.ok(migration.includes('REFERENCES products(id) ON DELETE CASCADE'));
}

{
  const csv='\uFEFFexport_id,export_folder,title_vi,category_vi,image_files,image_export_failed,image_export_status\r\n"0002-B","images/0002-B/","Giày B","Sneaker","images/0002-B/01.webp",0,"complete"';
  const rows=core.csvRows(csv);
  assert.equal(rows[0].export_id,'0002-B');
  const files=new Map([['images/0002-B/01.webp',fakeWebp()]]);
  const p=core.normalize(rows[0],0,files);
  assert.deepEqual(Array.from(p.images),['images/0002-B/01.webp'],'CSV fallback must preserve the real image paths');
  assert.equal(p.errs.length,0);
}
{
  await assert.rejects(()=>core.readZip(fakeFile(zip([{name:'nested.zip',data:zip([{name:'inner.txt',data:'x'}])}]))),/ZIP lồng/i);
}
{
  const noImages={export_id:'empty-1',export_folder:'images/empty-1/',title_vi:'No image',category_vi:'Sneaker',image_files:[],image_manifest:[],image_export_failed:0,image_export_status:'no_source_images'};
  const p=core.normalize(noImages,0,new Map());
  core.state.allowNoImages=false;
  assert.equal(core.ready(p),false,'products with no images must not pass without explicit opt-in');
  core.state.allowNoImages=true;
  assert.equal(core.ready(p),true,'explicit no-image opt-in may permit product data only');
  core.state.allowNoImages=false;
}
{
  const dup={export_id:'dupe',export_folder:'images/dupe/',title_vi:'Dup',category_vi:'Sneaker',image_files:['images/dupe/01.webp','images/dupe/01.webp'],image_manifest:[],image_export_failed:0};
  const p=core.normalize(dup,0,new Map([['images/dupe/01.webp',fakeWebp()]]));
  assert.ok(p.errs.some(e=>e.includes('Đường dẫn ảnh bị lặp')));
}
{
  const api=readFileSync(new URL('../functions/api/admin/products.js',import.meta.url),'utf8');
  assert.ok(api.includes('body.published = false'),'server must enforce hidden products for ZIP imports, not trust the client');
  assert.ok(source.includes("document.body.append(b)")&&!source.includes("m.append(b)"),'mobile ZIP button must not create a seventh bottom-navigation item');
  assert.ok(source.includes("if(!name.endsWith('/')&&/\\.zip$/i.test(name))"),'nested ZIPs must be rejected');
}

console.log('PASS: ZIP parser, exact image linkage, 100-product package, CSV image fallback, missing-image opt-in, duplicate paths, nested ZIP, traversal and server gates.');
