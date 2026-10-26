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
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n1/6 · Áp dụng schema SQL idempotent cho D1…'"), 'Setup must require bindings/secrets before migrations');
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n6/6 · Triển khai website cùng Pages Functions…'"), 'Setup must require bindings/secrets before deploy');
assert.ok(setupScript.includes('migrations/0004_admin_notifications.sql'), 'Setup must apply admin notification migration');
assert.ok(setupScript.includes('migrations/0005_address_warranty_verification.sql'), 'Setup must apply address and warranty metadata migration');
assert.ok(setupScript.includes('migrations/0006_remove_warranty_otp.sql'), 'Setup must apply the OTP removal migration');
assert.ok(setupScript.includes('migrations/0007_order_contact_details.sql') && setupScript.includes('migrations/0008_product_sku_verification.sql'), 'Setup must apply order contact and SKU verification migrations');
assert.ok(setupScript.includes('d1HasColumn') && setupScript.includes('ALTER TABLE products ADD COLUMN sku_verified') && setupScript.includes('ALTER TABLE order_items ADD COLUMN sku_verified'), 'Setup must add SKU verification columns idempotently instead of rerunning ALTER TABLE blindly');
assert.ok(!/TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_FROM_NUMBER|warranty_verifications/.test(setupScript), 'Setup must not depend on obsolete OTP/SMS configuration or tables');
const warrantyMigration = readFileSync('migrations/0006_remove_warranty_otp.sql', 'utf8');
assert.ok(!/DROP\s+TABLE/i.test(warrantyMigration), 'Migration must not drop production tables');
assert.ok(!/CREATE TABLE|ALTER TABLE|DROP TABLE/i.test(warrantyMigration), 'Migration 0006 must not change production schema');
// The isolated Admin deployment workflow must coexist with the shared Pages workflow on main.
const isolatedAdminDeployPath = '.github/workflows/deploy-admin-isolated-preview.yml';
assert.ok(existsSync(isolatedAdminDeployPath),
  'The Admin isolated Preview workflow must use a distinct filename to avoid the main workflow path conflict.');
const isolatedAdminDeployWorkflow = readFileSync(isolatedAdminDeployPath, 'utf8');
assert.ok(isolatedAdminDeployWorkflow.includes('CLOUDFLARE_PAGES_PROJECT: sindarealest-admin-preview'),
  'The isolated workflow must pin the dedicated Admin Preview project.');
assert.ok(isolatedAdminDeployWorkflow.includes('refs/heads/feature/admin-isolated-handoff-2026-10-20'),
  'The isolated workflow must guard the exact approved branch.');
const adminDiagnosticsWorkflow = readFileSync('.github/workflows/admin-preview-diagnostics.yml', 'utf8');
assert.ok(adminDiagnosticsWorkflow.includes('deploy-admin-isolated-preview.yml'),
  'Changes to the isolated deployment workflow must trigger the exact-SHA Preview diagnostics.');
assert.ok(isolatedAdminDeployWorkflow.includes('npx wrangler pages deploy public'),
  'The isolated workflow must deploy only the approved public ADMIN build to the isolated Pages project.');
assert.ok(!isolatedAdminDeployWorkflow.includes('CLOUDFLARE_PAGES_PROJECT: ${{ vars.CLOUDFLARE_PAGES_PROJECT }}'),
  'The isolated workflow must not inherit the shared Pages project variable.');
const isolatedPreviewSpecPath = 'tests/e2e/admin-isolated-preview.spec.js';
assert.ok(existsSync(isolatedPreviewSpecPath),
  'The isolated Admin E2E spec must use a distinct path from main\'s shared Admin Preview spec.');
const isolatedPreviewSpec = readFileSync(isolatedPreviewSpecPath, 'utf8');
assert.ok(isolatedPreviewSpec.includes('sindarealest-admin-preview.pages.dev'),
  'The isolated Admin E2E spec must remain pinned to the isolated Preview host.');
