/**
 * Single-purpose, owner-directed, production D1 title-only rename.
 * Invoked by the one-time isolated branch workflow, NOT the Pages deploy.
 * No SKU/slug/price/images/status/order/stock changes.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { planSneakerTitleRename } from './rename-sneakers-vip-plan.mjs';

const account = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const token = process.env.CLOUDFLARE_API_TOKEN || '';
const dbId = 'f6c208a1-052a-445c-a3b7-a442783f9bd3';
const projectName = 'sindarealest2';
const branch = 'refs/heads/chore/rename-sneakers-vip-2026-10-28';
const marker = 'owner_sneakers_vip_title_2026_10_28';
function requireCondition(value, code) { if (!value) throw Error(code); }
requireCondition(
  process.env.GITHUB_REPOSITORY === 'chichute5500/Sindarealest-admin' &&
  process.env.GITHUB_REF === branch &&
  process.env.GITHUB_EVENT_NAME === 'push' &&
  /^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA || '') &&
  /^[0-9a-f]{32}$/.test(account) && token.length > 0,
  'PRODUCTION_RENAME_EXECUTION_GUARD_FAILED'
);

async function api(path, payload) {
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' + account + path, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + token,
      ...(payload === undefined ? {} : { 'Content-Type':'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    redirect: 'error', signal: AbortSignal.timeout(30000)
  });
  const body = await response.json().catch(() => null);
  requireCondition(response.ok && body?.success === true,
    'CLOUDFLARE_REQUEST_FAILED_' + response.status);
  return body.result;
}
async function query(sql, params = []) {
  const response = await api('/d1/database/' + dbId + '/query', { sql, params });
  const result = Array.isArray(response) ? response[0] : response;
  requireCondition(result?.success === true && Array.isArray(result.results),
    'D1_QUERY_FAILED');
  return { rows: result.results, changes: Number(result.meta?.changes ?? -1) };
}
const db = await api('/d1/database/' + dbId);
requireCondition(db?.uuid === dbId && db?.name === 'sindarealest-db',
  'PRODUCTION_D1_IDENTITY_FAILED');
const pages = await api('/pages/projects/' + projectName);
const liveBinding = pages?.deployment_configs?.production?.d1_databases?.DB;
requireCondition(pages?.name === projectName &&
  (liveBinding?.id || liveBinding?.database_id) === dbId,
  'PRODUCTION_PAGES_D1_BINDING_MISMATCH');

const before = await query(
  "SELECT id,sku,title,category,published FROM products WHERE category='sneakers' AND published=1 LIMIT 501"
);
const planned = planSneakerTitleRename(before.rows);
const count = await query("SELECT COUNT(*) AS count FROM products WHERE category='sneakers' AND published=1");
requireCondition(count.rows.length === 1 && Number(count.rows[0].count) === planned.length,
  'SNEAKER_COHORT_CHANGED_DURING_PREFLIGHT');

const priorMarker = await query('SELECT value FROM settings WHERE key=? LIMIT 1', [marker]);
const alreadyDone = planned.every(item => item.before === item.after);
if (priorMarker.rows.length) {
  requireCondition(alreadyDone, 'RENAME_MARKER_PRESENT_BUT_TITLES_CHANGED');
  console.log('VIP_SNEAKER_RENAME=ALREADY_COMPLETED count=' + planned.length);
} else if (alreadyDone) {
  console.log('VIP_SNEAKER_RENAME=ALREADY_MATCHING count=' + planned.length);
} else {
  // This backup contains catalog names and SKUs, no customer/order data.
  await mkdir('backup', { recursive: true });
  await writeFile('backup/sneaker-titles-before-2026-10-28.json',
    JSON.stringify({ date:'2026-10-28', database:dbId, products:planned },null,2) + '\n',
    { flag:'wx' });
  console.log('VIP_SNEAKER_PREFLIGHT=PASS count=' + planned.length + ' backup=written');

  // Single atomic SQLite UPDATE. Snapshot equality protects from other editors;
  // existing order snapshots, SKU and URLs are unaffected.
  const mapped = JSON.stringify(planned);
  const update = `
    WITH desired AS (
      SELECT json_extract(value,'$.id') AS product_id,
             json_extract(value,'$.sku') AS original_sku,
             json_extract(value,'$.before') AS old_title,
             json_extract(value,'$.after') AS new_title
      FROM json_each(?)
    )
    UPDATE products SET title=desired.new_title, updated_at=datetime('now')
    FROM desired
    WHERE products.id=desired.product_id
      AND products.category='sneakers' AND products.published=1
      AND products.sku=desired.original_sku AND products.title=desired.old_title
      AND products.title<>desired.new_title
  `;
  await query(update,[mapped]);

  const after = await query(
    "SELECT id,sku,title,category,published FROM products WHERE category='sneakers' AND published=1 LIMIT 501"
  );
  const actualById = new Map(after.rows.map(r => [r.id,r]));
  requireCondition(after.rows.length === planned.length && planned.every(item => {
    const row = actualById.get(item.id);
    return row && row.sku === item.sku && row.title === item.after &&
      row.category === 'sneakers' && Number(row.published) === 1;
  }), 'VIP_SNEAKER_RENAME_POSTCHECK_FAILED');
  await query(
    "INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now'))",
    [marker, JSON.stringify({ count:planned.length,date:'2026-10-28',scope:'published-sneakers-titles-only' })]
  );
  console.log('VIP_SNEAKER_RENAME=PASS renamed=' + planned.filter(p => p.before !== p.after).length +
    ' total=' + planned.length + ' first=' + planned[0].after +
    ' last=' + planned[planned.length - 1].after);
}
