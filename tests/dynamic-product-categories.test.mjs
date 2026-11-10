import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { productCategoryRouteSlug } from "../functions/_storefront-route.js";

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
const categoryNameStart=html.indexOf('function displayProductName(');
const categoryNameEnd=html.indexOf('\nfunction preferred(',categoryNameStart);
assert.ok(categoryNameStart>0&&categoryNameEnd>categoryNameStart);
const productNameDisplay=runInNewContext(html.slice(categoryNameStart,categoryNameEnd)+'\ndisplayProductName',{}, {timeout:1000});
const ctx={
 displayProductName:productNameDisplay,
 products:rows,
 categoryLabels:{all:"Tất cả",sneakers:"Sneaker",loafers:"Giày lười",belts:"Thắt lưng","vi-nam-nu":"Ví Nam & Nữ","tui-thoi-trang-golf":"Túi Thời Trang & Golf","tui-xach":"Túi Xách"},
 categoryOrder:["all","sneakers","loafers","dress-shoes","belts","vi-nam-nu","sandals","watch-straps","phone-cases","cap-tab-laptop","tui-thoi-trang-golf","mu","tui-xach"],
 canonicalCategoryKey:value=>({wallets:"vi-nam-nu","vi-nam":"vi-nam-nu","vi-cam-tay":"vi-nam-nu",clutch:"tui-thoi-trang-golf","tui-deo-cheo":"tui-thoi-trang-golf","tui-golf":"tui-thoi-trang-golf","tui-nu":"tui-xach"}[String(value||"").toLowerCase()]||String(value||"").toLowerCase()),
 selectedCategory:"missing-from-new-upload",
 escapeHtml,routeSlug:productCategoryRouteSlug,
 $:selector=>selector==="#categoryFilters"?box:null,
};
runInNewContext(source+"\nrenderFilters();",ctx,{timeout:1000});
assert.equal(ctx.selectedCategory,"all","Stale selection resets when catalog changes");
for(const c of ["sneakers","loafers","belts","tui-thoi-trang-golf","tui-xach","cap-tab-laptop","mu","vi-nam-nu"])
 assert.ok(box.innerHTML.includes('data-category="'+c+'"'),"Missing category: "+c);
