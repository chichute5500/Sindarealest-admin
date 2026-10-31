/**
 * Preview-only catalog revision rollout. Verifies exact account resources,
 * records a Time Travel bookmark, checks query parity, and never writes Production.
 */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const token = process.env.CLOUDFLARE_API_TOKEN || '';
const PREVIEW = '573ad702-05fc-405e-8ef3-0cf2e7fea98d';
const LIVE = 'f6c208a1-052a-445c-a3b7-a442783f9bd3';
if (!/^[0-9a-f]{32}$/i.test(account) || !token) throw Error('Cloudflare credentials unavailable');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const api = 'https://api.cloudflare.com/client/v4/accounts/' + account;
async function request(path, sql = null) {
  const response = await fetch(api + path, {
    method: sql === null ? 'GET' : 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      ...(sql === null ? {} : { 'Content-Type': 'application/json' })
    },
    ...(sql === null ? {} : { body: JSON.stringify({ sql }) }),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw Error('Cloudflare preflight HTTP ' + response.status);
  const result = await response.json();
  if (!result.success) throw Error('Cloudflare API rejected Preview rollout');
  return result.result;
}
const query = async sql => {
  const payload = await request('/d1/database/' + PREVIEW + '/query', sql);
  const first = Array.isArray(payload) ? payload[0] : payload;
  if (!first || first.success === false || !Array.isArray(first.results))
    throw Error('D1 returned an invalid query result');
  return first;
};
const [preview, production, project] = await Promise.all([
  request('/d1/database/' + PREVIEW),
  request('/d1/database/' + LIVE),
  request('/pages/projects/sindarealest-admin-preview')
]);
assert.equal(preview.name, 'sindarealest-admin-preview-db');
assert.equal(preview.uuid, PREVIEW);
assert.equal(preview.version, 'production', 'Time Travel is required for this D1');
assert.equal(production.name, 'sindarealest-db');
assert.equal(production.uuid, LIVE);
assert.equal(project.name, 'sindarealest-admin-preview');
assert.equal(project.deployment_configs?.preview?.d1_databases?.DB?.id, PREVIEW);
assert.notEqual(project.deployment_configs?.preview?.d1_databases?.DB?.id, LIVE);
const bookmark = await request('/d1/database/' + PREVIEW + '/time_travel/bookmark');
assert.match(bookmark?.bookmark || '', /^[a-z0-9-]{20,}$/i, 'Missing recovery bookmark');
const dir = resolve(root, 'artifacts', 'd1-preview-products');
mkdirSync(dir, { recursive: true });
const checkpoint = {
  database: 'sindarealest-admin-preview-db',
  beforeBookmark: bookmark.bookmark,
  schemaApplied: false,
  start: new Date().toISOString()
};
function save() {
  writeFileSync(resolve(dir, 'checkpoint.json'), JSON.stringify(checkpoint, null, 2) + '\n', { mode: 0o600 });
}
save();
const requiredIndex = (await query(
  "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_audit_entity_action_created'"
)).results;
assert.equal(requiredIndex.length, 1, 'PR #155 base index migration 0015 has not been applied');
const sql = readFileSync(resolve(root, 'migrations', '0016_admin_products_revision.sql'), 'utf8')
  .split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n').trim();
const statements = sql.split(/;\s*(?=(?:CREATE\s+(?:INDEX|TRIGGER)|INSERT\s+OR\s+IGNORE)\b)/i)
  .map(text => text.trim().replace(/;\s*$/, '')).filter(Boolean);
assert.equal(statements.length, 5, 'Expected one index, three product triggers and revision seed');
assert.match(statements[0], /^CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_products_sort_sku\s+ON\s+products\s*\(/i);
for (const [index, action] of ['INSERT', 'UPDATE', 'DELETE'].entries()) {
  const statement = statements[index + 1];
  assert.match(statement, new RegExp('^CREATE\\s+TRIGGER\\s+IF\\s+NOT\\s+EXISTS\\s+trg_products_revision_' + action.toLowerCase() + '\\s+AFTER\\s+' + action + '\\s+ON\\s+products\\b', 'i'));
  assert.match(statement, /UPDATE\s+settings\s+SET\s+value[\s\S]*WHERE\s+key\s*=\s*'products_revision'[\s\S]*END$/i);
}
assert.match(statements[4], /^INSERT\s+OR\s+IGNORE\s+INTO\s+settings\s*\(key,value,updated_at\)\s*VALUES\s*\('products_revision','0',datetime\('now'\)\)$/i);
const listing = 'SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000';
const before = await query(listing);
if (before.results.length > 2000) throw Error('Unexpected Preview product count');
checkpoint.beforeFullRowsRead = before.meta?.rows_read ?? null;
checkpoint.productCount = before.results.length;
save();
// Seed the revision row last. If a trigger creation fails, the Admin API will
// stay on its safe full-read fallback rather than advertise stale revisions.
for (let i = 0; i < statements.length; i++) {
  await query(statements[i]);
  checkpoint.lastAppliedStep = i + 1;
  save();
}
const schemaObjects = (await query(
  "SELECT name FROM sqlite_master WHERE name IN ('idx_products_sort_sku','trg_products_revision_insert','trg_products_revision_update','trg_products_revision_delete')"
)).results.map(row => row.name);
for (const expected of ['idx_products_sort_sku','trg_products_revision_insert','trg_products_revision_update','trg_products_revision_delete'])
  assert.ok(schemaObjects.includes(expected), 'Missing ' + expected);
const revision = await query("SELECT value FROM settings WHERE key='products_revision' LIMIT 1");
assert.match(String(revision.results[0]?.value ?? ''), /^\d{1,19}$/, 'Invalid product revision token');
const after = await query(listing);
assert.equal(JSON.stringify(after.results), JSON.stringify(before.results), 'Product order or content changed during rollout');
const plan = await query('EXPLAIN QUERY PLAN ' + listing);
checkpoint.queryPlan = plan.results.map(row => row.detail).join(' | ').slice(0,500);
checkpoint.afterFullRowsRead = after.meta?.rows_read ?? null;
checkpoint.revisionRowsRead = revision.meta?.rows_read ?? null;
checkpoint.schemaApplied = true;
checkpoint.completed = new Date().toISOString();
save();
console.log('PREVIEW ONLY: catalog revision installed; product ordering and fields unchanged.');
console.log('Rows read: full before=' + checkpoint.beforeFullRowsRead +
  ', full after=' + checkpoint.afterFullRowsRead +
  ', unchanged revision check=' + checkpoint.revisionRowsRead +
  '; productCount=' + checkpoint.productCount);
console.log('Production database not written.');
