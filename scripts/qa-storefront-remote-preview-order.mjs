/**
 * Strict remote-preview E2E smoke. ONLY the already-isolated D1 Preview may be written.
 * Owns one uniquely tagged product/customer/order and cleans up those rows in finally.
 * QR config and payment ledger are NEVER mutated; they remain covered by disposable E2E.
 * No production data, external payments, actual shipments or real personal information.
 */
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {sanitizedDeployments} from './admin-preview-provenance-readonly.mjs';
import {buildCloudflareAccessHeaders} from './cloudflare-access-service-token.mjs';

const REPO='chichute5500/Sindarealest-admin';
const REF='refs/heads/integration/storefront-locked-on-main-2026-10-26';
const BRANCH='integration-storefront-locked-on-main-20261026';
const PROJECT='sindarealest-admin-preview';
const PROD_PROJECT='sindarealest2';
const ORIGIN='https://integration-storefront-locke.sindarealest-admin-preview.pages.dev';
const ALIAS='integration-storefront-locke.sindarealest-admin-preview.pages.dev';
const {GITHUB_REPOSITORY,GITHUB_REF,GITHUB_SHA,CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_API_TOKEN,ADMIN_TEST_PASSWORD}=process.env;
if(GITHUB_REPOSITORY!==REPO||GITHUB_REF!==REF||!/^[0-9a-f]{40}$/.test(String(GITHUB_SHA||'')))
 throw Error('Remote-write QA is restricted to expected GitHub repository/branch/commit');
if(!CLOUDFLARE_ACCOUNT_ID||!CLOUDFLARE_API_TOKEN)
 throw Error('Cannot verify remote Preview binding without Cloudflare credentials');
if(!ADMIN_TEST_PASSWORD || ADMIN_TEST_PASSWORD.length<12)
 throw Error('Dedicated Preview Admin test password unavailable; refuse remote writes');
const ACCESS=buildCloudflareAccessHeaders();
if(!ACCESS['cf-access-client-id']||!ACCESS['cf-access-client-secret'])
 throw Error('Paired Preview Access service credentials are mandatory for remote-write QA');

const accountUrl='https://api.cloudflare.com/client/v4/accounts/'+encodeURIComponent(CLOUDFLARE_ACCOUNT_ID);
const headers={Authorization:'Bearer '+CLOUDFLARE_API_TOKEN};
async function cloudflareGet(url){
 const res=await fetch(url,{headers,signal:AbortSignal.timeout(25000),redirect:'error'});
 const payload=await res.json().catch(()=>null);
 if(!res.ok||payload?.success!==true)
  throw Error('Cloudflare read-only metadata unavailable; HTTP '+res.status);
 return payload.result;
}
const [preview,production,deployments]=await Promise.all([
 cloudflareGet(accountUrl+'/pages/projects/'+PROJECT),
 cloudflareGet(accountUrl+'/pages/projects/'+PROD_PROJECT),
 cloudflareGet(accountUrl+'/pages/projects/'+PROJECT+'/deployments'),
]);
assert.equal(preview.name,PROJECT);
assert.equal(production.name,PROD_PROJECT);
assert.equal(preview.production_branch,'main');
assert.equal(production.production_branch,'main');
const p=preview.deployment_configs?.preview;
const a=preview.deployment_configs?.production;
const b=production.deployment_configs?.production;
const dbId=v=>String(v?.d1_databases?.DB?.id||v?.d1_databases?.DB?.database_id||'');
const r2Name=(v,k)=>String(v?.r2_buckets?.[k]?.name||v?.r2_buckets?.[k]?.bucket_name||'');
const PREVIEW_DB=dbId(p);
const PROD_DBS=[dbId(a),dbId(b)].filter(Boolean);
const previewBuckets=[r2Name(p,'IMAGES'),r2Name(p,'ORIGINALS')];
const prodBuckets=[r2Name(a,'IMAGES'),r2Name(a,'ORIGINALS'),r2Name(b,'IMAGES'),r2Name(b,'ORIGINALS')].filter(Boolean);
if(!/^[0-9a-f-]{36}$/i.test(PREVIEW_DB)||!dbId(b)||PROD_DBS.includes(PREVIEW_DB))
 throw Error('BLOCKED: Preview D1 not separately identified from all known Production bindings');
