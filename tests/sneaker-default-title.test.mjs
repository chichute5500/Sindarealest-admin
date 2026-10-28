import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSession,slugify} from '../functions/_lib.js';
import {onRequestPost} from '../functions/api/admin/products.js';
import {DEFAULT_PRODUCT_CATEGORY_NAMES,OFFICIAL_SKU_PREFIXES,defaultProductTitle} from '../functions/_catalog-sku.js';

assert.equal(Object.keys(DEFAULT_PRODUCT_CATEGORY_NAMES).length,15);
assert.deepEqual(Object.keys(DEFAULT_PRODUCT_CATEGORY_NAMES).sort(),Object.keys(OFFICIAL_SKU_PREFIXES).sort());
assert.equal(defaultProductTitle('Giày thể thao','SD-SN001'),'Giày Thể Thao VIP Da Cá Sấu Mẫu #001');
assert.equal(defaultProductTitle('loafers','SD-GL025'),'Giày Lười VIP Da Cá Sấu Mẫu #025');
assert.equal(defaultProductTitle('tui-nu','SD-TN1000'),'Túi Nữ VIP Da Cá Sấu Mẫu #1000');
for(const [category,prefix] of Object.entries(OFFICIAL_SKU_PREFIXES)){
 assert.equal(defaultProductTitle(category,prefix+'001'),DEFAULT_PRODUCT_CATEGORY_NAMES[category]+' VIP Da Cá Sấu Mẫu #001');
 assert.equal(defaultProductTitle(category,prefix+'025'),DEFAULT_PRODUCT_CATEGORY_NAMES[category]+' VIP Da Cá Sấu Mẫu #025');
 assert.equal(defaultProductTitle(category,'SD-UN025'),'','Incorrect-category SKU must not be used');
}
assert.equal(defaultProductTitle('unsupported','SD-SN001'),'');
assert.equal(defaultProductTitle('sneakers','SD-SNabc'),'');
assert.equal(defaultProductTitle('sneakers','SD-SN000'),'');

const ADMIN_PASSWORD='fake-admin-password-long-enough';
const SESSION_SECRET='fake-local-session-secret-long-enough-2026';
const cookie='sd_admin_session='+await createSession(SESSION_SECRET);
function dbAdapter(initialSkus=[],raceOnce=false) {
 const skus=[...initialSkus],inserted=[];
 let attempts=0;
 return {
  inserted,skus,
  prepare(sql){
   const stmt={sql,values:[],bind(...values){this.values=values;return this}};
   stmt.all=async()=>({results:skus.map(sku=>({sku}))});
   return stmt;
  },
  async batch(statements){
   attempts++;
   const insert=statements.find(stmt=>stmt.sql.startsWith('INSERT INTO products'));
   assert.ok(insert,'Product insert must be present');
   if(raceOnce&&attempts===1){skus.push('SD-SN025');throw Error('UNIQUE constraint failed: products.sku')}
   inserted.push({sku:insert.values[2],title:insert.values[4],slug:insert.values[1],description:insert.values[7],price:insert.values[8]});
   skus.push(insert.values[2]);
   return statements.map(()=>({success:true,meta:{changes:1}}));
  }
 };
}
async function create(db,{category='sneakers',title='',price=null}={}){
 const request=new Request('https://qa.invalid/api/admin/products',{
  method:'POST',
  headers:{Cookie:cookie,Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},
  body:JSON.stringify({category,categoryLabel:category,title,
   description:'Dữ liệu mô tả không được thay đổi',price,stock:null,published:false,images:[]})
 });
 const response=await onRequestPost({request,env:{DB:db,ADMIN_PASSWORD,SESSION_SECRET}});
 return {status:response.status,body:await response.json()};
}

for(const [category,prefix] of Object.entries(OFFICIAL_SKU_PREFIXES)){
 const db=dbAdapter([prefix+'024']);
 const result=await create(db,{category});
 assert.equal(result.status,201,category+' should save with a blank name');
 assert.equal(result.body.product.sku,prefix+'025');
 assert.equal(result.body.product.title,DEFAULT_PRODUCT_CATEGORY_NAMES[category]+' VIP Da Cá Sấu Mẫu #025');
 assert.equal(db.inserted[0].description,'Dữ liệu mô tả không được thay đổi');
}

let db=dbAdapter(['SD-SN024'],true);
let result=await create(db,{title:''});
assert.equal(result.status,201,'Concurrent SKU allocation must retry');
assert.equal(result.body.product.sku,'SD-SN026');
assert.equal(result.body.product.title,'Giày Thể Thao VIP Da Cá Sấu Mẫu #026');
assert.ok(result.body.product.slug.includes('mau-026'), 'Slug must track newly allocated default name');
assert.equal(db.inserted.length,1,'One product only after conflict');

db=dbAdapter(['SD-SN024']);
result=await create(db,{title:'Giày Thể Thao Phối Màu Theo Yêu Cầu'});
assert.equal(result.status,201);
assert.equal(result.body.product.title,'Giày Thể Thao Phối Màu Theo Yêu Cầu');
assert.equal(result.body.product.price,null,'Do not invent price');

db=dbAdapter(['SD-GL024']);
result=await create(db,{category:'loafers',title:'Giày Lười Da Cá Sấu Riêng'});
assert.equal(result.status,201);
assert.equal(result.body.product.title,'Giày Lười Da Cá Sấu Riêng','Custom names work on non-sneaker categories');

const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.match(admin,/function syncDefaultProductTitle\(\)\{/);
assert.match(admin,/if\(isNewOfficial\)\{/,'Only new official category products get a placeholder');
assert.match(admin,/input\.required=!isNewOfficial/);
assert.match(admin,/input\.placeholder=DEFAULT_PRODUCT_LABELS\[key\]\+' VIP Da Cá Sấu Mẫu #'\+suffix/);
assert.ok(!admin.includes("input.value=generatedSneakerTitle"),'Never prefill title as a real value');
assert.ok(!admin.includes('autoSneakerTitle:'),'Do not override a custom title by client flag');
assert.ok(admin.includes("title:$('#pTitle').value.trim(),category:"),'Submit blank name; server determines final title');
assert.ok(admin.includes('if(/^SD-SN\\d{3,6}$/.test(sku))')===false,'Remove sneaker-only default logic');
assert.equal(admin.split('</style>').length-1,1,'Keep Owner-approved single stylesheet');
console.log('PASS: all 15 categories have grey-only default title, custom names protected, server SKU numbering and concurrent retry align.');
