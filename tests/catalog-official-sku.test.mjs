import assert from 'node:assert/strict';
import { OFFICIAL_SKU_PREFIXES,officialSkuPrefix,normalizeCatalogCategory,nextSkuForPrefix } from '../functions/_catalog-sku.js';
import { planCatalogCutover } from '../scripts/catalog-cutover-plan.mjs';
import { readFileSync } from 'node:fs';
const intended={
 sneakers:'SD-SN',loafers:'SD-GL','dress-shoes':'SD-GT',belts:'SD-TL',
 sandals:'SD-DD','watch-straps':'SD-DH','phone-cases':'SD-OP',
 'vi-nam':'SD-VN','vi-cam-tay':'SD-VD','cap-tab-laptop':'SD-CA',
 clutch:'SD-CL',mu:'SD-MU','tui-deo-cheo':'SD-DC',
 'tui-golf':'SD-TG','tui-nu':'SD-TN'
};
assert.deepEqual(OFFICIAL_SKU_PREFIXES,intended);
assert.equal(new Set(Object.values(OFFICIAL_SKU_PREFIXES)).size,15);
assert.equal(normalizeCatalogCategory('Ví da'),'vi-nam');
assert.equal(officialSkuPrefix('wallets'),'SD-VN');
assert.equal(officialSkuPrefix('Ví cầm tay'),'SD-VD');
assert.equal(officialSkuPrefix('Ốp điện thoại'),'SD-OP');
assert.equal(nextSkuForPrefix([{sku:'SD-GT009'},{sku:'SD-GT002'},{sku:'SD-GT013'}],'SD-GT'),'SD-GT014');
const published=Object.keys(intended).map((category,i)=>({
 id:'p-'+i,sku:'LEG-'+i,sku_verified:0,category,sort_order:3,published:1,
 created_at:'2026-10-27 01:01:01'
}));
published.push({id:'p-new',category:'vi-nam',sort_order:5,created_at:'2026-10-27 12:00:00',published:1});
const hidden=[{id:'hidden-old',category:'wallets',published:0},{id:'hidden-test',category:'sneakers',published:0}];
const plan=planCatalogCutover([...published,...hidden]);
assert.equal(plan.hidden.length,2);
assert.equal(plan.planned.length,16);
assert.equal(new Set(plan.planned.map(x=>x.sku)).size,16);
assert.equal(plan.planned.find(x=>x.id==='p-new').sku,'SD-VN002');
assert.equal(plan.planned.find(x=>x.id==='p-14').sku,'SD-TN001');
assert.throws(()=>planCatalogCutover([...published,{id:'strange',published:1,category:'new-no-prefix'}]),/CATALOG_/);
assert.throws(()=>planCatalogCutover([...published,{...published[0]}]),/CATALOG_DUPLICATE_ID/);
assert.throws(()=>planCatalogCutover(hidden),/CATALOG_/);
const deploy=readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
const cutover=readFileSync(new URL('../scripts/cutover-production-catalog-2026-10-27.mjs',import.meta.url),'utf8');
assert.doesNotMatch(deploy,/run:\s*node scripts\/cutover-production-catalog-2026-10-27\.mjs/,'Historical catalog mutation must not run automatically with every Production deployment');
assert.match(cutover,/DELETE FROM products WHERE published=0/);
assert.match(cutover,/CATALOG_CUTOVER=ALREADY_COMPLETED/);
assert.match(cutover,/const liveIsOfficial=/,'Recognize an already-assigned official SKU cohort');
assert.match(cutover,/plan.hidden.length===0/,'Support recovering when hidden rows were already purged');
assert.match(cutover,/CATALOG_HIDDEN_DELETE_REPORTED=/,'Report DELETE metadata without mistaking it for row proof');
assert.match(cutover,/CATALOG_POSTCHECK_FAILED/,'Verify every surviving row after possible deletion');
assert.ok(cutover.indexOf("const after=await query(")<cutover.indexOf('INSERT INTO settings(key,value,updated_at)'),'Never set the one-time completion marker before D1 verification');
assert.match(cutover,/PRODUCTION_PAGES_D1_BINDING_MISMATCH/);
assert.doesNotMatch(cutover,/DELETE FROM orders|DELETE FROM warranties|r2\/buckets/);
console.log('PASS: 15 official category codes; guarded single-use D1 cutover plan; no draft re-deletion.');
