import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
/**
 * Short public warranty codes (4 characters) and backward-compatible phone
 * or 24-character code lookups. Uses only in-memory API doubles, no D1 writes.
 */
import assert from 'node:assert/strict';
import { generateShortWarrantyCode, isWarrantyCode, isWarrantyCodeCollisionError } from '../functions/_warranty-policy.js';
import { onRequestPost as lookup } from '../functions/api/warranty-lookup.js';
globalThis.fetch=async url=>{
 assert.ok(String(url).startsWith("https://challenges.cloudflare.com/turnstile/v0/siteverify"));
 return new Response(JSON.stringify({success:true,hostname:"shop.example",action:"warranty_lookup"}),{headers:{"Content-Type":"application/json"}});
};

for (let i=0;i<512;i++){
 const code=generateShortWarrantyCode();
 assert.match(code,/^SDW-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
 assert.equal(isWarrantyCode(code),true);
}
assert.equal(isWarrantyCode('sdw-k7m2'),true,'lower-case user input is valid');
assert.equal(isWarrantyCode('SDW-'+'A'.repeat(24)),true,'previously issued 24-char codes remain valid');
for (const bad of ['SDW-123','SDW-12345','SDW-0000','SDW-IOI1','SDW-','SDW-7!F2'])
 assert.equal(isWarrantyCode(bad),false,'invalid or ambiguous short-code input: '+bad);
assert.equal(isWarrantyCodeCollisionError(new Error('D1_ERROR: UNIQUE constraint failed: warranties.warranty_code')),true);
assert.equal(isWarrantyCodeCollisionError(new Error('D1_ERROR: UNIQUE constraint failed: manual_warranties.warranty_code')),true);
assert.equal(isWarrantyCodeCollisionError(new Error('UNIQUE constraint failed: warranties.order_item_id')),false);
assert.equal(isWarrantyCodeCollisionError(new Error('database down')),false);

const code='SDW-K7M2';
const record={
 warrantyId:'qa-short-id',warranty_code:code,duration_months:12,starts_at:'2026-01-01',ends_at:'2099-01-01',status:'active',
 sku:'SKU-123',skuVerified:0,title:'Giày thử nghiệm',size:'42',purchasedAt:'2026-05-01',orderNumber:'SD-QA-123',
 fullName:'Khách hàng thử',customerPhone:'0901234567',purchaseAddress:'123 Phố thử, Quận Một, TP HCM',imagesJson:'[]'
};
const manualRecord={
 warrantyId:'manual-warranty-qa',warranty_code:'SDW-M4N7',duration_months:6,starts_at:'2026-05-01',ends_at:'2099-01-01',status:'active',
 sku:'',skuVerified:0,title:'Ví da mua trực tiếp',size:'',purchasedAt:'2026-05-01',orderNumber:'',
 fullName:'Khách mua trực tiếp',customerPhone:'0901234567',purchaseAddress:'Địa chỉ khách mua trực tiếp',imagesJson:'[]',
 price:2800000,manual:1
};
const stored=new Map();
const DB={
 prepare(sql){
  return {sql,
   async run(){ return {meta:{changes:1}}; },
   bind(...params){
   return {
    sql,params,
    async first(){
     if(sql.includes('SELECT attempts FROM public_rate_limits'))return {attempts:1};
     if(sql.includes('upper(w.warranty_code)=?'))return String(params[0]).toUpperCase()===code?record:null;
     if(sql.includes('upper(mw.warranty_code)=?'))return String(params[0]).toUpperCase()===manualRecord.warranty_code?manualRecord:null;
     return null;
    },
    async all(){
     if(sql.includes('FROM warranties w')&&sql.includes('substr('))return {results:[record]};
     if(sql.includes('FROM manual_warranties mw')&&sql.includes('substr('))return {results:[manualRecord]};
     return {results:[]};
    },
    async run(){
     if(sql.includes('INSERT INTO settings'))stored.set(params[0],params[1]);
     return {meta:{changes:1}};
    },
   }
  }}
 },
 async batch(statements){
  for(const statement of statements)await statement.run();
  if(statements[0]?.sql.includes('INSERT INTO public_rate_limits'))return [{success:true},{success:true,results:[{attempts:1}]}];
  return statements.map(()=>({meta:{changes:1}}));
 }
};
async function search(lookupValue,ip){
 return lookup({request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{
  Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':ip
 },body:JSON.stringify({lookup:lookupValue,turnstileToken:'qa-test-proof-warranty-1'})}),env:{DB,TURNSTILE_SITE_KEY:"qa-public-site",TURNSTILE_SECRET_KEY:"qa-private-test"}});
}
const byCode=await search('sdw-k7m2','198.51.100.155');
assert.equal(byCode.status,200,'short code must work on public lookup');
const shortResponse=await byCode.json();
assert.equal(shortResponse.warranties.length,1);
assert.equal(shortResponse.warranty.maskedWarrantyCode,'••••M2','short code must not reveal all 4 characters');
assert.equal(shortResponse.warranty.maskedPhone,'090••••67');
assert.ok(!JSON.stringify(shortResponse).includes('SDW-K7M2'),'public output must not reveal full short code');
assert.match(shortResponse.warranty.claimToken,/^[a-f0-9]{32}$/,'valid short-lived claim token');
const byManualCode=await search('sdw-m4n7','198.51.100.157');
assert.equal(byManualCode.status,200,'standalone warranty code must work on public lookup');
const manualCodeResponse=await byManualCode.json();
assert.equal(manualCodeResponse.warranty.title,'Ví da mua trực tiếp');
assert.equal(manualCodeResponse.warranty.eligible,false,'standalone records do not expose order-dependent claim submission');
assert.equal(manualCodeResponse.warranty.status,'active');
assert.ok(manualCodeResponse.warranty.remainingDays>0,'manual active warranties must show remaining days even if claim submission is disabled');
assert.equal(Object.hasOwn(manualCodeResponse.warranty,'price'),false,'private sale price remains Admin-only');
assert.equal(manualCodeResponse.warranty.maskedPhone,'090••••67');
assert.equal(manualCodeResponse.warranty.maskedOrderNumber,'Mua trực tiếp');
assert.equal(manualCodeResponse.warranty.manual,true);
const byPhone=await search('090 123 4567','198.51.100.156');
assert.equal(byPhone.status,200,'phone lookup stays supported');
const phoneResponse=await byPhone.json();
assert.equal(phoneResponse.warranties[0].maskedWarrantyCode,'••••M2');
assert.equal(phoneResponse.warranties.length,2,'phone lookup returns both order-linked and standalone warranties');
assert.ok(phoneResponse.warranties.some(w=>w.title==='Ví da mua trực tiếp'),'phone lookup finds standalone warranties');
assert.ok(!JSON.stringify(phoneResponse).includes('0901234567'),'phone lookup must mask original phone');
console.log('PASS: SDW-4, legacy SDW-24, public code or phone lookup, masking and code collision classification.');