const deployReadme = readFileSync('README-DEPLOY.txt', 'utf8');
assert.ok(deployReadme.includes('migrations/0004_admin_notifications.sql') && deployReadme.includes('migrations/0005_address_warranty_verification.sql') && deployReadme.includes('migrations/0006_remove_warranty_otp.sql') && deployReadme.includes('migrations/0007_order_contact_details.sql') && deployReadme.includes('migrations/0008_product_sku_verification.sql'), 'Deployment guide must match current migration sequence');
assert.ok(!/TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_FROM_NUMBER/.test(deployReadme), 'Deployment guide must not require obsolete SMS credentials');
const deployScript = readFileSync(new URL('../scripts/deploy-cloudflare.mjs', import.meta.url), 'utf8');
assert.ok(deployScript.includes('GITHUB_REF_NAME'), 'CI must reject deploy from a source branch different from production');
assert.ok(deployScript.includes('CLOUDFLARE_PAGES_ORIGINALS_READY'), 'Deploy must be blocked until private ORIGINALS is verified');
const requiredPaymentSchemaQueries = [
  "SELECT fulfillment_type FROM products LIMIT 0;",
  "SELECT fulfillment_type FROM order_items LIMIT 0;",
  "SELECT payment_terms_confirmed_at, payment_terms_confirmed_by, payment_terms_note, public_access_token_hash FROM orders LIMIT 0;",
  "SELECT id, order_id, installment_type, amount, shipping_benefit, transfer_reference, qr_image_key, bank_name, account_number, account_name, status, created_by, created_at, updated_at FROM order_payment_requests LIMIT 0;",
  "SELECT id, order_id, payment_request_id, direction, amount, transaction_reference, note, actor, verified_at, created_at FROM order_payment_transactions LIMIT 0;",
];
for (const query of requiredPaymentSchemaQueries) {
  assert.ok(setupScript.includes(query), 'Setup must verify migration 0009 schema before deployment: ' + query);
  assert.ok(deployScript.includes(query), 'Deploy must verify migration 0009 schema before deployment: ' + query);
}
assert.ok(!setupScript.includes('--file=migrations/0009_fulfillment_and_manual_payments.sql'), 'Setup must not silently apply migration 0009 remotely');
assert.ok(!deployScript.includes('--file=migrations/0009_fulfillment_and_manual_payments.sql'), 'Deploy must not apply migration 0009 automatically');
const setupPaymentPreflight = setupScript.indexOf('Xác minh schema fulfillment/payment của migration 0009 trước seed/deploy');
const setupSeedCommand = setupScript.indexOf("--file=migrations/0002_seed_products.sql");
const setupSeedCount = setupScript.indexOf('let productCount = readProductCount(dbName)');
const setupPagesDeploy = setupScript.indexOf("runWrangler(['pages', 'deploy'");
assert.ok(setupPaymentPreflight >= 0 && setupPaymentPreflight < setupSeedCount && setupPaymentPreflight < setupSeedCommand,
  'Setup must verify migration 0009 schema before reading or seeding products');
