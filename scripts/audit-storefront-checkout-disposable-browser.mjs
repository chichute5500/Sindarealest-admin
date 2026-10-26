/**
 * Real browser -> Storefront form -> actual orders handler -> disposable SQLite -> Admin handler.
 * Loads the isolated Preview's exact UI while intercepting ALL write methods.
 * Only /api/orders and read-only /api/checkout-quote are intercepted and executed locally.
 * No remote mutation and no real payment or shipment is possible.
 */
import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'playwright';
import { createSession } from '../functions/_lib.js';
import { onRequestGet as publicProducts } from '../functions/api/products.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as quoteOrder } from '../functions/api/checkout-quote.js';
import { onRequestGet as adminOrders } from '../functions/api/admin/orders.js';
import { buildCloudflareAccessHeaders } from './cloudflare-access-service-token.mjs';
import { isApprovedPreviewExternalRead } from './preview-external-read-allowlist.mjs';

const branch='integration/storefront-locked-on-main-2026-10-26';
const alias='https://integration-storefront-locke.sindarealest-admin-preview.pages.dev';
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'
 ||process.env.GITHUB_REF!=='refs/heads/'+branch
 ||process.env.PREVIEW_URL!==alias+'/'
 ||!/^[0-9a-f]{40}$/.test(String(process.env.GITHUB_SHA||'')))
 throw Error('Unexpected branch / Preview / source SHA; disposable browser E2E refused');
const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
for(const filename of [
 '0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql',
 '0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql',
 '0007_order_contact_details.sql','0008_product_sku_verification.sql',
 '0009_fulfillment_and_manual_payments.sql'
]) db.exec(readFileSync(new URL('../migrations/'+filename,import.meta.url),'utf8'));
const DB={
 prepare(sql) {
  let args=[];
  return {
   bind(...params){args=params;return this},
   async first(){return db.prepare(sql).get(...args)||null},
   async all(){return {results:db.prepare(sql).all(...args)}},
   async run(){let v=db.prepare(sql).run(...args);return {meta:{changes:Number(v.changes)}}},
   execute(){if(/^\s*(?:SELECT|WITH|PRAGMA)\b/i.test(sql))
     return {results:db.prepare(sql).all(...args),meta:{changes:0}};
    const v=db.prepare(sql).run(...args);return {meta:{changes:Number(v.changes)}}}
  };
 },
 async batch(stmts) {
  db.exec('BEGIN IMMEDIATE');
  try{const rows=stmts.map(s=>s.execute());db.exec('COMMIT');return rows}
  catch(e){db.exec('ROLLBACK');throw e}
 }
};
const productId='00000000-1111-4222-8333-000000000086';
db.prepare("INSERT INTO products(id,slug,sku,sku_verified,title,category,category_label,price,stock,published,source_price_confirmed,fulfillment_type) VALUES(?,?,'QA-BROWSER-001',1,'Ví TEST KHÔNG BÁN','wallets','Ví',150000,50,1,1,'in_stock')")
 .run(productId,'qa-e2e-browser-only');
db.prepare("UPDATE settings SET value='1' WHERE key='show_prices'").run();
const qrKey='qr-550e8400-e29b-41d4-a716-446655440000.png';
for(const [key,value] of Object.entries({payment_qr_active:'1',payment_qr_active_key:qrKey,payment_qr_bank_name:'QA BANK ONLY',payment_qr_account_number:'000000000',payment_qr_account_name:'DISPOSABLE QA ONLY'}))
 db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key,value);
