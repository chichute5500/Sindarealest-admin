/**
 * Merge-compatibility guard for main's 31f395a Product D1 category hotfix.
 * Runs against the OWNER-PASS integration implementation, without rewriting it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

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
 categoryOrder:["all","sneakers","loafers","dress-shoes","belts","wallets","sandals","watch-straps","phone-cases"],
 categoryLabels:{all:"Tất cả",sneakers:"Sneaker"},
 displayProductName,escapeHtml,selectedCategory:"stale-from-import",
 $:selector=>selector==="#categoryFilters"?container:null
};
function render(){runInNewContext(html.slice(start,end)+"\nrenderFilters();",ctx,{timeout:1000})}
render();
assert.equal(ctx.selectedCategory,"all","The old selected category must reset after D1 import");
for(const c of ["sneakers","tui-golf","clutch","vi-nam","vi-cam-tay","mu"])assert.ok(container.innerHTML.includes('data-category="'+c+'"'),"D1 hotfix category missing: "+c);
assert.ok(container.innerHTML.includes("Túi Golf · 2"),"Existing D1 category counts preserved with Owner-approved capitalization");
assert.equal((container.innerHTML.match(/class="filter-pill/g)||[]).length,8,"Every distinct imported category plus All stays visible");
assert.ok(!container.innerHTML.includes("<img src=x"),"Untrusted D1 labels cannot inject markup");
assert.ok(container.innerHTML.includes("&lt;img src=x onerror=alert(1)&gt;"),"Escaped untrusted category labels remain readable");
ctx.selectedCategory="tui-golf";render();
assert.ok(container.innerHTML.includes('data-category="tui-golf" aria-pressed="true"'),"Dynamic D1 category remains selectable");
ctx.products=[{category:"imported-after-merge",categoryLabel:"Danh mục tương lai"}];render();
assert.equal(ctx.selectedCategory,"all","Subsequent D1 import removes stale selection");
assert.ok(container.innerHTML.includes('data-category="imported-after-merge"'),"Future imported categories appear without source edits");
assert.ok(!container.innerHTML.includes('data-category="tui-golf"'),"Old D1 categories disappear after import");
console.log("PASS: main 31f395a dynamic D1 category hotfix remains compatible with Owner-PASS integrated Storefront.");
