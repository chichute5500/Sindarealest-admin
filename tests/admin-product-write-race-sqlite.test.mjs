/** Actual SQLite batch semantics for stale Admin product PUT/DELETE operations.
 * Fully in-memory. No cloud bindings, real products, R2 or finance touched.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createSession} from '../functions/_lib.js';
import {onRequestPut,onRequestDelete} from '../functions/api/admin/products/[id].js';

const SESSION_SECRET='test-only-concurrency-session-secret-1234567890';
const ADMIN_PASSWORD='test-only-admin-password-not-real';
const session=await createSession(SESSION_SECRET);
const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
for(const file of ['0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql','0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql','0007_order_contact_details.sql','0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql'])
  db.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));

const id='qa-disposable-product';
function seed() {
  db.prepare("INSERT INTO products(id,slug,sku,title,category,category_label,description,price,stock,published,images_json,source_price_confirmed,sort_order,sku_verified,fulfillment_type) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id,'qa-disposable-product','QA-001','Sản phẩm giả','sneakers','sneakers','Chỉ dùng để kiểm thử',120000,2,1,'[]',1,1,0,'in_stock');
}
function snapshot() {
  return {count:db.prepare('SELECT COUNT(*) AS n FROM audit_logs').get().n,
    rows:db.prepare("SELECT action FROM audit_logs ORDER BY rowid").all().map(row=>row.action)};
}
function adapter(mode='normal') {
  return {
    prepare(sql) {
      let values=[];
      return {
        bind(...args){values=args;return this;},
        async first(){
          const result=db.prepare(sql).get(...values) || null;
          if(mode==='race' && result && (sql.startsWith('SELECT * FROM products') || sql.startsWith('SELECT sku,title FROM products')))
            db.prepare('DELETE FROM products WHERE id=?').run(id);
          return result;
        },
        async all(){return {results:db.prepare(sql).all(...values)};},
        _run(){return db.prepare(sql).run(...values);}
      };
    },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const results=statements.map(statement=>({meta:{changes:Number(statement._run().changes)}}));
        db.exec('COMMIT');
        return results;
      } catch(error) {db.exec('ROLLBACK');throw error;}
    },
  };
}
function request(method) {
  return new Request('https://qa.invalid/api/admin/products/'+id,{
    method,
    headers:{
      Origin:'https://qa.invalid',
      'Sec-Fetch-Site':'same-origin',
      Cookie:'sd_admin_session='+session,
      ...(method==='PUT'?{'Content-Type':'application/json'}:{})
    },
    ...(method==='PUT'?{body:JSON.stringify({
      title:'Sản phẩm thử nghiệm đã cập nhật',sku:'QA-001',category:'sneakers',
      fulfillmentType:'in_stock',price:125000,stock:3,images:[],published:true
    })}:{})
  });
}
async function execute(method,mode='normal'){
  const context={params:{id},request:request(method),env:{DB:adapter(mode),ADMIN_PASSWORD,SESSION_SECRET}};
  return method==='PUT'?onRequestPut(context):onRequestDelete(context);
}

seed();
assert.equal((await execute('PUT')).status,200);
assert.equal(db.prepare('SELECT title FROM products WHERE id=?').get(id).title,'Sản phẩm thử nghiệm đã cập nhật');
assert.deepEqual(snapshot().rows,['product_updated'],'successful update audited once');
db.prepare('DELETE FROM products WHERE id=?').run(id);
seed();
const beforeUpdate=snapshot();
const updateLost=await execute('PUT','race');
assert.equal(updateLost.status,409,'stale product PUT must not report success');
assert.deepEqual(snapshot(),beforeUpdate,'stale PUT must not forge a success audit');
seed();
const beforeDelete=snapshot();
const deleteLost=await execute('DELETE','race');
assert.equal(deleteLost.status,409,'stale product DELETE must not report success');
assert.deepEqual(snapshot(),beforeDelete,'stale DELETE must not forge a success audit');
seed();
const deleteOk=await execute('DELETE');
assert.equal(deleteOk.status,200);
assert.deepEqual(snapshot().rows,['product_updated','product_deleted']);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
db.close();
console.log('PASS: real disposable SQLite rejects stale product PUT/DELETE without phantom audit and preserves valid operations.');
