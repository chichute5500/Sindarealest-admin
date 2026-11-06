import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { validateProduct } from '../functions/_lib.js';
import { normalizeCatalogCategory } from '../functions/_catalog-sku.js';
import { productCategoryRouteSlug } from '../functions/_storefront-route.js';

assert.equal(normalizeCatalogCategory('Giày Thể Thao'),'sneakers');
assert.equal(normalizeCatalogCategory('giay-the-thao'),'sneakers');
assert.equal(normalizeCatalogCategory('wallets'),'vi-nam-nu');
assert.equal(normalizeCatalogCategory('Ví da'),'vi-nam-nu');
for(const value of ['Ví nam','Ví cầm tay','vi-nam','vi-cam-tay'])assert.equal(normalizeCatalogCategory(value),'vi-nam-nu');
for(const value of ['Clutch','Túi golf','Túi đeo chéo'])assert.equal(normalizeCatalogCategory(value),'tui-thoi-trang-golf');
assert.equal(normalizeCatalogCategory('Túi nữ'),'tui-xach');

for(const value of ['Giày thể thao','giay-the-thao','Sneaker','sneakers']){
 const result=validateProduct({
  title:'Giày mới',sku:'SD-SN071',skuVerified:true,category:value,categoryLabel:'Giày Thể Thao',
  description:'',images:[],published:true,price:null,stock:null,fulfillmentType:'made_to_order'
 });
 assert.ok(!result.error,value+' '+result.error);
 assert.equal(result.value.category,'sneakers',value+' must persist canonical category');
 assert.equal(result.value.sku,'SD-SN071');
}
for(const value of ['Ví da','wallets','Ví nam','Ví cầm tay','vi-nam','vi-cam-tay']){
 const result=validateProduct({title:'Ví mới',sku:'SD-VI099',category:value,skuVerified:true,
 categoryLabel:'Ví nam & nữ',images:[],published:true,price:null,stock:null});
 assert.ok(!result.error,value+' '+result.error);
 assert.equal(result.value.category,'vi-nam-nu',value+' must persist the merged wallet category');
}

const shop=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.match(shop,/const categoryOrder=\['all','sneakers'.*'vi-nam-nu'/);
assert.doesNotMatch(shop,/const categoryOrder=[^\n]*'wallets'/);
const canonicalCategoryKey=value=>({'wallets':'vi-nam-nu','vi-nam':'vi-nam-nu','vi-cam-tay':'vi-nam-nu','giay-the-thao':'sneakers'}[String(value).toLowerCase()]||String(value).toLowerCase());
const filterStart=shop.indexOf('function renderFilters(){'),filterEnd=shop.indexOf('\nfunction foldSearch(',filterStart);
assert.ok(filterStart>=0&&filterEnd>filterStart);
const html={innerHTML:''};
const rows=[
 {category:'sneakers',categoryLabel:'Giày thể thao'},
 {category:'giay-the-thao',categoryLabel:'Giày thể thao'},
 {category:'giay-the-thao',categoryLabel:'Giày thể thao'},
 {category:'wallets',categoryLabel:'Ví nam'},
 {category:'vi-nam',categoryLabel:'Ví nam'},
 {category:'loafers',categoryLabel:'Giày lười'}
];
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ctx={
 products:rows,selectedCategory:'giay-the-thao',categoryLabels:{all:'Tất cả',sneakers:'Giày Thể Thao','vi-nam-nu':'Ví Nam & Nữ',loafers:'Giày lười'},
 categoryOrder:['all','sneakers','vi-nam-nu','loafers'],canonicalCategoryKey,displayProductName:v=>String(v).replace(/\p{L}[\p{L}\p{M}\p{N}]*/gu,w=>w[0].toLocaleUpperCase('vi')+w.slice(1)),
 escapeHtml,routeSlug:productCategoryRouteSlug,$:selector=>selector==='#categoryFilters'?html:null
};
runInNewContext(shop.slice(filterStart,filterEnd)+'\nrenderFilters();',ctx,{timeout:1000});
assert.equal(ctx.selectedCategory,'sneakers');
assert.equal((html.innerHTML.match(/class="filter-pill/g)||[]).length,4,
 'One All + 3 canonical categories, not two separate sneaker/wallet filters');
assert.match(html.innerHTML,/<a class="filter-pill tap-target active" href="\/sanpham\/sneaker" data-category="sneakers"[^>]*>Giày Thể Thao · 3<\/a>/);
assert.match(html.innerHTML,/data-category="vi-nam-nu"[^>]*>Ví Nam &amp; Nữ · 2<\/a>/);
assert.ok(!html.innerHTML.includes('data-category="giay-the-thao"'));
assert.ok(!html.innerHTML.includes('data-category="wallets"'));
assert.match(admin,/const SKU_CATEGORY_ALIASES=[^;]*'giay-the-thao':'sneakers'/);
assert.match(admin,/const official=Object\.entries\(DEFAULT_PRODUCT_LABELS\)/,
 'The picker uses twelve canonical category labels, never the legacy wallets alias');
assert.match(admin,/const extras=\[\.\.\.new Set\(products\.map\(p=>skuCategory\(p.category\)\|\|p.category\)/,
 'Historical category labels are deduplicated by canonical category');
assert.match(admin,/const DEFAULT_PRODUCT_LABELS=\{/);
assert.match(admin,/vi-nam-nu':'Ví nam & nữ/);
assert.ok(admin.includes('id="productCategoryGrid" class="product-category-grid"'));
assert.ok(!admin.includes('<datalist id="categoryOptions">'),
 'The 12-category selection table should replace the Android native datalist');
console.log('PASS: 12-group category dedupe across API, Admin, storefront; aliases retain existing links.');