const SESSION_SECRET='E2E_BROWSER_DISPOSABLE_ONLY_NOT_PRODUCTION';
const env={DB,ADMIN_PASSWORD:'NO_REAL_ADMIN_PASSWORD',SESSION_SECRET,IMAGES:{head:async key=>key===qrKey?{size:100}:null}};
const adminCookie='sd_admin_session='+await createSession(SESSION_SECRET);
const auth=buildCloudflareAccessHeaders();
const dir='artifacts/storefront-integration-preview';
await fs.mkdir(dir,{recursive:true});
const configurations=[
 {name:'checkout-pc-light',width:1280,height:800,dark:false,mobile:false},
 {name:'checkout-pc-dark',width:1280,height:800,dark:true,mobile:false},
 {name:'checkout-mobile-light',width:390,height:844,dark:false,mobile:true},
 {name:'checkout-mobile-dark',width:390,height:844,dark:true,mobile:true}
];
const report={sha:process.env.GITHUB_SHA,scope:'BROWSER_UI_TO_REAL_HANDLER_DISPOSABLE_SQLITE',remoteWrites:0,realPayments:0,matrix:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const [index,spec] of configurations.entries()){
  const ctx=await browser.newContext({
   viewport:{width:spec.width,height:spec.height},
   isMobile:spec.mobile,hasTouch:spec.mobile,colorScheme:spec.dark?'dark':'light',
   reducedMotion:'reduce',deviceScaleFactor:1
  });
  await ctx.addInitScript(mode=>{
   try{localStorage.setItem('sd-theme-mode',mode)}catch{}
  },spec.dark?'dark':'light');
  const page=await ctx.newPage();
  const results={name:spec.name,pass:false,errors:[],locallyCreatedOrders:0,locallyQuotedOrders:0};
  page.on('pageerror',e=>results.errors.push('pageerror: '+e.message));
  let attemptedRemoteWrites=0;
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.method()==='POST'&&url.origin===alias&&url.pathname==='/api/orders'){
    const local=new Request(alias+'/api/orders',{method:'POST',
     headers:{Origin:alias,'Sec-Fetch-Site':'same-origin','Content-Type':'application/json',
      'CF-Connecting-IP':'qa-browser-'+spec.name},
     body:req.postData()});
    const response=await createOrder({request:local,env});
    if(response.status===201)results.locallyCreatedOrders++;
    await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
    return;
   }
   if(req.method()==='POST'&&url.origin===alias&&url.pathname==='/api/checkout-quote'){
    const local=new Request(alias+'/api/checkout-quote',{method:'POST',headers:{Origin:alias,'Content-Type':'application/json'},body:req.postData()});
    const response=await quoteOrder({request:local,env});
    if(response.status===200)results.locallyQuotedOrders++;
    await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});return;
   }
   if(req.method()==='GET'&&url.origin===alias&&url.pathname==='/payment-qr/'+qrKey){
    // A real PNG transfer fixture, never a real bank QR and never a remote write.
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8//8/AwMDEwMDAwMDAwAkBgMB/DXemwAAAABJRU5ErkJggg==','base64');
    await route.fulfill({status:200,contentType:'image/png',body:png});return;
   }
   if(req.method()!=='GET'&&req.method()!=='HEAD'){
    attemptedRemoteWrites++;
    await route.abort('blockedbyclient');return;
   }
   if(url.origin===alias&&url.pathname==='/api/products'){
    const response=await publicProducts({env,request:new Request(alias+'/api/products')});
    await route.fulfill({status:response.status,contentType:'application/json',body:await response.text()});return;
   }
   if(url.origin===alias&&url.pathname==='/api/settings'){
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:true})});return;
   }
   if(url.origin==='https://provinces.open-api.vn'){
    if(url.pathname==='/api/v2/p/') {
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{name:'Tỉnh kiểm thử QA',code:'99'}])});return;
    }
    if(url.pathname==='/api/v2/p/99'){
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({wards:[{name:'Phường kiểm thử',code:'99001'}]})});return;
    }
    await route.abort('blockedbyclient');return;
   }
   if(url.origin===alias){await route.continue({headers:{...req.headers(),...auth}});return}
   if(isApprovedPreviewExternalRead(req.url(),req.method())){await route.continue();return}
   await route.abort('blockedbyclient');
  });
  try{
   const pageResponse=await page.goto(alias+'/',{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(pageResponse?.status(),200);
   // Welcome is owner-approved to self-dismiss; do not race a vanished skip button.
   if(await page.locator('#welcomeSplash').isVisible())
    await page.locator('#skipIntro').evaluate(button=>button.click());
   await page.locator('#welcomeSplash').waitFor({state:'hidden',timeout:15000});
   await page.locator('#catalogGrid [data-add]').first().waitFor({state:'visible',timeout:15000});
   await page.locator('#catalogGrid [data-add]').first().click();
   const cartButton=spec.mobile?'#mobileCartNav':'#cartOpen';
   await page.locator(cartButton).click();
   await page.locator('#cartCheckout').click();
   await page.locator('#checkoutForm input[name="fullName"]').fill('KHACH QA TEST '+index);
   await page.locator('#checkoutForm input[name="phone"]').fill('000000030'+index);
   await page.locator('#checkoutProvince').selectOption({label:'Tỉnh kiểm thử QA'});
   await page.locator('#checkoutWard').selectOption({label:'Phường kiểm thử'});
   await page.locator('#checkoutStreet').fill('DIA CHI GIA — KHONG GIAO HANG');
   await page.locator('#checkoutSubmit').click();
   await page.locator('#sdCheckoutPaymentStep').waitFor({state:'visible',timeout:15000});
   assert.equal(results.locallyQuotedOrders,1,'Quote must be computed locally by real server handler');
   assert.equal(await page.locator('#sdCheckoutOptions [data-sd-payment-option]').count(),2,'In-stock checkout must offer exactly deposit and full transfer');
   assert.equal(await page.locator('#sdCheckoutSelectedAmount').textContent(),'100.000đ');
   await page.locator('[data-sd-payment-option="full"]').click();
   assert.equal(await page.locator('#sdCheckoutSelectedAmount').textContent(),'150.000đ');
   await page.locator('[data-sd-payment-option="deposit"]').click();
   await page.screenshot({path:dir+'/'+spec.name+'-payment-step.png',animations:'disabled'});
   await page.locator('#checkoutSubmit').click();
   await page.locator('#sdCheckoutReviewStep').waitFor({state:'visible',timeout:10000});
   await page.locator('#checkoutSubmit').click();
   await page.locator('#checkoutMessage').filter({hasText:/Mã yêu cầu SD-/}).waitFor({timeout:15000});
   assert.equal(results.locallyCreatedOrders,1,'Actual browser POST must call local checkout handler exactly once');
   assert.equal(attemptedRemoteWrites,0,'Browser must not send writes to Preview');
   assert.equal(db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,index+1);
   const last=db.prepare('SELECT order_number AS n FROM orders ORDER BY created_at DESC,id DESC').all();
   assert.equal(last.length,index+1);
   const admin=await adminOrders({env,request:new Request(alias+'/api/admin/orders',{
    headers:{Cookie:adminCookie,Origin:alias,'Sec-Fetch-Site':'same-origin'}
   })});
   assert.equal(admin.status,200,'Same disposable order must be visible in real Admin GET handler');
   const view=await admin.json();
   assert.equal(view.orders.length,index+1);
   assert.ok(view.orders.every(o=>o.items.length===1));
   const latest=view.orders.find(o=>o.phone==='000000030'+index);
   assert.equal(latest?.customer_payment_option,'deposit','Admin must see customer's selected deposit preference');
   assert.equal(Number(latest?.customer_payment_amount),100000,'Admin must receive server-derived amount, not browser amount');
   await page.screenshot({path:dir+'/'+spec.name+'.png',animations:'disabled'});
   results.pass=true;
  }catch(error){
   results.errors.push(String(error).slice(0,500));
   await page.screenshot({path:dir+'/'+spec.name+'-FAIL.png',animations:'disabled'}).catch(()=>{});
  }finally{results.remoteWrites=attemptedRemoteWrites;report.matrix.push(results);await ctx.close()}
 }
}finally{await browser.close();db.close()}
report.pass=report.matrix.length===configurations.length&&report.matrix.every(x=>x.pass);
await fs.writeFile(dir+'/browser-checkout-disposable.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.pass)process.exitCode=1;
