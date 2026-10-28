import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Guard the actual browser-side validator against accidental escaping of \d.
// This bug rejected every valid price even though server-side PATCH was correct.
const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
const marker="if(field==='price'&&raw!==''&&(";
const start=admin.indexOf(marker);
assert.ok(start>0,'Inline price editor validation must exist');
const expression=admin.slice(start,start+230);
const match=expression.match(/!\/(\^[^/]*\$)\/\.test\(raw\)/);
assert.ok(match,'Price must be validated using a regular expression literal');
const digits=new RegExp(match[1]);
for(const price of ['0','5800000','2000000000','000100000']){
 assert.equal(digits.test(price),true,'Valid whole-VND input must pass: '+price);
}
for(const invalid of ['','-1','1.5','2e6','5.800.000','abc',' 5800000 ','2000000001']){
 if(invalid==='2000000001')continue; // Numeric upper bound has a separate check.
 assert.equal(digits.test(invalid),false,'Non-digit input must be rejected: '+invalid);
}
assert.ok(expression.includes('Number.isSafeInteger(Number(raw))'),
 'Do not drop integer-safety validation');
assert.ok(expression.includes('Number(raw)>2000000000'),
 'Keep maximum price constraint');
assert.ok(admin.includes("const value=field==='price'?(raw===''?null:Number(raw))"),
 'Blank price remains null, not zero');
assert.ok(admin.includes('type="number" min="0" max="2000000000" step="1" inputmode="numeric"'),
 'Keep native mobile numeric keyboard and min/max/step');
assert.ok(admin.includes('expectedValue:productQuickExpected(p,field)'),
 'Keep optimistic concurrency so another Admin update is not overwritten');
console.log('PASS: valid inline Admin prices, including 5,800,000 VND, pass numeric validation; invalid inputs and concurrency safeguards remain enforced.');
