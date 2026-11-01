// All D1, R2 and restore operations below target temporary local Miniflare only.
// NEVER use the real repository Wrangler config, remote bindings or financial providers.
import assert from 'node:assert/strict';
import {getPlatformProxy} from 'wrangler';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSession} from '../functions/_lib.js';
import {onRequestPost as restore} from '../functions/api/admin/restore.js';
import {onRequestPost as uploadQr} from '../functions/api/admin/payment-qr-upload.js';
import {onRequestPut as configureQr,onRequestGet as readQr} from '../functions/api/admin/payment-qr.js';
import {onRequestGet as previewQr} from '../functions/api/admin/payment-qr-preview.js';

const dir=mkdtempSync(join(tmpdir(),'sd-disposable-miniflare-'));
const config=join(dir,'wrangler.toml');
writeFileSync(config,[
'name = "sindarealest-qa-disposable"','compatibility_date = "2026-10-12"',
'[[d1_databases]]','binding = "DB"','database_name = "sd-disposable-only"',
'database_id = "00000000-0000-4000-8000-000000000042"',
'[[r2_buckets]]','binding = "IMAGES"','bucket_name = "sd-disposable-only"'
].join('\n')+'\n');
let platform;
try{
  platform=await getPlatformProxy({configPath:config,remoteBindings:false,persist:{path:join(dir,'bindings')}});
  const DB=platform.env.DB, IMAGES=platform.env.IMAGES;
  assert.ok(DB && IMAGES,'Expected local D1 and R2 bindings');
  const files=['0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql',
  '0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql',
  '0007_order_contact_details.sql','0008_product_sku_verification.sql','0009_fulfillment_and_manual_payments.sql',
  '0018_payment_delivery_settlement.sql'];
  // D1.exec() is line-delimited and cannot safely apply full multi-line
  // migration files. Prepare and execute each complete SQL statement instead.
  for(const name of files){
    const source=readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8');
    const withoutComments=source.replace(/^\s*--.*$/gm,'');
    for(const fragment of withoutComments.split(';')){
      const statement=fragment.trim();
      if(!statement || /^PRAGMA foreign_keys\s*=/i.test(statement))continue;
      await DB.prepare(statement).run();
    }
  }
  const password='NO_REAL_ADMIN_PASSWORD_QA',secret='NO_REAL_SESSION_SECRET_QA_FIXED_AT_LEAST_32_CHARS';
  const env={...platform.env,ADMIN_PASSWORD:password,SESSION_SECRET:secret};
  const headers={Cookie:'sd_admin_session='+await createSession(secret),
    Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin'};
  const req=(path,method,body)=>new Request('https://qa.invalid'+path,{
    method,headers:{...headers,...(body===undefined?{}:{'Content-Type':'application/json'}),...(path==='/api/admin/restore'?{'X-SD-Restore-Password':password}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const first=async(sql,...values)=>DB.prepare(sql).bind(...values).first();
  const setting=async key=>(await first('SELECT value FROM settings WHERE key=?',key))?.value??null;

  const backup={
    format:'sindarealest-backup-v2',products:[],
    settings:{showPrices:true,welcomeEnabled:false,welcomeTitleLine1:'QA',welcomeTitleLine2:'LOCAL',welcomeText:'TEST ONLY'},
    operations:{customers:[],orders:[],orderItems:[],warranties:[],warrantyClaims:[],auditLogs:[]}
  };
  assert.equal((await restore({env,request:req('/api/admin/restore','POST',backup)})).status,200);
  assert.equal(await setting('show_prices'),'1');

  const form=new FormData();
  const fakePng=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
  form.append('file',new Blob([fakePng],{type:'image/png'}),'test-only.png');
  const upload=await uploadQr({env,request:new Request('https://qa.invalid/api/admin/payment-qr-upload',
    {method:'POST',headers,body:form})});
  assert.equal(upload.status,201,'Local R2 upload + D1 pending/audit must be atomic');
  const response=await upload.json();
  const key=response.pendingKey;
  assert.match(key,/^qr-[a-f0-9-]+\.png$/);
  assert.ok(await IMAGES.head(key),'R2 object must actually exist');
  assert.equal(await setting('payment_qr_pending_key'),key);
  assert.equal((await first("SELECT COUNT(*) AS n FROM audit_logs WHERE action='payment_qr_uploaded'")).n,1);
  const image=await previewQr({env,request:new Request('https://qa.invalid/api/admin/payment-qr-preview?key='+key,{headers})});
  assert.equal(image.status,200,'Must retrieve same object via preview endpoint');
  assert.notEqual(await setting('payment_qr_active'),'1','Upload must not activate QR');

  const invalid=await configureQr({env,request:req('/api/admin/payment-qr','PUT',{action:'activate',verified:false})});
  assert.notEqual(invalid.status,200,'Admin verification required');
  const draft=await configureQr({env,request:req('/api/admin/payment-qr','PUT',{
    action:'save-draft',bankName:'Ngan hang QA',accountNumber:'0123456789',
    accountName:'NGUYEN VAN QA',instructions:'TEST ONLY'})});
  assert.equal(draft.status,200,'Local database stores bank draft');
  const activated=await configureQr({env,request:req('/api/admin/payment-qr','PUT',{action:'activate',verified:true})});
  assert.equal(activated.status,200,'Verified QR can become active');
  assert.equal(await setting('payment_qr_active_key'),key);
  assert.equal((await readQr({env,request:req('/api/admin/payment-qr','GET')})).status,200);
  assert.equal((await configureQr({env,request:req('/api/admin/payment-qr','PUT',{action:'deactivate'})})).status,200);
  assert.equal(await setting('payment_qr_active'),'0');
  assert.ok(await IMAGES.head(key),'Deactivation cannot delete QR image');
  assert.equal((await DB.prepare('PRAGMA foreign_key_check').all()).results.length,0);
  console.log('PASS: isolated Wrangler local D1/R2 actual binding APIs, Restore POST, QR put/preview/pending/audit, draft, verified activate and deactivate; no remote data or money touched.');
}finally{
  if(platform)await platform.dispose();
  rmSync(dir,{recursive:true,force:true});
}
