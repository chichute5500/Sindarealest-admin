import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { onRequest as storefront } from "../functions/_middleware.js";
import { PRODUCT_CATEGORY_ROUTE_SLUGS,productCategoryRouteSlug } from "../functions/_storefront-route.js";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const json=html.match(/<script id="sd-seo-category-copy" type="application\/json">([^<]*)<\/script>/);
assert.ok(json,"Keyword copy must be available in initial HTML without client JavaScript");
const profiles=JSON.parse(json[1]);
const slugs=[...new Set(Object.values(PRODUCT_CATEGORY_ROUTE_SLUGS))];
assert.equal(slugs.length,15,"15 official categories");
assert.equal(Object.keys(profiles).length,16,"15 category profiles plus all-products");
assert.deepEqual(Object.keys(profiles).sort(),["all",...slugs].sort(),"Only canonical category profiles");
const titles=new Set();
for(const slug of ["all",...slugs]){
  const p=profiles[slug];
  assert.ok(p,"Missing SEO category "+slug);
  for(const name of ["heading","title","description","intro"]){
    assert.ok(typeof p[name]==="string" && p[name].length>(name==="heading"?7:20),"Missing or empty "+name+" for "+slug);
    assert.ok(!/[<>]/.test(p[name]),"No raw HTML allowed in SEO copy");
  }
  assert.ok(p.title.endsWith("SinDarealest"),"Title must include brand");
  assert.ok(!titles.has(p.title),"Avoid duplicate titles: "+p.title);
  titles.add(p.title);
  assert.ok(p.description.length<210,"Keep meta description concise");
}
for(const slug of ["sneaker","giayluoi","giaytay","thatlung","dep","vinam","vicamtay","tuinu"]){
  assert.match(profiles[slug].title,/da cá sấu/i,"Commercial search term missing from "+slug);
}
assert.ok(html.includes('name="description" content="SinDarealest chuyên thời trang da cá sấu:'));
assert.ok(html.includes('<title>SinDarealest | Giày, ví, túi và thời trang da cá sấu</title>'));

const readBreadcrumbs = body => {
  const entries = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]))
    .filter(schema => schema["@type"] === "BreadcrumbList");
  assert.equal(entries.length, 1, "Exactly one BreadcrumbList per catalog/product page");
  return entries[0].itemListElement;
};
const origin="https://shop.example";
const fetchPage=async pathname=>{
  const response=await storefront({
    request:new Request(origin+pathname),
    env:{},
    next:async()=>new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}})
  });
  assert.equal(response.status,200,pathname);
  return await response.text();
};
for(const slug of ["sneaker","giaytay","vinam","thatlung","tuinu","mu"]){
  const p=profiles[slug],body=await fetchPage("/sanpham/"+slug);
  assert.ok(body.includes("<title>"+p.title+"</title>"),"Server title missing: "+slug);
  assert.ok(body.includes('name="description" content="'+p.description+'"'),"Server description missing: "+slug);
  assert.ok(body.includes('id="catalogHeading">'+p.heading+"</h2>"),"Server heading missing: "+slug);
  assert.ok(body.includes('id="catalogSeoNote">'+p.intro+"</p>"),"Server visible SEO introduction missing: "+slug);
  assert.ok(body.includes('rel="canonical" href="'+origin+"/sanpham/"+slug+'"'),"Wrong canonical");
  assert.equal((body.match(/<meta name="description"/g)||[]).length,1,"Description must not be duplicated");
  const crumbs=readBreadcrumbs(body);
  assert.deepEqual(crumbs.map(item=>item.position),[1,2,3]);
  assert.deepEqual(crumbs.map(item=>item.item),[origin+"/",origin+"/sanpham",origin+"/sanpham/"+slug]);
  assert.deepEqual(crumbs.map(item=>item.name),["Trang chủ","Tất cả sản phẩm",
    ({sneaker:"Giày thể thao",giaytay:"Giày tây",vinam:"Ví nam",thatlung:"Thắt lưng",tuinu:"Túi nữ",mu:"Mũ"})[slug]]);

}
const all=await fetchPage("/sanpham");
assert.ok(all.includes("<title>"+profiles.all.title+"</title>"));
assert.ok(all.includes('id="catalogSeoNote">'+profiles.all.intro+"</p>"));
assert.deepEqual(readBreadcrumbs(all).map(x=>x.item),[origin+"/",origin+"/sanpham"]);

const start=html.indexOf("function renderFilters(){");
const end=html.indexOf("\nfunction foldSearch(",start);
assert.ok(end>start);
const box={innerHTML:""},heading={textContent:""},note={textContent:""};
const ctx={
  products:[{category:"sneakers",categoryLabel:"Giày thể thao"},{category:"vi-nam",categoryLabel:"Ví nam"}],
  categoryOrder:["all","sneakers","vi-nam"],categoryLabels:{all:"Tất cả",sneakers:"Giày thể thao","vi-nam":"Ví nam"},
  selectedCategory:"sneakers",routeSlug:productCategoryRouteSlug,
  displayProductName:s=>String(s),escapeHtml:s=>String(s),
  document:{
    getElementById:id=>id==="sd-seo-category-copy"?{textContent:json[1]}:null,
    documentElement:{classList:{contains(){return false}}}
  },
  $:id=>id==="#categoryFilters"?box:id==="#catalogHeading"?heading:id==="#catalogSeoNote"?note:null
};
runInNewContext(html.slice(start,end)+"\nrenderFilters()",ctx,{timeout:1000});
assert.equal(heading.textContent,profiles.sneaker.heading,"SPA heading aligns with server SEO");
assert.equal(note.textContent,profiles.sneaker.intro,"SPA intro aligns with server SEO");
// Product pages keep real Admin metadata and only add a category phrase when
// the public product title/description lack it. Never invent offers or ratings.
const product={id:"product-1",slug:"san-pham-1",sku:"SD-SN321",sku_verified:1,
  title:"Giày mẫu SN321",description:"Mẫu thiết kế cá nhân",
  category:"sneakers",published:1,images_json:"[]"};
const productHtml=await storefront({
  request:new Request(origin+"/sanpham/sneaker/SD-SN321"),
  env:{DB:{prepare(){return {bind(){return {async first(){return product}}}}}}},
  next:async()=>new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}})
});
assert.equal(productHtml.status,200);
const productBody=await productHtml.text();
assert.ok(productBody.includes("<title>Giày mẫu SN321 – Giày thể thao da cá sấu | SinDarealest</title>"));
assert.ok(productBody.includes('content="Mẫu thiết kế cá nhân · SKU: SD-SN321 Khám phá Giày thể thao da cá sấu tại SinDarealest."'));
assert.ok(productBody.includes('rel="canonical" href="'+origin+"/sanpham/sneaker/SD-SN321"+'"'));
assert.deepEqual(readBreadcrumbs(productBody).map(x=>x.item),[
  origin+"/",origin+"/sanpham",origin+"/sanpham/sneaker",origin+"/sanpham/sneaker/SD-SN321"
]);
assert.deepEqual(readBreadcrumbs(productBody).map(x=>x.name),[
  "Trang chủ","Tất cả sản phẩm","Giày thể thao","Giày mẫu SN321"
]);

assert.ok(!productBody.includes('"@type":"Offer"'),"Do not invent verified prices");
assert.ok(!productBody.includes('"@type":"AggregateRating"'),"Do not invent reviews");
console.log("PASS: 15 unique keyword category profiles, canonical URLs and verified category/product BreadcrumbList hierarchies.");
