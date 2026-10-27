/**
 * Short public warranty codes (4 characters) and backward-compatible phone
 * or 24-character code lookups. Uses only in-memory API doubles, no D1 writes.
 */
import assert from 'node:assert/strict';
import { generateShortWarrantyCode, isWarrantyCode, isWarrantyCodeCollisionError } from '../functions/_warranty-policy.js';
import { onRequestPost as lookup } from '../functions/api/warranty-lookup.js';

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
assert.equal(isWarrantyCodeCollisionError(new Error('UNIQUE constraint failed: warranties.order_item_id')),false);
assert.equal(isWarrantyCodeCollisionError(new Error('database down')),false);

const code='SDW-K7M2';
const record={
 warrantyId:'qa-short-id',warranty_code:code,duration_months:12,starts_at:'2026-01-01',ends_at:'2099-01-01',status:'active',
 sku:'SKU-123',skuVerified:0,title:'Giày thử nghiệm',size:'42',purchasedAt:'2026-05-01',orderNumber:'SD-QA-123',
 fullName:'Khách hàng thử',customerPhone:'0901234567',purchaseAddress:'123 Phố thử, Quận Một, TP HCM',imagesJson:'[]'
};
const stored=new Map();
const DB={
 prepare(sql){
  return {sql,bind(...params){
   return {
    sql,params,
    async first(){
     if(sql.includes('SELECT attempts FROM public_rate_limits'))return {attempts:1};
     if(sql.includes('upper(w.warranty_code)=?'))return String(params[0]).toUpperCase()===code?record:null;
     return null;
    },
    async all(){
     if(sql.includes('FROM warranties w')&&sql.includes('substr('))return {results:[record]};
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
 },body:JSON.stringify({lookup:lookupValue})}),env:{DB}});
}
const byCode=await search('sdw-k7m2','198.51.100.155');
assert.equal(byCode.status,200,'short code must work on public lookup');
const shortResponse=await byCode.json();
assert.equal(shortResponse.warranties.length,1);
assert.equal(shortResponse.warranty.maskedWarrantyCode,'••••M2','short code must not reveal all 4 characters');
assert.equal(shortResponse.warranty.maskedPhone,'090••••67');
assert.ok(!JSON.stringify(shortResponse).includes('SDW-K7M2'),'public output must not reveal full short code');
assert.match(shortResponse.warranty.claimToken,/^[a-f0-9]{32}$/,'valid short-lived claim token');
const byPhone=await search('090 123 4567','198.51.100.156');
assert.equal(byPhone.status,200,'phone lookup stays supported');
const phoneResponse=await byPhone.json();
assert.equal(phoneResponse.warranties[0].maskedWarrantyCode,'••••M2');
assert.ok(!JSON.stringify(phoneResponse).includes('0901234567'),'phone lookup must mask original phone');
console.log('PASS: SDW-4, legacy SDW-24, public code or phone lookup, masking and code collision classification.');
