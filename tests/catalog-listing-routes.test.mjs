import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script,runInNewContext } from 'node:vm';
import { onRequest as middleware } from '../functions/_middleware.js';
import { catalogListingPath,isKnownCatalogCategoryRoute,productCategoryRouteSlug } from '../functions/_storefront-route.js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';

const html='<html><head><title>Trang chủ</title><link rel="canonical" href="https://shop.example/"></head><body>Storefront</body></html>';
const fakeContext=path=>({
 request:new Request('https://shop.example'+path),
 env:{DB:{prepare(sql){return {async all(){return {results:[{category:'new-test-bag'}]}}}}}},
 next:async request=>{assert.equal(new URL(request.url).pathname,'/index.html');return new Response(html,{headers:{'Content-Type':'text/html'}})}
});
assert.equal(catalogListingPath(),'/sanpham');
assert.equal(catalogListingPath('dress-shoes'),'/sanpham/giaytay');
assert.equal(catalogListingPath('vi-cam-tay'),'/sanpham/vicamtay');
assert.equal(productCategoryRouteSlug('phone-cases'),'oplung');
assert.ok(isKnownCatalogCategoryRoute('giaytay'));
for(const [path,canonical] of [['/sanpham','/sanpham'],['/sanpham/giaytay','/sanpham/giaytay'],['/sanpham/vicamtay','/sanpham/vicamtay'],['/sanpham/new-test-bag','/sanpham/new-test-bag']]){
 const response=await middleware(fakeContext(path));
 assert.equal(response.status,200,path);
 const text=await response.text();
 assert.ok(text.includes('rel="canonical" href="https://shop.example'+canonical+'"'),path);
 assert.ok(text.includes('Storefront'),path);
}
for(const [path,canonical] of [['/sanpham/','/sanpham'],['/sanpham/GIAYTAY','/sanpham/giaytay'],['/sanpham/vida','/sanpham/vinam'],['/sanpham/giay-tay','/sanpham/giaytay']]){
 const response=await middleware(fakeContext(path));
 assert.equal(response.status,301,path);
 assert.equal(response.headers.get('location'),'https://shop.example'+canonical,path);
}
const unknown=await middleware(fakeContext('/sanpham/khong-ton-tai'));
assert.equal(unknown.status,404);
assert.equal(unknown.headers.get('X-Robots-Tag'),'noindex, nofollow');
const front=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert.ok(front.includes('href="/sanpham"'));
assert.ok(!front.includes('href="#products"'));
assert.match(front,/function navigateCatalog\(/);
assert.match(front,/function syncCatalogFromLocation\(/);
assert.match(front,/history\.replaceState\(history\.state\|\|\{\},'','\/sanpham'\)/);
assert.match(front,/sdDetailReturnUrl/);
assert.match(front,/navigateCatalog\(b\.dataset\.category\)/);
const helperStart=front.indexOf('function catalogCategoryFromLocation(){');
const helperEnd=front.indexOf("let selectedCategory='all';",helperStart);
const functions=front.slice(helperStart,helperEnd);
assert.ok(helperStart>0&&helperEnd>helperStart);
const sample=[
 {category:'dress-shoes'},
 {category:'vi-cam-tay'},
 {category:'sneakers'}
];
const state={
 location:{pathname:'/sanpham/giaytay',hash:''},
 products:sample,routeSlug:productCategoryRouteSlug,
 history:{calls:[],pushState(obj,title,path){this.calls.push(path);state.location.pathname=path}},
 selectedCategory:'all',page:2,
 renderFilters(){},renderCatalog(){},setActiveNav(){},$:()=>({scrollIntoView(){}}),
};
let ret=runInNewContext(functions+"\ncatalogCategoryFromLocation()",state);
assert.equal(ret,'dress-shoes');
state.location.pathname='/sanpham/vicamtay';ret=runInNewContext(functions+"\ncatalogCategoryFromLocation()",state);
assert.equal(ret,'vi-cam-tay');
state.location.pathname='/sanpham';ret=runInNewContext(functions+"\ncatalogCategoryFromLocation()",state);
assert.equal(ret,'all');
runInNewContext(functions+"\nnavigateCatalog('dress-shoes')",state);
assert.deepEqual(state.history.calls,['/sanpham/giaytay']);
const DB={prepare(){return {async all(){return {results:[
 {id:'1',category:'dress-shoes',sku:'SD-GT001',sku_verified:1,published:1},
 {id:'2',category:'vi-cam-tay',sku:'SD-VD001',sku_verified:1,published:1}
]}}}}};
const response=await sitemap({request:new Request('https://shop.example/sitemap.xml'),env:{DB}});
assert.equal(response.status,200);
const xml=await response.text();
for(const path of ['/sanpham</loc>','/sanpham/giaytay</loc>','/sanpham/vicamtay</loc>','/sanpham/giaytay/SD-GT001</loc>'])
 assert.ok(xml.includes(path),'Missing sitemap '+path);
console.log('PASS: catalog routes, category deep links, 301 legacy routes, menu links, history and SEO sitemap.');
