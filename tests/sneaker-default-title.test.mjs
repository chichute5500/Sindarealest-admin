import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSession} from '../functions/_lib.js';
import {onRequestPost} from '../functions/api/admin/products.js';
import {defaultSneakerTitle} from '../functions/_catalog-sku.js';

assert.equal(defaultSneakerTitle('SD-SN001'),'Giày Thể Thao VIP Da Cá Sấu Mẫu #001');
assert.equal(defaultSneakerTitle('SD-SN025'),'Giày Thể Thao VIP Da Cá Sấu Mẫu #025');
assert.equal(defaultSneakerTitle('SD-SN1000'),'Giày Thể Thao VIP Da Cá Sấu Mẫu #1000');
assert.equal(defaultSneakerTitle('SD-GL025'),'');
assert.equal(defaultSneakerTitle('SD-SNnot-an-ordinal'),'');

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
   inserted.push({sku:insert.values[2],title:insert.values[4],description:insert.values[7]});
   skus.push(insert.values[2]);
   return statements.map(()=>({success:true,meta:{changes:1}}));
  }
 };
}
async function create(db,{category='sneakers',title='',autoSneakerTitle=false}={}){
 const request=new Request('https://qa.invalid/api/admin/products',{
  method:'POST',
  headers:{Cookie:cookie,Origin:'https://qa.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json'},
  body:JSON.stringify({category,categoryLabel:category,title,autoSneakerTitle,
   description:'Dữ liệu mô tả không được thay đổi',price:null,stock:null,published:false,images:[]})
 });
 const response=await onRequestPost({request,env:{DB:db,ADMIN_PASSWORD,SESSION_SECRET}});
 return {status:response.status,body:await response.json()};
}

let db=dbAdapter(['SD-SN024']);
let result=await create(db);
assert.equal(result.status,201);
assert.equal(result.body.product.sku,'SD-SN025');
assert.equal(result.body.product.title,'Giày Thể Thao VIP Da Cá Sấu Mẫu #025');
assert.equal(db.inserted[0].description,'Dữ liệu mô tả không được thay đổi');

db=dbAdapter(['SD-SN024'],true);
result=await create(db,{title:'Giày Thể Thao VIP Da Cá Sấu Mẫu #025',autoSneakerTitle:true});
assert.equal(result.status,201,'Concurrent SKU allocation must retry');
assert.equal(result.body.product.sku,'SD-SN026');
assert.equal(result.body.product.title,'Giày Thể Thao VIP Da Cá Sấu Mẫu #026');
assert.deepEqual(db.inserted.map(x=>x.title),['Giày Thể Thao VIP Da Cá Sấu Mẫu #026']);

db=dbAdapter(['SD-SN024']);
result=await create(db,{title:'Giày Thể Thao Da Cá Sấu Phối Màu Riêng'});
assert.equal(result.status,201);
assert.equal(result.body.product.title,'Giày Thể Thao Da Cá Sấu Phối Màu Riêng','Custom title must not be overwritten');

db=dbAdapter(['SD-GL002']);
result=await create(db,{category:'loafers',title:''});
assert.equal(result.status,400,'Non-sneaker categories still require a title');

const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.match(admin,/function syncDefaultSneakerTitle\(\)\{/);
assert.match(admin,/if\(editing\)return;/,'Never auto-rename existing products');
assert.match(admin,/skuCategory\(\$\('#pCategory'\)\.value\)==='sneakers'/);
assert.ok(admin.includes("input.value=generatedSneakerTitle"),'Show default visibly before save');
assert.ok(admin.includes("if(input.value.trim()&&!unchangedSuggestion)return"),'Preserve manually entered name');
assert.ok(admin.includes("generatedSneakerTitle=''"),'Manual edits disable suggested name');
assert.ok(admin.includes("autoSneakerTitle:!id&&skuCategory($('#pCategory').value)==='sneakers'"),'Request server-side numbering only for an untouched new-product suggestion');
assert.ok(admin.includes('if(!/^SD-SN\\d{3,6}$/.test(sku))return;'),'Browser must match digit suffix');
assert.equal(admin.split('</style>').length-1,1,'Keep Owner-approved Admin single stylesheet');
console.log('PASS: official SKU-derived sneaker naming #001+, race-safe numbering, manual names protected, new-product Admin prefill only.');
