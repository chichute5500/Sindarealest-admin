import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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
assert.ok(workflow.includes('rewrite/ai-system-2026-10-14'), 'Automatic deploy trigger must match the verified Cloudflare Pages Production branch');
const setupScript = readFileSync(new URL('../scripts/setup-cloudflare.mjs', import.meta.url), 'utf8');
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n1/5 · Áp dụng schema SQL idempotent cho D1…'"), 'Setup must require bindings/secrets before migrations');
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n5/5 · Triển khai website cùng Pages Functions…'"), 'Setup must require bindings/secrets before deploy');
assert.ok(setupScript.includes('migrations/0004_admin_notifications.sql'), 'Setup must apply admin notification migration');
assert.ok(setupScript.includes('migrations/0005_address_warranty_verification.sql'), 'Setup must apply address and warranty metadata migration');
assert.ok(setupScript.includes('migrations/0006_remove_warranty_otp.sql'), 'Setup must apply the OTP removal migration');
assert.ok(setupScript.includes('scripts/apply-ai-image-migrations.mjs') && setupScript.includes('CLOUDFLARE_D1_DATABASE: database'), 'Setup must apply AI image schema and request-limit migrations to the selected D1');
assert.ok(setupScript.indexOf('applyAiImageMigrations(dbName)') < setupScript.indexOf("'\\n5/5 · Triển khai website cùng Pages Functions…'"), 'AI image schema must be applied before deployment');
assert.ok(!/TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_FROM_NUMBER|warranty_verifications/.test(setupScript), 'Setup must not depend on obsolete OTP/SMS configuration or tables');
const aiQueueMigration = readFileSync('migrations/0007_ai_image_reviews.sql', 'utf8');
const aiSourceUrlMigration = readFileSync('migrations/0008_ai_image_source_url.sql', 'utf8');
assert.ok(aiQueueMigration.includes('CREATE TABLE IF NOT EXISTS image_ai_reviews'), 'Migration 0007 must create the AI review table');
assert.ok(!/source_url/.test(aiQueueMigration), 'Migration 0007 must not pre-create a column that migration 0008 adds');
assert.equal((aiSourceUrlMigration.match(/ADD COLUMN source_url/g) || []).length, 1, 'Migration 0008 must add source_url exactly once in a standard migration sequence');
const aiQuotaMigration = readFileSync('migrations/0009_ai_request_limits.sql', 'utf8');
assert.ok(aiQuotaMigration.includes('CREATE TABLE IF NOT EXISTS ai_request_limits'), 'Migration 0009 must create the Workers AI quota table');
const aiMigrationScript = readFileSync('scripts/apply-ai-image-migrations.mjs', 'utf8');
assert.ok(aiMigrationScript.includes('migrations/0009_ai_request_limits.sql'), 'AI setup must apply migration 0009 before calling the quota guard');
assert.ok(aiMigrationScript.indexOf('migrations/0007_ai_image_reviews.sql') < aiMigrationScript.indexOf('migrations/0009_ai_request_limits.sql'), 'AI review schema must be applied before the quota migration');
assert.ok(aiMigrationScript.includes('CLOUDFLARE_D1_TARGET'), 'AI migrations must require an explicit Preview/Production target');
assert.ok(aiMigrationScript.includes('ALLOW_PRODUCTION_D1_MIGRATIONS') && aiMigrationScript.includes('CONFIRM_PRODUCTION_D1_DATABASE'), 'Production AI migration must require explicit opt-in and exact database-name confirmation');
assert.doesNotMatch(aiMigrationScript, /CLOUDFLARE_D1_DATABASE\s*\|\|\s*["']sindarealest-db["']/, 'AI migration must not silently default to the known Production database');
assert.ok(setupScript.includes('productionDbConfirmation') && setupScript.includes("CLOUDFLARE_D1_TARGET: 'production'") && setupScript.includes('CONFIRM_PRODUCTION_D1_DATABASE'), 'Setup wizard must confirm the exact Production D1 target before migration');
assert.ok(setupScript.indexOf('productionDbConfirmation') < setupScript.indexOf("'\\n1/5 · Áp dụng schema SQL idempotent cho D1…'"), 'Exact Production D1 confirmation must occur before any SQL migration');

// Runtime regression: missing target configuration must stop before invoking
// Wrangler or contacting Cloudflare.
const migrationEnv = { ...process.env };
for (const name of ['CLOUDFLARE_D1_DATABASE', 'CLOUDFLARE_D1_TARGET', 'ALLOW_PRODUCTION_D1_MIGRATIONS', 'CONFIRM_PRODUCTION_D1_DATABASE']) delete migrationEnv[name];
const missingMigrationTarget = spawnSync(process.execPath, ['scripts/apply-ai-image-migrations.mjs'], { encoding: 'utf8', env: migrationEnv });
assert.notEqual(missingMigrationTarget.status, 0, 'AI migration must fail when no explicit target is configured');
assert.match(missingMigrationTarget.stderr || '', /CLOUDFLARE_D1_DATABASE/i, 'AI migration should explain that a named D1 target is required');

const previewOnKnownProduction = spawnSync(process.execPath, ['scripts/apply-ai-image-migrations.mjs'], {
  encoding: 'utf8',
  env: { ...migrationEnv, CLOUDFLARE_D1_DATABASE: 'sindarealest-db', CLOUDFLARE_D1_TARGET: 'preview' }
});
assert.notEqual(previewOnKnownProduction.status, 0, 'Known Production D1 must never be accepted as Preview');
assert.match(previewOnKnownProduction.stderr || '', /không thể dùng làm Preview/i);

const warrantyMigration = readFileSync('migrations/0006_remove_warranty_otp.sql', 'utf8');
assert.ok(!/DROP\s+TABLE/i.test(warrantyMigration), 'Migration must not drop production tables');
assert.ok(!/CREATE TABLE|ALTER TABLE|DROP TABLE/i.test(warrantyMigration), 'Migration 0006 must not change production schema');
const deployReadme = readFileSync('README-DEPLOY.txt', 'utf8');
assert.ok(deployReadme.includes('migrations/0004_admin_notifications.sql') && deployReadme.includes('migrations/0005_address_warranty_verification.sql') && deployReadme.includes('migrations/0006_remove_warranty_otp.sql'), 'Deployment guide must match current migration sequence');
assert.ok(!/TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_FROM_NUMBER/.test(deployReadme), 'Deployment guide must not require obsolete SMS credentials');
const deployScript = readFileSync(new URL('../scripts/deploy-cloudflare.mjs', import.meta.url), 'utf8');
assert.ok(deployScript.includes('GITHUB_REF_NAME'), 'CI must reject deploy from a source branch different from production');
assert.ok(workflow.indexOf('npm run check') < workflow.indexOf('npm run deploy'));
assert.ok(workflow.indexOf('npm test') < workflow.indexOf('npm run deploy'));
assert.ok(!workflow.includes('migrations/0001_schema.sql'), 'Deploy workflow must not modify D1 schema automatically');
assert.ok(!workflow.includes('0002_seed_products.sql'), 'Deploy workflow must not seed D1 automatically');
assert.ok(!workflow.includes('apply-ai-image-migrations.mjs'), 'Deploy workflow must not run AI D1 migrations automatically');
const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
assert.ok(!/^\s*pages_build_output_dir\s*=/m.test(wranglerConfig), 'Do not opt into Wrangler production config until actual Pages config has been downloaded and reconciled');
assert.ok(existsSync('public/index.html'));
assert.ok(existsSync('public/admin/index.html'));
assert.ok(!existsSync('public/catalog-fallback.json'), 'Stale static catalog fallback must not shadow D1 failures');
console.log('PASS: JSON preflight helpers, explicit deployment target, CI gates, and single-source catalog invariant.');
