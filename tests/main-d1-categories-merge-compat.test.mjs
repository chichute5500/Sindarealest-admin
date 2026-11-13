/**
 * Merge-compatibility guard for main's 31f395a Product D1 category hotfix.
 * Runs against the OWNER-PASS integration implementation, without rewriting it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { productCategoryRouteSlug } from "../functions/_storefront-route.js";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const start=html.indexOf("function renderFilters(){");
const end=html.indexOf("\nfunction foldSearch(",start);
assert.ok(start>=0 && end>start,"The integrated category renderer must exist");
const categoryStart=html.indexOf("function displayProductName(");
const categoryEnd=html.indexOf("\nfunction preferred(",categoryStart);
assert.ok(categoryStart>=0 && categoryEnd>categoryStart,"Owner-approved category capitalization helper must exist");
const displayProductName=runInNewContext(html.slice(categoryStart,categoryEnd)+"\ndisplayProductName",{}, {timeout:1000});
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const container={innerHTML:""};
const ctx={
 products:[
  {category:"sneakers",categoryLabel:"Giày thể thao"},
  {category:"tui-golf",categoryLabel:"Túi golf"},
  {category:"tui-golf",categoryLabel:"Túi golf"},
  {category:"clutch",categoryLabel:"Clutch"},
  {category:"vi-nam",categoryLabel:"Ví nam"},
  {category:"vi-cam-tay",categoryLabel:"Ví cầm tay"},
  {category:"mu",categoryLabel:"Mũ"},
  {category:"bags-x",categoryLabel:'<img src=x onerror=alert(1)>'}
 ],
 categoryOrder:["all","sneakers","loafers","dress-shoes","belts","vi-nam-nu","tui-thoi-trang-golf","sandals","watch-straps","phone-cases"],
 categoryAliases:{wallets:"vi-nam-nu","vi-nam":"vi-nam-nu","vi-cam-tay":"vi-nam-nu",clutch:"tui-thoi-trang-golf","tui-deo-cheo":"tui-thoi-trang-golf","tui-golf":"tui-thoi-trang-golf","tui-nu":"tui-xach"},canonicalCategoryKey:value=>({wallets:"vi-nam-nu","vi-nam":"vi-nam-nu","vi-cam-tay":"vi-nam-nu",clutch:"tui-thoi-trang-golf","tui-deo-cheo":"tui-thoi-trang-golf","tui-golf":"tui-thoi-trang-golf","tui-nu":"tui-xach"}[value]||value),
 categoryLabels:{all:"Tất cả",sneakers:"Sneaker","vi-nam-nu":"Ví Nam & Nữ","tui-thoi-trang-golf":"Túi Thời Trang & Golf","tui-xach":"Túi Xách"},
 displayProductName,escapeHtml,routeSlug:productCategoryRouteSlug,selectedCategory:"stale-from-import",
 sdUpdateCatalogBreadcrumbs(){},sdUpdateCategorySeoBlock(){},sdUpdateCatalogMetadata(){},
 document:{documentElement:{classList:{contains:()=>false}}},
 $:selector=>selector==="#categoryFilters"?container:null
};
function render(){runInNewContext(html.slice(start,end)+"\nrenderFilters();",ctx,{timeout:1000})}
render();
assert.equal(ctx.selectedCategory,"all","The old selected category must reset after D1 import");
for(const c of ["sneakers","tui-thoi-trang-golf","vi-nam-nu","mu"])assert.ok(container.innerHTML.includes('data-category="'+c+'"'),"Merged D1 category missing: "+c);
assert.ok(container.innerHTML.includes("Túi Thời Trang &amp; Golf · 3"),"Legacy bag categories count together");
assert.ok(container.innerHTML.includes("Ví Nam &amp; Nữ · 2"),"Legacy wallet categories count together");
assert.equal((container.innerHTML.match(/class="filter-pill/g)||[]).length,7,"Merged categories and remaining D1 groups plus All stay visible, with quick stock filter");
assert.ok(!container.innerHTML.includes("<img src=x"),"Untrusted D1 labels cannot inject markup");
assert.ok(container.innerHTML.toLowerCase().includes("&lt;img src=x onerror=alert(1)&gt;"),"Escaped untrusted category labels remain readable, regardless of owner-approved title case");
ctx.selectedCategory="tui-thoi-trang-golf";render();
assert.ok(container.innerHTML.includes('href="/sanpham/tuithoitrang-golf" data-category="tui-thoi-trang-golf" aria-current="page"'),"Merged D1 bag category remains linkable and selectable");
ctx.products=[{category:"imported-after-merge",categoryLabel:"Danh mục tương lai"}];render();
assert.equal(ctx.selectedCategory,"all","Subsequent D1 import removes stale selection");
assert.ok(container.innerHTML.includes('data-category="imported-after-merge"'),"Future imported categories appear without source edits");
assert.ok(!container.innerHTML.includes('data-category="tui-thoi-trang-golf"'),"Old merged D1 category disappears after import");
console.log("PASS: main 31f395a dynamic D1 category hotfix remains compatible with Owner-PASS integrated Storefront.");
