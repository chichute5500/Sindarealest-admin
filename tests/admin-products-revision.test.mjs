/**
 * Admin catalog revision: real disposable SQLite triggers + real authenticated GET.
 * Does not access remote D1, customer records, or production data.
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createSession } from '../functions/_lib.js';
import { onRequestGet } from '../functions/api/admin/products.js';

const sql = new DatabaseSync(':memory:');
for (const file of ['0001_schema.sql', '0016_admin_products_revision.sql']) {
  sql.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
}
const revision = () => sql.prepare("SELECT value FROM settings WHERE key='products_revision'").get()?.value ?? null;
assert.equal(revision(), '0');
const migration = readFileSync(new URL('../migrations/0016_admin_products_revision.sql', import.meta.url), 'utf8');
sql.exec(migration);
assert.equal(revision(), '0', 'Reapplying migration must not reset current version');

const plan = sql.prepare('EXPLAIN QUERY PLAN SELECT * FROM products ORDER BY sort_order ASC, sku ASC LIMIT 2000')
  .all().map(row => row.detail).join(' | ');
assert.match(plan, /idx_products_sort_sku/, 'Admin sort should have its own matching index');

const secret = 'qa-disposable-session-secret-not-real-and-long-enough';
const cookie = await createSession(secret);
let fullReads = 0, revisionReads = 0;
const env = {
  ADMIN_PASSWORD: 'qa-disposable-password',
  SESSION_SECRET: secret,
  DB: {
    prepare(query) {
      if (query.startsWith('SELECT * FROM products ORDER BY')) fullReads++;
      if (query.includes("key = 'products_revision'")) revisionReads++;
      let params = [];
      return {
        bind(...args) { params = args; return this; },
        async first() { return sql.prepare(query).get(...params) ?? null; },
        async all() { return { results: sql.prepare(query).all(...params) }; }
      };
    }
  }
};
async function getProductList(token = null, authenticated = true) {
  const suffix = token === null ? '' : '?revision=' + encodeURIComponent(token);
  const request = new Request('https://qa.invalid/api/admin/products' + suffix, {
    headers: {
      Origin: 'https://qa.invalid',
      'Sec-Fetch-Site': 'same-origin',
      ...(authenticated ? { Cookie: 'sd_admin_session=' + cookie } : {})
    }
  });
  const response = await onRequestGet({ request, env });
  return { status: response.status, body: await response.json() };
}
function add(id, sku, order, published = 1) {
  sql.prepare('INSERT INTO products(id,slug,sku,title,category,sort_order,published) VALUES(?,?,?,?,?,?,?)')
    .run(id, id, sku, 'QA-only ' + id, 'sneakers', order, published);
}
add('a', 'QA-A', 2);
add('b', 'QA-B', 1, 0);
assert.equal(revision(), '2', 'Insert trigger must run even for hidden products');
let result = await getProductList();
assert.equal(result.status, 200);
assert.deepEqual(result.body.products.map(p => p.sku), ['QA-B', 'QA-A'], 'Keep SKU order and unpublished rows');
assert.equal(result.body.revision, '2');
assert.equal(fullReads, 1);

result = await getProductList('2');
assert.equal(result.status, 200);
assert.deepEqual(result.body, { unchanged: true, revision: '2' });
assert.equal(fullReads, 1, 'Unchanged requests must skip the large products SELECT');
assert.equal(revisionReads, 2, 'Unchanged checks use the single settings-key query');
// Simulate prolonged Android Admin usage without product mutations.
for (let i = 0; i < 50; i++) {
  const idlePoll = await getProductList('2');
  assert.equal(idlePoll.body.unchanged, true);
}
assert.equal(fullReads, 1, 'Fifty idle polls must not issue 50 catalog scans');
assert.equal(revisionReads, 52, 'Fifty idle polls must use only 50 indexed revision lookups');

sql.prepare("UPDATE products SET title='Updated',sort_order=0 WHERE id='a'").run();
assert.equal(revision(), '3', 'Update trigger must bump revision even without updated_at change');
result = await getProductList('2');
assert.equal(fullReads, 2);
assert.equal(result.body.revision, '3');
assert.deepEqual(result.body.products.map(p => p.sku), ['QA-A', 'QA-B']);
assert.equal(result.body.products[0].title, 'Updated');

sql.prepare("DELETE FROM products WHERE id='b'").run();
assert.equal(revision(), '4', 'Delete trigger must invalidate cached lists');
result = await getProductList('3');
assert.equal(fullReads, 3);
assert.deepEqual(result.body.products.map(p => p.id), ['a']);

const readsBeforeUnauthorized = fullReads;
result = await getProductList('4', false);
assert.equal(result.status, 401, 'Unauthenticated clients must never read the Admin catalog');
assert.equal(fullReads, readsBeforeUnauthorized);

// Backup restore uses DELETE + INSERT in a transaction, not the normal CRUD path.
// Both mutations must be tracked even when the SKU is reused.
const beforeRestore = Number(revision());
sql.exec('BEGIN');
try {
  sql.prepare('DELETE FROM products').run();
  add('restored', 'QA-RESTORED', 10, 0);
  sql.exec('COMMIT');
} catch (error) { sql.exec('ROLLBACK'); throw error; }
assert.equal(Number(revision()), beforeRestore + 2,
  'Restore-style product replacement must invalidate old revision tokens');
result = await getProductList(String(beforeRestore));
assert.deepEqual(result.body.products.map(p => p.sku), ['QA-RESTORED']);
assert.equal(fullReads, 4, 'Restored catalog must be loaded exactly once');
result = await getProductList(String(beforeRestore + 2));
assert.deepEqual(result.body, {unchanged: true, revision: String(beforeRestore + 2)});
assert.equal(fullReads, 4, 'A follow-up should not re-read an unchanged restored catalog');

// Missing migration / absent version row: always load products (safe fallback).
sql.prepare("DELETE FROM settings WHERE key='products_revision'").run();
result = await getProductList('4');
assert.equal(result.status, 200);
assert.ok(Array.isArray(result.body.products));
assert.equal(Object.hasOwn(result.body, 'revision'), false);
assert.equal(fullReads, 5);
console.log('PASS: Admin products revision triggers, index, secure conditional reads, Restore invalidation, and schema fallback.');
