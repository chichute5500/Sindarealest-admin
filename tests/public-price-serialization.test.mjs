import assert from 'node:assert/strict';
import { fromRow } from '../functions/_lib.js';
import { onRequestGet as publicProductsGet } from '../functions/api/products.js';

// In-memory API serializer regression contract. This never touches D1,
// fixture JSON, production bindings, or order endpoints.
const priceRow = {
  id: 'in-memory-price-contract',
  slug: 'in-memory-price-contract',
  sku: 'INTERNAL-TEST',
  sku_verified: 0,
  title: 'In-memory price contract fixture',
  category: 'sneakers',
  category_label: 'Sneaker',
  description: '',
  price: 1234567,
  source_price_confirmed: 0,
  stock: 1,
  published: 1,
  images_json: '[]',
  sort_order: 0,
  updated_at: null,
};
assert.equal(fromRow(priceRow, { publicView: true, showPrices: false }).price, null,
  'the public API must null the amount when public price visibility is disabled');
assert.equal(fromRow(priceRow, { publicView: true, showPrices: true }).price, null,
  'the public API must not leak an unconfirmed amount even when visibility is enabled');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1 }, { publicView: true, showPrices: true }).price, 1234567,
  'a confirmed whole-VND amount may be public when the toggle is enabled');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1 }, { publicView: true, showPrices: false }).price, null,
  'the public toggle must hide even an otherwise confirmed amount');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: -1 }, { publicView: true, showPrices: true }).price, null,
  'negative DB amounts must not be serialized publicly');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: 1.5 }, { publicView: true, showPrices: true }).price, null,
  'fractional DB amounts must not be serialized publicly');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: '' }, { publicView: true, showPrices: true }).price, null,
  'empty DB amounts must not be coerced to zero');
assert.equal(fromRow({ ...priceRow, source_price_confirmed: 1, price: 0 }, { publicView: true, showPrices: true }).price, 0,
  'explicitly confirmed zero is preserved as a valid value');
assert.equal(fromRow(priceRow, { publicView: false, showPrices: false }).price, 1234567,
  'admin/internal serialization retains stored price data irrespective of public toggle');


// Edge-cache regression: only public serializations may be cached. Admin
// toggling show_prices off must NEVER reuse a cached priced response.
const priorCache=globalThis.caches;
const memo=new Map();
let catalogReads=0,priceSetting="0";
const fakeCache={
  async match(key){return memo.get(key.url)?.clone() || null},
  async put(key,response){assert.match(response.headers.get("Cache-Control")||"",/max-age=15/);memo.set(key.url,response.clone())}
};
const publicRow={...priceRow,sku:"SD-SN-TEST",sku_verified:1,source_price_confirmed:1,fulfillment_type:"made_to_order"};
const env={DB:{prepare(sql){
  if(sql.includes("FROM settings"))return {bind(){return {async first(){return {value:priceSetting}}}}};
  if(sql.includes("FROM products")){
    const statement={bind(){return this},async all(){catalogReads++;return {results:[publicRow]}}};
    return statement;
  }
  throw Error("Unexpected SQL in public cache test: "+sql);
}}};
async function readCatalog(path="/api/products"){
  const req=new Request("https://shop.example"+path);
  const res=await publicProductsGet({request:req,env});
  assert.equal(res.status,200);
  assert.equal(res.headers.get("Cache-Control"),"no-store","Browsers must not reuse stale catalog data");
  return res.json();
}
try{
  globalThis.caches={default:fakeCache};
  const hidden=await readCatalog();
  assert.equal(hidden[0].price,null);
  assert.equal(hidden[0].stock,null,"Public stock is not exposed");
  assert.equal(hidden[0].sku,"SD-SN-TEST");
  await readCatalog();
  assert.equal(catalogReads,1,"Repeated public catalog GETs should avoid full D1 scans within edge TTL");
  priceSetting="1";
  const shown=await readCatalog();
  assert.equal(shown[0].price,1234567,"Turning on public prices uses a separate safe edge key");
  assert.equal(catalogReads,2);
  priceSetting="0";
  const hiddenAgain=await readCatalog();
  assert.equal(hiddenAgain[0].price,null,"Turning off public prices cannot leak a previously cached amount");
  assert.equal(catalogReads,2);
  await readCatalog("/api/products?fulfillmentType=made_to_order");
  assert.equal(catalogReads,3,"Fulfillment filters need separate cache keys");
  const invalid=await publicProductsGet({request:new Request("https://shop.example/api/products?fulfillmentType=invalid"),env});
  assert.equal(invalid.status,400);
  assert.equal(catalogReads,3,"Invalid filters must not scan D1 or populate the cache");
  globalThis.caches={default:{match:async()=>{throw Error("cache offline")},put:fakeCache.put.bind(fakeCache)}};
  await readCatalog();
  assert.equal(catalogReads,4,"Cache outage must transparently fall back to live D1");

  // Pages waitUntil must decouple slow edge-cache writes from public JSON
  // delivery. The write remains tracked and contains only sanitized data.
  let finishCacheWrite;
  let startedCacheWrite=false;
  const pendingWrites=[];
  globalThis.caches={default:{
    async match(){return null},
    async put(key,body){
      startedCacheWrite=true;
      assert.match(body.headers.get("Cache-Control")||"",/max-age=15/);
      await new Promise(resolve=>{finishCacheWrite=resolve});
      const publicBody=await body.clone().json();
      assert.equal(publicBody[0].price,null,"Background cache must not reveal a hidden price");
    }
  }};
  const quickResponse=await Promise.race([
    publicProductsGet((()=>{
      const context={
        request:new Request("https://shop.example/api/products"),env,
        waitUntil(task){
          assert.equal(this,context,"Cloudflare waitUntil must retain its context receiver");
          pendingWrites.push(task);
        }
      };
      return context;
    })()),
    new Promise((_,reject)=>setTimeout(()=>reject(Error("Public response waited for edge cache put")),1200))
  ]);
  assert.equal(quickResponse.status,200);
  assert.equal(startedCacheWrite,true);
  assert.equal(pendingWrites.length,1,"waitUntil should track one cache write");
  assert.equal((await quickResponse.json())[0].price,null);
  assert.equal(typeof finishCacheWrite,"function","Cache write has started");
  finishCacheWrite();
  await Promise.all(pendingWrites);
}finally{
  if(priorCache===undefined)delete globalThis.caches;
  else globalThis.caches=priorCache;
}
console.log("PASS: short-lived public edge cache reduces D1 reads; price toggles and filter keys remain isolated.");

console.log('PASS: public price serialization hides unconfirmed or invalid amounts and preserves admin/internal values.');
