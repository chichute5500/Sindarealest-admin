import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {onRequest as middleware} from '../functions/_middleware.js';
import {PRODUCT_CATEGORY_ROUTE_SLUGS,productCategoryRouteSlug} from '../functions/_storefront-route.js';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const match=html.match(/<script id="sd-not-found-route-init">([\s\S]*?)<\/script>/);
assert.ok(match,"The page's initial 404 guard must exist");
const guard=match[1];
// The browser runs this synchronous guard before data fetch, so it must
// recognize direct category/listing/deep links; unit testing server HTML alone
// would miss the regression visible to customers.
function runGuard(path){
 const classes=new Set();
 runInNewContext(guard,{
  location:{pathname:path},
  document:{body:{classList:{add(c){classes.add(c)},contains(c){return classes.has(c)}}}}
 });
 return classes.has('sd-not-found-route');
}
const validRoutes=[
 '/', '/index.html', '/sanpham', '/sanpham/',
 ...Object.values(PRODUCT_CATEGORY_ROUTE_SLUGS).map(slug=>'/sanpham/'+slug),
 '/sanpham/mu/','/sanpham/sneaker','/sanpham/giaytay',
 '/sanpham/mu/SD-MU001','/sanpham/giaytay/SD-GT001',
 '/san-pham/123abc','/sanpham/future-category'
];
for(const path of new Set(validRoutes))assert.equal(runGuard(path),false,'Direct browser visit incorrectly displays 404: '+path);
const invalidRoutes=['/abc-no-such-page','/sanpham/mu/more/extra','/sanpham//extra','/unknown/products'];
for(const path of invalidRoutes)assert.equal(runGuard(path),true,'Unknown route must remain 404: '+path);

// Assert the real Cloudflare Pages middleware handles the same paths.
const fakeContext=path=>({
 request:new Request('https://shop.example'+path),
 env:{DB:{prepare(){return {async all(){return {results:[{category:'future-category'}]}}}}}},
 next:async req=>{
  assert.equal(new URL(req.url).pathname,'/index.html',path);
  return new Response('<html><head><title>Home</title></head><body>App</body></html>',
   {headers:{'Content-Type':'text/html; charset=utf-8'}});
 }
});
for(const path of ['/sanpham','/sanpham/mu','/sanpham/sneaker','/sanpham/giaytay','/sanpham/future-category']){
 const r=await middleware(fakeContext(path));
 assert.equal(r.status,200,'Cloudflare direct load failed: '+path);
 assert.ok((await r.text()).includes('App'),path);
}
// Returning from an unrelated/unknown history entry must clear the 404 CSS.
const start=html.indexOf('function catalogCategoryFromLocation(){');
const end=html.indexOf("let selectedCategory='all';",start);
assert.ok(start>=0&&end>start,'Catalog routing functions missing');
const classes=new Set(['sd-not-found-route']);
let hidden=false;let filters=0,catalog=0,active='';
const state={
 location:{pathname:'/sanpham/mu',hash:''},
 products:[{category:'mu'}],
 routeSlug:productCategoryRouteSlug,
 document:{body:{classList:{remove(c){classes.delete(c)}}},querySelector(){return {
  set hidden(v){hidden=v},
  get hidden(){return hidden}
 }}},
 selectedCategory:'all',page:2,
 renderFilters(){filters++},renderCatalog(){catalog++},setActiveNav(v){active=v},
 $:()=>({scrollIntoView(){}})
};
const success=runInNewContext(html.slice(start,end)+'\nsyncCatalogFromLocation()',state);
assert.equal(success,true);
assert.equal(classes.has('sd-not-found-route'),false);
assert.equal(hidden,true);
assert.equal(state.selectedCategory,'mu');
assert.equal(state.page,1);
assert.equal(active,'products');
assert.equal(filters,1);
assert.equal(catalog,1);
console.log('PASS: all 15 catalog direct links render without fake client-side 404; product paths, real missing pages, server routes and history recovery protected.');
