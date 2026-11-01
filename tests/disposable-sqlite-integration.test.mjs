/**
 * Disposable SQLite/D1-contract integration: no Cloudflare credentials, no shared D1, no R2,
 * no external network, and no real finance transactions. The database exists only in RAM.
 * Calls the real Restore POST and admin payment transaction handlers against every relevant
 * production migration, with actual SQLite constraints, statements, and rollback semantics.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSession } from '../functions/_lib.js';
import { onRequestPost as restore } from '../functions/api/admin/restore.js';
import { onRequestPost as ledger } from '../functions/api/admin/payment-transactions.js';
import { onRequestPatch as patchAdminOrder } from '../functions/api/admin/orders.js';

const PASSWORD = 'disposable-sqlite-qa-password-not-real';
const SECRET = 'disposable-sqlite-qa-session-secret-not-real';
const session = await createSession(SECRET);
const sql = new DatabaseSync(':memory:');
sql.exec('PRAGMA foreign_keys=ON');
const migrationNames = [
  '0001_schema.sql', '0003_storefront_operations.sql',
  '0004_admin_notifications.sql', '0005_address_warranty_verification.sql',
  '0006_remove_warranty_otp.sql', '0007_order_contact_details.sql',
  '0008_product_sku_verification.sql', '0009_fulfillment_and_manual_payments.sql',
  '0018_payment_delivery_settlement.sql',
];
for (const name of migrationNames)
  sql.exec(readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'));

let batches=0;
let rolledBack=0;
let beforeNextBatch=null;
const database = {
  prepare(text) {
    let values = [];
    return {
      sql: text,
      bind(...next) { values=next; return this; },
      async first() { return sql.prepare(text).get(...values) ?? null; },
      async all() { return {results:sql.prepare(text).all(...values)}; },
      async run() {
        const result=sql.prepare(text).run(...values);
        return {success:true,meta:{changes:Number(result.changes)}};
      },
      _execute() { return sql.prepare(text).run(...values); },
    };
  },
  async batch(statements) {
    batches++;
    if (beforeNextBatch) {
      const simulateExternalCommit=beforeNextBatch;
      beforeNextBatch=null;
      simulateExternalCommit();
    }
    sql.exec('BEGIN IMMEDIATE');
    try {
      const results=statements.map(statement=>{
        const result=statement._execute();
        return {success:true,meta:{changes:Number(result.changes)}};
      });
      sql.exec('COMMIT');
      return results;
    } catch(error) {
      rolledBack++;
      sql.exec('ROLLBACK');
      throw error;
    }
  }
};
const env={ADMIN_PASSWORD:PASSWORD,SESSION_SECRET:SECRET,DB:database};
const post=(path,body,withAuth=true)=>new Request('https://qa.invalid'+path,{
  method:'POST',
  headers:{
    Origin:'https://qa.invalid',
    'Sec-Fetch-Site':'same-origin',
    'Content-Type':'application/json',
    ...(path==='/api/admin/restore'?{'X-SD-Restore-Password':PASSWORD}:{}),
    ...(withAuth?{Cookie:'sd_admin_session='+session}:{})
  },
  body:JSON.stringify(body)
});
const callRestore=body=>restore({request:post('/api/admin/restore',body),env});
const callLedger=(body,auth=true)=>ledger({request:post('/api/admin/payment-transactions',body,auth),env});
const scalar=(query,...params)=>sql.prepare(query).get(...params);
const rows=query=>sql.prepare(query).all();
const stamp='2026-10-25 00:00:00';
const qaProduct={
  id:'qa-isolated-product',slug:'qa-isolated-product',title:'Sản phẩm QA không phải hàng bán',
  sku:'QA-SQLITE-001',category:'sneakers',categoryLabel:'Thử nghiệm',
  description:'DATA ONLY - DISPOSABLE IN MEMORY',price:120000,stock:2,published:true,images:[],sortOrder:1
};
const qaCustomer={
  id:'qa-isolated-customer',full_name:'KHÁCH GIẢ LẬP - KHÔNG THẬT',
  phone:'0000000101',email:'',address:'',created_at:stamp,updated_at:stamp
};
const qaOrder={
  id:'qa-isolated-order',order_number:'QA-SQLITE-ORDER-001',
  customer_id:qaCustomer.id,status:'confirmed',payment_status:'unpaid',
  subtotal:120000,total:120000,price_confirmation_required:0,
  customer_note:'QA ONLY',payment_terms_confirmed_at:stamp,
  created_at:stamp,updated_at:stamp
};
const qaItem={
  id:'qa-isolated-item',order_id:qaOrder.id,product_id:qaProduct.id,
  sku:qaProduct.sku,title:qaProduct.title,quantity:1,unit_price:120000,line_total:120000
};
const v2={
  format:'sindarealest-backup-v2',
  settings:{showPrices:true,welcomeEnabled:false,welcomeTitleLine1:'QA',
    welcomeTitleLine2:'SINDAREALEST',welcomeText:'DỮ LIỆU GIẢ LẬP'},
  products:[qaProduct],
  operations:{customers:[qaCustomer],orders:[qaOrder],orderItems:[qaItem],
    warranties:[],warrantyClaims:[],auditLogs:[]}
};

try {
  // Seed a disposable predecessor record to prove full replacement happens in
  // the local database, not just through a mocked batch invocation.
  sql.prepare("INSERT INTO products(id,slug,sku,title,category) VALUES(?,?,?,?,?)")
    .run('old','old','OLD-SKU','Prior QA row','other');
  const initial=await callRestore(v2);
  assert.equal(initial.status,200,'V2 restore must perform actual SQLite writes');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM products').n,1);
  assert.equal(scalar('SELECT id FROM products').id,qaProduct.id);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM customers').n,1);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM orders').n,1);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM order_items').n,1);
  assert.equal(scalar('SELECT full_name FROM order_contact_details').full_name,qaCustomer.full_name);
  assert.equal(scalar("SELECT value FROM settings WHERE key='show_prices'").value,'1');
  assert.equal(rows('PRAGMA foreign_key_check').length,0);

  // An ordinary admin status save submits existing price values. If a second
  // writer reprices before its D1 batch, the stale save must not overwrite
  // either item price or confirmed order total, even with unchanged user input.
  beforeNextBatch=() => {
    sql.prepare("UPDATE order_items SET unit_price=130000,line_total=130000 WHERE id=?").run(qaItem.id);
    sql.prepare("UPDATE orders SET subtotal=130000,total=130000 WHERE id=?").run(qaOrder.id);
  };
  const staleSave=await patchAdminOrder({
    request:new Request('https://qa.invalid/api/admin/orders',{
      method:'PATCH',
      headers:{
        Origin:'https://qa.invalid',
        'Sec-Fetch-Site':'same-origin',
        Cookie:'sd_admin_session='+session,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        id:qaOrder.id,status:'confirmed',
        prices:[{itemId:qaItem.id,unitPrice:120000}]
      })
    }),
    env
  });
  assert.equal(staleSave.status,409,'stale status save must reject a concurrently repriced order');
  assert.equal(scalar('SELECT unit_price FROM order_items').unit_price,130000,
    'stale status save must not overwrite a fresh item price');
  assert.equal(scalar('SELECT total FROM orders').total,130000,
    'stale status save must not overwrite freshly confirmed order total');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM audit_logs').n,0,
    'stale status save must not emit phantom success audit');
  // Restore disposable baseline for the remaining independent ledger tests.
  sql.prepare("UPDATE order_items SET unit_price=120000,line_total=120000 WHERE id=?").run(qaItem.id);
  sql.prepare("UPDATE orders SET subtotal=120000,total=120000 WHERE id=?").run(qaOrder.id);

  // Competing Admin repricing must be rejected BEFORE any line write.
  // The earlier code wrote a stale item first and re-summarized the order later.
  beforeNextBatch=() => {
    sql.prepare("UPDATE order_items SET unit_price=130000,line_total=130000 WHERE id=?").run(qaItem.id);
    sql.prepare("UPDATE orders SET subtotal=130000,total=130000 WHERE id=?").run(qaOrder.id);
  };
  const conflictingReprice=await patchAdminOrder({
    request:new Request('https://qa.invalid/api/admin/orders',{
      method:'PATCH',
      headers:{Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin',
        Cookie:'sd_admin_session='+session,'Content-Type':'application/json'},
      body:JSON.stringify({
        id:qaOrder.id,status:'confirmed',
        prices:[{itemId:qaItem.id,unitPrice:140000}]
      })
    }),env
  });
  assert.equal(conflictingReprice.status,409,'concurrently repriced order must reject stale price change');
  assert.equal(scalar('SELECT unit_price FROM order_items').unit_price,130000);
  assert.equal(scalar('SELECT total FROM orders').total,130000);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM audit_logs').n,0);
  sql.prepare("UPDATE order_items SET unit_price=120000,line_total=120000 WHERE id=?").run(qaItem.id);
  sql.prepare("UPDATE orders SET subtotal=120000,total=120000 WHERE id=?").run(qaOrder.id);

  // A concurrent status-only transition should also be protected by the
  // original order status compare-and-swap, not just a terminal-cancel check.
  beforeNextBatch=() => sql.prepare("UPDATE orders SET status='shipped' WHERE id=?").run(qaOrder.id);
  const conflictingStatus=await patchAdminOrder({
    request:new Request('https://qa.invalid/api/admin/orders',{
      method:'PATCH',
      headers:{Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin',
        Cookie:'sd_admin_session='+session,'Content-Type':'application/json'},
      body:JSON.stringify({id:qaOrder.id,status:'processing'})
    }),env
  });
  assert.equal(conflictingStatus.status,409,'stale status transition must not overwrite another admin');
  assert.equal(scalar('SELECT status FROM orders').status,'shipped');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM audit_logs').n,0);
  sql.prepare("UPDATE orders SET status='confirmed' WHERE id=?").run(qaOrder.id);

  // The guarded order-first transaction must still support an actual
  // legitimate reprice in the disposable real SQLite database.
  const repriced=await patchAdminOrder({
    request:new Request('https://qa.invalid/api/admin/orders',{
      method:'PATCH',
      headers:{Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin',
        Cookie:'sd_admin_session='+session,'Content-Type':'application/json'},
      body:JSON.stringify({id:qaOrder.id,status:'confirmed',
        prices:[{itemId:qaItem.id,unitPrice:125000}]})
    }),env
  });
  assert.equal(repriced.status,200,'valid reprice is accepted');
  assert.equal(scalar('SELECT unit_price FROM order_items').unit_price,125000);
  assert.equal(scalar('SELECT total FROM orders').total,125000);
  sql.prepare("DELETE FROM audit_logs WHERE entity_type='order' AND entity_id=?").run(qaOrder.id);
  sql.prepare("UPDATE order_items SET unit_price=120000,line_total=120000 WHERE id=?").run(qaItem.id);
  // The disposable fixture must restore its original signed payment terms
  // after the preceding QA reprice invalidated them; otherwise the later real
  // ledger handler correctly rejects the synthetic receipt with HTTP 409.
  sql.prepare("UPDATE orders SET subtotal=120000,total=120000,payment_terms_confirmed_at=? WHERE id=?")
    .run(stamp,qaOrder.id);

  // Validation failure must happen before D1 batch and preserve all existing rows.
  const preBatch=batches;
  const invalid=structuredClone(v2);
  invalid.products.push({...qaProduct,id:'qa-isolated-second-product',slug:'qa-isolated-second-product'});
  assert.equal((await callRestore(invalid)).status,400,'Duplicate SKU must reject');
  assert.equal(batches,preBatch,'Rejected JSON must not issue destructive SQL');
  assert.equal(scalar('SELECT id FROM products').id,qaProduct.id);

  // Force a genuine SQL transaction failure halfway through restore. All DELETEs
  // must be rolled back, including the previous valid linked customer/order/item.
  const invalidSql=structuredClone(v2);
  invalidSql.operations.customers[0].phone=qaCustomer.phone;
  sql.exec("CREATE TRIGGER qa_disposable_block_products BEFORE INSERT ON products BEGIN SELECT RAISE(ABORT, 'qa expected restore rollback'); END;");
  const failed=await callRestore(invalidSql);
  assert.equal(failed.status,503,'Actual SQL abort should yield a bounded server error');
  assert.ok(rolledBack>=1,'Atomic D1-style batch must rollback on SQL failure');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM products').n,1);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM orders').n,1);
  assert.equal(rows('PRAGMA foreign_key_check').length,0);
  sql.exec('DROP TRIGGER qa_disposable_block_products');

  // Test real handler SQL for a manually verified payment journal, using only local
  // invented references; no bank, gateway, Cloudflare, or finance provider is touched.
  const incoming={orderId:qaOrder.id,direction:'received',amount:120000,transactionReference:'QA-LOCAL-RECV-001'};
  const authRejected=await callLedger(incoming,false);
  assert.ok([401,403].includes(authRejected.status),'Non-admin transaction denied');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM order_payment_transactions').n,0);
  assert.equal((await callLedger(incoming)).status,201,'Accepted verified receipt');
  assert.equal(scalar('SELECT payment_status FROM orders').payment_status,'paid');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM order_payment_transactions').n,1);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM audit_logs').n,1);
  assert.equal((await callLedger(incoming)).status,409,'Unique transaction reference must reject replay');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM order_payment_transactions').n,1);

  const overRefund={orderId:qaOrder.id,direction:'refunded',amount:120001,transactionReference:'QA-LOCAL-OVER-001'};
  assert.equal((await callLedger(overRefund)).status,409,'Cannot refund more than received');
  assert.equal(scalar('SELECT COUNT(*) AS n FROM order_payment_transactions').n,1);
  const partial={orderId:qaOrder.id,direction:'refunded',amount:40000,transactionReference:'QA-LOCAL-PARTIAL-001'};
  assert.equal((await callLedger(partial)).status,201,'Partial refund is recorded');
  assert.equal(scalar('SELECT payment_status FROM orders').payment_status,'pending');
  const last={orderId:qaOrder.id,direction:'refunded',amount:80000,transactionReference:'QA-LOCAL-FINAL-001'};
  assert.equal((await callLedger(last)).status,201,'Exact remaining refund is recorded');
  assert.equal(scalar('SELECT payment_status FROM orders').payment_status,'refunded');
  assert.equal((await callLedger({...last,transactionReference:'QA-LOCAL-EXTRA-001',amount:1})).status,409);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM order_payment_transactions').n,3);
  assert.equal(scalar('SELECT COUNT(*) AS n FROM audit_logs').n,3);
  assert.equal(rows('PRAGMA foreign_key_check').length,0);
  assert.ok(batches>=5,'Validated operations really touched SQLite transactions');
  console.log('PASS: disposable in-memory SQLite, full migrations, V2 Restore POST readback/rollback, linked contact/rows, authenticated local receipt and partial/full refund SQL, replay protection, audit and FK integrity. No real financial transaction.');
} finally {
  sql.close();
}
