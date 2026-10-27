import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { normalizeProductOption, productOptionKind, productOptionLabel } from '../functions/_product-options.js';
import { createSession } from '../functions/_lib.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as quoteCheckout } from '../functions/api/checkout-quote.js';
import { onRequestGet as adminOrders } from '../functions/api/admin/orders.js';

for(const category of ['sneakers','loafers','dress-shoes']) {
 assert.equal(productOptionKind(category),'shoe');
 for(let size=38;size<=44;size++)assert.equal(normalizeProductOption(category,String(size)),String(size));
 for(const invalid of ['', '37', '45', '40.5'])assert.equal(normalizeProductOption(category,invalid),null);
}
assert.equal(normalizeProductOption('belts','3.5'),'3.5');
assert.equal(normalizeProductOption('belts','4.0'),'4.0');
assert.equal(normalizeProductOption('belts','3.0'),null);
assert.equal(normalizeProductOption('phone-cases','iPhone 16 Pro  Max'),'iPhone 16 Pro Max');
assert.equal(normalizeProductOption('phone-cases',''),null);
assert.equal(normalizeProductOption('phone-cases','<script>alert(1)</script>'),null);
assert.equal(normalizeProductOption('wallets',''), '');
assert.equal(normalizeProductOption('wallets','44'),null);
assert.equal(productOptionLabel('belts','4.0'),'Bản dây 4.0 cm');

const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
for(const name of ['0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql','0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql','0007_order_contact_details.sql','0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql'])
 db.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));

const DB={
 prepare(sql){
  let values=[];
  return {
   bind(...args){values=args;return this},
   async first(){return db.prepare(sql).get(...values)||null},
   async all(){return {results:db.prepare(sql).all(...values)}},
   async run(){const result=db.prepare(sql).run(...values);return {success:true,meta:{changes:Number(result.changes)}}},
   execute(){if(['SELECT','WITH','PRAGMA'].includes(sql.trim().split(' ')[0].toUpperCase()))return {results:db.prepare(sql).all(...values)};return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}}}
  }
 },
 async batch(statements){
  db.exec('BEGIN IMMEDIATE');
  try{const result=statements.map(s=>s.execute());db.exec('COMMIT');return result}
  catch(error){db.exec('ROLLBACK');throw error}
 }
};
const categories=[['sneakers','Giày sneaker'],['loafers','Giày lười'],['dress-shoes','Giày tây'],['belts','Thắt lưng'],['phone-cases','Ốp điện thoại'],['wallets','Ví']];
for(let i=0;i<categories.length;i++){
 const [category,title]=categories[i];
 db.prepare('INSERT INTO products(id,slug,sku,title,category,category_label,price,stock,published,source_price_confirmed,fulfillment_type) VALUES(?,?,?,?,?,?,100000,10,1,1,?)')
   .run('opt-'+i,'opt-'+i,'OPT-'+i,title,category,title,'made_to_order');
}
const env={DB,ADMIN_PASSWORD:'FAKE_QA_PASSWORD_NOT_REAL',SESSION_SECRET:'QA-NONPRODUCTION-ONLY-SESSION-SECRET-123456'};
const body={fullName:'KHACH HANG GIA LAP',phone:'0000000808',address:'Địa chỉ QA giả lập, không giao hàng',items:[]};
const endpoint='https://qa.invalid/api/orders';
const invoke=async items=>createOrder({env,request:new Request(endpoint,{method:'POST',headers:{Origin:'https://qa.invalid','Content-Type':'application/json','CF-Connecting-IP':'203.0.113.88'},body:JSON.stringify({...body,items})})});
const quote=async items=>quoteCheckout({env,request:new Request('https://qa.invalid/api/checkout-quote',{method:'POST',headers:{Origin:'https://qa.invalid','Content-Type':'application/json'},body:JSON.stringify({items,phone:body.phone})})});
const item=(i,quantity=1,option='')=>({id:'opt-'+i,quantity,option});
try {
 for(const invalid of [[item(0,1,'37')],[item(0)],[item(3,1,'4.5')],[item(4)],[item(5,1,'42')]]) {
  const result=await invoke(invalid);
  assert.equal(result.status,400,'Invalid/missing option must fail before D1 order creation: '+await result.text());
  db.exec('DELETE FROM public_rate_limits');
 }
 assert.equal((await quote([item(0)])).status,400,'Payment quote must reject missing shoe size');
 assert.equal((await quote([item(3,1,'4.5')])).status,400,'Payment quote must reject invalid belt width');
 assert.equal((await quote([item(4)])).status,400,'Payment quote must reject missing phone model');
 assert.equal((await quote([item(0,1,'42'),item(0,1,'43'),item(3,1,'4.0'),item(4,1,'Samsung Galaxy S25')])).status,200,'Payment quote accepts valid size-specific items');
 const overLimit=await invoke([item(0,40,'42'),item(0,11,'43')]);
 assert.equal(overLimit.status,400,'The 50-piece limit applies to a product across all its sizes');
 db.exec('DELETE FROM public_rate_limits');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);
 const response=await invoke([item(0,1,'42'),item(0,2,'43'),item(0,1,'42'),item(3,1,'3.5'),item(4,1,'iPhone 16 Pro Max'),item(5,1,'')]);
 assert.equal(response.status,201,await response.text());
 const saved=db.prepare('SELECT title,quantity,product_id FROM order_items ORDER BY rowid').all();
 assert.equal(saved.length,5,'Different sizes must not be merged; same size must be grouped');
 assert.equal(saved[0].title,'Giày sneaker · Size 42');
 assert.equal(saved[0].quantity,2);
 assert.equal(saved[1].title,'Giày sneaker · Size 43');
 assert.equal(saved[1].quantity,2);
 assert.equal(saved[2].title,'Thắt lưng · Bản dây 3.5 cm');
 assert.equal(saved[3].title,'Ốp điện thoại · Dòng điện thoại: iPhone 16 Pro Max');
 assert.equal(saved[4].title,'Ví');
 assert.deepEqual(db.prepare('SELECT size FROM order_item_details ORDER BY size').all().map(x=>x.size),['42','43']);
 const cookie=await createSession(env.SESSION_SECRET);
 const admin=await adminOrders({env,request:new Request('https://qa.invalid/api/admin/orders',{headers:{Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin',Cookie:'sd_admin_session='+cookie}})});
 if(admin.status!==200)throw Error('Admin read failed: '+admin.status+' '+await admin.text());
 const payload=await admin.json();
 assert.deepEqual(payload.orders[0].items.map(x=>x.title),saved.map(x=>x.title),'Admin receives the exact selected size / belt width / phone model');
 assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);

 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const adminHtml=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
 assert.ok(html.includes('function renderProductOptions(p)'));
 assert.ok(html.includes('function sdCheckoutItems(){return cartEntries()'));
 assert.ok(html.includes('const items=sdCheckoutItems();if(!items.length)'));
 assert.ok(html.includes('selectedDetailOption(currentProduct)'));
 assert.match(html,/data-cart-select/);
 assert.ok(html.includes('#productOverlay .detail-variants:not([hidden])'));
 assert.ok(adminHtml.includes("esc(item.title||'Sản phẩm')"));
 console.log('PASS: category-specific selections, server validation, multi-size cart contract, real SQLite order snapshots, shoe warranty sizes, Admin parity, no Production writes.');
} finally {db.close()}
