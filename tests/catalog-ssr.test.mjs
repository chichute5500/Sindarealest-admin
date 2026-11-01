import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderPublicCatalog} from "../functions/_catalog-ssr.js";
import {onRequest as middleware} from "../functions/_middleware.js";
const origin="https://shop.example";
const shell='<html><head><title>SinDarealest</title></head><body><div class="featured-grid" id="featuredGrid"></div><div class="catalog-grid" id="catalogGrid"></div></body></html>';
const row={id:"shoe-1",slug:"shoe-1",sku:"SD-SN001",sku_verified:1,title:'Giày VIP <img src=x onerror=alert(1)>',category:"sneakers",images_json:'["images/test-image.webp","https://evil.example/track.png"]',fulfillment_type:"made_to_order"};
const rows=Array.from({length:8},(_,i)=>({...row,id:"shoe-"+(i+1),slug:"shoe-"+(i+1)}));
let statements=[];
const DB={prepare(sql){statements.push(sql);return {
 bind(...args){return {all:async()=>({results:args.includes("sneakers")?rows:[]})}},
 all:async()=>({results:rows})
}}};
const full=await renderPublicCatalog(shell,{DB},origin,{home:true});
assert.ok(full.includes('id="featuredGrid"><article'),'Home featured visible in raw HTML');
assert.ok(full.includes('id="catalogGrid"><article'),'Catalog visible with JS disabled');
assert.ok(full.includes('class="product-card-footer" aria-hidden="true"'),'SSR must reserve the same product-card footer height before catalog hydration');
assert.ok(full.includes('class="product-card-bottom"'),'SSR footer must follow hydrated product-card layout');
assert.ok(full.includes('class="photo-shade"'),'SSR photo should share hydrated image overlay geometry');
assert.match(full,/id="catalogGrid"><article[^]*?loading="lazy"/,
  "Homepage catalog below the fold must not eagerly fetch product photographs");

assert.ok(!full.includes('data-add='),'SSR placeholder cannot pretend a cart button works without hydrated product data');
assert.ok(full.includes('"@type":"ItemList"'),'JSON-LD includes real product URLs');
assert.ok(full.includes('images/test-image.webp'));
assert.ok(!full.includes('https://evil.example'),'No remote image host may be injected');
assert.ok(!full.includes('<img src=x onerror=alert(1)>'),'Untrusted title is escaped');
assert.ok(!full.includes('SD-PRIVATE'),'Never include private/unverified details');
assert.ok(!full.includes('"price"'),'Never expose unverified price');
assert.ok(statements.every(sql=>sql.startsWith("SELECT ")&&sql.includes("LIMIT 8")),'SSR must use bounded read-only SQL');
const category=await renderPublicCatalog(shell,{DB},origin,{categorySlug:"sneaker"});
assert.ok(category.includes('id="catalogGrid"><article'));
assert.match(category,/id="catalogGrid"><article[^]*?loading="eager"/,
  "Direct catalog entry should eagerly load the first visible product image");
const priority=[...category.matchAll(/<img src="[^"]+" alt="[^"]+" width="480" height="440" loading="(eager|lazy)" fetchpriority="(high|low)" decoding="async">/g)];
assert.equal(priority.length,8,"The bounded catalog has eight accessible SSR image elements");
assert.deepEqual(priority.map(x=>x[2]),["high","high","low","low","low","low","low","low"],
  "Only the above-the-fold first mobile row should compete at high image priority");
assert.equal(priority[0][1],"eager");assert.equal(priority[1][1],"eager");
assert.ok(priority.slice(2).every(x=>x[1]==="lazy"),"Offscreen SSR images preserve native lazy behavior");

assert.ok(category.includes('id="featuredGrid"></div>'),'Category route must not populate hidden home sections');
assert.equal(await renderPublicCatalog(shell,{DB},origin,{categorySlug:"not-a-category"}),shell);
assert.equal(await renderPublicCatalog(shell,{},origin,{home:true}),shell);
assert.equal(await renderPublicCatalog(shell,{DB:{prepare(){throw Error("DB offline")}}},origin,{home:true}),shell);
const ctx={
 request:new Request(origin+"/sanpham"),
 env:{DB},
 next:async()=>new Response(shell,{headers:{"Content-Type":"text/html"}})
};
const response=await middleware(ctx);
assert.equal(response.status,200);
assert.ok((await response.text()).includes('id="catalogGrid"><article'),'Middleware must compose SSR into catalog');
// Protect the initial catalog hydration path against double render and
// lost first-viewport SSR image nodes. Browser-level Lighthouse remains the
// authority for LCP/CLS; these tests lock the source-level regression.
const storefront=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert.match(storefront,/const initialCatalogListing=catalogCategoryFromLocation\(\)!==null;/);
assert.match(storefront,/if\(!initialCatalogListing\)\{renderFeatured\(\);renderFilters\(\);renderCatalog\(\)\}/);
assert.match(storefront,/const ssrCards=grid\.querySelectorAll\('article\[data-ssr-product\]'\)/);
assert.match(storefront,/grid\.replaceChildren\(template\.content\)/);
assert.match(storefront,/if\(!active&&products\.length&&featured&&!featured\.querySelector\('\[data-featured-card\]'\)\)renderFeatured\(\)/);
// Offscreen Home material artwork must not load/rotate on direct /sanpham.
assert.match(storefront,/function initArtSlideshowWhenVisible\(\)/);
assert.match(storefront,/artSlideObserver\.observe\(slide\)/);
assert.ok(storefront.includes('bindReveal(document);initArtSlideshowWhenVisible();'),
  'Home slideshow still starts only after products are hydrated');
const apiStart=storefront.indexOf("await fetch('/api/products'");
const initStart=storefront.indexOf('async function init()');
assert.ok(initStart>=0&&apiStart>initStart);
assert.ok(storefront.slice(initStart,apiStart).includes('setupNavSpy();'),
  'Mobile section navigation starts before product API resolves');
assert.match(storefront,/if\(!active\)initArtSlideshowWhenVisible\(\)/);
assert.match(storefront,/document\.documentElement\.classList\.contains\('sd-catalog-route'\)\)return;const rect=/);
// SQL and hydrated list must use the same deterministic tiebreak for
// products created in the same batch. This prevents LCP-image replacement.
assert.ok(storefront.includes("eager&&idx<2?'high':'low'"),"Hydration keeps first two image requests high priority");
assert.match(storefront,/const dateOrder=timestamp\(b\)\.localeCompare\(timestamp\(a\)\)/);
assert.match(storefront,/return left<right\?1:left>right\?-1:0;/);
console.log("PASS: bounded catalog SSR, escaping, no-JS, no D1 writes, route middleware integration.");