// Real disposable SQLite exercises the exact public SQL. Unlike the fast D1
// doubles above, it must only return rows matching the phone and code input.
// Cloudflare Turnstile siteverify is stubbed; no remote credentials or traffic.
const sqlite=new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for(const name of [
  '0001_schema.sql','0003_storefront_operations.sql','0004_admin_notifications.sql',
  '0005_address_warranty_verification.sql','0006_remove_warranty_otp.sql',
  '0007_order_contact_details.sql','0008_product_sku_verification.sql',
  '0009_fulfillment_and_manual_payments.sql','0018_payment_delivery_settlement.sql',
  '0019_manual_warranties.sql','0020_manual_warranty_contacts.sql','0021_warranty_policy_snapshots.sql'
])sqlite.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
const insertManual=sqlite.prepare(
  "INSERT INTO manual_warranties(id,warranty_code,customer_name,customer_phone,customer_address,product_name,price,policy_name,duration_months,starts_at,ends_at,status) VALUES(?,?,?,?,?,?,?,'Bảo hành trực tiếp',?,?,?,?)");
insertManual.run('qa-phone-1','SDW-M4N7','Khách mẫu A','+84901234567',
  '123 Đường mẫu, TP HCM','Ví mẫu A',1600000,6,'2026-01-01','2027-01-01','active');
