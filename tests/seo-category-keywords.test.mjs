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
assert.equal(slugs.length,12,"12 consolidated category routes");
assert.equal(Object.keys(profiles).length,13,"12 category profiles plus all-products");
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
for(const slug of ["sneaker","giayluoi","giaytay","thatlung","dep","vinamnu","tuixach"]){
  assert.match(profiles[slug].title,/da cá sấu/i,"Commercial search term missing from "+slug);
}
assert.ok(html.includes('name="description" content="SinDarealest chuyên thời trang da cá sấu:'));
assert.ok(html.includes('<title>SinDarealest | Giày, ví, túi và thời trang da cá sấu</title>'));
assert.ok(html.includes('<h1 id="detailTitle"></h1>'),"Product modal has a semantic H1");
assert.ok(html.includes('.detail-copy #detailTitle{font:'),"H1 preserves product title typography");
assert.ok(!html.includes('.detail-copy h2{'),"No obsolete H2-only product title styling");

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
for(const slug of ["sneaker","giaytay","vinamnu","thatlung","tuixach","mu"]){
  const p=profiles[slug],body=await fetchPage("/sanpham/"+slug);
  assert.ok(body.includes("<title>"+p.title+"</title>"),"Server title missing: "+slug);
  assert.ok(body.includes('name="description" content="'+p.description+'"'),"Server description missing: "+slug);
  assert.ok(body.includes('id="catalogHeading">'+p.heading+"</h1>"),"Server H1 missing: "+slug);
  assert.ok(body.includes('<h2 class="sdh-title" id="sdh-title">'),"Home hero must not be H1 on catalog route");
  assert.ok(body.includes('id="catalogSeoNote">'+p.intro+"</p>"),"Server visible SEO introduction missing: "+slug);
  assert.ok(body.includes('rel="canonical" href="'+origin+"/sanpham/"+slug+'"'),"Wrong canonical");
  assert.equal((body.match(/<meta name="description"/g)||[]).length,1,"Description must not be duplicated");
  const crumbs=readBreadcrumbs(body);
  assert.deepEqual(crumbs.map(item=>item.position),[1,2,3]);
  assert.deepEqual(crumbs.map(item=>item.item),[origin+"/",origin+"/sanpham",origin+"/sanpham/"+slug]);
  assert.deepEqual(crumbs.map(item=>item.name),["Trang chủ","Tất cả sản phẩm",
    ({sneaker:"Giày thể thao (Sneaker)",giaytay:"Giày tây",vinamnu:"Ví nam & nữ",thatlung:"Thắt lưng",tuixach:"Túi xách",mu:"Mũ"})[slug]]);

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
  canonicalCategoryKey:value=>({sneakers:"sneakers","vi-nam":"vi-nam-nu"}[value]||value),
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
assert.match(productBody,/<title>Giày mẫu SN321[^<]*SinDarealest<\/title>/);
assert.ok(productBody.includes('Mẫu thiết kế cá nhân'));
assert.ok(productBody.includes('rel="canonical" href="'+origin+"/sanpham/sneaker/SD-SN321"+'"'));
assert.ok(productBody.includes('<h1 id="detailTitle">Giày mẫu SN321</h1>'),"Direct product title must be H1 in the initial HTML");
assert.ok(productBody.includes('<h2 class="sdh-title" id="sdh-title">'),"Home hero must not be H1 on product route");
assert.deepEqual(readBreadcrumbs(productBody).map(x=>x.item),[
  origin+"/",origin+"/sanpham",origin+"/sanpham/sneaker",origin+"/sanpham/sneaker/SD-SN321"
]);
assert.deepEqual(readBreadcrumbs(productBody).map(x=>x.name),[
  "Trang chủ","Tất cả sản phẩm","Giày thể thao","Giày mẫu SN321"
]);

assert.ok(!productBody.includes('"@type":"Offer"'),"Do not invent verified prices");
assert.ok(!productBody.includes('"@type":"AggregateRating"'),"Do not invent reviews");

// The seller operates online only. Use the supported channel availability
// value without claiming that inventory is physically in stock. Refer to the
// published organization-level shipping policy; do not flatten conditional
// free shipping into a universal zero-rate offer or invent transit days.
const pricedProduct={...product,price:1230000,source_price_confirmed:1};
const pricedProductResponse=await storefront({
  request:new Request(origin+"/sanpham/sneaker/SD-SN321"),
  env:{DB:{prepare(){return {bind(){return {async first(){return pricedProduct}}}}}}},
  next:async()=>new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}})
});
assert.equal(pricedProductResponse.status,200);
const pricedProductBody=await pricedProductResponse.text();
const productSchemas=[...pricedProductBody.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match=>JSON.parse(match[1]));
const pricedSchema=productSchemas.find(schema=>schema["@type"]==="Product");
assert.equal(pricedSchema?.offers?.availability,"https://schema.org/OnlineOnly",
  "Offers must state the verified online-only purchase channel");