assert.match(box.innerHTML,/Túi Thời Trang &amp; Golf · 4/,"Legacy bag category counts combined");
assert.equal((box.innerHTML.match(/class="filter-pill/g)||[]).length,11,"One all filter, nine published groups and the stock quick filter");
assert.match(box.innerHTML,/data-stock-filter[^>]*aria-pressed="false"/,"Quick stock filter exposes its state");
assert.ok(!box.innerHTML.includes("<img src=x"),"Untrusted category labels must be escaped");
assert.ok(box.innerHTML.toLowerCase().includes("&lt;img src=x onerror=alert(1)&gt;"));
ctx.selectedCategory="vi-cam-tay";
runInNewContext(source+"\nrenderFilters();",ctx,{timeout:1000});
assert.ok(box.innerHTML.includes('class="filter-pill tap-target active" href="/sanpham/vinamnu" data-category="vi-nam-nu" aria-current="page"'),"Wallet category has its canonical link and page semantics");
assert.match(box.innerHTML,/<a class="filter-pill tap-target" href="\/sanpham\/sneaker" data-category="sneakers"/,"Sneaker category is crawlable");
assert.ok(!/data-category="[^"]+"[^>]*aria-pressed=/.test(box.innerHTML),"Category links use aria-current, not button-only aria-pressed");
ctx.products=[{category:"new-2027",categoryLabel:"Loại mới"}];
runInNewContext(source+"\nrenderFilters();",ctx,{timeout:1000});
assert.equal(ctx.selectedCategory,"all","Stale filter selection resets");
assert.match(box.innerHTML,/data-category="new-2027"/,"Future categories need no code change");
assert.ok(!box.innerHTML.includes("tui-golf"),"Stale categories must be removed");

// The requested footwear, belt and phone-case categories lead All, while the
// remaining products keep their newest-first order and session order stays stable.
const sampleCatalog=[
 ...Array.from({length:12},(_,i)=>({id:'sn-'+i,category:'sneakers',title:'Giày thể thao '+i})),
 ...Array.from({length:4},(_,i)=>({id:'lo-'+i,category:'loafers',title:'Giày lười '+i})),
 {id:'gt-1',category:'dress-shoes',title:'Giày tây'},
 {id:'tl-1',category:'belts',title:'Thắt lưng'},
 {id:'op-1',category:'phone-cases',title:'Ốp điện thoại'},
 {id:'vi-1',category:'vi-nam',title:'Ví nam'},
 {id:'mu-1',category:'mu',title:'Mũ'}
];
sampleCatalog.forEach((p,i)=>{p.createdAt=new Date(Date.UTC(2026,9,1+i)).toISOString()});
const shuffleStart=html.indexOf("let selectedCategory='all';");
const shuffleEnd=html.indexOf("\nconst fulfillmentLabels=",shuffleStart);
const filterStart=html.indexOf("function getFiltered(){");
const filterEnd=html.indexOf("\nfunction renderCatalog(",filterStart);
const featuredStart=html.indexOf("function renderFeatured(){");
const featuredEnd=html.indexOf("\nfunction changeFeaturedImage(",featuredStart);
assert.ok(shuffleStart>=0&&shuffleEnd>shuffleStart&&filterStart>=0&&filterEnd>filterStart&&featuredStart>=0&&featuredEnd>featuredStart);
const snippets=html.slice(shuffleStart,shuffleEnd)+"\n"+html.slice(filterStart,filterEnd)+"\n"+html.slice(featuredStart,featuredEnd);
const featuredBox={innerHTML:''},searchBox={value:''};
const deterministicMath=Object.create(Math);deterministicMath.random=()=>0;
const productCtx={
 products:sampleCatalog,categoryOrder:ctx.categoryOrder,canonicalCategoryKey:ctx.canonicalCategoryKey,routeSlug:productCategoryRouteSlug,
 $:s=>s==='#catalogSearch'?searchBox:s==='#featuredGrid'?featuredBox:null,
 visibleSku:p=>p.sku||'',foldSearch:v=>String(v||'').toLocaleLowerCase('vi'),
 unbindReveal(){},bindReveal(){},setupFeaturedAutoplay(){},
 featuredProductCard:p=>'<article data-featured-card data-product="'+p.id+'"></article>',
 Math:deterministicMath
};
const result=runInNewContext(snippets+`
const first=getFiltered().map(p=>p.id);
const second=getFiltered().map(p=>p.id);
renderFeatured();
({first,second,filtered:getFiltered().map(p=>p.id),randomized:orderedSessionProducts().map(p=>p.id)})
`,productCtx,{timeout:1000});
assert.equal(result.first.join('|'),result.second.join('|'),'Paging and rerendering must keep order stable within session');
assert.equal(result.first.length,sampleCatalog.length);
assert.equal(JSON.stringify(result.first.slice(0,4)),JSON.stringify(['sn-11','gt-1','tl-1','op-1']),'All starts with the newest sneaker, dress shoe, belt and phone case');
assert.notEqual(result.randomized.join('|'),sampleCatalog.map(p=>p.id).join('|'),
 'Shuffle must genuinely randomize order rather than retain raw D1 order');
assert.equal((featuredBox.innerHTML.match(/data-featured-card/g)||[]).length,4,
 'Featured section must have exactly four real products');
const featuredIds=[...featuredBox.innerHTML.matchAll(/data-product="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(featuredIds).size,4,'Featured picks must be distinct');
assert.equal(new Set(featuredIds.map(id=>sampleCatalog.find(p=>p.id===id).category)).size,4,
 'Four featured slots should use different categories when available');
const filterSource=snippets;
const categoryResult=runInNewContext(filterSource+`
selectedCategory='sneakers';
getFiltered().map(p=>p.id)
`,{...productCtx}, {timeout:1000});
assert.equal(categoryResult.length,12);
assert.ok(categoryResult.every(id=>id.startsWith('sn-')));
assert.ok(html.includes('<span class="product-price">Giá: <strong class="product-price-amount">'),'Plain price text on cards');
assert.ok(html.includes("$('#detailPrice').textContent=detailPrice?'Giá: '+detailPrice:'';"),'Plain price text in details');
assert.ok(!html.includes('id="detailCategory"'),'Detail category removed');
assert.ok(html.includes('class="detail-meta-row"'),'SKU/status on one row');
assert.ok(!html.includes("detail?'Tình trạng: ':'"),'Status has no prefix');
assert.ok(html.includes('#productOverlay .detail-copy #detailTitle{font-weight:700'),'Bold product detail title');
assert.ok(html.includes('.product-card .product-title{font-weight:700}'),'Bold catalog product title');
assert.ok(html.includes('::before{content:none;display:none}'),'No decorative price box');
const nameBegin=html.indexOf('function displayProductName('),nameEnd=html.indexOf('\nfunction preferred(',nameBegin);
assert.ok(nameBegin>0&&nameEnd>nameBegin);
for(const [input,expected] of [['giày tây','Giày Tây'],['giày lười','Giày Lười'],['ví cầm tay','Ví Cầm Tay'],['mũ vip gù 6 đinh da cá sấu','Mũ Vip Gù 6 Đinh Da Cá Sấu']]){
 const actual=runInNewContext(html.slice(nameBegin,nameEnd)+'\ndisplayProductName('+JSON.stringify(input)+')',{}, {timeout:1000});
 assert.equal(actual,expected);
}
const statusBegin=html.indexOf('const fulfillmentLabels='),statusEnd=html.indexOf('\nfunction renderFilters(',statusBegin);
assert.ok(statusBegin>0&&statusEnd>statusBegin);
for(const [key,label] of [['in_stock','Có sẵn'],['made_to_order','Hàng đặt riêng'],['unclassified','Cần xác nhận']]){
 const actual=runInNewContext(html.slice(statusBegin,statusEnd)+'\nfulfillmentBadge({fulfillmentType:'+JSON.stringify(key)+'},true)',{escapeHtml},{timeout:1000});
 assert.ok(actual.includes('>'+label+'</span>'));
 assert.ok(!actual.includes('Tình trạng:'));
}
console.log('PASS: newest-first catalog, stable pagination, four varied featured products and price styling.');

// Owner-approved detail purchase layout, identical glass recipes for blue and orange.
const detailStart=html.indexOf('<div class="detail-copy">');
const detailFinish=html.indexOf('</div></div></div></div>',detailStart);
assert.ok(detailStart>=0&&detailFinish>detailStart);
const detail=html.slice(detailStart,detailFinish);
assert.ok(detail.indexOf('id="detailPrice"')<detail.indexOf('id="detailVariants"'));
assert.ok(detail.indexOf('id="detailVariants"')<detail.indexOf('id="detailAdd"'));
assert.ok(detail.indexOf('id="detailAdd"')<detail.indexOf('id="detailBuyNow"'));
assert.ok(detail.indexOf('id="detailBuyNow"')<detail.indexOf('class="sd-detail-pledges"'));
assert.ok(detail.indexOf('class="sd-detail-pledges"')<detail.indexOf('id="detailZalo"'));
assert.equal((detail.match(/class="sd-detail-pledge"/g)||[]).length,3,'three customer-facing material and warranty cards');
assert.ok(!detail.includes('id="detailDescription"')&&!detail.includes('class="promise-tags"'),'remove only the redundant description and four chips');
assert.match(detail, /id="detailAdd"[^>]*>[\s\S]*?<svg/);
assert.match(detail, /id="detailBuyNow"[^>]*>[\s\S]*?<svg/);
assert.equal((detail.match(/class="pill-btn primary detail-purchase-button/g)||[]).length,2);
assert.match(html,/\.detail-buy-now\{--sd-action-rgb:242,152,70;--sd-action-border-rgb:215,119,47\}/);
assert.match(html,/--sd-action-rgb:126,177,215/);
assert.match(html,/linear-gradient\(145deg,rgba\(232,247,255,\.48\),rgba\(var\(--sd-action-rgb\),\.3024\)\)/,"Blue and orange CTAs retain matching one-pass 3D face and separate functional color tokens.");
assert.match(html,/#productOverlay \.detail-purchase-button/,"Purchase controls preserve their live selectors.");
assert.match(html,/#productOverlay \.detail-purchase-button,/,"Purchase controls participate in masked shared prismatic refraction.");
assert.match(html,/#productOverlay \.detail-actions \.detail-purchase-button:active\{/,"Purchase controls must still offer the tactile active state.");
assert.ok(html.includes("$('#detailBuyNow').addEventListener('click'"));
assert.ok(html.includes("const option=selectedDetailOption(product),sizeOption=selectedDetailSize(product),imageVariant=selectedDetailImage(product)"),"Buy now must require the product-specific selection");
assert.ok(html.includes("if(missing){sdDetailGuideToRequiredSelection(missing);return}")&&html.includes("if(option===null||sizeOption===null||imageVariant===null)return;if(sdCheckoutQuote?.quoteReady===true&&!detailPaymentChoice){sdDetailGuideToPaymentChoice();return}"),"Priced Buy now guides missing selections and requires an explicit payment choice");
assert.ok(html.includes("openCheckout({items:[{id,option,sizeOption,imageVariant,quantity:1}],paymentChoice:detailPaymentChoice})"),"Buy now submits the selected product, size, image, and payment option");
assert.ok(!detail.includes('id="detailZalo"')||detail.indexOf('id="detailZalo"')>detail.indexOf('id="detailBuyNow"'));
assert.match(html,/border:1px solid rgba\(205,167,93,\.60\)/);
assert.match(html,/background:linear-gradient\(135deg,rgba\(255,252,236,\.82\),rgba\(244,214,148,\.44\)\)/);
