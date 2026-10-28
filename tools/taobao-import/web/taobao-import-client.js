'use strict';
const $ = id => document.getElementById(id);
const MAX_ORIGINAL = 20 * 1024 * 1024, MAX_DERIVATIVE = 5 * 1024 * 1024;
const validType = new Set(['image/jpeg', 'image/png', 'image/webp']);
async function imageSha256(file){
  if(!crypto?.subtle?.digest)return ''; // HTTPS supports content SHA-256; opaque offline preview uses metadata fallback.
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
const STORAGE_KEY = 'sdi-import-v2';
const DATABASE_NAME = 'sindarealest-import-v2';
const items = [];
function newUuid(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const x=[...b].map(v=>v.toString(16).padStart(2,'0')).join('');return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;}
let busy = false, completed = false, creationAttempted = false;
let importId = newUuid();
let dbPromise;

async function request(path, options={}) {
  const response = await fetch(path, {credentials:'same-origin',cache:'no-store',...options});
  let data;
  try { data = await response.json(); } catch { throw Error('Máy chủ trả về dữ liệu không hợp lệ.'); }
  if (!response.ok || data.ok === false) throw Error(data.error || data.message || `Máy chủ báo lỗi ${response.status}.`);
  return data;
}
function status(value, kind='') { const el=$('status');el.hidden=false;el.textContent=value;el.className='status '+kind; }
function allowedSource(input) {
  try { const u=new URL(input),host=u.hostname.toLowerCase();return u.protocol==='https:'&&['taobao.com','tmall.com','tb.cn'].some(d=>host===d||host.endsWith('.'+d)); }
  catch { return false; }
}
function localGet() { try {return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{return null;} }
function localSet(value) { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(value)); return true; } catch { return false; } }
function localClear() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

// Binary originals stay in the phone's browser storage, never localStorage.
// IndexedDB transactions must finish before UI reports a file safely stored.
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DATABASE_NAME,1);
      req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('photos')) req.result.createObjectStore('photos',{keyPath:'key'}); };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>resolve(null);
      req.onblocked=()=>resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}
