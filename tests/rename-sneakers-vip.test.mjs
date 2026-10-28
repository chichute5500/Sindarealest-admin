import assert from 'node:assert/strict';
import { planSneakerTitleRename, SNEAKER_TITLE_PREFIX } from '../scripts/rename-sneakers-vip-plan.mjs';

const rows = [
  {id:'B',sku:'SD-SN010',title:'Old second',category:'sneakers',published:1},
  {id:'A',sku:'SD-SN001',title:'Old first',category:'sneakers',published:1},
  {id:'C',sku:'SD-SN003',title:'Old third',category:'sneakers',published:1}
];
const plan = planSneakerTitleRename(rows);
assert.deepEqual(plan.map(item => item.sku), ['SD-SN001','SD-SN003','SD-SN010']);
assert.deepEqual(plan.map(item => item.after), [1,2,3].map(n => SNEAKER_TITLE_PREFIX + String(n).padStart(3,'0')));
assert.deepEqual(rows.map(item => item.title), ['Old second','Old first','Old third']); // Pure plan; inputs unchanged.
assert.throws(() => planSneakerTitleRename([]), /UNEXPECTED_SNEAKER_COUNT/);
assert.throws(() => planSneakerTitleRename([...rows,rows[0]]), /INVALID_SNEAKER_ROW/);
assert.throws(() => planSneakerTitleRename([{...rows[0],sku:'SD-GL001'}]), /INVALID_SNEAKER_ROW/);
assert.throws(() => planSneakerTitleRename([{...rows[0],published:0}]), /INVALID_SNEAKER_ROW/);
assert.throws(() => planSneakerTitleRename([{...rows[0],category:'loafers'}]), /INVALID_SNEAKER_ROW/);
console.log('VIP sneaker rename plan tests PASS');
