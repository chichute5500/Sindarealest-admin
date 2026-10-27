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
for(const marker of ['data-inline-photo=','data-inline-edit="fulfillmentType"','data-inline-edit="category"','data-inline-edit="price"','function beginProductQuickEdit(','function quickReplaceCover(','function moveGalleryImage(','[data-image-drag-handle]','galleryGrid.addEventListener(\'pointerdown\'','galleryGrid.addEventListener(\'pointerup\'','moveGalleryImage(from,to)','saveProductQuick(p,\'images\',updated)']){
 assert.ok(admin.includes(marker),'Missing quick-edit/touch reorder binding: '+marker);
}
assert.equal(admin.split('</style>').length-1,1,'Keep one approved Admin CSS block');

const reorderStart=admin.indexOf('function moveGalleryImage(from,to){');
const reorderEnd=admin.indexOf("$('#imageGrid').addEventListener('dragstart'",reorderStart);
assert.ok(reorderStart>=0&&reorderEnd>reorderStart,'Gallery reorder helper must be defined once');
const reorderCode=admin.slice(reorderStart,reorderEnd);
const {runInNewContext}=await import('node:vm');
const state={gallery:['ảnh 1','ảnh 2','ảnh 3','ảnh 4'],calls:0,renderGallery(){this.calls++},$(){return {textContent:''}}};
// Method call through VM-owned context rather than relying on the platform drag behavior.
const verify=runInNewContext(reorderCode+'\nmoveGalleryImage(2,0);gallery',state);
assert.deepEqual(Array.from(verify),['ảnh 3','ảnh 1','ảnh 2','ảnh 4'],
 'Moving a later photo to cover must INSERT and shift former cover/other photos right');

console.log('PASS: authenticated atomic quick-edit for fulfillment/category/price/cover, CAS, audit, revert, touch reorder wiring, owner CSS.');
