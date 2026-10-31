/**
 * Strictly read-only post-migration Preview D1 proof and Rows Read comparison.
 * Returns sanitized metrics only; does not log or persist product/customer rows.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const token = process.env.CLOUDFLARE_API_TOKEN || '';
assert.match(account, /^[a-f0-9]{32}$/i, 'Invalid Cloudflare account');
assert.ok(token, 'Cloudflare API token is missing');
const preview = '573ad702-05fc-405e-8ef3-0cf2e7fea98d';
const prod = 'f6c208a1-052a-445c-a3b7-a442783f9bd3';
const base = 'https://api.cloudflare.com/client/v4/accounts/' + account;
async function get(path, sql) {
  if (sql && !/^(?:SELECT|EXPLAIN QUERY PLAN SELECT)\s/i.test(sql))
    throw Error('Only SELECT or EXPLAIN SELECT is allowed');
  const res = await fetch(base + path, {
    method: sql ? 'POST' : 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      ...(sql ? {'Content-Type':'application/json'} : {})
    },
    ...(sql ? {body:JSON.stringify({sql})} : {}),
    signal: AbortSignal.timeout(45000)
  });
  if (!res.ok) throw Error('Cloudflare API HTTP ' + res.status);
  const data = await res.json();
  if (data.success !== true) throw Error('Cloudflare API query failed');
  const result = data.result;
  if (!sql) return result;
  const first = Array.isArray(result) ? result[0] : result;
  assert.ok(first?.success !== false && Array.isArray(first?.results), 'Invalid SQL response');
  return first;
}
const [db, live, project] = await Promise.all([
  get('/d1/database/' + preview),
  get('/d1/database/' + prod),
  get('/pages/projects/sindarealest-admin-preview')
]);
assert.equal(db.name, 'sindarealest-admin-preview-db');
assert.equal(db.uuid, preview);
assert.equal(live.name, 'sindarealest-db');
assert.equal(live.uuid, prod);
assert.equal(project.name, 'sindarealest-admin-preview');
assert.equal(project.deployment_configs?.preview?.d1_databases?.DB?.id, preview);
const sql = stmt => get('/d1/database/' + preview + '/query', stmt);
const ready = await sql(
  "SELECT name, sql FROM sqlite_master WHERE name IN ('idx_products_sort_sku','trg_products_revision_insert','trg_products_revision_update','trg_products_revision_delete')"
);
const objects = new Map(ready.results.map(o => [o.name, String(o.sql || '')]));
assert.match(objects.get('idx_products_sort_sku') || '', /ON\s+products\s*\(\s*sort_order\s+ASC\s*,\s*sku\s+ASC\s*\)/i);
for (const action of ['insert','update','delete']) {
  const definition = objects.get('trg_products_revision_' + action) || '';
  assert.match(definition, new RegExp('AFTER\\s+' + action + '\\s+ON\\s+products', 'i'));
  assert.match(definition, /UPDATE\s+settings[\s\S]*key\s*=\s*'products_revision'/i);
}
const version = await sql("SELECT value FROM settings WHERE key = 'products_revision' LIMIT 1");
assert.match(String(version.results[0]?.value ?? ''), /^\d{1,19}$/);
const listing = await sql('SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000');
const planner = await sql('EXPLAIN QUERY PLAN SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000');
const plan = planner.results.map(r => String(r.detail ?? '')).join(' | ');
assert.match(plan, /idx_products_sort_sku/, 'Product sorting index not used');
const metrics = {
  database: 'sindarealest-admin-preview-db',
  generatedAt: new Date().toISOString(),
  passed: true,
  productCount: listing.results.length,
  revisionRowsRead: version.meta?.rows_read ?? null,
  fullProductRowsRead: listing.meta?.rows_read ?? null,
  sortIndexUsed: true,
  queryPlan: plan.slice(0,350),
  noProductionWrites: true
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = resolve(root, 'artifacts', 'd1-preview-products');
mkdirSync(dir, {recursive:true});
writeFileSync(resolve(dir, 'readonly-metrics.json'), JSON.stringify(metrics,null,2)+'\n');
console.log('PASS: Preview-only product revision schema verified and ordered SQL plan indexed');
console.log('Preview D1 rows read: full=' + metrics.fullProductRowsRead +
  ', revision=' + metrics.revisionRowsRead +
  ', products=' + metrics.productCount);
console.log('No customer/order/product data or Production D1 writes performed.');
