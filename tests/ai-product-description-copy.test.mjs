import assert from 'node:assert/strict';
import { generateProductDescription, generateDescriptionPlan } from '../scripts/ai-product-description-copy.mjs';
const categories=['sneakers','loafers','dress-shoes','belts','sandals','watch-straps','phone-cases',
  'vi-nam','vi-cam-tay','cap-tab-laptop','clutch','mu','tui-deo-cheo','tui-golf','tui-nu'];
const fixtures=categories.map((category,index)=>({id:'p'+index,category,sku:'SD-'+String(index+10)+'001',
  title:'Sản phẩm da cá sấu '+category,description:'Mô tả cũ',published:1}));
const sample=generateDescriptionPlan(fixtures);
assert.equal(sample.length,15);
for(const item of sample){
 assert.ok(item.after.length>=420&&item.after.length<1800,item.sku+' '+item.after.length);
 assert.ok(item.after.includes(item.title),item.sku);
 assert.ok(item.after.includes('SinDarealest'));
 assert.ok(item.after.includes('\n\n'));
 assert.equal(item.before,'Mô tả cũ');
}
const sneakers=Array.from({length:68},(_,i)=>({id:'s'+i,sku:'SD-SN'+String(i+1).padStart(3,'0'),
 category:'sneakers',title:'Giày Thể Thao VIP Da Cá Sấu Mẫu #'+String(i+1).padStart(3,'0'),
 description:'',published:1}));
const sneakerPlan=generateDescriptionPlan(sneakers);
assert.equal(new Set(sneakerPlan.map(p=>p.after)).size,68);
assert.deepEqual(sneakers.map(s=>s.description),Array(68).fill(''));
assert.match(generateProductDescription({sku:'SD-TL001',title:'Thắt lưng da bụng cá sấu màu đen',
 category:'belts'}),/màu đen/i);
assert.throws(()=>generateDescriptionPlan([...fixtures,fixtures[0]]),/DUPLICATE_OR_UNPUBLISHED/);
assert.throws(()=>generateDescriptionPlan([{...fixtures[0],published:0}]),/DUPLICATE_OR_UNPUBLISHED/);
assert.throws(()=>generateProductDescription({...fixtures[0],category:'other'}),/UNSUPPORTED_PRODUCT_IDENTITY/);
console.log('AI_EDITORIAL_PLAN=PASS categories=15 sneaker_variations=68 sample_chars='+sample[0].after.length);
