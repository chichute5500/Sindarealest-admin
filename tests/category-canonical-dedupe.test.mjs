import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { validateProduct } from '../functions/_lib.js';
import { normalizeCatalogCategory } from '../functions/_catalog-sku.js';

assert.equal(normalizeCatalogCategory('Giày Thể Thao'),'sneakers');
assert.equal(normalizeCatalogCategory('giay-the-thao'),'sneakers');
assert.equal(normalizeCatalogCategory('wallets'),'vi-nam');
assert.equal(normalizeCatalogCategory('Ví da'),'vi-nam');

for(const value of ['Giày thể thao','giay-the-thao','Sneaker','sneakers']){
 const result=validateProduct({
  title:'Giày mới',sku:'SD-SN071',skuVerified:true,category:value,categoryLabel:'Giày Thể Thao',
  description:'',images:[],published:true,price:null,stock:null,fulfillmentType:'made_to_order'
 });
 assert.ok(!result.error,value+' '+result.error);
 assert.equal(result.value.category,'sneakers',value+' must persist canonical category');
 assert.equal(result.value.sku,'SD-SN071');
}
for(const value of ['Ví da','wallets','Ví nam','vi-nam']){
 const result=validateProduct({title:'Ví mới',sku:'SD-VN099',category:value,skuVerified:true,
 categoryLabel:'Ví nam',images:[],published:true,price:null,stock:null});
 assert.ok(!result.error,value+' '+result.error);
 assert.equal(result.value.category,'vi-nam',value+' must not persist legacy wallets');
}

const shop=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.match(shop,/const categoryOrder=\['all','sneakers'.*'vi-nam'/);
assert.doesNotMatch(shop,/const categoryOrder=[^\n]*'wallets'/);
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
 products:rows,selectedCategory:'giay-the-thao',categoryLabels:{all:'Tất cả',sneakers:'Giày Thể Thao','vi-nam':'Ví Nam',loafers:'Giày lười'},
 categoryOrder:['all','sneakers','vi-nam','loafers'],displayProductName:v=>String(v).replace(/\p{L}[\p{L}\p{M}\p{N}]*/gu,w=>w[0].toLocaleUpperCase('vi')+w.slice(1)),
 escapeHtml,$:selector=>selector==='#categoryFilters'?html:null
};
runInNewContext(shop.slice(filterStart,filterEnd)+'\nrenderFilters();',ctx,{timeout:1000});
assert.equal(ctx.selectedCategory,'sneakers');
assert.equal((html.innerHTML.match(/class="filter-pill/g)||[]).length,4,
 'One All + 3 canonical categories, not two separate sneaker/wallet filters');
assert.match(html.innerHTML,/data-category="sneakers"[^>]*>Giày Thể Thao · 3<\/button>/);
assert.match(html.innerHTML,/data-category="vi-nam"[^>]*>Ví Nam · 2<\/button>/);
assert.ok(!html.innerHTML.includes('data-category="giay-the-thao"'));
assert.ok(!html.innerHTML.includes('data-category="wallets"'));
assert.match(admin,/const SKU_CATEGORY_ALIASES=[^;]*'giay-the-thao':'sneakers'/);
assert.match(admin,/const official=Object\.entries\(DEFAULT_PRODUCT_LABELS\)/,
 'The picker uses fifteen canonical category labels, never the legacy wallets alias');
assert.match(admin,/const extras=\[\.\.\.new Set\(products\.map\(p=>skuCategory\(p.category\)\|\|p.category\)/,
 'Historical category labels are deduplicated by canonical category');
assert.match(admin,/Object\.keys\(CAT\)\.filter\(code=>code!=='wallets'\)/);
assert.ok(admin.includes('id="productCategoryGrid" class="product-category-grid"'));
assert.ok(!admin.includes('<datalist id="categoryOptions">'),
 'The 15-category selection table should replace the Android native datalist');
console.log('PASS: 15-canonical-category dedupe across API, Admin, storefront; aliases retain existing links.');
