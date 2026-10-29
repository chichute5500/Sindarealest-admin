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
// Category names and headings must be visible even before JS fetches products.
const actualInitialHtml=html.replace(
  '<title>Trang chủ</title>',
  '<title>Trang chủ</title>'
).replace('</body>','<h2 class="section-title" id="catalogHeading">Tất cả sản phẩm</h2></body>');
const actualContext=()=>({
 ...fakeContext('/sanpham/sneaker'),
 next:async()=>new Response(actualInitialHtml,{headers:{'Content-Type':'text/html'}})
});
const sneakerHTML=await (await middleware(actualContext())).text();
assert.ok(sneakerHTML.includes('Giày thể thao (Sneaker) | SinDarealest'));
assert.ok(sneakerHTML.includes('id="catalogHeading">Giày thể thao (Sneaker)</h2>'));
const unknown=await middleware(fakeContext('/sanpham/khong-ton-tai'));
assert.equal(unknown.status,404);
assert.equal(unknown.headers.get('X-Robots-Tag'),'noindex, nofollow');
const front=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const verificationTag='<meta name="google-site-verification" content="6GC_01bvUrkBiD79vdoKU9wJ3A5PGNdqibCT_FkgG7o">';
assert.ok(front.includes(verificationTag),'Google Search Console URL-prefix verification meta tag must remain on storefront');
assert.equal(front.split('name="google-site-verification"').length-1,1,'Verification tag must appear exactly once');
assert.ok(front.indexOf(verificationTag)>front.indexOf('<head>')&&front.indexOf(verificationTag)<front.indexOf('</head>'),
  'Google verification tag must be inside head for Googlebot');

assert.ok(front.includes('href="/sanpham"'));
// Cards have real crawlable links, while normal clicks still open the SPA
// overlay. Modified clicks must retain browser-native new-tab behavior.
assert.ok(front.includes('function productHref(p){'));
assert.ok(front.includes('<a class="product-open" href="${href}" data-open-product='));
assert.ok(front.includes('<a class="product-open featured-open" href="${href}" data-open-product='));
assert.ok(front.includes('<a class="featured-title product-title" href="${href}" data-open-product='));
assert.ok(front.includes('if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault()'));
const seoHrefSource=front.slice(front.indexOf('function productHref(p){'),front.indexOf('\nfunction productCard('));
const hrefContext={routeSlug:productCategoryRouteSlug,encodeURIComponent};
assert.equal(runInNewContext(seoHrefSource+"\nproductHref({id:'uuid-1',category:'dress-shoes',skuVerified:false})",hrefContext),'/sanpham/giaytay/uuid-1');
assert.equal(runInNewContext(seoHrefSource+"\nproductHref({id:'uuid-1',category:'sneakers',sku:'SD-SN001',skuVerified:true})",hrefContext),'/sanpham/sneaker/SD-SN001');

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
assert.ok(front.includes("id=\"catalogHeading\""),'Category heading must be visible on screen');
assert.ok(front.includes("routeSlug(p.category)+' '+(p.description||'')"),'Search index must include route category slugs');
assert.ok(front.includes("$('#searchJump').addEventListener('click',()=>{navigateCatalog('all')"),'Header search must route to the all-products search');
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
// Search matches both a URL slug and the category key, even when the product
// title/description contain no English keyword.
const searchStart=front.indexOf('function getFiltered(){');
const searchEnd=front.indexOf('\nfunction renderCatalog(){',searchStart);
const source=front.slice(searchStart,searchEnd);
const cases=[
 ['sneaker','sneakers',true],['giaytay','dress-shoes',true],
 ['tuideocheo','tui-deo-cheo',true],['khong-ton-tai','sneakers',false]
];
for(const [term,category,shouldMatch] of cases) {
 const context={
   selectedCategory:'all',orderedSessionProducts:()=>[{
      id:'sample-1',category,title:'Sản phẩm cá sấu',description:'Đẹp',categoryLabel:'Phụ kiện',
      createdAt:'2026-10-27 01:00:00'
   }],$:(x)=>x==='#catalogSearch'?{value:term}:null,
   foldSearch:v=>String(v||'').toLowerCase(),visibleSku:()=>'',routeSlug:productCategoryRouteSlug
 };
  const matched=runInNewContext(source+"\ngetFiltered().map(p=>p.id)",context);
 assert.equal(matched.length,shouldMatch?1:0,term);
}
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
