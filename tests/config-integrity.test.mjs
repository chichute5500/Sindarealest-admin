import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseCliJson, findNamedRecord, assertSafeName } from '../scripts/cloudflare-utils.mjs';

const payload = parseCliJson('\nWrangler notice\n[{"name":"shop-prod","production_branch":"main"}]\nFinished listing projects.');
assert.equal(findNamedRecord(payload, 'shop-prod')?.production_branch, 'main');
assert.equal(findNamedRecord(payload, 'wrong-project'), null);
assert.throws(() => parseCliJson('not JSON'), /không đọc được/i);
assert.doesNotThrow(() => assertSafeName('sindarealest-prod', 'project'));
assert.throws(() => assertSafeName('../production', 'project'), /không hợp lệ/i);

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
assert.ok(workflow.includes('npm run check'));
assert.ok(workflow.includes('npm test'));
assert.ok(workflow.includes('CLOUDFLARE_PAGES_PROJECT'));
const setupScript = readFileSync(new URL('../scripts/setup-cloudflare.mjs', import.meta.url), 'utf8');
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n1/5 · Áp dụng schema SQL idempotent cho D1…'"), 'Setup must require bindings/secrets before migrations');
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n5/5 · Triển khai website cùng Pages Functions…'"), 'Setup must require bindings/secrets before deploy');
assert.ok(setupScript.includes('migrations/0004_admin_notifications.sql'), 'Setup must apply admin notification migration');
assert.ok(setupScript.includes('migrations/0005_address_warranty_verification.sql'), 'Setup must apply address and warranty metadata migration');
assert.ok(setupScript.includes('migrations/0006_remove_warranty_otp.sql'), 'Setup must apply the OTP removal migration');
assert.ok(!/TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_FROM_NUMBER|warranty_verifications/.test(setupScript), 'Setup must not depend on obsolete OTP/SMS configuration or tables');
const warrantyMigration = readFileSync('migrations/0006_remove_warranty_otp.sql', 'utf8');
assert.ok(!/DROP\s+TABLE/i.test(warrantyMigration), 'Migration must not drop production tables');
assert.ok(!/CREATE TABLE|ALTER TABLE|DROP TABLE/i.test(warrantyMigration), 'Migration 0006 must not change production schema');
const deployReadme = readFileSync('README-DEPLOY.txt', 'utf8');
assert.ok(deployReadme.includes('migrations/0004_admin_notifications.sql') && deployReadme.includes('migrations/0005_address_warranty_verification.sql') && deployReadme.includes('migrations/0006_remove_warranty_otp.sql'), 'Deployment guide must match current migration sequence');
assert.ok(!/TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_FROM_NUMBER/.test(deployReadme), 'Deployment guide must not require obsolete SMS credentials');
const deployScript = readFileSync(new URL('../scripts/deploy-cloudflare.mjs', import.meta.url), 'utf8');
assert.ok(deployScript.includes('GITHUB_REF_NAME'), 'CI must reject deploy from a source branch different from production');
assert.ok(deployScript.includes('CLOUDFLARE_PAGES_ORIGINALS_READY'), 'Deploy must be blocked until private ORIGINALS is verified');
assert.ok(setupScript.includes('originalsBucket === bucket'), 'Setup must require ORIGINALS separate from IMAGES');
assert.ok(workflow.includes('CLOUDFLARE_PAGES_ORIGINALS_READY'), 'Workflow must pass the ORIGINALS readiness variable');
assert.ok(workflow.includes("if: vars.CLOUDFLARE_PAGES_ORIGINALS_READY == 'true'"), 'Production deployment must be skipped until private ORIGINALS is verified');
assert.ok(setupScript.includes('confirm !== `DEPLOY ${project} USING ${dbName} AND ${bucket} AND ${originalsBucket}`'), 'Setup confirmation must include both R2 bucket names');
assert.ok(workflow.indexOf('npm run check') < workflow.indexOf('npm run deploy'));
assert.ok(workflow.indexOf('npm test') < workflow.indexOf('npm run deploy'));
assert.ok(!workflow.includes('migrations/0001_schema.sql'), 'Deploy workflow must not modify D1 schema automatically');
assert.ok(!workflow.includes('0002_seed_products.sql'), 'Deploy workflow must not seed D1 automatically');
const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
assert.ok(!/^\s*pages_build_output_dir\s*=/m.test(wranglerConfig), 'Do not opt into Wrangler production config until actual Pages config has been downloaded and reconciled');
assert.ok(existsSync('public/index.html'));
assert.ok(existsSync('public/admin/index.html'));
assert.ok(!existsSync('public/catalog-fallback.json'), 'Stale static catalog fallback must not shadow D1 failures');

