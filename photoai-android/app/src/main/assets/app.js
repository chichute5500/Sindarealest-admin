/* SinDarealest PhotoAI — offline-first project editor.
   Native Android SAF bridge handles images, persisted access and export.
   No remote data transfer, no automatic file deletion. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const native=typeof window.Native!=='undefined';
const empty=()=>({schema:1,rootName:'',rootUri:'',photos:[],models:[],expanded:[],checked:{}});
let s=empty(),active=null,chosen=new Set(),tab='tree',take=60,history=[],search='',busy=false,callback=null,dragging=null;
const SETTINGS_KEY='sindarealest-photoai-settings-v2';
const defaultSettings=()=>({aiEnabled:true,mode:'local',cloudEndpoint:'',cloudConsent:false});
let settings=defaultSettings(),sessionToken='';
try{settings={...defaultSettings(),...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch(e){}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch(e){console.warn('save settings',e)}}
function modeText(){return !settings.aiEnabled?'Tắt AI · Chỉnh tay':({local:'AI trên máy (MobileNetV3)',cloud:'AI Cloud (cần máy chủ)',hybrid:'Kết hợp (Cloud tùy chọn)'}[settings.mode]||'Thủ công')}
function safeUrl(s){try{const u=new URL(s);return u.protocol==='https:' && !!u.hostname && !u.username&&!u.password}catch(e){return false}}

const colorCodes={'Đen':'#242426','Nâu':'#94663f','Trắng':'#f1eee7','Đỏ':'#b53938','Xanh dương':'#426eac','Xanh lá':'#468b69','Be':'#c6aa7c','Xám':'#96999c','Vàng':'#eec365','Chưa rõ':'#777777'};
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm=x=>(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLocaleLowerCase('vi').trim();
const id=()=>('M'+Math.random().toString(36).slice(2,10));
function notify(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>el.classList.remove('show'),3000)}
function remember(){history.push(JSON.stringify({photos:s.photos,models:s.models,checked:s.checked,expanded:s.expanded}));if(history.length>25)history.shift()}
function autosave(){if(native){window.Native.saveState(JSON.stringify(s))}else{try{localStorage.setItem('sindarealest-photoai-project',JSON.stringify(s))}catch(e){console.warn(e)}}}
function load(json){try{const v=typeof json==='string'?JSON.parse(json):json;if(!v||!Array.isArray(v.photos)||!Array.isArray(v.models))return;s={...empty(),...v};history=[];chosen.clear();active=null;render();notify('Đã mở dự án đã lưu')}catch(e){notify('Không mở được dự án: '+e.message)}}
function countReview(){return s.photos.filter(p=>{const m=modelById(p.modelId);return !m?.verified||m.priceVnd===null||m.priceVnd===undefined||p.color==='Chưa rõ'}).length}
function selection(){return s.photos.filter(p=>chosen.has(p.id))}
function groupPhotos(node=active){if(search){const q=norm(search);return s.photos.filter(p=>[p.name,p.category,p.color,p.relativePath,modelById(p.modelId)?.name].some(v=>norm(v).includes(q)))}if(!node)return s.photos.slice();if(node.type==='category')return s.photos.filter(p=>p.category===node.id);if(node.type==='model')return s.photos.filter(p=>p.modelId===node.id);if(node.type==='color')return s.photos.filter(p=>p.modelId===node.modelId&&p.color===node.color);return s.photos}
function modelById(i){return s.models.find(m=>m.id===i)}
function validModels(){return s.models.filter(m=>s.photos.some(p=>p.modelId===m.id))}
function colorsForModel(i){const result={};for(const p of s.photos)if(p.modelId===i)result[p.color]=(result[p.color]||0)+1;return Object.entries(result)}
function setActive(node){active=node;chosen.clear();take=60;if(tab==='review')tab='tree';render()}
function render(){
$('photoCount').textContent=s.photos.length;$('modelCount').textContent=validModels().length;$('reviewCount').textContent=countReview();
$('treeTab').classList.toggle('active',tab==='tree');$('photosTab').classList.toggle('active',tab==='photos');$('reviewTab').classList.toggle('active',tab==='review');
$('treeTitle').textContent=s.rootName?('DANH MỤC · '+s.rootName):'DANH MỤC / MẪU / MÀU';
renderTree();renderGallery();$('undoBtn').disabled=!history.length;$('loadMoreBtn').hidden=groupPhotos().length<=take;
}
function categoryNames(){return [...new Set([...s.photos.map(p=>p.category),...s.models.map(m=>m.category)])].sort((a,b)=>a.localeCompare(b,'vi'))}
function treeRow(parent,node,label,num,depth,expandable,expanded){const d=document.createElement('div');d.className='tree-row depth'+depth+(active&&active.type===node.type&&active.id===node.id&&active.modelId===node.modelId&&active.color===node.color?' current':'');
const key=node.type+':'+node.id+(node.color||'');d.dataset.key=key;d.__node=node;d.innerHTML=`<span class="chev">${expandable?(expanded?'▾':'▸'):''}</span><span class="folder">${node.type==='color'?'●':'▣'}</span><span class="name" title="${escapeHtml(label)}">${escapeHtml(label)}</span><span class="count">${num}</span>`;
if(node.type==='color')d.querySelector('.folder').style.color=colorCodes[node.color]||'#d6ad65';
d.addEventListener('click',ev=>{if(ev.target.classList.contains('chev')&&expandable){if(s.expanded.includes(key))s.expanded=s.expanded.filter(v=>v!==key);else s.expanded.push(key);autosave();renderTree();return}setActive(node)});
if(node.type!=='category'){
d.draggable=true;
d.addEventListener('dragstart',ev=>{dragging={kind:'node',node};ev.dataTransfer.setData('text/plain',JSON.stringify(dragging));ev.dataTransfer.effectAllowed='move'});
}
d.addEventListener('dragover',ev=>{if(dragging){ev.preventDefault();d.classList.add('dragover')}});
d.addEventListener('dragleave',()=>d.classList.remove('dragover'));
d.addEventListener('drop',ev=>{ev.preventDefault();d.classList.remove('dragover');const payload=dragging;dragging=null;if(payload)handleDrop(payload,node)});
// Mobile long press opens reliable transfer action; do not expand collapsed folders on drag.
if(node.type==='model'||node.type==='color')d.addEventListener('contextmenu',ev=>{ev.preventDefault();setActive(node);openNodeOptions(node)});
parent.appendChild(d);return d;
}
function renderTree(){const box=$('treeList');box.replaceChildren();const cats=categoryNames();if(!cats.length){box.innerHTML='<div class="empty">Chưa có ảnh. Hãy chọn thư mục sản phẩm để nhập dữ liệu.</div>';return}
for(const cat of cats){const node={type:'category',id:cat},key='category:'+cat,open=s.expanded.includes(key),photos=s.photos.filter(p=>p.category===cat);treeRow(box,node,cat,photos.length,0,true,open);if(!open)continue;
const models=s.models.filter(m=>m.category===cat&&s.photos.some(p=>p.modelId===m.id)).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
for(const m of models){const mnode={type:'model',id:m.id},mk='model:'+m.id,op=s.expanded.includes(mk),items=s.photos.filter(p=>p.modelId===m.id);treeRow(box,mnode,m.name,items.length,1,true,op);if(!op)continue;
for(const [color,qty] of colorsForModel(m.id).sort((a,b)=>a[0].localeCompare(b[0],'vi'))){treeRow(box,{type:'color',id:m.id+'|'+color,modelId:m.id,color},color,qty,2,false,false)}
}
}
}
function imageUrl(p,full=false){return p.demoUrl||p.localUrl||(native?'https://photoai.local/media/'+encodeURIComponent(p.id)+(full?'?full=1':''):'')}
function renderGallery(){const grid=$('gallery');grid.replaceChildren();let items=groupPhotos();if(tab==='review'&&!search){items=s.photos.filter(p=>{const m=modelById(p.modelId);return !m?.verified||m.priceVnd==null||p.color==='Chưa rõ'})}
$('galleryTitle').textContent=search?('KẾT QUẢ · '+items.length+' ẢNH'):tab==='review'?'CẦN XEM LẠI':active?.type==='model'?(modelById(active.id)?.name||'MẪU'):active?.type==='color'?active.color:'ẢNH TRONG NHÓM ('+items.length+')';
$('loadMoreBtn').hidden=items.length<=take;
if(!items.length){grid.innerHTML='<div class="empty">'+(search?'Không tìm thấy tên file phù hợp.':'Không có ảnh trong nhóm này.')+'</div>';return}
for(const p of items.slice(0,take)){
const div=document.createElement('div');div.className='photo'+(chosen.has(p.id)?' selected':'');div.draggable=true;div.dataset.id=p.id;
const img=document.createElement('img');img.loading='lazy';img.alt=p.name;img.src=imageUrl(p);img.onerror=()=>{img.onerror=null;img.src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="#26262b"/><text x="75" y="82" fill="#dabb83" font-size="17" text-anchor="middle">Ảnh</text></svg>')};
const check=document.createElement('span');check.className='check';check.textContent=chosen.has(p.id)?'✓':'○';
const filename=document.createElement('span');filename.className='filename';filename.textContent=p.name;
const color=document.createElement('span');color.className='meta'+(p.color==='Chưa rõ'?' uncertain':'');color.textContent=p.color+' · '+(modelById(p.modelId)?.name||'Chưa phân nhóm');
div.append(img,check,filename,color);
div.addEventListener('click',ev=>{if(chosen.has(p.id))chosen.delete(p.id);else chosen.add(p.id);renderGallery()});
div.addEventListener('dblclick',()=>openPreview(p));
div.addEventListener('dragstart',ev=>{if(!chosen.has(p.id))chosen.add(p.id);dragging={kind:'photos',ids:[...chosen]};ev.dataTransfer.setData('text/plain',JSON.stringify(dragging));ev.dataTransfer.effectAllowed='move'});
let timer,pressX=0,pressY=0;
div.addEventListener('touchstart',e=>{pressX=e.touches[0].clientX;pressY=e.touches[0].clientY;
 timer=setTimeout(()=>{chosen.add(p.id);renderGallery();notify('Đã chọn ảnh. Dùng “Chuyển đến” hoặc nhấn giữ ảnh để kéo thả.')},550)
},{passive:true});
div.addEventListener('touchend',()=>clearTimeout(timer));
div.addEventListener('touchmove',e=>{if(Math.abs(e.touches[0].clientX-pressX)+Math.abs(e.touches[0].clientY-pressY)>15)clearTimeout(timer)},{passive:true});
grid.appendChild(div)
}
}
function handleDrop(payload,target){if(!payload)return;
if(payload.kind==='photos'){movePhotos(payload.ids,target);return}
const src=payload.node;if(!src||src.id===target.id)return;
if(src.type==='model'&&target.type==='model'){const a=modelById(src.id),b=modelById(target.id);if(!a||!b||a.category!==b.category){notify('Chỉ gộp mẫu trong cùng danh mục');return}ask('Gộp hai mẫu?',`Toàn bộ ảnh “${a.name}” sẽ chuyển sang “${b.name}”. Bạn có thể Hoàn tác.`,()=>{mergeModels(src.id,target.id);hideModal()});return}
if(src.type==='color'&&target.type==='color'){if(src.modelId!==target.modelId){ask('Chuyển nhóm màu?',`Chuyển ảnh ${src.color} sang mẫu và màu ${target.color}?`,()=>{moveGroupColor(src,target);hideModal()});}else ask('Gộp nhóm màu?',`Chuyển toàn bộ ảnh màu ${src.color} vào ${target.color}?`,()=>{moveGroupColor(src,target);hideModal()});return}
if(src.type==='color'&&target.type==='model'){ask('Chuyển nhóm màu?',`Chuyển toàn bộ ảnh màu ${src.color} sang mẫu mới, giữ nguyên màu?`,()=>{moveGroupColor(src,target);hideModal()});return}
notify('Chỉ hỗ trợ kéo Mẫu → Mẫu và Màu → Mẫu/Màu')
}
function mergeModels(from,to){if(from===to)return;remember();for(const p of s.photos)if(p.modelId===from)p.modelId=to;s.models=s.models.filter(m=>m.id!==from);if(active?.id===from)active={type:'model',id:to};autosave();render();notify('Đã gộp mẫu')}
function moveGroupColor(src,target){remember();const mid=target.type==='model'?target.id:target.modelId;const targetModel=modelById(mid);if(!targetModel){notify('Mẫu đích không tồn tại');return}for(const p of s.photos)if(p.modelId===src.modelId&&p.color===src.color){p.modelId=mid;p.category=targetModel.category;if(target.type==='color')p.color=target.color}cleanupModels();autosave();render();notify('Đã chuyển nhóm màu')}
function movePhotos(ids,target){if(!ids||!ids.length){notify('Chọn ảnh trước');return}remember();let count=0;const idsSet=new Set(ids);const newModelForCategory=target.type==='category'?createModel(target.id,'Mẫu mới'):null;for(const p of s.photos){if(!idsSet.has(p.id))continue;if(target.type==='category'){
p.category=target.id;p.modelId=newModelForCategory.id;
}else if(target.type==='model'){const m=modelById(target.id);if(!m)continue;p.modelId=m.id;p.category=m.category}
else if(target.type==='color'){const m=modelById(target.modelId);if(!m)continue;p.category=m.category;p.modelId=m.id;p.color=target.color}count++}
cleanupModels();chosen.clear();autosave();render();notify('Đã chuyển '+count+' ảnh')}
function cleanupModels(){s.models=s.models.filter(m=>s.photos.some(p=>p.modelId===m.id))}
function createModel(category,name){const m={id:id(),category,name:name||'Mẫu mới',verified:false};s.models.push(m);return m}
function ask(title,message,fn){modal(title,'<p>'+escapeHtml(message)+'</p>',fn)}
function modal(title,html,fn){callback=fn;$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modal').classList.remove('hidden')}
function hideModal(){$('modal').classList.add('hidden');callback=null}
function openPreview(p){modal('Chi tiết ảnh',`<img class="preview-img" src="${escapeHtml(imageUrl(p,true))}" alt="${escapeHtml(p.name)}"><p>${escapeHtml(p.name)}<br>${escapeHtml(p.category)} · ${escapeHtml(modelById(p.modelId)?.name||'Chưa nhóm')} · ${escapeHtml(p.color)}</p>`,()=>{chosen.add(p.id);hideModal();openDestination()})}
function openDestination(){const items=selection();if(!items.length){notify('Hãy chọn một hoặc nhiều ảnh trước');return}
let options='<label>Tìm thư mục đích</label><input id="destFilter" placeholder="Nhập mẫu hoặc màu...">';options+='<div id="destinationList" style="max-height:45vh;overflow:auto;margin-top:10px"></div>';
modal('Chuyển '+items.length+' ảnh vào nhóm',options,()=>{const radio=document.querySelector('input[name="destination"]:checked');if(!radio){notify('Chọn thư mục đích trước');return}const val=JSON.parse(decodeURIComponent(radio.value));movePhotos(items.map(p=>p.id),val);hideModal()});
const list=$('destinationList'),filter=$('destFilter');const redraw=()=>{list.replaceChildren();const q=norm(filter.value);for(const m of s.models){if(!s.photos.some(p=>p.modelId===m.id))continue;const targets=[{type:'model',id:m.id,label:m.category+' / '+m.name},...colorsForModel(m.id).map(([color])=>({type:'color',id:m.id+'|'+color,modelId:m.id,color,label:m.category+' / '+m.name+' / '+color}))];
for(const t of targets){if(q&&!norm(t.label).includes(q))continue;const label=document.createElement('label');label.className='dest-item';const radio=document.createElement('input');radio.type='radio';radio.name='destination';radio.value=encodeURIComponent(JSON.stringify(t));radio.style.width='18px';radio.style.height='18px';radio.style.marginRight='8px';label.append(radio,document.createTextNode(t.label));list.appendChild(label)}}};filter.addEventListener('input',redraw);redraw()
}
function renameNode(){if(!active||active.type==='category'){notify('Chọn một Mẫu hoặc Màu bên trái trước');return}
const m=active.type==='model'?modelById(active.id):null;
const val=m?m.name:active.color;
let html=`<label>Tên mới</label><input id="editName" value="${escapeHtml(val)}" maxlength="120">`;
if(m)html+=`<label>Giá bán (VNĐ) — do bạn nhập, AI không tự đoán</label><input id="editPrice" type="number" min="0" step="1000" placeholder="Chưa nhập giá" value="${m.priceVnd??''}"><label class="checkline"><input type="checkbox" id="modelVerified" ${m.verified?'checked':''}> Đã xác nhận mẫu, màu và giá</label>`;
modal('Đổi thông tin '+(m?'sản phẩm':'màu'),html,()=>{const name=$('editName').value.trim();if(!name){notify('Tên không được để trống');return}if(m){const raw=$('editPrice').value.trim();if(raw!==''&&(!/^\d+$/.test(raw)||Number(raw)>100000000000)){notify('Giá không hợp lệ');return}if($('modelVerified').checked&&raw===''){notify('Cần nhập giá trước khi xác nhận sản phẩm');return}if($('modelVerified').checked&&s.photos.some(p=>p.modelId===m.id&&(!p.color||p.color==='Chưa rõ'))){notify('Hãy xác nhận màu của từng ảnh trước khi duyệt mẫu');return}remember();m.name=name;m.priceVnd=raw===''?null:Number(raw);m.verified=$('modelVerified').checked}else{remember();for(const p of s.photos)if(p.modelId===active.modelId&&p.color===active.color)p.color=name;active={type:'color',modelId:active.modelId,id:active.modelId+'|'+name,color:name}}autosave();render();hideModal();notify('Đã lưu thông tin sản phẩm')})
}
function mergeCurrent(){if(!active||active.type!=='model'){notify('Chọn một mẫu cần gộp trước');return}const src=modelById(active.id);const matches=s.models.filter(m=>m.category===src.category&&m.id!==src.id);if(!matches.length){notify('Không có mẫu khác trong danh mục');return}
const html='<p>Chọn mẫu đích để gộp:</p><select id="mergeDest">'+matches.map(m=>`<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('')+'</select>';
modal('Gộp '+src.name,html,()=>{const to=$('mergeDest').value;mergeModels(src.id,to);hideModal()})}
function newModel(){const cat=active?.type==='category'?active.id:active?.type==='model'?modelById(active.id)?.category:active?.type==='color'?modelById(active.modelId)?.category:categoryNames()[0];if(!cat){notify('Hãy nhập thư mục trước');return}modal('Tạo mẫu mới',`<p>Danh mục: ${escapeHtml(cat)}</p><label>Tên mẫu</label><input id="newName" value="Mẫu mới">`,()=>{const name=$('newName').value.trim();if(!name)return;remember();const m=createModel(cat,name);if(chosen.size)for(const p of selection()){p.category=cat;p.modelId=m.id}autosave();active={type:'model',id:m.id};chosen.clear();render();hideModal();notify('Đã tạo mẫu')})}
function openNodeOptions(node){if(node.type==='model')ask('Thao tác với mẫu','Chọn Đổi tên ở thanh phía dưới để chỉnh sửa. Kéo thả mẫu để gộp, hoặc chọn Gộp mẫu.',()=>{hideModal();renameNode()});else renameNode()}
function setBusy(v){busy=v;$('analyzeBtn').disabled=v||!settings.aiEnabled;$('pickBtn').disabled=v;$('exportBtn').disabled=v}
function onImported(data){setBusy(false);try{
const value=typeof data==='string'?JSON.parse(data):data;
if(!Array.isArray(value.photos))throw Error('Không có danh sách ảnh');
s=empty();s.rootName=value.rootName||'Ảnh sản phẩm';s.rootUri=value.rootUri||'';
s.photos=value.photos.map(p=>({...p,modelId:'',color:p.sourceColor&&p.sourceColor!=='Chưa rõ'?p.sourceColor:'Chưa rõ',confidence:.25,review:true}));
// Respect folders the owner already reviewed: Category / Model / Color.
const existing=new Map();
for(const p of s.photos){const label=p.sourceModel||'Chưa phân nhóm';const key=p.category+'\u0000'+label;
    let m=existing.get(key);if(!m){m=createModel(p.category,label);existing.set(key,m)}
    p.modelId=m.id;
}
s.expanded=categoryNames().map(c=>'category:'+c);
history=[];active=null;chosen.clear();autosave();render();
notify('Đã nhập '+s.photos.length+' ảnh và giữ cấu trúc mẫu/màu cũ. Hãy kiểm tra trước khi phân tích AI.');
}catch(e){notify('Lỗi nhập ảnh: '+e.message)}}
function groupSuggestion(){
if(!s.photos.length){notify('Chọn thư mục ảnh trước');return}
if(!settings.aiEnabled){notify('AI đang tắt. Bạn vẫn có thể tạo mẫu, đổi tên và chuyển ảnh thủ công.');return}
if(settings.mode==='cloud'&&!safeUrl(settings.cloudEndpoint)){
    notify('Chưa có địa chỉ dịch vụ AI Cloud HTTPS. Vào ⚙ để cấu hình, hoặc chọn AI trên máy.');return;
}
if(settings.mode==='cloud'&&!settings.cloudConsent){notify('Cần bật đồng ý gửi ảnh lên Cloud trong ⚙ trước khi phân tích.');return;}
const verified=s.models.filter(m=>m.verified).length;const eligible=s.photos.filter(p=>!modelById(p.modelId)?.verified);if(!eligible.length){notify('Tất cả mẫu đã xác nhận. AI không thay đổi dữ liệu đã duyệt.');return}
const body=`<p>Chế độ: <b>${escapeHtml(modeText())}</b>. Quét toàn bộ ảnh trong từng danh mục lớn.</p>`+
'<p><strong>Quan trọng:</strong> AI trên máy dùng MobileNetV3 để so ảnh. Đây chỉ là gợi ý cần kiểm tra, không bảo đảm gom đúng mọi mẫu. Màu chưa đủ tin cậy sẽ ghi “Chưa rõ”. Dịch vụ Cloud phải do bạn cấu hình và có thể tính phí.</p>'+
(verified?`<p>✓ Giữ nguyên ${verified} mẫu đã xác nhận (tên, giá, màu, ảnh). AI chỉ phân tích ${eligible.length} ảnh chưa duyệt.</p>`:'')+
(settings.mode==='cloud'||(settings.mode==='hybrid'&&settings.cloudConsent&&settings.cloudEndpoint)?'<p>Ảnh thu nhỏ sẽ được gửi đến dịch vụ HTTPS bạn cấu hình sau khi bạn xác nhận.</p>':'')+
'<div class="progress"><div id="analysisBar"></div></div><p id="analysisInfo">Đang chuẩn bị...</p>';
modal('Xác nhận phân nhóm',body,()=>{
    $('modalConfirm').disabled=true;setBusy(true);
    const req={photos:eligible.map(p=>({id:p.id,name:p.name,category:p.category})),rootUri:s.rootUri,
      mode:settings.mode,cloudEndpoint:settings.cloudEndpoint,cloudToken:sessionToken,cloudConsent:settings.cloudConsent};
    if(native)window.Native.analyze(JSON.stringify(req));else{notify('Môi trường thử giao diện không có mô hình AI.');setBusy(false);hideModal()}
});
}
function onProgress(done,total){const bar=$('analysisBar');if(bar)bar.style.width=Math.floor(done/Math.max(total,1)*100)+'%';const info=$('analysisInfo');if(info)info.textContent='Đã phân tích '+done+' / '+total+' ảnh'}
function onAnalysis(result){setBusy(false);$('modalConfirm').disabled=false;hideModal();try{
const data=typeof result==='string'?JSON.parse(result):result;
if(data.error)throw Error(data.error);
if(!Array.isArray(data.photos)||!Array.isArray(data.models))throw Error('Dữ liệu kết quả không hợp lệ');
const mutable=s.photos.filter(p=>!modelById(p.modelId)?.verified),mutableIds=new Set(mutable.map(p=>p.id));
const suggestions=new Map();
for(const a of data.photos){if(!mutableIds.has(a.id)||suggestions.has(a.id))throw Error('Kết quả AI có ảnh lạ hoặc lặp');suggestions.set(a.id,a)}
if(suggestions.size!==mutable.length)throw Error('AI chưa trả đủ ảnh; dữ liệu cũ được giữ nguyên');
const proposalModels=new Map();
for(const m of data.models){if(!m.id||proposalModels.has(m.id)||s.models.some(existing=>existing.verified&&existing.id===m.id))throw Error('Mã mẫu từ AI không hợp lệ');proposalModels.set(m.id,m)}
for(const p of mutable){const a=suggestions.get(p.id),m=proposalModels.get(a.modelId);if(!m||m.category!==p.category)throw Error('AI trả mẫu khác danh mục');}
remember();
// Never overwrite confirmed price, model name, colors or assignments.
s.models=s.models.filter(m=>m.verified);
for(const m of proposalModels.values())s.models.push({id:m.id,category:m.category,name:m.name||'Mẫu đề xuất',verified:false,priceVnd:null});
for(const p of mutable){const a=suggestions.get(p.id);p.modelId=a.modelId;p.color=a.color||'Chưa rõ';p.confidence=Math.min(1,Math.max(0,Number(a.confidence)||0));p.review=p.confidence<.6||p.color==='Chưa rõ'}
s.expanded=categoryNames().map(cat=>'category:'+cat);active=null;chosen.clear();autosave();render();
notify(data.cloudWarning?'Cloud lỗi, giữ kết quả trên máy: '+data.cloudWarning:'Đã có gợi ý. Ảnh và giá được duyệt vẫn giữ nguyên.');
}catch(e){notify('Không áp dụng kết quả: '+e.message)}
}
function fakeAnalyze(){const fakePhotos=s.photos.map((p,i)=>({id:p.id,modelId:'F'+Math.floor(i/3),color:i%3===0?'Đen':'Nâu',confidence:.54}));const fakeModels=[...new Set(fakePhotos.map(p=>p.modelId))].map(mid=>({id:mid,category:s.photos[fakePhotos.findIndex(p=>p.modelId===mid)].category,name:'Mẫu gợi ý '+mid}));setTimeout(()=>onAnalysis({photos:fakePhotos,models:fakeModels}),120)}
function pickFolder(){
const run=()=>{if(native)window.Native.pickSource();else $('browserFolder').click()};
if(s.photos.length)ask('Nhập bộ ảnh mới?', 'Thư mục mới sẽ thay thế dự án đang mở. Hãy lưu hoặc xuất bản sao trước khi tiếp tục.',()=>{hideModal();run()});
else run();
}
function exportFolder(){if(!s.photos.length){notify('Không có ảnh để xuất');return}if(native)window.Native.pickExport(JSON.stringify(s));else{const data=JSON.stringify(s,null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='DuAn_Anh_SinDarealest.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);notify('Đã tải dự án JSON. Xuất thư mục thực cần ứng dụng Android.')}}
function onExportUpdate(done,total,error){if(error)notify('Lỗi xuất: '+error);else if(done===total)notify('Xuất hoàn thành '+done+' ảnh. Ảnh gốc vẫn giữ nguyên.');else if(done%50===0)notify('Đang xuất '+done+'/'+total)}
function doUndo(){if(!history.length)return;try{const p=JSON.parse(history.pop());Object.assign(s,p);active=null;chosen.clear();autosave();render();notify('Đã hoàn tác')}catch(e){notify('Không hoàn tác được')}}
function browserFiles(files){if(!files.length)return;const cats=new Set();const photos=files.filter(f=>f.type.startsWith('image/')||/\.(jpe?g|png|webp|bmp)$/i.test(f.name)).map((f,i)=>{const parts=(f.webkitRelativePath||f.name).split('/');const category=parts.length>2?parts[1]:'Chưa phân loại';cats.add(category);return{id:'local'+i,name:f.name,category,sourceModel:parts.length>3?parts[2]:'',sourceColor:parts.length>4?parts[3]:'Chưa rõ',localUrl:URL.createObjectURL(f)}});onImported({rootName:'Thư mục đã chọn',photos})}
function demo(){const colors=['Đen','Nâu','Đen','Nâu','Đen','Nâu','Trắng','Đen'];const names=['Ví gù 6 hàng','Ví gù 6 hàng','Ví gù 6 hàng','Ví gù 6 hàng','Thắt lưng cá sấu','Thắt lưng cá sấu','Giày tây da','Giày tây da'];const cats=['Ví nam','Ví nam','Ví nam','Ví nam','Thắt lưng','Thắt lưng','Giày tây','Giày tây'];let photos=[];for(let i=0;i<30;i++){const j=i%8,c=colors[j],color=colorCodes[c];const svg='<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#383738"/><rect x="20" y="42" width="120" height="76" rx="13" fill="'+color+'" stroke="#c8a574" stroke-width="2"/><path d="M35 60L120 60M35 80L120 80M35 100L120 100" stroke="#8a6b4b" stroke-width="3"/></svg>';photos.push({id:'demo'+i,name:names[j]+' ('+(i+1)+').jpg',category:cats[j],demoUrl:'data:image/svg+xml,'+encodeURIComponent(svg)})}onImported({rootName:'Ảnh thử giao diện',photos});s.models=[];let catalog={};for(const p of s.photos){const key=p.category+':'+p.name.replace(/ \(\d+\)\.jpg$/,'');if(!catalog[key])catalog[key]=createModel(p.category,p.name.replace(/ \(\d+\)\.jpg$/,''));p.modelId=catalog[key].id;p.color=iColor(p.demoUrl)?((p.id.endsWith('0')||p.id.endsWith('1'))?'Đen':'Nâu'):'Chưa rõ';p.confidence=.8;p.review=false}s.expanded=categoryNames().map(c=>'category:'+c);autosave();render()}
function iColor(x){return !!x}
$('pickBtn').onclick=pickFolder;$('analyzeBtn').onclick=groupSuggestion;$('exportBtn').onclick=exportFolder;$('saveBtn').onclick=()=>{autosave();notify('Đã lưu dự án trên thiết bị')};$('undoBtn').onclick=doUndo;$('moveBtn').onclick=openDestination;$('renameBtn').onclick=renameNode;$('mergeBtn').onclick=mergeCurrent;$('newModelBtn').onclick=newModel;
$('searchInput').addEventListener('input',ev=>{search=ev.target.value;take=60;renderGallery()});$('clearSearch').onclick=()=>{search='';$('searchInput').value='';renderGallery()};
$('selectAllBtn').onclick=()=>{groupPhotos().forEach(p=>chosen.add(p.id));renderGallery();notify('Đã chọn '+chosen.size+' ảnh')};
$('loadMoreBtn').onclick=()=>{take+=60;renderGallery()};
$('treeTab').onclick=()=>{tab='tree';render()};$('photosTab').onclick=()=>{tab='photos';render()};$('reviewTab').onclick=()=>{tab='review';render()};
$('modalClose').onclick=hideModal;$('modalCancel').onclick=hideModal;$('modalConfirm').onclick=()=>{if(callback)callback()};$('modal').addEventListener('click',ev=>{if(ev.target===$('modal'))hideModal()});
function settingsModal(){
let info={};try{if(native)info=JSON.parse(window.Native.deviceInfo())}catch(e){}
const html=`<p><strong>SinDarealest PhotoAI — thử nghiệm tích hợp AI trên máy</strong></p>`+
`<p>Máy: ${escapeHtml(info.model||'Chưa xác định')} · RAM ${info.ramMb?Math.round(info.ramMb/1024)+' GB':'chưa đo'} · ${info.processors||'?'} luồng xử lý. Thiết bị mạnh vẫn cần mô hình tối ưu; không tự đảm bảo nhận diện chính xác.</p>`+
`<label class="checkline"><input id="aiEnabled" type="checkbox" ${settings.aiEnabled?'checked':''}> Bật phân tích AI (tắt = chỉnh tay)</label>`+
`<label>Chọn chế độ xử lý</label><div class="mode-options">`+
`<label><input type="radio" name="aiMode" value="local" ${settings.mode==='local'?'checked':''}> Trên điện thoại — không gửi ảnh</label>`+
`<label><input type="radio" name="aiMode" value="cloud" ${settings.mode==='cloud'?'checked':''}> Cloud — dùng dịch vụ do bạn cấu hình</label>`+
`<label><input type="radio" name="aiMode" value="hybrid" ${settings.mode==='hybrid'?'checked':''}> Kết hợp — xử lý máy, Cloud khi được phép</label></div>`+
`<p>Trên máy: nhận diện đặc trưng bằng MobileNetV3, gộp thận trọng trong mỗi danh mục. Kết quả phải kiểm tra trước khi xác nhận. Cloud chưa kèm nhà cung cấp; cần endpoint HTTPS tương thích.</p>`+
`<label>HTTPS API Cloud (tùy chọn, không có sẵn)</label><input id="cloudEndpoint" placeholder="https://your-service.example/analyze" value="${escapeHtml(settings.cloudEndpoint)}">`+
`<label>Mã truy cập Cloud (chỉ giữ trong phiên, không lưu trên máy)</label><input id="cloudToken" type="password" placeholder="Nhập khi cần" value="${escapeHtml(sessionToken)}">`+
`<label class="checkline"><input id="cloudConsent" type="checkbox" ${settings.cloudConsent?'checked':''}> Tôi đồng ý gửi ảnh thu nhỏ đến dịch vụ Cloud đã chọn</label>`+
`<p>Không có máy chủ Cloud hoặc không đồng ý gửi ảnh: hãy dùng chế độ trên điện thoại. Không tự động tính phí hay đăng tải ảnh.</p>`;
modal('Cài đặt AI và dữ liệu',html,()=>{
    const enabled=$('aiEnabled').checked,mode=document.querySelector('input[name="aiMode"]:checked').value;
    const endpoint=$('cloudEndpoint').value.trim(),consent=$('cloudConsent').checked;
    if((mode==='cloud'||mode==='hybrid')&&endpoint&&!safeUrl(endpoint)){notify('Địa chỉ Cloud phải dùng HTTPS hợp lệ');return}
    settings={aiEnabled:enabled,mode,cloudEndpoint:endpoint,cloudConsent:consent};sessionToken=$('cloudToken').value;
    saveSettings();hideModal();updateModeLabel();notify('Đã lưu cài đặt. '+modeText());
})
}
function updateModeLabel(){$('aiModeLabel').textContent=modeText();$('analyzeBtn').disabled=!settings.aiEnabled||busy}
$('menuBtn').onclick=settingsModal;$('modeOpenBtn').onclick=settingsModal;
$('browserFolder').addEventListener('change',e=>browserFiles([...e.target.files]));
window.PhotoApp={onImported,onProgress,onAnalysis,onExportUpdate,load,render};
window.__PhotoTest={demo,state:()=>s,select:id=>{chosen.add(id);renderGallery()},movePhotos,handleDrop,undo:doUndo,search:q=>{search=q;$('searchInput').value=q;renderGallery()},setActive,mergeModels};
if(native){try{const saved=window.Native.loadState();if(saved)load(saved);else render()}catch(e){render()}}else{const saved=localStorage.getItem('sindarealest-photoai-project');if(saved)load(saved);else render();if(new URLSearchParams(location.search).has('demo'))demo()}
updateModeLabel();
})();
