import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createSession} from '../functions/_lib.js';
import {onRequestPatch} from '../functions/api/admin/products/[id].js';

// Real transactional SQLite in memory only: no Production D1, remote API or R2.
const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
for(const file of ['0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql','0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql','0007_order_contact_details.sql','0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql'])
 db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
const id='qa-quick-edit';
db.prepare("INSERT INTO products(id,slug,sku,title,category,category_label,description,price,stock,published,images_json,source_price_confirmed,sort_order,sku_verified,fulfillment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
 .run(id,'quickedit','SD-CL001','Túi thử','clutch','Clutch','Giữ mô tả',3000000,8,1,JSON.stringify(['images/example1.webp','images/example2.webp']),1,7,1,'unclassified');
const before=db.prepare('SELECT * FROM products WHERE id=?').get(id);
const secret='fake-local-test-secret-quick-edit-123456789',password='fake-local-admin-pw';
const cookie='sd_admin_session='+await createSession(secret);
function dbAdapter(race=false){
 return {prepare(sql){
  let args=[];
  return {bind(...params){args=params;return this},
   async first(){const row=db.prepare(sql).get(...args)||null;if(race&&sql.startsWith('SELECT * FROM products')&&row)db.prepare("UPDATE products SET price=999999 WHERE id=?").run(id);return row},
   _run(){return db.prepare(sql).run(...args)}};
 },
 async batch(statements){
  db.exec('BEGIN IMMEDIATE');
  try{const out=statements.map(stmt=>({meta:{changes:Number(stmt._run().changes)}}));db.exec('COMMIT');return out}
  catch(e){db.exec('ROLLBACK');throw e}
 }};
}
async function patch(field,value,expectedValue,authenticated=true,race=false){
 return onRequestPatch({params:{id},request:new Request('https://qa.invalid/api/admin/products/'+id,{
  method:'PATCH',
  headers:{Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json',...(authenticated?{Cookie:cookie}:{})},
  body:JSON.stringify({field,value,expectedValue})
 }),env:{DB:dbAdapter(race),ADMIN_PASSWORD:password,SESSION_SECRET:secret}});
}
const type=await patch('fulfillmentType','made_to_order','unclassified');
assert.equal(type.status,200,'Owner can change only fulfillment type');
let row=db.prepare('SELECT * FROM products WHERE id=?').get(id);
assert.equal(row.fulfillment_type,'made_to_order');
assert.equal(row.price,3000000);
assert.equal(row.images_json,before.images_json);
assert.equal(row.sku,before.sku);
assert.equal((await patch('fulfillmentType','in_stock','made_to_order')).status,200,'Owner can always revert one product to stock');
assert.equal(db.prepare('SELECT fulfillment_type FROM products WHERE id=?').get(id).fulfillment_type,'in_stock');
assert.equal((await patch('price',3300000,3000000)).status,200);
row=db.prepare('SELECT * FROM products WHERE id=?').get(id);
assert.equal(row.price,3300000);assert.equal(row.source_price_confirmed,1);
assert.equal((await patch('category',{category:'mu',categoryLabel:'Mũ'},{category:'clutch',categoryLabel:'Clutch'})).status,200);
row=db.prepare('SELECT * FROM products WHERE id=?').get(id);
assert.equal(row.category,'mu');assert.equal(row.category_label,'Mũ');assert.equal(row.sku,before.sku);
const images=['images/example2.webp','images/example1.webp'];
assert.equal((await patch('images',images,['images/example1.webp','images/example2.webp'])).status,200);
row=db.prepare('SELECT * FROM products WHERE id=?').get(id);
assert.equal(row.images_json,JSON.stringify(images));
assert.equal(row.title,before.title);assert.equal(row.description,before.description);
assert.equal(row.published,before.published);assert.equal(row.stock,before.stock);
const audits=db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get().c;
assert.equal(audits,5,'Audit exactly one event per quick edit');
assert.equal((await patch('images',[],['images/example1.webp'])).status,409,'Stale photo reorder must not overwrite concurrent gallery');
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM audit_logs').get().c,audits,'Conflict must not forge an audit');
assert.equal((await patch('price',-100,3300000)).status,400);
assert.equal((await patch('fulfillmentType','unknown','in_stock')).status,400);
assert.equal((await patch('price',2,3300000,false)).status,401,'Unauthenticated edits rejected');
db.close();
const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
for(const marker of [
 'data-inline-photo=','data-product-row=','data-inline-edit="fulfillmentType"',
 'data-inline-edit="category"','data-inline-edit="price"',
 'function beginProductQuickEdit(','function openEditor(p,initialTab=',
 "if(initialTab==='gallery')setProductEditorTab('gallery',true)",
 'function moveGalleryImage(','function removeGalleryImage(index){',
 "galleryGrid.addEventListener('pointerdown'",
 "galleryGrid.addEventListener('pointermove'",
 "galleryGrid.addEventListener('pointerup'",
 'showHeldGalleryPreview(index)','hideHeldGalleryPreview()',
 "if(target.type==='trash')removeGalleryImage(from)",
 'id="galleryTrash"','gallery-held-preview','gallery-drag-ghost'
]) assert.ok(admin.includes(marker),'Missing Owner-requested interaction: '+marker);

assert.equal(admin.split('</style>').length-1,1,'Owner-approved Admin CSS remains one block');
assert.ok(!admin.includes('function quickReplaceCover('),'Image tap must open Gallery, not directly replace cover');
assert.ok(!admin.includes('id="imageDropZone"'),'Remove obsolete drop/upload box');
assert.ok(!admin.includes('data-image-drag-handle'),'No drag grip controls remain');
assert.ok(!admin.includes('data-gallery="up"')&&!admin.includes('data-gallery="down"')&&!admin.includes('data-gallery="remove"'),
 'No per-photo arrows or delete buttons');
assert.ok(!admin.includes('draggable="true" data-image-index'),
 'Native drag must not compete with unified pointer gestures');
assert.ok(admin.includes("openEditor(products.find(p=>String(p.id)===String(photo.dataset.inlinePhoto)),'gallery')"),
 'Tapping card image must open the Gallery tab');
assert.ok(admin.includes("if(row&&!e.target.closest('button,a,input,select,textarea,label,form,[role=\"button\"]'))"),
 'Blank card opens details without swallowing inline buttons');

const {runInNewContext}=await import('node:vm');
const reorderStart=admin.indexOf('function moveGalleryImage(from,to){');
const reorderEnd=admin.indexOf('function removeGalleryImage(index){',reorderStart);
assert.ok(reorderStart>=0&&reorderEnd>reorderStart,'Insert/shift image helper must exist');
const removeEnd=admin.indexOf('/* The entire photograph',reorderEnd);
assert.ok(removeEnd>reorderEnd,'Drop-to-trash removal helper must exist');
const code=admin.slice(reorderStart,removeEnd);
let renderCalls=0,revoked=[];
const mock={gallery:[
 {url:'ảnh 1',temporary:false},{url:'ảnh 2',temporary:false},
 {url:'ảnh 3',temporary:true},{url:'ảnh 4',temporary:false}
 ],renderGallery:()=>{renderCalls++},$:()=>({textContent:''}),
 URL:{revokeObjectURL:x=>revoked.push(x)}};
const moved=runInNewContext(code+'\nmoveGalleryImage(2,0);gallery.map(g=>g.url)',mock);
assert.deepEqual(Array.from(moved),['ảnh 3','ảnh 1','ảnh 2','ảnh 4'],
 'Moving a later photo to cover inserts and shifts previous photos (not swap)');
assert.equal(renderCalls,1,'One reorder re-renders once');
const removed=runInNewContext(code+'\nremoveGalleryImage(0);gallery.map(g=>g.url)',mock);
assert.deepEqual(Array.from(removed),['ảnh 1','ảnh 2','ảnh 4'],
 'Trash removes dragged photo from unsaved gallery, preserving remaining order');
assert.deepEqual(revoked,['ảnh 3'],'Removing unsaved local image revokes its temporary URL');
assert.equal(renderCalls,2);
assert.equal(runInNewContext(code+'\nremoveGalleryImage(99)',mock),false,'Refuse invalid gallery index');

const renderStart=admin.indexOf('function renderGalleryItem(g,i){');
const renderEnd=admin.indexOf("$('#chooseImages').addEventListener('click'",renderStart);
const renderCode=admin.slice(renderStart,renderEnd);
assert.ok(renderStart>0&&renderEnd>renderStart);
const card=runInNewContext(renderCode+'\nrenderGalleryItem({url:"images/sample.webp"},1)',{
  gallery:[{},{}],esc:x=>String(x),galleryImageSrc:x=>'/'+x,$:()=>null
});
assert.match(card,/<img draggable="false"/);
assert.match(card,/tabindex="0"/);
assert.doesNotMatch(card,/<button|data-gallery|image-drag-handle|imagebuttons/,
 'Photo slot only contains image and optional cover label, no action controls');

console.log('PASS: original-type conversion remains reversible, quick-edit auth/CAS/audit, card/gallery taps, pointer preview/shift/trash and clean image-only gallery.');
