import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRODUCT_CATEGORY_ROUTE_SLUGS, productCategoryRouteSlug, isVerifiedCommercialSku, canonicalProductPath } from "../functions/_storefront-route.js";
import { onRequest as middleware } from "../functions/_middleware.js";
import { onRequestGet as publicProducts } from "../functions/api/products.js";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";
const front=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const map=front.match(/const productCategoryRouteSlugs=Object\.freeze\((\{[^;]*\})\);function routeSlug/);
assert.ok(map);
assert.deepEqual(PRODUCT_CATEGORY_ROUTE_SLUGS,JSON.parse(map[1]));
assert.equal(productCategoryRouteSlug("dress-shoes"),"giaytay");
const old={id:"internal-abc123",slug:"shoe-abc123",sku:"SD001",title:"Giày da cá sấu",description:"Mô tả",category:"dress-shoes",category_label:"Giày tây",images_json:'["images/demo.webp"]',published:1,price:500,stock:1,source_price_confirmed:1,updated_at:"2026-10-25 08:00:00"};
const verified={...old,sku:"REAL-001",sku_verified:1};
const missingFlagButLooksReal={...old,id:"older-human-sku-id",sku:"CUSTOM-HUMAN-SKU-919"};

assert.equal(isVerifiedCommercialSku(old),false,"missing 0008 must fail closed");
assert.equal(canonicalProductPath(old),"/sanpham/giaytay/internal-abc123");
assert.equal(canonicalProductPath(verified),"/sanpham/giaytay/REAL-001");
assert.equal(isVerifiedCommercialSku({...verified,sku_verified:0}),false);
assert.equal(isVerifiedCommercialSku({...verified,sku:"../bad"}),false);
const html='<html><head><title>Home</title></head><body>Content</body></html>';
function ctx(row,path) {
  return {request:new Request("https://shop.example"+path),
    env:{DB:{prepare(sql){assert.match(sql,/SELECT \* FROM products WHERE/);return {bind(...values){assert.equal(values.length,3);return {async first(){return row}}}}}}},
    next:async()=>new Response(html,{headers:{"Content-Type":"text/html"}})};
}
const legacy=await middleware(ctx(old,"/san-pham/SD001"));
assert.equal(legacy.status,301);
assert.equal(legacy.headers.get("Location"),"https://shop.example/sanpham/giaytay/internal-abc123");
const wrong=await middleware(ctx(old,"/sanpham/vida/internal-abc123"));
assert.equal(wrong.headers.get("Location"),"https://shop.example/sanpham/giaytay/internal-abc123");
// Product-detail deep URLs must not turn state-changing verbs into 200 HTML.
for (const method of ["POST","PUT","PATCH","DELETE"]) {
  const denied=await middleware({
    request:new Request("https://shop.example/sanpham/giaytay/internal-abc123",{method}),
    env:{DB:{prepare(){throw Error("Unsupported verb queried D1");}}},
    next:async()=>{throw Error("Unsupported verb fetched HTML");}
  });
  assert.equal(denied.status,405,method+" must fail closed");
  assert.equal(denied.headers.get("Allow"),"GET, HEAD");
  assert.equal(denied.headers.get("Cache-Control"),"no-store");
}
const correct=await middleware(ctx(old,"/sanpham/giaytay/internal-abc123"));
assert.equal(correct.status,200);
const seo=await correct.text();
assert.match(seo,/canonical" href="https:\/\/shop\.example\/sanpham\/giaytay\/internal-abc123"/);
assert.match(seo,/"@type":"WebPage"/,"Product detail without public offer/reviews uses truthful WebPage markup");
assert.doesNotMatch(seo,/"@type":"Product"/,"Never publish an incomplete rich-result Product");
assert.doesNotMatch(seo,/"offers"|aggregateRating|"review"/,
  "Do not invent pricing or customer ratings in structured data");
assert.doesNotMatch(seo,/"sku":"SD001"/);
assert.doesNotMatch(seo,/Mã sản phẩm: SD001/);
const verifiedResponse=await middleware(ctx(verified,"/sanpham/giaytay/REAL-001"));
assert.equal(verifiedResponse.status,200);
assert.match(await verifiedResponse.text(),/"sku":"REAL-001"/);
const verifiedLegacy=await middleware(ctx(verified,"/san-pham/real-001"));
assert.equal(verifiedLegacy.headers.get("Location"),"https://shop.example/sanpham/giaytay/REAL-001");
assert.equal((await middleware(ctx({...old,published:0},"/sanpham/giaytay/internal-abc123"))).status,404);
assert.equal((await middleware({...ctx(old,"/sanpham/giaytay/internal-abc123"),env:{}})).status,503);
const DB={prepare(sql){
  if(sql.includes("FROM settings"))return {bind(){return {async first(){return {value:"0"}}}}};
  assert.match(sql,/FROM products/);
  return {async all(){return {results:[old,verified]}}};
}};
const res=await publicProducts({env:{DB}});
assert.equal(res.status,200);
const items=await res.json();
assert.equal(items[0].sku,null);
assert.equal(items[0].skuVerified,false);
assert.equal(items[0].fulfillmentType,"unclassified");
assert.equal(items[0].price,null);
assert.equal(items[1].sku,"REAL-001");
const historicalDB={prepare(sql){
  if(sql.includes("FROM settings"))return {bind(){return {async first(){return {value:"0"}}}}};
  return {async all(){return {results:[missingFlagButLooksReal]}}};
}};
const historicalResponse=await publicProducts({request:new Request("https://shop.example/api/products"),env:{DB:historicalDB}});
assert.equal(historicalResponse.status,200);
const historicalProducts=await historicalResponse.json();
assert.equal(historicalProducts[0].sku,null,"No migration flag means public SKU must be hidden despite plausible human formatting");
assert.equal(historicalProducts[0].skuVerified,false);

assert.equal(items[1].skuVerified,true);
const listing=await sitemap({request:new Request("https://shop.example/sitemap.xml"),env:{DB}});
assert.equal(listing.status,200);
const xml=await listing.text();
assert.match(xml,/sanpham\/giaytay\/internal-abc123/);
assert.match(xml,/sanpham\/giaytay\/REAL-001/);
assert.doesNotMatch(xml,/san-pham\//);
const preview=await sitemap({request:new Request("https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/sitemap.xml"),env:{DB}});
assert.equal(preview.status,404);
assert.match(preview.headers.get("X-Robots-Tag"),/noindex/);
assert.ok(front.includes("p.skuVerified===true&&String(p.sku||'').trim()?(p.sku):(p.id||p.slug)"));
console.log("PASS: route parity, legacy redirects, metadata, optional migration, public SKU fail-closed and Preview sitemap.");