async function photoWrite(value) {
  const db=await openDb();if(!db)return false;
  return new Promise(resolve=>{
    try {const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(value);tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);}
    catch{resolve(false);}
  });
}
async function photoDelete(key) {
  const db=await openDb();if(!db)return;
  return new Promise(resolve=>{
    try{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();tx.onabort=()=>resolve();}catch{resolve();}
  });
}
async function photoAll() {
  const db=await openDb();if(!db)return [];
  return new Promise(resolve=>{
    try {const tx=db.transaction('photos','readonly');const req=tx.objectStore('photos').getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>resolve([]);}
    catch{resolve([]);}
  });
}
async function photoClear() {
  const db=await openDb();if(!db)return;
  return new Promise(resolve=>{try{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();tx.onabort=()=>resolve();}catch{resolve();}});
}
function fields() {return {title:$('title').value,category:$('category').value,price:$('price').value,fulfillment:$('fulfillment').value,description:$('description').value};}
function persistMeta() {localSet({version:2,importId,completed,creationAttempted,fields:fields(),order:items.map(x=>x.key),source:$('taobaoLink').value.trim(),rightsConfirmed:$('photoRights').checked});}
function applySource(source) {
  if(source&&source.length<=2200&&allowedSource(source)){
    $('sourceLink').href=source;$('sourceLink').hidden=false;$('noSource').hidden=true;
    $('taobaoLink').value=source;
  }
}
function lockFields() {
  for(const id of ['title','category','price','fulfillment','description'])$(id).disabled=busy||creationAttempted||completed;
  $('picker').disabled=busy||creationAttempted||completed;
  $('taobaoLink').disabled=busy||creationAttempted||completed;
  $('autoPhotos').disabled=busy||creationAttempted||completed;
  $('photoRights').disabled=busy||creationAttempted||completed;
  $('submit').disabled=busy||completed;
  $('submit').textContent=creationAttempted&&!completed?'Kiểm tra / hoàn tất bản nháp':'Tải ảnh & tạo bản nháp';
  $('newDraft').hidden=!completed;
}
async function restore() {
  const meta=localGet();
  const p=new URLSearchParams(location.hash.slice(1));const source=p.get('source');
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  if(meta?.version===2 && /^[0-9a-f-]{36}$/.test(meta.importId)){
    importId=meta.importId;completed=Boolean(meta.completed);creationAttempted=Boolean(meta.creationAttempted);
    for(const [id,v] of Object.entries(meta.fields||{}))if(['title','category','price','fulfillment','description'].includes(id)&&typeof v==='string')$(id).value=v;
    const entries=await photoAll();const byKey=new Map(entries.map(x=>[x.key,x]));
    for(const key of meta.order||[]){const x=byKey.get(key);if(!x||!(x.file instanceof Blob))continue;
      items.push({key:x.key,file:x.file,preview:URL.createObjectURL(x.file),uploaded:x.uploaded||null,name:x.name||x.file.name||'image',sha256:x.sha256||''});
    }
    if(items.length || creationAttempted || completed)status(completed?'Đã khôi phục bản nháp đã tạo.':'Đã khôi phục phiên nhập đang dở và những ảnh đã lưu trên thiết bị.','good');
    applySource(meta.source);
    $('photoRights').checked=Boolean(meta.rightsConfirmed);
  } else await photoClear();
  if(source)applySource(source);
  persistMeta();render();lockFields();
}
async function checkSession() {
  try{await request('/api/admin/session');$('work').hidden=false;$('loginPanel').hidden=true;}
  catch{$('work').hidden=true;$('loginPanel').hidden=false;}
}
$('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const btn=e.submitter;btn.disabled=true;
  try{await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('adminPassword').value})});$('adminPassword').value='';$('loginMsg').hidden=true;await checkSession();}
  catch(ex){$('loginMsg').hidden=false;$('loginMsg').textContent=ex.message;$('loginMsg').className='status bad';}
  finally{btn.disabled=false;}
});
function render() {
  const el=$('photos');el.replaceChildren();
  for(let i=0;i<items.length;i++){
    const item=items[i],wrap=document.createElement('div'),img=document.createElement('img');wrap.className='photo';img.src=item.preview;img.alt='Ảnh '+(i+1);img.loading='lazy';
    const bar=document.createElement('div');bar.className='bar';const name=document.createElement('span');name.textContent=(i===0?'★ ':'')+item.name;bar.append(name);
    for(const [symbol,action,disabled] of [['↑','up',i===0],['↓','down',i===items.length-1],['✕','remove',false]]){
      const btn=document.createElement('button');btn.type='button';btn.textContent=symbol;btn.className='btn small';btn.disabled=busy||creationAttempted||completed||disabled;btn.setAttribute('aria-label',action+' '+item.name);
      btn.addEventListener('click',async()=>{
        if(action==='remove'){URL.revokeObjectURL(item.preview);items.splice(i,1);await photoDelete(item.key);}
        else{const other=action==='up'?i-1:i+1;[items[i],items[other]]=[items[other],items[i]];}
        persistMeta();render();
      });bar.append(btn);
    }
    wrap.append(img,bar);if(item.uploaded){const yes=document.createElement('span');yes.className='uploaded';yes.textContent='✓ Đã tải lên';wrap.append(yes);}el.append(wrap);
  }
  $('count').textContent=`Đã chọn ${items.length}/30 ảnh`;
}
async function addImages(files,showErrors=true){

  const errors=[],before=items.length;
  for(const file of Array.from(files||[])){
    if(items.length>=30){errors.push('Chỉ chọn tối đa 30 ảnh.');break;}
    if(!validType.has(file.type)||!file.size||file.size>MAX_ORIGINAL){errors.push(file.name+': chỉ nhận JPEG/PNG/WebP 1–20 MB.');continue;}
    if(items.some(x=>x.name===file.name&&x.file.size===file.size&&x.file.lastModified===file.lastModified)){errors.push(file.name+': ảnh có thể bị trùng.');continue;}
    let sha256='';
    try{sha256=await imageSha256(file);}catch{errors.push(file.name+': không đọc được dữ liệu ảnh để kiểm tra trùng.');continue;}
    if(sha256&&items.some(x=>x.sha256===sha256)){errors.push(file.name+': ảnh trùng nội dung, đã bỏ qua.');continue;}
    const key=newUuid(),ok=await photoWrite({key,file,name:file.name,uploaded:null,sha256});
    if(!ok){errors.push(file.name+': không lưu được ảnh trên thiết bị. Vui lòng kiểm tra dung lượng hoặc quyền lưu trữ.');continue;}
    items.push({key,file,name:file.name,preview:URL.createObjectURL(file),uploaded:null,sha256});
  }
  persistMeta();render();if(errors.length && showErrors)status(errors.join('\n'),'bad');
  return {added:items.length-before,errors};
}
$('picker').addEventListener('change',async e=>{
  await addImages(Array.from(e.target.files||[]));
  e.target.value='';
});