assert.ok(setupPaymentPreflight < setupPagesDeploy, 'Setup must fail closed before Pages deployment');
const deployPaymentPreflight = deployScript.indexOf('Xác minh schema fulfillment/payment migration 0009 trước deploy');
const deployPagesDeploy = deployScript.indexOf("runWrangler(['pages', 'deploy'");
assert.ok(deployPaymentPreflight >= 0 && deployPaymentPreflight < deployPagesDeploy, 'Deploy must fail closed on a missing 0009 schema before Pages deployment');
assert.ok(setupScript.includes('originalsBucket === bucket'), 'Setup must require ORIGINALS separate from IMAGES');
assert.ok(workflow.includes("CLOUDFLARE_PAGES_ORIGINALS_READY: 'true'"), 'Deploy may set readiness only after the mandatory verifier succeeds');
assert.ok(workflow.indexOf('Verify Production Pages and private R2 bindings') < workflow.indexOf('Deploy to verified Cloudflare Pages project'), 'Actual production bindings must be verified before deployment');
assert.ok(workflow.includes('node scripts/verify-pages-bindings.mjs'), 'Deployment must run the production binding verifier');
assert.ok(!workflow.includes('continue-on-error:'), 'Production binding verification must fail closed');
const bindingVerifier = readFileSync(new URL('../scripts/verify-pages-bindings.mjs', import.meta.url), 'utf8');
assert.ok(bindingVerifier.includes('deployment_configs?.production'), 'Binding verifier must inspect production, not preview, settings');
assert.ok(bindingVerifier.includes('buckets.IMAGES?.name') && bindingVerifier.includes('buckets.ORIGINALS?.name'), 'Binding verifier must require IMAGES and ORIGINALS');
assert.ok(bindingVerifier.includes('images === originals'), 'Binding verifier must reject the same bucket for public images and private originals');
assert.ok(bindingVerifier.includes('/managed') && bindingVerifier.includes('/custom'), 'Binding verifier must inspect both r2.dev and custom-domain public access');
assert.ok(bindingVerifier.includes('assertPrivateR2Access'), 'Deployment must fail closed if ORIGINALS is publicly accessible');
assert.ok(setupScript.includes('confirm !== `DEPLOY ${project} USING ${dbName} AND ${bucket} AND ${originalsBucket}`'), 'Setup confirmation must include both R2 bucket names');
assert.ok(workflow.includes('node scripts/verify-pages-bindings.mjs'), 'Deployment must run the production binding verifier');
assert.ok(workflow.indexOf('npm run check') < workflow.indexOf('npm run deploy'));
assert.ok(workflow.indexOf('npm test') < workflow.indexOf('npm run deploy'));
assert.ok(!workflow.includes('continue-on-error:'), 'Production binding verification must fail closed');
assert.ok(!workflow.includes('migrations/0001_schema.sql'), 'Deploy workflow must not modify D1 schema automatically');
assert.ok(!workflow.includes('0002_seed_products.sql'), 'Deploy workflow must not seed D1 automatically');
const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
assert.ok(!/^\s*pages_build_output_dir\s*=/m.test(wranglerConfig), 'Do not opt into Wrangler production config until actual Pages config has been downloaded and reconciled');
assert.ok(existsSync('public/index.html'));
assert.ok(existsSync('public/admin/index.html'));
const storefrontSource = readFileSync('public/index.html', 'utf8');
const adminSource = readFileSync('public/admin/index.html', 'utf8');
function assertUniqueStaticIds(source, label) {
  const ids = [...source.matchAll(/(?:^|\s)id=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${label} must not contain duplicate static HTML id attributes`);
}
assertUniqueStaticIds(storefrontSource, 'Storefront');
assertUniqueStaticIds(adminSource, 'Admin');
assert.ok(storefrontSource.includes('Tư vấn/đặt hàng qua Zalo'), 'The separate Zalo contact CTA must keep the approved label');
assert.ok(!storefrontSource.includes('Tư Vấn 24/7'), 'Do not claim 24/7 availability without confirmation');
assert.ok(!storefrontSource.includes('Da tuyển chọn'), 'Do not claim an unverified leather selection process');
for (const unsupportedClaim of ['Da Cá Sấu Thật', 'Thiết Kế Độc Quyền', 'Bảo Hành Uy Tín', 'Giao Hàng Toàn Quốc', 'Chính sách rõ ràng', 'Đẳng Cấp Thật', 'Từ Chất Liệu Thật', 'Cam kết chất lượng']) {
  assert.ok(!storefrontSource.includes(unsupportedClaim), `Storefront must not assert an unverified claim: ${unsupportedClaim}`);
}
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
assert.ok(deployReadme.includes('R2 Storage: Read') && deployReadme.includes('HTTP 403'), 'Deployment guide must explain the read-only R2 permissions needed for public-access verification');
const integratedReadme = readFileSync('README-INTEGRATED-VI.txt', 'utf8');
assert.ok(integratedReadme.includes('`ORIGINALS`') && integratedReadme.includes('CLOUDFLARE_PAGES_ORIGINALS_READY'), 'Integrated guide must document private originals and deployment readiness');
const upgradeReport = readFileSync('UPGRADE-REPORT.md', 'utf8');
assert.ok(upgradeReport.includes('không đóng dấu logo trực tiếp vào file WebP mới'), 'Upgrade report must match the clean WebP upload implementation');
const notificationsSource = readFileSync('functions/_notifications.js', 'utf8');
assert.ok(notificationsSource.includes('mailto:dacasau.sindarealest@gmail.com'), 'VAPID fallback subject must use the verified SinDarealest contact');
assert.ok(!notificationsSource.includes('mailto:admin@sindarealest.com'), 'VAPID fallback must not contain an unverified placeholder email');

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
