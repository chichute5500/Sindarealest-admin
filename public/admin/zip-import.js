(() => {
'use strict';
const LIM={zip:120*1024*1024,expanded:220*1024*1024,files:5000,products:200,images:3000};
const S={files:new Map(),products:[],existing:[],report:[],busy:false,filter:'all',filename:''};
const $=s=>document.querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,opt){opt=opt||{};let r;try{r=await fetch(url,Object.assign({credentials:'same-origin',cache:'no-store',headers:opt.body instanceof FormData?{}:{'Content-Type':'application/json'}},opt))}catch(e){throw Error('Không kết nối được máy chủ.')}let d={};try{d=await r.json()}catch(e){}if(!r.ok)throw Error(d.error||('Lỗi máy chủ '+r.status));return d}
function crc32(b){let c=0xffffffff;for(let i=0;i<b.length;i++){c^=b[i];for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function safePath(n){return !!n&&!n.includes('\\')&&!n.startsWith('/')&&!/^[a-z]:/i.test(n)&&!n.split('/').some(p=>p==='..'||p==='.')&&!n.includes('\0')}
async function readZip(file){
 if(!file||!file.name.toLowerCase().endsWith('.zip'))throw Error('Chỉ nhận file .zip.');
 if(!file.size||file.size>LIM.zip)throw Error('ZIP phải nhỏ hơn hoặc bằng 120 MB.');
 const b=new Uint8Array(await file.arrayBuffer()),v=new DataView(b.buffer);let end=-1;
 for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--)if(v.getUint32(p,true)===0x06054b50){end=p;break}
 if(end<0)throw Error('Không tìm thấy cấu trúc ZIP hợp lệ.');
 if(v.getUint16(end+4,true)||v.getUint16(end+6,true))throw Error('Không hỗ trợ ZIP nhiều phân vùng.');
 const count=v.getUint16(end+10,true),cs=v.getUint32(end+12,true),co=v.getUint32(end+16,true);
 if(!count||count>LIM.files||co+cs>end)throw Error('Số tệp hoặc chỉ mục ZIP không hợp lệ.');
 let pos=co,total=0;const files=new Map(),dec=new TextDecoder('utf-8',{fatal:true});
 for(let i=0;i<count;i++){
  if(pos+46>b.length||v.getUint32(pos,true)!==0x02014b50)throw Error('Danh mục ZIP bị hỏng.');
  const flags=v.getUint16(pos+8,true),method=v.getUint16(pos+10,true),crc=v.getUint32(pos+16,true),size=v.getUint32(pos+20,true),raw=v.getUint32(pos+24,true),nl=v.getUint16(pos+28,true),el=v.getUint16(pos+30,true),cl=v.getUint16(pos+32,true),lo=v.getUint32(pos+42,true);
  if(flags&9)throw Error('ZIP mã hóa hoặc dùng data descriptor không được hỗ trợ.');
  if(method!==0||size!==raw)throw Error('Chỉ hỗ trợ ZIP WebP không nén từ bộ xuất Taobao Shop Collector.');
  total+=raw;if(total>LIM.expanded)throw Error('Tổng dung lượng giải nén vượt 220 MB.');
  let name;try{name=dec.decode(b.slice(pos+46,pos+46+nl))}catch(e){throw Error('Tên tệp trong ZIP không phải UTF-8 hợp lệ.')}
  pos+=46+nl+el+cl;if(name.endsWith('/'))continue;
  if(!safePath(name))throw Error('Đường dẫn ZIP không an toàn: '+name);
  if(files.has(name))throw Error('Đường dẫn tệp trùng: '+name);
  if(lo+30>b.length||v.getUint32(lo,true)!==0x04034b50)throw Error('Header ZIP không hợp lệ: '+name);
  const start=lo+30+v.getUint16(lo+26,true)+v.getUint16(lo+28,true),stop=start+size;
  if(stop>co||stop>b.length)throw Error('Tệp nằm ngoài vùng dữ liệu hợp lệ: '+name);
  const data=b.slice(start,stop);if(crc32(data)!==crc)throw Error('CRC không khớp: '+name);
  files.set(name,data)
 }
 return files
}
function csvRows(s){const rows=[];let row=[],cell='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else if(c==='"'&&!cell)q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}if(q)throw Error('CSV chưa đóng dấu ngoặc kép.');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}if(rows.length<2)throw Error('CSV không có sản phẩm.');const h=rows.shift().map((x,i)=>(i===0?x.replace(/^\uFEFF/,''):x).trim());return rows.filter(r=>r.some(x=>x.trim())).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]||''])))}
function maybe(v){if(Array.isArray(v))return v;if(v&&typeof v==='object')return v;if(typeof v!=='string'||!v.trim())return[];try{return JSON.parse(v)}catch(e){return v.split('|').map(x=>x.trim()).filter(Boolean)}}
function normalize(s,i,files){
 const id=String(s.export_id||'').trim(),folder=String(s.export_folder||'').trim(),errs=[];
 if(!id)errs.push('Thiếu export_id.');if(!folder||!safePath(folder.endsWith('/')?folder:folder+'/'))errs.push('export_folder thiếu hoặc không an toàn.');
 const declared=maybe(s.image_files),manifest=maybe(s.image_manifest),images=[];
 if(!Array.isArray(declared))errs.push('image_files không hợp lệ.');
 else declared.forEach(p=>{p=String(p||'');if(!safePath(p)||!p.startsWith(folder.endsWith('/')?folder:folder+'/')){errs.push('Ảnh không thuộc thư mục sản phẩm: '+p);return}const b=files.get(p);if(!b){errs.push('Thiếu file ảnh: '+p);return}if(b.length<12||new TextDecoder().decode(b.slice(0,4))!=='RIFF'||new TextDecoder().decode(b.slice(8,12))!=='WEBP'){errs.push('File không phải WebP hợp lệ: '+p);return}images.push(p)});
 const mErr=Array.isArray(manifest)?manifest.filter(x=>x&&(x.status==='failed'||!x.file_path)).length:0,fail=Number(s.image_export_failed)||0;
 if(fail||mErr||s.image_export_status==='failed'||s.image_export_status==='partial')errs.push('Bộ xuất báo ảnh lỗi ('+Math.max(fail,mErr)+').');
 const title=String(s.title_vi||'').trim()||String(s.title||s.name||'').trim(),category=String(s.category_vi||'').trim()||String(s.category||'').trim();
 if(!title)errs.push('Thiếu tên sản phẩm.');
 return {key:id||'invalid-'+i,id,folder,src:s,title,category,description:String(s.description_vi||s.description||''),sourcePrice:String(s.price==null?'':s.price),currency:String(s.currency||''),productId:String(s.product_id||''),sourceTitle:String(s.title||''),sourceCategory:String(s.category||''),sourceUrl:String(s.product_url||s.sourceUrl||''),images,errs,selected:!errs.length,retailTitle:title,retailCategory:category,salePrice:'',hasVi:!!String(s.title_vi||'')}
}
function prefix(label){const n=String(label||'').toLocaleLowerCase('vi').replace(/đ/g,'d').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');const m={sneaker:'SD-SN',sneakers:'SD-SN','giay-luoi':'SD-GL',loafers:'SD-GL','giay-tay':'SD-GT','dress-shoes':'SD-GT','that-lung':'SD-TL',belts:'SD-TL','vi-da':'SD-VD',wallets:'SD-VD',dep:'SD-DD',sandals:'SD-DD','day-dong-ho':'SD-DH','watch-straps':'SD-DH','op-dien-thoai':'SD-ODT','phone-cases':'SD-ODT'};if(m[n])return m[n];let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%1296;return 'SD-'+(n.replace(/-/g,'').toUpperCase().slice(0,5)||'MISC')+h.toString(36).toUpperCase().padStart(2,'0')}
function sku(p){const pre=prefix(p.retailCategory);let max=0;S.existing.forEach(x=>{const k=String(x.sku||'').toUpperCase();if(k.startsWith(pre)&&/^\d+$/.test(k.slice(pre.length)))max=Math.max(max,Number(k.slice(pre.length))||0)});return pre+String(max+1).padStart(3,'0')}
function duplicate(p){const t=String(p.retailTitle||'').trim().toLocaleLowerCase('vi');return S.existing.find(x=>t&&String(x.title||'').trim().toLocaleLowerCase('vi')===t)||null}
function ready(p){return !p.errs.length&&!!p.retailTitle.trim()&&!!p.retailCategory.trim()}
function render(){
 const body=$('#ziRows');if(!body)return;
 const rows=S.products.filter(p=>S.filter==='all'||(S.filter==='errors'&&!ready(p))||(S.filter==='duplicates'&&duplicate(p)));
 body.innerHTML=rows.map(p=>{const d=duplicate(p),path=p.images[0],bytes=path&&S.files.get(path),url=bytes?URL.createObjectURL(new Blob([bytes],{type:'image/webp'})):'';
 return '<tr><td><input type="checkbox" data-zi-check="'+esc(p.key)+'" '+(p.selected?'checked':'')+'></td><td><div style="display:flex;gap:8px;min-width:210px">'+(url?'<img src="'+url+'" style="width:62px;height:62px;object-fit:contain;background:#eee;border-radius:8px">':'<span>Không ảnh</span>')+'<div><b>'+esc(p.retailTitle||'(Thiếu tên)')+'</b><div class="zi-muted">ID: '+esc(p.id||'—')+'</div><div class="zi-muted">'+esc(p.errs.concat(!p.hasVi?['Chưa có tên tiếng Việt']:[]).join(' '))+'</div></div></div></td><td>'+esc(p.sourcePrice||'—')+' '+esc(p.currency)+'</td><td><input data-zi-title="'+esc(p.key)+'" value="'+esc(p.retailTitle)+'" maxlength="180" placeholder="Tên bán"><input data-zi-cat="'+esc(p.key)+'" value="'+esc(p.retailCategory)+'" maxlength="80" placeholder="Danh mục" style="margin-top:5px"><input data-zi-price="'+esc(p.key)+'" value="'+esc(p.salePrice)+'" inputmode="numeric" placeholder="Giá bán VNĐ (để trống)" style="margin-top:5px"></td><td>'+p.images.length+' ảnh<div class="zi-muted">'+esc(ready(p)?'Sẵn sàng':'Cần kiểm tra')+'</div><div class="zi-muted">SKU dự kiến '+esc(sku(p))+'</div>'+(d?'<b class="zi-badge">Có thể trùng</b>':'')+'</td></tr>'}).join('');
 body.querySelectorAll('img').forEach(img=>{const u=img.getAttribute('src');if(u&&u.startsWith('blob:'))img.addEventListener('load',()=>URL.revokeObjectURL(u),{once:true})});
 $('#ziCount').textContent=S.products.length+' sản phẩm đọc được · '+S.products.filter(ready).length+' đủ điều kiện · '+S.products.filter(p=>p.errs.length).length+' cần kiểm tra'
}
function openPanel(){
 let p=$('#zipImportPanel');if(!p){p=document.createElement('div');p.id='zipImportPanel';p.style.cssText='position:fixed;inset:0;z-index:10010;background:#171713b8;overflow:auto;padding:12px';p.innerHTML='<section style="max-width:1450px;margin:10px auto;padding:18px;background:var(--paper,#fffdf9);color:var(--ink,#24211c);border-radius:18px;font:13px/1.5 system-ui"><header style="display:flex;justify-content:space-between;gap:10px"><div><b style="color:var(--gold,#ad8242)">SIND A REAL EST</b><h2 style="margin:4px 0">Nhập sản phẩm từ ZIP</h2><p class="zi-muted">Xem trước trước khi ghi dữ liệu. Không tự ghi đè sản phẩm đang có.</p></div><button id="ziClose" class="btn">Đóng</button></header><section style="border:1px solid var(--line,#dfd6c9);padding:12px;border-radius:12px;display:grid;gap:8px"><label><b>Chọn ZIP từ Taobao Shop Collector</b><input id="ziFile" type="file" accept=".zip,application/zip" style="display:block;margin-top:8px"></label><div id="ziFileInfo" class="zi-muted">Chưa chọn file.</div><button id="ziRead" class="btn primary">Đọc ZIP và xem trước</button><div id="ziStatus" role="status" class="zi-muted"></div></section><div id="ziPreview" style="display:none"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0"><b id="ziCount"></b><select id="ziFilter" class="control" style="width:auto"><option value="all">Tất cả</option><option value="errors">Cần kiểm tra</option><option value="duplicates">Có thể trùng</option></select><button id="ziReady" class="btn small">Chọn sản phẩm hợp lệ</button><button id="ziClear" class="btn small">Bỏ chọn tất cả</button></div><div style="overflow:auto;border:1px solid var(--line,#dfd6c9);border-radius:10px"><table style="width:100%;min-width:850px;border-collapse:collapse"><thead><tr><th>Chọn</th><th>Sản phẩm / ảnh</th><th>Giá nguồn</th><th>Thông tin nhập</th><th>Kiểm tra</th></tr></thead><tbody id="ziRows"></tbody></table></div><p class="zi-muted">Giá Taobao không tự chuyển thành giá bán. Giá bán để trống nếu chưa xác nhận. Sản phẩm mới sẽ ở trạng thái ẩn. Ảnh được đóng dấu và tải lên R2 sau khi xác nhận.</p><button id="ziCommit" class="btn primary">Xác nhận nhập đã chọn</button><div id="ziResults" style="margin-top:12px"></div><button id="ziReport" class="btn small" hidden>Tải báo cáo</button></div></section>';
 document.body.append(p);const st=document.createElement('style');st.textContent='#zipImportPanel .zi-muted{color:var(--muted,#777166);font-size:11px}#zipImportPanel th,#zipImportPanel td{padding:8px;border-bottom:1px solid var(--line,#dfd6c9);text-align:left;vertical-align:top}#zipImportPanel input,#zipImportPanel select{max-width:100%;padding:7px;border:1px solid var(--line,#dfd6c9);border-radius:7px;background:var(--paper,#fffdf9);color:var(--ink,#24211c)}#zipImportPanel .zi-badge{display:inline-block;padding:2px 5px;border-radius:5px;background:#f5dfbd;color:#6b4718;font-size:10px}';document.head.append(st);
 $('#ziClose').onclick=()=>p.style.display='none';$('#ziFile').onchange=e=>{const f=e.target.files[0];$('#ziFileInfo').textContent=f?f.name+' · '+(f.size/1048576).toFixed(2)+' MB':'Chưa chọn file'};$('#ziRead').onclick=readFile;$('#ziFilter').onchange=e=>{S.filter=e.target.value;render()};$('#ziReady').onclick=()=>{S.products.forEach(x=>x.selected=ready(x)&&!duplicate(x));render()};$('#ziClear').onclick=()=>{S.products.forEach(x=>x.selected=false);render()};
 $('#ziRows').addEventListener('change',e=>{const t=e.target;let p=S.products.find(x=>x.key===(t.dataset.ziCheck||t.dataset.ziTitle||t.dataset.ziCat||t.dataset.ziPrice));if(!p)return;if(t.dataset.ziCheck)p.selected=t.checked;if(t.dataset.ziTitle)p.retailTitle=t.value;if(t.dataset.ziCat)p.retailCategory=t.value;if(t.dataset.ziPrice)p.salePrice=t.value});
 $('#ziRows').addEventListener('input',e=>{const t=e.target;let p=S.products.find(x=>x.key===(t.dataset.ziTitle||t.dataset.ziCat||t.dataset.ziPrice));if(!p)return;if(t.dataset.ziTitle)p.retailTitle=t.value;if(t.dataset.ziCat)p.retailCategory=t.value;if(t.dataset.ziPrice)p.salePrice=t.value});
 $('#ziCommit').onclick=commit;$('#ziReport').onclick=report
 }p.style.display='block'
}
async function readFile(){
 if(S.busy)return;const f=$('#ziFile').files[0];if(!f){$('#ziStatus').textContent='Hãy chọn ZIP trước.';return}
 S.busy=true;$('#ziRead').disabled=true;$('#ziStatus').textContent='Đang kiểm tra ZIP…';
 try{S.files=await readZip(f);let records=null,jsonErr='';const j=S.files.get('products.json'),c=S.files.get('products.csv');
 if(j){try{const o=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(j));records=Array.isArray(o)?o:o.products;if(!Array.isArray(records))throw Error('products.json không có danh sách sản phẩm')}catch(e){jsonErr=e.message}}
 if(!records&&c){try{records=csvRows(new TextDecoder('utf-8',{fatal:true}).decode(c));$('#ziStatus').textContent='Đang dùng products.csv dự phòng. '+jsonErr}catch(e){throw Error('JSON lỗi ('+(jsonErr||'thiếu')+'); CSV cũng lỗi: '+e.message)}}
 if(!records)throw Error(jsonErr||'Thiếu products.json và products.csv hợp lệ.');
 if(!records.length||records.length>LIM.products)throw Error('Số sản phẩm phải từ 1 đến '+LIM.products+'.');
 const mf=S.files.get('export-manifest.json');if(mf){const m=JSON.parse(new TextDecoder().decode(mf));if(m.schema_version&&!/^1\./.test(String(m.schema_version)))throw Error('Schema ZIP không hỗ trợ: '+m.schema_version)}
 S.products=records.map(normalize);const ids=new Set();S.products.forEach(p=>{if(p.id&&ids.has(p.id)){p.errs.push('export_id bị trùng');p.selected=false}ids.add(p.id)});
 if(S.products.reduce((n,p)=>n+p.images.length,0)>LIM.images)throw Error('Vượt giới hạn '+LIM.images+' ảnh.');
 const old=await api('/api/admin/products');S.existing=old.products||[];S.products.forEach(p=>{if(duplicate(p))p.selected=false});S.filename=f.name;S.report=[];S.filter='all';$('#ziFilter').value='all';$('#ziPreview').style.display='block';$('#ziStatus').textContent='Đã đọc ZIP; chưa ghi dữ liệu sản phẩm nào.';render()
 }catch(e){$('#ziStatus').textContent='Không thể đọc ZIP: '+e.message;$('#ziPreview').style.display='none';S.products=[]}finally{S.busy=false;$('#ziRead').disabled=false}
}
async function upload(bytes,name){
 let bitmap;try{bitmap=await createImageBitmap(new Blob([bytes],{type:'image/webp'}))}catch(e){throw Error('Không giải mã được ảnh '+name)}
 const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d',{alpha:false});if(!ctx){bitmap.close();throw Error('Không tạo được canvas')}
 ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let mark;try{const r=await fetch('/watermark.webp');if(!r.ok)throw Error();mark=await createImageBitmap(await r.blob())}catch(e){throw Error('Không tải được watermark.webp')}
 const ms=Math.min(canvas.width,canvas.height)*.19,mg=Math.max(8,Math.min(canvas.width,canvas.height)*.035);ctx.globalAlpha=.68;ctx.drawImage(mark,canvas.width-ms-mg,canvas.height-ms-mg,ms,ms);ctx.globalAlpha=1;mark.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.88));if(!blob||blob.size>5*1024*1024)throw Error('Ảnh sau tối ưu vượt 5 MB: '+name);
 const fd=new FormData();fd.append('file',blob,'product.webp');fd.append('watermarkApplied','1');const d=await api('/api/admin/upload',{method:'POST',body:fd});if(!d.url)throw Error('API upload không trả URL');return d.url
}
async function commit(){
 if(S.busy)return;const chosen=S.products.filter(p=>p.selected&&ready(p));if(!chosen.length){alert('Chưa chọn sản phẩm hợp lệ.');return}
 if(chosen.some(p=>p.salePrice!==''&&(!/^\d+$/.test(p.salePrice)||!Number.isSafeInteger(Number(p.salePrice)))))return alert('Giá bán phải là số nguyên VNĐ không âm hoặc để trống.');
 const possible=chosen.filter(p=>duplicate(p)).length;if(possible&&!confirm('Có '+possible+' sản phẩm trùng tên có thể cần kiểm tra. Tên giống nhau không chứng minh là cùng sản phẩm. Bạn xác nhận vẫn nhập các mục đã chọn?'))return;if(!confirm('Xác nhận tạo '+chosen.length+' sản phẩm mới? Sản phẩm hiện có sẽ không bị ghi đè; sản phẩm mới ở trạng thái ẩn.'))return;
 S.busy=true;$('#ziCommit').disabled=true;$('#ziResults').textContent='Đang nhập…';S.report=[];
 try{for(let i=0;i<chosen.length;i++){const p=chosen[i],r={export_id:p.id,title:p.retailTitle,status:'failed',imagesUploaded:0,error:''};try{const imgs=[];for(const path of p.images){const b=S.files.get(path);if(!b)throw Error('Thiếu ảnh '+path);imgs.push(await upload(b,path));r.imagesUploaded++}
 const d=await api('/api/admin/products',{method:'POST',body:JSON.stringify({title:p.retailTitle,category:p.retailCategory,categoryLabel:p.retailCategory,description:p.description||'',price:p.salePrice===''?null:Number(p.salePrice),stock:null,published:false,images:imgs,importSource:{exportId:p.id,exportFolder:p.folder,productId:p.productId,title:p.sourceTitle,category:p.sourceCategory,description:String(p.src.description||''),price:p.sourcePrice,currency:p.currency,url:p.sourceUrl,sourceRecord:p.src}})});
 r.status='created';r.sku=d.product&&d.product.sku||'';r.productId=d.product&&d.product.id||'';r.images=imgs;S.existing.push({id:r.productId,sku:r.sku,title:p.retailTitle,category:p.retailCategory,images:imgs,published:false})
 }catch(e){r.error=e.message}S.report.push(r);$('#ziResults').textContent='Đã xử lý '+(i+1)+'/'+chosen.length+' · Thành công '+S.report.filter(x=>x.status==='created').length+' · Lỗi '+S.report.filter(x=>x.status!=='created').length}
 $('#ziReport').hidden=false;$('#ziResults').textContent='Hoàn tất: '+S.report.filter(x=>x.status==='created').length+'/'+chosen.length+' sản phẩm đã tạo. Nếu upload ảnh thành công nhưng lưu sản phẩm thất bại, ảnh có thể cần dọn thủ công trong R2.'
 }finally{S.busy=false;$('#ziCommit').disabled=false}
}
function report(){const data={zip:S.filename,created_at:new Date().toISOString(),results:S.report,source_records:S.products.map(p=>({export_id:p.id,export_folder:p.folder,product_id:p.productId,source_title:p.sourceTitle,source_category:p.sourceCategory,source_price:p.sourcePrice,currency:p.currency,source_url:p.sourceUrl,image_files:p.images,image_errors:p.errs,source:p.src}))};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='sindarealest-zip-import-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function nav(){const n=document.querySelector('.sidebar');if(n&&!$('#ziNav')){const b=document.createElement('button');b.id='ziNav';b.className='nav';b.innerHTML='<span>⇧</span>Nhập sản phẩm từ ZIP';b.onclick=openPanel;const note=n.querySelector('.side-note');n.insertBefore(b,note||null)}const m=document.querySelector('.mobiletabs');if(m&&!$('#ziNavMobile')){const b=document.createElement('button');b.id='ziNavMobile';b.className='nav';b.textContent='⇧ Nhập ZIP';b.onclick=openPanel;m.append(b)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',nav);else nav();setTimeout(nav,600);
if(typeof window!=='undefined'&&window.__SD_IMPORT_TEST__)window.__SD_IMPORT_CORE__={readZip:readZip,csvRows:csvRows,normalize:normalize};
})();