assert.equal(pricedSchema?.offers?.seller?.["@id"],origin+"/#business");
assert.deepEqual(pricedSchema?.offers?.shippingDetails,{
  "@type":"OfferShippingDetails",
  hasShippingService:{"@id":origin+"/terms-of-service#shipping-policy"}
},"Product Offer must reference the public shipping policy without fabricating cost or transit time");
assert.ok(!Object.hasOwn(pricedSchema.offers,"hasMerchantReturnPolicy"),
  "Do not map warranty terms to a return policy");
const terms=readFileSync(new URL("../public/terms-of-service.html",import.meta.url),"utf8");
assert.ok(terms.includes("thanh toán toàn bộ được giảm 5% và miễn phí giao hàng"));
assert.ok(terms.includes("đặt cọc áp dụng phí giao hàng tiêu chuẩn, được xác nhận theo từng đơn hàng"));
const shippingPolicy=[...terms.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match=>JSON.parse(match[1])).find(schema=>schema["@type"]==="Organization")
  ?.hasShippingService;
assert.equal(shippingPolicy?.["@id"],"#shipping-policy");
assert.equal(shippingPolicy?.shippingConditions?.shippingDestination?.addressCountry,"VN");
assert.match(shippingPolicy?.description||"",/thanh toán toàn bộ.*miễn phí giao hàng/i);
assert.ok(!Object.hasOwn(shippingPolicy?.shippingConditions||{},"shippingRate"),
  "Do not invent a standard shipping charge or misrepresent conditional free shipping");
assert.ok(!Object.hasOwn(shippingPolicy?.shippingConditions||{},"transitTime"),
  "Do not treat production time as carrier transit time");

// Pagination is crawlable without JavaScript: after eight cards a native
// category link leads to eight more published products via distinct URL.
const makeCatalogProduct = n => ({
  id:"product-"+n,slug:"sku-"+n,sku:"SD-SN"+String(n).padStart(3,"0"),
  sku_verified:1,title:"Giày mẫu "+n,category:"sneakers",
  published:1,images_json:"[]",fulfillment_type:"in_stock"
});
const fakeRows=Array.from({length:17},(_,i)=>makeCatalogProduct(i+1));
const pageQueries=[];
const catalogDb={prepare(sql){
  pageQueries.push(sql);
  const query={bind(){return query},async all(){
    const off=Number(sql.match(/OFFSET (\d+)/)?.[1]||0);
    return {results:fakeRows.slice(off,off+9)};
  }};
  return query;
}};
const pageHtml=await storefront({
  request:new Request(origin+"/sanpham/sneaker?page=2"),
  env:{DB:catalogDb},
  next:async()=>new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}})
});
assert.equal(pageHtml.status,200);
const pageText=await pageHtml.text();
assert.ok(pageQueries.some(q=>q.includes("LIMIT 9 OFFSET 8")),"Crawlable page 2 must query the second product group");
assert.ok(pageText.includes('href="/sanpham/sneaker?page=3"'),"Next page link is a native href");
assert.ok(pageText.includes('href="/sanpham/sneaker"'),"Previous page 1 has a native href");
assert.ok(pageText.includes('/sanpham/sneaker/SD-SN009'),"Page 2 contains item nine");
assert.ok(!pageText.includes('href="/sanpham/sneaker/SD-SN001"'),"Page 2 does not repeat page 1 item");
assert.ok(pageText.includes('rel="canonical" href="'+origin+'/sanpham/sneaker?page=2"'),"Page 2 canonical is unique");
assert.ok(pageText.includes("Trang 2"),"Page 2 has distinct title");
assert.deepEqual(readBreadcrumbs(pageText).map(x=>x.item),[
  origin+"/",origin+"/sanpham",origin+"/sanpham/sneaker"
]);
assert.ok(html.includes("href=\"\${pageHref(n)}\""),"Hydrated pagination maintains real anchor links");
assert.ok(html.includes("const pageMatch=String(location.search||'').match("),"SPA respects direct page URL without requiring browser-only test globals");
const rejectInvalid=await storefront({
  request:new Request(origin+"/sanpham/sneaker?page=999"),
  env:{DB:catalogDb},
  next:async()=>new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8"}})
});
assert.equal(rejectInvalid.status,404,"Out-of-bounds page URLs must not create crawl traps");

console.log("PASS: 12 consolidated category profiles, canonical URLs and verified category/product BreadcrumbList hierarchies.");
