import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
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

const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
assert.ok(ciWorkflow.includes('npm run check'));
assert.ok(ciWorkflow.includes('npm test'));
assert.ok(ciWorkflow.includes('node tests/pages-routing.test.mjs'), 'Automatic CI must cover local Pages routing');
assert.ok(ciWorkflow.includes("'fix/**'") && ciWorkflow.includes("'rewrite/**'"), 'Automatic CI must validate PRs to the verified Production branch pattern');
assert.match(ciWorkflow, /on:\s*# Keep one run per PR update[\s\S]*?push:\s*branches:\s*- main[\s\S]*?pull_request:/, 'Automatic CI should run on main pushes and PR updates');
assert.ok(!/push:\s*branches:\s*[\s\S]{0,100}maintenance\//.test(ciWorkflow), 'Maintenance PR branch pushes must not duplicate the PR-triggered test run');

const manualValidationWorkflow = readFileSync('.github/workflows/validate.yml', 'utf8');
assert.ok(manualValidationWorkflow.includes('workflow_dispatch:'), 'Standalone validation must remain available on demand');
assert.ok(!/^\s*pull_request:/m.test(manualValidationWorkflow), 'Standalone workflow must not duplicate automatic PR validation');
assert.ok(!existsSync('.github/workflows/verify-project.yml'), 'Do not retain a second automatic workflow with duplicate validation steps');

const setupScript = readFileSync(new URL('../scripts/setup-cloudflare.mjs', import.meta.url), 'utf8');
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n1/5 · Áp dụng schema SQL idempotent cho D1…'"), 'Setup must require bindings/secrets before migrations');
assert.ok(setupScript.indexOf('bindingsReady') < setupScript.indexOf("'\\n5/5 · Triển khai website cùng Pages Functions…'"), 'Setup must require bindings/secrets before deploy');
assert.ok(setupScript.includes('migrations/0004_admin_notifications.sql'), 'Setup must apply admin notification migration');
assert.ok(setupScript.includes('migrations/0005_address_warranty_verification.sql'), 'Setup must apply address and warranty metadata migration');
assert.ok(setupScript.includes('migrations/0006_remove_warranty_otp.sql'), 'Setup must apply the OTP removal migration');
assert.ok(!/TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_FROM_NUMBER|warranty_verifications/.test(setupScript), 'Setup must not depend on obsolete OTP/SMS configuration or tables');

const warrantyMigration = readFileSync('migrations/0006_remove_warranty_otp.sql', 'utf8');
const freshWarrantyMigration = readFileSync('migrations/0005_address_warranty_verification.sql', 'utf8');
assert.ok(!/CREATE TABLE IF NOT EXISTS\s+warranty_verifications\b/i.test(freshWarrantyMigration), 'Fresh setup must not recreate retired warranty OTP storage');
assert.ok(!/CREATE TABLE IF NOT EXISTS\s+warranty_claim_uploads\b/i.test(freshWarrantyMigration), 'Fresh setup must not recreate retired OTP upload storage');
assert.ok(!/DROP TABLE\s+(IF EXISTS\s+)?(warranty_verifications|warranty_claim_uploads)\b/i.test(freshWarrantyMigration), 'Address/warranty migration must preserve any existing legacy data');
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

const wranglerConfig = readFileSync('wrangler.toml', 'utf8');
assert.ok(!/^\s*pages_build_output_dir\s*=/m.test(wranglerConfig), 'Do not opt into Wrangler production config until actual Pages config has been downloaded and reconciled');
assert.ok(existsSync('public/index.html'));
assert.ok(existsSync('public/admin/index.html'));
assert.ok(!existsSync('public/catalog-fallback.json'), 'Stale static catalog fallback must not shadow D1 failures');
console.log('PASS: JSON preflight helpers, CI gates, manual validation workflow, deployment target, and single-source catalog invariant.');