const autoMessage=(message,bad=false)=>{
  const el=$('autoStatus');el.textContent=message;el.className='status '+(bad?'bad':'');
};
$('taobaoLink').addEventListener('input',()=>{
  const link=$('taobaoLink').value.trim();
  if(allowedSource(link)){
    $('sourceLink').href=link;$('sourceLink').hidden=false;$('noSource').hidden=true;
  }else{
    $('sourceLink').hidden=true;$('noSource').hidden=!link;
  }
  persistMeta();
});
$('photoRights').addEventListener('change',persistMeta);
$('autoPhotos').addEventListener('click',async()=>{
  if(busy||creationAttempted||completed)return;
  const link=$('taobaoLink').value.trim();
  if(!allowedSource(link)){autoMessage('Vui lòng dán URL Taobao/Tmall đầy đủ có https:// và id sản phẩm.',true);return;}
  if(!$('photoRights').checked){autoMessage('Cần xác nhận quyền sử dụng ảnh trước khi lấy.',true);return;}
  busy=true;lockFields();
  let added=0,failed=0;
  try{
    autoMessage('Đang lấy danh sách ảnh qua API Taobao chính thức…');
    const result=await request('/api/admin/taobao-photos',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({link,permissionConfirmed:true})
    });
    if(!Array.isArray(result.images)||result.images.length===0)throw Error('API không trả về ảnh sản phẩm.');
    // Do not auto-fill product title: official titles may not reflect SinDarealest naming.
    for(let i=0;i<Math.min(result.images.length,30-items.length);i++){
      const entry=result.images[i];
      if(!entry||typeof entry.ticket!=='string'){failed++;continue;}
      autoMessage('Đang tải ảnh '+(i+1)+'/'+result.images.length+'…');
      try{
        const res=await fetch('/api/admin/taobao-photo?ticket='+encodeURIComponent(entry.ticket),{
          credentials:'same-origin',cache:'no-store'
        });
        if(!res.ok){failed++;continue;}
        const type=(res.headers.get('Content-Type')||'').split(';')[0];
        if(!validType.has(type)){failed++;continue;}
        const blob=await res.blob();
        if(!blob.size||blob.size>MAX_ORIGINAL){failed++;continue;}
        const ext=type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';
        const name='Taobao-'+result.itemId+'-'+(i+1)+'.'+ext;
        const record=await addImages([new File([blob],name,{type})],false);
        added+=record.added;
        failed+=record.errors.length;
      }catch{failed++;}
    }
    autoMessage(added
      ?'Đã tự tải '+added+' ảnh. '+(failed?'Bỏ qua '+failed+' ảnh lỗi/trùng. ':'')+'Kiểm tra ảnh bên dưới rồi tạo bản nháp.'
      :'Không tải được ảnh nào. API có thể thiếu quyền tải hình hoặc ảnh nguồn đã chặn truy xuất.',!added);
  }catch(ex){
    autoMessage('Chưa lấy được ảnh: '+ex.message,true);
  }finally{
    busy=false;lockFields();persistMeta();render();
  }
});
async function toWebp(file){
  let bitmap;
  try{
    bitmap=await createImageBitmap(file);
    if(bitmap.width>12000||bitmap.height>12000||bitmap.width*bitmap.height>60000000)throw Error('Độ phân giải ảnh quá lớn; hãy thu nhỏ ảnh trước khi nhập.');
    let edge=2400;
    for(let scale=0;scale<4;scale++){
      const ratio=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('Không thể tối ưu ảnh trên thiết bị này.');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const q of [.88,.78,.66]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',q));if(blob?.type==='image/webp'&&blob.size>0&&blob.size<=MAX_DERIVATIVE)return blob;}
      edge=Math.round(edge*.75);
    }
    throw Error('Ảnh vượt 5 MB sau tối ưu; giảm kích thước trước khi nhập.');
  }finally{bitmap?.close?.();}
}
function payload() {
  const title=$('title').value.trim(),category=$('category').value,n=$('price').value.trim(),price=n===''?null:Number(n);
  if(!title||!category||(n!==''&&(!Number.isSafeInteger(price)||price<0||price>2e9)))throw Error('Tên, danh mục hoặc giá không hợp lệ.');
  return {importId,title,category,categoryLabel:$('category').selectedOptions[0].textContent,description:$('description').value,price,stock:null,fulfillmentType:$('fulfillment').value,published:false,images:items.map(x=>x.uploaded)};
}
async function confirmExisting(body) {
  const found=await request('/api/admin/import-draft?id='+encodeURIComponent(importId));
  if(!found.exists)return null;
  if(found.product?.published!==false)throw Error('Sản phẩm đã đổi trạng thái hoặc không còn là bản nháp; cần kiểm tra Admin.');
  if(found.product?.title!==body.title)throw Error('Mã nhập đã trùng dữ liệu khác; cần kiểm tra Admin.');
  return found.product;
}
function finish(product) {
  completed=true;persistMeta();$('bar').style.width='100%';
  status(`✓ Đã tạo bản nháp ẨN\nSKU: ${product.sku}\nTên: ${product.title}\nHãy mở Admin để kiểm tra trước khi công khai.`, 'good');
}
$('createForm').addEventListener('input',()=>{if(!busy&&!creationAttempted)persistMeta();});
$('createForm').addEventListener('change',()=>{if(!busy&&!creationAttempted)persistMeta();});
$('createForm').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||completed)return;
  if(!items.length){status('Vui lòng chọn ít nhất một ảnh.','bad');return;}
  let body;
  try{body=payload();}catch(ex){status(ex.message,'bad');return;}
  if(!creationAttempted&&!confirm(`Tải ${items.length} ảnh rồi tạo sản phẩm ẨN trên Admin?`))return;
  busy=true;lockFields();render();
  try{
    if(creationAttempted){const found=await confirmExisting(body);if(found){finish(found);return;}}
    for(let i=0;i<items.length;i++){
      const item=items[i];
      if(!item.uploaded){
        status(`Đang tải ảnh ${i+1}/${items.length}: ${item.name}`);
        const derivative=await toWebp(item.file),form=new FormData();form.append('file',derivative,'optimized.webp');form.append('original',item.file,item.name);
        const out=await request('/api/admin/upload',{method:'POST',body:form});
        if(!/^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(out.url||''))throw Error('Máy chủ trả về đường dẫn ảnh không hợp lệ.');
        item.uploaded=out.url;
        if(!await photoWrite({key:item.key,file:item.file,name:item.name,uploaded:item.uploaded,sha256:item.sha256||''}))throw Error('Không lưu được tiến trình tải ảnh; cần kiểm tra dung lượng thiết bị.');
      }
      $('bar').style.width=(i+1)/items.length*90+'%';
    }
    body=payload();creationAttempted=true;persistMeta();lockFields();
    status('Ảnh đã tải lên. Đang tạo bản nháp…');
    const result=await request('/api/admin/import-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(result.product?.published!==false)throw Error('Máy chủ không xác nhận bản nháp ẩn; cần kiểm tra Admin.');
    finish(result.product);
  }catch(ex){
    let resolved=false;
    if(creationAttempted){try{const found=await confirmExisting(body);if(found){finish(found);resolved=true;}}catch{}}
    if(!resolved){status('Chưa hoàn tất: '+ex.message+'\nTiến trình đã được lưu. Bấm kiểm tra / hoàn tất để tiếp tục an toàn.','bad');
      if(/phiên đăng nhập|chưa đăng nhập|401/.test(ex.message))checkSession();}
  }finally{busy=false;lockFields();render();}
});
$('newDraft').addEventListener('click',async()=>{
  if(!completed||busy)return;
  for(const item of items)URL.revokeObjectURL(item.preview);
  items.length=0;await photoClear();localClear();importId=newUuid();completed=false;creationAttempted=false;
  $('createForm').reset();$('sourceLink').hidden=true;$('sourceLink').removeAttribute('href');$('noSource').hidden=false;$('bar').style.width='0';$('status').hidden=true;persistMeta();render();lockFields();
});
window.addEventListener('pagehide',()=>{if(!busy)persistMeta();for(const item of items)URL.revokeObjectURL(item.preview);});
window.addEventListener('pageshow',event=>{if(event.persisted){for(const item of items)item.preview=URL.createObjectURL(item.file);render();}});
(async()=>{await restore();await checkSession();})();
