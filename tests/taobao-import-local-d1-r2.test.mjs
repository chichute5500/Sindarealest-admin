// Real local Cloudflare D1/R2 bindings. No production resources or credentials.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';
import { createSession } from '../functions/_lib.js';
import { onRequestPost as upload } from '../functions/api/admin/upload.js';
import { onRequestPost as importDraft, onRequestGet as importStatus } from '../functions/api/admin/import-draft.js';
import { onRequestGet as publicProducts } from '../functions/api/products.js';

const dir = mkdtempSync(join(tmpdir(), 'sd-taobao-import-local-'));
const config = join(dir, 'wrangler.toml');
writeFileSync(config, [
  'name = "taobao-qa-only"',
  'compatibility_date = "2026-10-12"',
  '[[d1_databases]]',
  'binding = "DB"',
  'database_name = "taobao-qa-isolated"',
  'database_id = "10000000-0000-4000-8000-000000000001"',
  '[[r2_buckets]]',
  'binding = "IMAGES"',
  'bucket_name = "taobao-qa-public-images"',
  '[[r2_buckets]]',
  'binding = "ORIGINALS"',
  'bucket_name = "taobao-qa-private-originals"',
].join('\n') + '\n');

let platform;
try {
  platform = await getPlatformProxy({
    configPath: config, remoteBindings: false,
    persist: { path: join(dir, 'local-binding-data') },
  });
  const db = platform.env.DB;
  assert.ok(db && platform.env.IMAGES && platform.env.ORIGINALS);
  assert.notEqual(platform.env.IMAGES, platform.env.ORIGINALS);

  for (const name of [
    '0001_schema.sql', '0003_storefront_operations.sql',
    '0004_admin_notifications.sql', '0005_address_warranty_verification.sql',
    '0006_remove_warranty_otp.sql', '0007_order_contact_details.sql',
    '0008_product_sku_verification.sql', '0009_fulfillment_and_manual_payments.sql'
  ]) {
    const sql = readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8')
      .replace(/^\s*--.*$/gm, '');
    for (const fragment of sql.split(';')) {
      const statement = fragment.trim();
      if (statement && !/^PRAGMA foreign_keys\s*=/i.test(statement))
        await db.prepare(statement).run();
    }
  }

  const secret = 'local-only-synthetic-signing-secret-for-isolated-test-at-least-32-chars';
  const env = { ...platform.env, SESSION_SECRET: secret, ADMIN_PASSWORD: 'synthetic-only-password-not-real' };
  const cookie = 'sd_admin_session=' + await createSession(secret);
  function context(path, method = 'GET', body, authorized = true) {
    const headers = { Origin: 'https://isolated-test.invalid', 'Sec-Fetch-Site': 'same-origin' };
    if (authorized) headers.Cookie = cookie;
    const request = new Request('https://isolated-test.invalid' + path, { method, headers,
      ...(body === undefined ? {} : { body }) });
    return { env, request };
  }
  function draft(id, images, title = 'Giày lười kiểm thử') {
    return { importId:id, title, category:'loafers', categoryLabel:'Giày lười',
      images, price:1500000, description:'QA only', stock:null,
      fulfillmentType:'made_to_order', published:true, sku:'FAKE-CLIENT-SKU' };
  }
  const row = async (sql, ...bindings) => db.prepare(sql).bind(...bindings).first();

  // Storage must refuse missing Admin authentication before touching R2.
  const webp = new Uint8Array([82,73,70,70,4,0,0,0,87,69,66,80,86,80,56,32]);
  const original = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/itkAAAAASUVORK5CYII=', 'base64'));
  function multipart(imageBytes = webp) {
    const form = new FormData();
    form.append('file', new Blob([imageBytes],{type:'image/webp'}), 'product.webp');
    form.append('original', new Blob([original],{type:'image/png'}), 'source.png');
    return form;
  }
  const noAuthUpload = await upload(context('/api/admin/upload', 'POST', multipart(), false));
  assert.equal(noAuthUpload.status, 401);
  const badUpload = await upload(context('/api/admin/upload', 'POST', multipart(new Uint8Array([0,1,2]))));
  assert.equal(badUpload.status,400);
  const actual = await upload(context('/api/admin/upload', 'POST', multipart()));
  assert.equal(actual.status, 201, 'Admin upload should succeed with local R2 public/private');
  const saved = await actual.json();
  assert.match(saved.url, /^\/media\/[a-f0-9-]+\.webp$/i);
  assert.equal(saved.originalStoredPrivately, true);
  const object = await platform.env.IMAGES.head(saved.url.slice('/media/'.length));
  assert.ok(object);
  assert.ok(object.customMetadata.originalKey);
  assert.ok(await platform.env.ORIGINALS.head(object.customMetadata.originalKey));
  console.log('PASS local R2: authenticated upload, public WebP + private original, invalid/anonymous rejected');

  const id = randomUUID(), body = draft(id,[saved.url]);
  const req = () => context('/api/admin/import-draft', 'POST', JSON.stringify(body));
  const denied = await importDraft(context('/api/admin/import-draft','POST',JSON.stringify(body),false));
  assert.equal(denied.status,401);
  const results = await Promise.all([importDraft(req()), importDraft(req())]);
  assert.deepEqual(results.map(x=>x.status).sort(), [200,201]);
  const first = await row('SELECT * FROM products WHERE id=?',id);
  assert.ok(first);
  assert.equal(first.published,0);
  assert.equal(first.sku_verified,1);
  assert.match(first.sku,/^SD-GL\d+$/);
  assert.deepEqual(JSON.parse(first.images_json),[saved.url]);
  assert.equal((await row("SELECT COUNT(*) AS n FROM products WHERE id=?",id)).n,1);
  assert.equal((await row("SELECT COUNT(*) AS n FROM audit_logs WHERE action='product_imported_draft' AND entity_id=?",id)).n,1);
  const status = await importStatus(context('/api/admin/import-draft?id='+id));
  assert.equal(status.status,200);
  assert.equal((await status.json()).product.published,false);
  const sameIdDifferentData = await importDraft(context('/api/admin/import-draft','POST',
    JSON.stringify(draft(id,[saved.url],'Sản phẩm khác'))));
  assert.equal(sameIdDifferentData.status,409);
  const publicRes = await publicProducts(context('/api/products'));
  assert.equal(publicRes.status,200);
  const listing = await publicRes.json();
  assert.ok(Array.isArray(listing));
  assert.ok(!listing.some(x=>x.id===id),'Unpublished draft must never appear in public catalog');
  console.log('PASS local D1: concurrent retry idempotent, SKU server-generated, hidden from storefront, audit once');

  const other = randomUUID();
  const next = await importDraft(context('/api/admin/import-draft','POST',
    JSON.stringify(draft(other,[saved.url],'Giày lười khác'))));
  assert.equal(next.status,201);
  const second = await row('SELECT * FROM products WHERE id=?',other);
  assert.notEqual(second.sku,first.sku);
  assert.equal((await row('SELECT COUNT(*) AS n FROM products')).n,2);
  console.log('PASS local D1: separate operation receives separate official SKU, no Production access');
} finally {
  if (platform) await platform.dispose();
  rmSync(dir, { recursive: true, force: true });
}
