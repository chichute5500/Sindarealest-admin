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
console.log("PASS: published Admin/D1 product categories stay distinct, safe and auto-updated.");
