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
}
const all=await fetchPage("/sanpham");
assert.ok(all.includes("<title>"+profiles.all.title+"</title>"));
assert.ok(all.includes('id="catalogSeoNote">'+profiles.all.intro+"</p>"));

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
console.log("PASS: 15 unique keyword category profiles, direct SSR tags, visible copy, SPA hydration and canonical URLs.");