insertManual.run('qa-phone-2','SDW-K7M2','Khách mẫu B','090 123 4567',
  '456 Đường mẫu, TP HCM','Túi mẫu B',4500000,12,'2026-01-01','2028-01-01','void');
insertManual.run('qa-phone-3','SDW-A5B7','Khách không liên quan','0912345678',
  '789 Đường khác','Dép khác',900000,6,'2026-01-01','2027-01-01','active');
const realDB={
  prepare(text){
    let args=[];
    return {
      bind(...next){args=next;return this},
      async first(){return sqlite.prepare(text).get(...args)||null},
      async all(){return {results:sqlite.prepare(text).all(...args)}},
      async run(){
        const info=sqlite.prepare(text).run(...args);
        return {success:true,meta:{changes:Number(info.changes)}};
      },
      _execute(){
        if(/^\s*SELECT/i.test(text))
          return {success:true,results:sqlite.prepare(text).all(...args)};
        const info=sqlite.prepare(text).run(...args);
        return {success:true,meta:{changes:Number(info.changes)}};
      },
    };
  },
  async batch(statements){
    sqlite.exec('BEGIN IMMEDIATE');
    try{
      const result=statements.map(stmt=>stmt._execute());
      sqlite.exec('COMMIT');
      return result;
    }catch(e){sqlite.exec('ROLLBACK');throw e}
  },
};
async function realSearch(lookupValue,ip,token='qa-test-proof-warranty-1'){
  return lookup({
    request:new Request('https://shop.example/api/warranty-lookup',{
      method:'POST',headers:{
        Origin:'https://shop.example','Content-Type':'application/json',
        'CF-Connecting-IP':ip,
      },
      body:JSON.stringify({lookup:lookupValue,turnstileToken:token}),
    }),
    env:{DB:realDB,TURNSTILE_SITE_KEY:'qa-public-site',TURNSTILE_SECRET_KEY:'qa-private-test'},
  });
}
const realByCode=await realSearch('sdw-m4n7','198.51.100.201','');
assert.equal(realByCode.status,200,'exact real SQL manual code lookup');
const codeResult=await realByCode.json();
assert.equal(codeResult.warranties.length,1);
assert.equal(codeResult.warranty.title,'Ví mẫu A');
assert.equal(codeResult.warranty.manual,true);
assert.equal(codeResult.warranty.eligible,false);
assert.ok(codeResult.warranty.remainingDays>0,'live manual record with future expiration must show remaining days');
assert.equal(codeResult.warranty.purchasedAt,'','manual created_at must not be called purchase date');
assert.ok(!JSON.stringify(codeResult).includes('1600000'),'sale price must remain private');
const realByPhone=await realSearch('+84 901 234 567','198.51.100.202');
assert.equal(realByPhone.status,200,'verified +84 phone input must work against actual SQL');
const phoneData=await realByPhone.json();
assert.equal(phoneData.warranties.length,2,'phone lookup must find 0-prefix and +84 saved formats');
assert.ok(phoneData.warranties.some(w=>w.title==='Ví mẫu A'));
assert.ok(phoneData.warranties.some(w=>w.title==='Túi mẫu B'&&w.status==='void'));
assert.ok(!phoneData.warranties.some(w=>w.title==='Dép khác'),'do not leak another phone');
assert.ok(!JSON.stringify(phoneData).includes('+84901234567'),'never return raw phone');
assert.ok(!JSON.stringify(phoneData).includes('090 123 4567'),'never return stored formatted phone');
const invalidChallenge=await realSearch('0901234567','198.51.100.203','tiny');
assert.equal(invalidChallenge.status,400,'phone search requires valid server-side challenge');
for(let n=0;n<6;n++)assert.equal(
  (await realSearch('SDW-A5B7','198.51.100.204','')).status,200,
  'legitimate queries within limit remain available');
assert.equal((await realSearch('SDW-A5B7','198.51.100.204','')).status,429,
  'seventh lookup in the rate window must be rejected');
sqlite.close();
console.log('PASS: disposable real-SQL public phone/code lookup, +84 variants, record isolation, masking, void and rate limit.');