if(previewBuckets.some(x=>!x)||previewBuckets[0]===previewBuckets[1]||previewBuckets.some(x=>prodBuckets.includes(x)))
 throw Error('BLOCKED: Preview R2 pair missing/overlapping Production bindings');
const deployment=sanitizedDeployments(deployments)
 .filter(x=>x.environment==='preview'&&x.stage==='success'&&x.aliases.includes(ALIAS))
 .sort((x,y)=>(y.createdOn||'').localeCompare(x.createdOn||''))[0];
if(!deployment||deployment.sha!==GITHUB_SHA||deployment.branch!==BRANCH)
 throw Error('BLOCKED: live isolated Preview alias does not match exact QA SHA');
console.log('PASS identity: Preview D1/R2 strictly separated, exact branch and deployed SHA verified (identifiers not printed).');

const d1Endpoint=accountUrl+'/d1/database/'+encodeURIComponent(PREVIEW_DB)+'/query';
async function query(sql,params=[]){
 const response=await fetch(d1Endpoint,{
  method:'POST',headers:{...headers,'Content-Type':'application/json'},
  body:JSON.stringify({sql,params}),signal:AbortSignal.timeout(25000),redirect:'error'
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||result?.success!==true||!Array.isArray(result.result)||result.result.some(x=>x.success===false))
  throw Error('D1 remote SQL failed; HTTP '+response.status+'; requested statement was not accepted');
 return result.result[0]?.results||[];
}
async function localGet(path,options={}){
 const response=await fetch(ORIGIN+path,{
  method:options.method||'GET',
  headers:{...ACCESS,Origin:options.origin||ORIGIN,'Sec-Fetch-Site':'same-origin',...(options.cookie?{Cookie:options.cookie}:{}),...(options.body===undefined?{}:{'Content-Type':'application/json'})},
  ...(options.body===undefined?{}:{body:JSON.stringify(options.body)}),
  redirect:'error',signal:AbortSignal.timeout(25000)
 });
 const payload=await response.json().catch(()=>null);
 return {status:response.status,body:payload,headers:response.headers};
}
const tag=randomUUID().replace(/-/g,'').slice(0,16).toUpperCase();
const fixture={
 sku:'QA-REMOTE-'+tag,
 productId:randomUUID(),productName:'QA PREVIEW ONLY '+tag,
 phone:'000'+String(parseInt(tag.slice(0,10),16)).padStart(13,'0'),
 fullName:'QA PREVIEW TEST '+tag,
 note:'QA_REMOTE_PREVIEW_ONLY_'+tag,
 price:150000
};
const report={sourceSha:GITHUB_SHA,scope:'REMOTE_PREVIEW_D1_ONLY',productionWrites:0,realTransfers:0,
 remotePreviewOrderWrites:0,adminReadVerified:false,priceTermsConfirmed:false,cleanupVerified:false,checks:[]};
let fixtureTouched=false;
let qaOrderId='';
let error=null;
const step=(name,pass,info={})=>{report.checks.push({name,pass,...info});if(!pass)throw Error('FAIL '+name)};
try{
 const tables=await query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('products','customers','orders','order_items','order_contact_details','order_payment_requests','order_payment_transactions','settings')");
 step('migrations present on Preview D1',tables.length===8);
 const occupied=await query('SELECT id FROM products WHERE sku=?',[fixture.sku]);
 const occupiedPhone=await query('SELECT id FROM customers WHERE phone=?',[fixture.phone]);
 step('unique QA identity, no preexisting records',occupied.length===0&&occupiedPhone.length===0);
 // Only the exact fixture product is created through remote D1; no settings or real product rows are changed.
 const ins=await query(
  'INSERT INTO products(id,slug,sku,sku_verified,title,category,category_label,description,price,stock,published,source_price_confirmed,fulfillment_type,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
  [fixture.productId,'qa-remote-'+tag.toLowerCase(),fixture.sku,1,fixture.productName,'wallets','QA Test',
   'TEST ONLY NOT FOR SALE',fixture.price,1,1,1,'in_stock',-20000]
 );
 fixtureTouched=true;
 step('insert QA fixture only',ins.length===1&&ins[0].id===fixture.productId);
 const products=await localGet('/api/products');
 step('actual Preview GET catalog from remote D1',products.status===200&&Array.isArray(products.body)
  &&products.body.some(p=>p.id===fixture.productId&&p.sku===fixture.sku));
 const checkout={fullName:fixture.fullName,phone:fixture.phone,address:'QA TEST ADDRESS - NO DELIVERY',
  note:fixture.note,items:[{id:fixture.productId,quantity:1}]};
 const csrf=await localGet('/api/orders',{method:'POST',body:checkout,origin:'https://untrusted.invalid'});
 step('cross-origin checkout blocked',csrf.status===403);
 const created=await localGet('/api/orders',{method:'POST',body:checkout});
 step('real POST /api/orders -> isolated remote D1',created.status===201
  &&created.body?.ok===true&&typeof created.body?.orderNumber==='string'
  &&/^[0-9a-f]{64}$/.test(String(created.body?.orderAccessToken||'')));
 report.remotePreviewOrderWrites=1;
 const rows=await query("SELECT o.id,o.order_number,o.public_access_token_hash,oi.product_id,oc.full_name FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN order_contact_details oc ON oc.order_id=o.id WHERE o.customer_note=? AND o.order_number=?",
  [fixture.note,created.body.orderNumber]);
 step('remote DB order/item/contact snapshot',rows.length===1
  &&rows[0].product_id===fixture.productId&&rows[0].full_name===fixture.fullName);
 qaOrderId=rows[0].id;
 const computedHash=createHash('sha256').update(created.body.orderAccessToken).digest('hex');
 step('token is stored as SHA-256 only',rows[0].public_access_token_hash===computedHash);
 const params='?orderNumber='+encodeURIComponent(created.body.orderNumber)+'&token='+created.body.orderAccessToken;
 const noTerms=await localGet('/api/order-payment'+params);
 step('public payment fail-closed until Admin confirmation',noTerms.status===200&&noTerms.body?.paymentReady===false);
 const wrong=await localGet('/api/order-payment?orderNumber='+encodeURIComponent(created.body.orderNumber)+'&token='+('f'.repeat(64)));
 step('wrong capability token rejected',wrong.status===404);
 const unauth=await localGet('/api/admin/orders');
 step('Admin GET denies no session',unauth.status===401);
 const login=await localGet('/api/admin/login',{method:'POST',body:{password:ADMIN_TEST_PASSWORD}});
 step('isolated Preview Admin login authenticates',login.status===200&&login.body?.ok===true);
 const cookie=(login.headers.get('set-cookie')||'').split(';')[0];
 if(!cookie.startsWith('sd_admin_session='))throw Error('No scoped Admin session cookie from Preview login');
 const admin=await localGet('/api/admin/orders',{cookie});
 const found=admin.body?.orders?.find(x=>x.id===qaOrderId);
 step('Admin API sees exact newly created order',admin.status===200&&found?.order_number===created.body.orderNumber
  &&found?.items?.length===1&&found.items[0].productId===fixture.productId);
 report.adminReadVerified=true;
 const wrongOrigin=await localGet('/api/admin/orders',{cookie,origin:'https://untrusted.invalid'});
 step('Admin CSRF origin guard',wrongOrigin.status===403);
 const tooEarly=await localGet('/api/admin/payment-requests',{method:'POST',cookie,
  body:{orderId:qaOrderId,paymentOption:'full'}});
 step('QR payment blocked before terms confirmed',tooEarly.status===409);
 const patch=await localGet('/api/admin/orders',{method:'PATCH',cookie,body:{
  id:qaOrderId,status:'confirmed',
  prices:[{itemId:found.items[0].id,unitPrice:fixture.price}],
  termsConfirmed:true,paymentTermsNote:'QA TEST — NO BANK TRANSFER'
 }});
 step('Admin confirms price and payment terms',patch.status===200&&patch.body?.ok===true);
 report.priceTermsConfirmed=true;
 const noRequest=await localGet('/api/order-payment'+params);
 step('No unsolicited QR/payment request',noRequest.status===200&&noRequest.body?.paymentReady===false);
 const badAmount=await localGet('/api/admin/payment-requests',{method:'POST',cookie,
  body:{orderId:qaOrderId,paymentOption:'full',amount:1}});
 step('client amount manipulation rejected before QR',badAmount.status===400);
 const unauthLedger=await localGet('/api/admin/payment-transactions',{method:'POST',body:{
  orderId:qaOrderId,direction:'received',amount:fixture.price,transactionReference:'QA-NO-RECEIPT-'+tag
 }});
 step('ledger cannot be forged without Admin session',unauthLedger.status===401);
 const cancel=await localGet('/api/admin/orders',{method:'PATCH',cookie,
  body:{id:qaOrderId,status:'cancelled'}});
 step('Admin can cancel isolated QA order',cancel.status===200&&cancel.body?.ok===true);
 const afterCancel=await localGet('/api/admin/payment-requests',{method:'POST',cookie,
  body:{orderId:qaOrderId,paymentOption:'full'}});
 step('cancelled QA order rejects new QR request',afterCancel.status===409);
 const noMoney=await query('SELECT COUNT(*) AS n FROM order_payment_transactions WHERE order_id=?',[qaOrderId]);
 step('no actual or simulated receipts written to Preview ledger',Number(noMoney[0]?.n)===0);
} catch(e){error=e;report.failure=String(e?.message||e).slice(0,240);}
finally{
 if(fixtureTouched){
  try{
   const qaOrders=await query('SELECT o.id FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.customer_note=? AND c.phone=? AND c.full_name=?',
    [fixture.note,fixture.phone,fixture.fullName]);
   if(qaOrders.length>1|| (qaOrderId&&qaOrders.some(x=>x.id!==qaOrderId)))throw Error('Cleanup scope mismatch');
   for(const row of qaOrders){
    const id=row.id;
    // Never delete unrelated orders or real financial activity.
    const money=await query('SELECT COUNT(*) AS n FROM order_payment_transactions WHERE order_id=?',[id]);
    if(Number(money[0]?.n)!==0)throw Error('Refusing cleanup of order with financial ledger');
    await query("DELETE FROM audit_logs WHERE entity_type='order' AND entity_id=?",[id]);
    await query('DELETE FROM order_shipping_addresses WHERE order_id=?',[id]);
    await query('DELETE FROM order_contact_details WHERE order_id=?',[id]);
    await query('DELETE FROM order_items WHERE order_id=?',[id]);
    await query('DELETE FROM orders WHERE id=? AND customer_note=?',[id,fixture.note]);
   }
   await query('DELETE FROM customers WHERE phone=? AND full_name=? AND NOT EXISTS(SELECT 1 FROM orders WHERE customer_id=customers.id)',
    [fixture.phone,fixture.fullName]);
   await query('DELETE FROM products WHERE id=? AND sku=? AND title=?',
    [fixture.productId,fixture.sku,fixture.productName]);
   const leftProducts=await query('SELECT COUNT(*) AS n FROM products WHERE id=?',[fixture.productId]);
   const leftCustomers=await query('SELECT COUNT(*) AS n FROM customers WHERE phone=?',[fixture.phone]);
   const leftOrders=await query('SELECT COUNT(*) AS n FROM orders WHERE customer_note=?',[fixture.note]);
   report.cleanupVerified=[leftProducts,leftCustomers,leftOrders].every(rows=>Number(rows[0]?.n)===0);
   if(!report.cleanupVerified)throw Error('QA cleanup verification failed');
  }catch(e){report.cleanupFailure=String(e?.message||e).slice(0,240);error=error||e;}
 }
}
report.pass=!error&&report.cleanupVerified&&report.remotePreviewOrderWrites===1
 &&report.adminReadVerified&&report.priceTermsConfirmed&&report.checks.every(x=>x.pass);
await mkdir('artifacts/storefront-integration-remote-e2e',{recursive:true});
await writeFile('artifacts/storefront-integration-remote-e2e/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.pass)process.exitCode=1;
