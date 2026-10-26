import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const start=html.indexOf("function renderFilters(){");
const end=html.indexOf("\nfunction foldSearch(",start);
assert.ok(start>=0&&end>start,"Dynamic catalog category renderer must exist");
const source=html.slice(start,end);
const box={innerHTML:""};
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rows=[
 {category:"sneakers",categoryLabel:"Giày thể thao"},
 {category:"loafers",categoryLabel:"Giày lười"},
 {category:"belts",categoryLabel:"Thắt lưng"},
 {category:"tui-golf",categoryLabel:"Túi golf"},
 {category:"tui-golf",categoryLabel:"Túi golf"},
 {category:"tui-deo-cheo",categoryLabel:"Túi đeo chéo"},
 {category:"tui-nu",categoryLabel:"Túi nữ"},
 {category:"cap-tab-laptop",categoryLabel:"Cặp-tab-laptop"},
 {category:"clutch",categoryLabel:"Clutch"},
 {category:"mu",categoryLabel:"Mũ"},
 {category:"vi-nam",categoryLabel:"Ví nam"},
 {category:"vi-cam-tay",categoryLabel:"Ví cầm tay"},
 {category:"bags-x",categoryLabel:'<img src=x onerror=alert(1)>'}
];
const ctx={
 products:rows,
 categoryLabels:{all:"Tất cả",sneakers:"Sneaker",loafers:"Giày lười",belts:"Thắt lưng"},
 categoryOrder:["all","sneakers","loafers","dress-shoes","belts","wallets","sandals","watch-straps","phone-cases"],
 selectedCategory:"missing-from-new-upload",
 escapeHtml,
 $:selector=>selector==="#categoryFilters"?box:null,
};
runInNewContext(source+"\nrenderFilters();",ctx,{timeout:1000});
assert.equal(ctx.selectedCategory,"all","Stale selection resets when catalog changes");
for(const c of ["sneakers","loafers","belts","tui-golf","tui-deo-cheo","tui-nu","cap-tab-laptop","clutch","mu","vi-nam","vi-cam-tay"])
 assert.ok(box.innerHTML.includes('data-category="'+c+'"'),"Missing category: "+c);
assert.match(box.innerHTML,/Túi golf · 2/,"Category count accurate");
assert.equal((box.innerHTML.match(/class="filter-pill/g)||[]).length,13,"One all filter plus twelve distinct published groups");
assert.ok(!box.innerHTML.includes("<img src=x"),"Untrusted category labels must be escaped");
assert.ok(box.innerHTML.includes("&lt;img src=x onerror=alert(1)&gt;"));
ctx.selectedCategory="vi-cam-tay";
runInNewContext(source+"\nrenderFilters();",ctx,{timeout:1000});
assert.ok(box.innerHTML.includes('class="filter-pill tap-target active" data-category="vi-cam-tay" aria-pressed="true"'),"Wallet categories stay distinct");
ctx.products=[{category:"new-2027",categoryLabel:"Loại mới"}];
runInNewContext(source+"\nrenderFilters();",ctx,{timeout:1000});
assert.equal(ctx.selectedCategory,"all","Stale filter selection resets");
assert.match(box.innerHTML,/data-category="new-2027"/,"Future categories need no code change");
assert.ok(!box.innerHTML.includes("tui-golf"),"Stale categories must be removed");

// The newly uploaded catalog may have no legacy "wallets" category. The
// owner-approved featured grid must still contain four distinct real products.
const featuredStart=html.indexOf("function renderFeatured(){");
const featuredEnd=html.indexOf("\nfunction changeFeaturedImage(",featuredStart);
assert.ok(featuredStart>=0&&featuredEnd>featuredStart);
const sampleCatalog=[
 ...Array.from({length:12},(_,i)=>({id:"s-"+i,category:"sneakers",title:"Giày "+i})),
 {id:"l-1",category:"loafers",title:"Giày lười"},
 {id:"b-1",category:"belts",title:"Thắt lưng"},
 {id:"v-1",category:"vi-nam",title:"Ví nam"},
 {id:"v-2",category:"vi-cam-tay",title:"Ví cầm tay"},
 {id:"g-1",category:"tui-golf",title:"Túi golf"},
 {id:"cl-1",category:"clutch",title:"Clutch"},
 {id:"mu-1",category:"mu",title:"Mũ"},
 {id:"dep-1",category:"sandals",title:"Dép"}
];
const featuredBox={innerHTML:""};
const featuredCtx={
 products:sampleCatalog,
 $:selector=>selector==="#featuredGrid"?featuredBox:null,
 preferredGallery:category=>sampleCatalog.find(p=>p.category===category),
 unbindReveal(){},bindReveal(){},setupFeaturedAutoplay(){},
 featuredProductCard:p=>'<article data-featured-card data-product="'+p.id+'"></article>'
};
runInNewContext(html.slice(featuredStart,featuredEnd)+"\nrenderFeatured();",featuredCtx,{timeout:1000});
assert.equal((featuredBox.innerHTML.match(/data-featured-card/g)||[]).length,4,
 "Featured grid must restore four distinct slots when the old wallets category is absent");
assert.match(featuredBox.innerHTML,/data-product="v-1"/,
 "New wallet category should fill the missing legacy featured slot");
assert.equal(new Set([...featuredBox.innerHTML.matchAll(/data-product="([^"]+)"/g)].map(x=>x[1])).size,4,
 "Featured cards must be unique");

// The All tab must show different categories on its first page instead of the
// leading batch of sneakers; individual category tabs still preserve their data.
const filterStart=html.indexOf("function getFiltered(){");
const filterEnd=html.indexOf("\nfunction renderCatalog(",filterStart);
assert.ok(filterStart>=0&&filterEnd>filterStart);
const catalogCtx={
 products:sampleCatalog,categoryOrder:ctx.categoryOrder,selectedCategory:"all",
 $:selector=>selector==="#catalogSearch"?{value:""}:null,
 visibleSku:p=>p.sku||"",
 foldSearch:value=>String(value||"").toLocaleLowerCase("vi")
};
const filterSource=html.slice(filterStart,filterEnd);
const mixed=runInNewContext(filterSource+"\ngetFiltered();",catalogCtx,{timeout:1000});
assert.equal(mixed.length,sampleCatalog.length,"All tab must retain every published product");
assert.equal(new Set(mixed.slice(0,8).map(p=>p.category)).size,8,
 "First All-products page must show eight different categories, not eight sneakers");
catalogCtx.selectedCategory="sneakers";
const sneakerOnly=runInNewContext(filterSource+"\ngetFiltered();",catalogCtx,{timeout:1000});
assert.equal(sneakerOnly.length,12,"Choosing sneakers must still show only sneakers");
assert.ok(sneakerOnly.every(p=>p.category==="sneakers"));

console.log("PASS: published Admin/D1 product categories stay distinct, safe and auto-updated.");