const seedWorkflow = readFileSync('.github/workflows/import-d1-products.yml', 'utf8');
assert.ok(seedWorkflow.includes('confirm_empty_database'), 'Manual D1 seed must require an explicit empty-database confirmation');
assert.ok(seedWorkflow.includes('CONFIRM_EMPTY_DATABASE') && seedWorkflow.includes('"YES"'), 'Manual D1 seed must stop unless confirmation is YES');
const productCountGuard = readFileSync('scripts/assert-product-count.mjs', 'utf8');
assert.ok(productCountGuard.includes('if (count !== expected)'), 'Product count guard must reject counts that differ from the expected value');
assert.ok(seedWorkflow.includes('SELECT COUNT(*) AS product_count FROM products;'), 'Manual D1 seed must query the live product count');
assert.ok(seedWorkflow.includes('node scripts/assert-product-count.mjs product-count.json 0'), 'Manual D1 seed must verify zero existing products before inserting');
assert.ok(seedWorkflow.includes('node scripts/assert-product-count.mjs product-count.json 235'), 'Manual D1 seed must verify exactly 235 products after import');
assert.ok(seedWorkflow.includes('concurrency:') && seedWorkflow.includes('sindarealest-d1-initial-seed'), 'Initial seed workflow must serialize simultaneous runs');
assert.ok(seedWorkflow.indexOf('Refuse to seed a database that already has products') < seedWorkflow.indexOf('Import initial products'), 'Manual D1 seed preflight must run before SQL inserts');

assert.ok(deployReadme.includes('`ORIGINALS`') && deployReadme.includes('CLOUDFLARE_PAGES_ORIGINALS_READY'), 'Deployment guide must explain the private ORIGINALS binding and readiness guard');
const integratedReadme = readFileSync('README-INTEGRATED-VI.txt', 'utf8');
assert.ok(integratedReadme.includes('`ORIGINALS`') && integratedReadme.includes('CLOUDFLARE_PAGES_ORIGINALS_READY'), 'Integrated guide must document private originals and deployment readiness');
const upgradeReport = readFileSync('UPGRADE-REPORT.md', 'utf8');
assert.ok(upgradeReport.includes('không đóng dấu logo trực tiếp vào file WebP mới'), 'Upgrade report must match the clean WebP upload implementation');

const guardDir = mkdtempSync(join(tmpdir(), 'sd-product-count-'));
try {
  const guardFile = join(guardDir, 'count.json');
  const guardScript = new URL('../scripts/assert-product-count.mjs', import.meta.url).pathname;
  const runGuard = (json, expected) => {
    writeFileSync(guardFile, json);
    return spawnSync(process.execPath, [guardScript, guardFile, String(expected)], { encoding: 'utf8' });
  };
  const zeroCount = runGuard('[{"results":[{"product_count":0}]}]', 0);
  assert.equal(zeroCount.status, 0, 'Product count guard must accept an empty table before seed');
  assert.match(zeroCount.stdout, /PASS: product_count=0/);
  const seededCount = runGuard('[{"results":[{"product_count":235}]}]', 235);
  assert.equal(seededCount.status, 0, 'Product count guard must accept exactly 235 seeded products');
  const nonEmpty = runGuard('[{"results":[{"product_count":1}]}]', 0);
  assert.notEqual(nonEmpty.status, 0, 'Product count guard must reject a non-empty target');
  const missingCount = runGuard('[{"results":[{"total_products":235}]}]', 235);
  assert.notEqual(missingCount.status, 0, 'Product count guard must fail closed when the count field is missing');
  const malformed = runGuard('not-json', 0);
  assert.notEqual(malformed.status, 0, 'Product count guard must fail closed on invalid JSON');
} finally {
  rmSync(guardDir, { recursive: true, force: true });
}

console.log('PASS: JSON preflight helpers, explicit deployment target, CI gates, private R2 readiness, guarded manual seed, and single-source catalog invariant.');
