import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sanitizeText, sanitizeUrl } from '../scripts/sanitize-audit-value.mjs';
import { buildCloudflareAccessHeaders } from '../scripts/cloudflare-access-service-token.mjs';
import { validatePreviewUrl, matchesPreviewDeployment, inspectPreviewDeployment } from '../scripts/verify-cloudflare-preview-deployment.mjs';

const workflow = readFileSync(new URL('../.github/workflows/liquid-glass-visual-preview.yml', import.meta.url), 'utf8');
const live = readFileSync(new URL('../scripts/capture-cloudflare-preview.mjs', import.meta.url), 'utf8');
const deploymentVerifier = readFileSync(new URL('../scripts/verify-cloudflare-preview-deployment.mjs', import.meta.url), 'utf8');
const compare = readFileSync(new URL('../scripts/compare-website-screenshots.mjs', import.meta.url), 'utf8');

const allowedPreview = validatePreviewUrl('https://3ed49bcc.sindarealest2.pages.dev/');
assert.equal(allowedPreview.origin, 'https://3ed49bcc.sindarealest2.pages.dev');
for (const invalidUrl of [
  'https://sindarealest2.pages.dev/',
  'http://3ed49bcc.sindarealest2.pages.dev/',
  'https://example.com/',
  'https://3ed49bcc.sindarealest2.pages.dev/?token=secret',
  'https://user:pass@3ed49bcc.sindarealest2.pages.dev/',
]) {
  assert.throws(() => validatePreviewUrl(invalidUrl), /Refused URL/,
    'Deployment verifier must reject unsafe Preview target: ' + invalidUrl);
}
const validDeployment = {
  id: 'deployment-preview-123',
  url: 'https://3ed49bcc.sindarealest2.pages.dev',
  aliases: ['https://3ed49bcc.sindarealest2.pages.dev'],
  environment: 'preview',
  status: 'success',
  created_on: '2026-10-20T01:00:00.000Z',
  latest_stage: { name: 'deploy', status: 'success' },
  deployment_trigger: {
    metadata: {
      branch: 'fix/liquid-glass-audit-2026-10-19',
      commit_hash: 'a'.repeat(40),
      commit_message: 'Test Preview commit',
    },
  },
};
assert.equal(matchesPreviewDeployment(validDeployment, allowedPreview), true,
  'A matching deployment alias must be recognized.');
assert.equal(matchesPreviewDeployment(validDeployment, 'https://other.sindarealest2.pages.dev'), false,
  'A different Preview hostname must not match.');
const inspected = inspectPreviewDeployment(validDeployment);
assert.equal(inspected.verified, true, 'Only a successful Preview with a concrete branch and SHA should verify.');
assert.equal(inspected.metadata.commitHash, 'a'.repeat(40));
assert.equal(inspected.metadata.environment, 'preview');
assert.equal(inspected.metadata.branch, 'fix/liquid-glass-audit-2026-10-19');
assert.equal(inspectPreviewDeployment({ ...validDeployment, environment: 'production' }).verified, false,
  'Production deployments must never be accepted as Preview evidence.');
assert.equal(inspectPreviewDeployment({ ...validDeployment, status: 'active' }).verified, false,
  'An unfinished deployment must fail closed.');
assert.equal(inspectPreviewDeployment({
  ...validDeployment,
  deployment_trigger: { metadata: { branch: 'fix/test', commit_hash: 'not-a-sha' } },
}).verified, false, 'A missing/invalid deployment commit SHA must fail closed.');


assert.match(workflow, /capture_source[\s\S]*cloudflare-preview[\s\S]*local-static-fixture/,
  'Capture source must be explicit with a live Preview option.');
assert.match(workflow, /inputs\.capture_source == 'cloudflare-preview'/,
  'Only real Cloudflare Preview captures may be archived into start/end folders.');
assert.match(workflow, /node scripts\/validate-cloudflare-preview-url\.mjs/,
  'The manual live-capture gate must use the tested Preview URL validator.');
assert.match(workflow, /artifacts\/liquid-glass-preview\/live-preview/,
  'The archive must source files from the dedicated live-capture directory.');
assert.match(workflow, /audit\.sourceKind !== 'cloudflare-pages-preview-live-read-only'/,
  'The archive must reject non-live or fixture-only reports.');
assert.match(workflow, /Verify actual Cloudflare Pages deployment before manual capture\/archive/,
  'Manual screenshot archiving must verify the actual deployed revision before capturing.');
assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID:\s*\$\{\{\s*vars\.CLOUDFLARE_ACCOUNT_ID\s*\}\}/,
  'The deployment verifier must read the Cloudflare account ID from a GitHub Actions variable.');
assert.match(workflow, /CLOUDFLARE_PAGES_READ_TOKEN:\s*\$\{\{\s*secrets\.CLOUDFLARE_PAGES_READ_TOKEN\s*\}\}/,
  'The deployment verifier must use a read-only token from GitHub Actions secrets.');
assert.match(workflow, /deployment-verification\.json[\s\S]*verification\.passed === true[\s\S]*deployed\.environment === 'preview'/,
  'The archive gate must reject any deployment not positively verified as a Preview.');
assert.match(workflow, /manifest\.previewDeploymentCommit = deployed\.commitHash/,
  'The manifest must record the API-verified deployed commit, separate from the workflow source commit.');
assert.match(deploymentVerifier, /searchParams\.set\('env', 'preview'\)/,
  'The Cloudflare API query must list Preview deployments only.');
assert.match(deploymentVerifier, /metadata\.commit_hash/,
  'The verifier must extract the actual deployment-trigger commit hash.');
assert.match(deploymentVerifier, /latestStageStatus === 'success'/,
  'The verifier must reject Preview deployments that have not completed successfully.');
assert.match(deploymentVerifier, /new URL\(alias\)\.origin\.toLowerCase\(\)/,
  'The verifier must match the requested deployment alias to the API metadata.');
assert.match(deploymentVerifier, /environment === 'preview'/,
  'The verifier must fail closed unless the matched deployment is explicitly a Preview.');
assert.doesNotMatch(deploymentVerifier, /method:\s*'POST'|method:\s*'PATCH'|method:\s*'DELETE'/,
  'The deployment verifier must remain read-only.');

assert.match(live, /cloudflare-pages-preview-live-read-only/,
  'The direct capture must identify its source.');
assert.match(live, /sindarealest2\\\.pages\\\.dev/,
  'The direct capture must restrict the Pages hostname and exclude Production.');
assert.match(live, /GET', 'HEAD'/,
  'The live capture must allow only GET/HEAD requests.');
assert.match(live, /accessBlocked/,
  'The live capture must detect and report Access gates.');
assert.match(live, /u\.hostname\.toLowerCase\(\)\.endsWith\('\.cloudflareaccess\.com'\)/,
  'A cross-origin Cloudflare Access login redirect must be classified before the browser navigation is blocked.');
assert.match(live, /external navigation was blocked and no credentials were entered/i,
  'Access-gated Preview checks must record a non-bypass decision and must not enter credentials.');
assert.match(live, /blocked: audit\.accessBlocked/,
  'A blocked Access redirect must stop route probing instead of repeating generic navigation failures.');
assert.match(live, /accessServiceTokenConfigured: Object\.keys\(accessHeaders\)\.length > 0/,
  'The audit must record only a boolean indicating whether optional Access token headers are configured.');
assert.match(live, /accessServiceTokenConfigured: audit\.accessServiceTokenConfigured/,
  'The safe Access-token configuration boolean must be visible in the diagnostic summary.');
assert.match(live, /buildCloudflareAccessHeaders/,
  'Preview capture must use the tested optional Cloudflare Access service-token helper.');
assert.match(live, /Object\.keys\(accessHeaders\)\.length > 0[\s\S]*route\.continue\(\{ headers: \{ \.\.\.req\.headers\(\), \.\.\.accessHeaders \} \}\)/,
  'Access service-token headers must be attached only after the same-origin allowlist and read-only method checks.');
assert.match(live, /u\.origin !== origin[\s\S]*return route\.abort\(\)/,
  'Cross-origin requests must be blocked before any Access service-token header is attached.');

assert.match(live, /new URL\(sourceUrl\)\.origin !== origin/,
  'Console errors from the external Access login page must not be reported as storefront errors.');
assert.match(live, /sanitizeUrl\(info\.url\)/,
  'Access redirect query strings must be removed before they are saved.');
assert.doesNotMatch(live, /legacy-products\.json|scenarioProducts/,
  'The direct capture must not use legacy fixtures or mock product API responses.');
assert.match(live, /name: 'mobile-360', width: 360, height: 800/,
  'Live Preview capture must include the required 360×800 mobile viewport.');
assert.match(live, /name: 'mobile-390', width: 390, height: 844/,
  'Live Preview capture must include the required 390×844 mobile viewport.');
assert.match(live, /name: 'tablet-768', width: 768, height: 1024/,
  'Live Preview capture must include the required 768×1024 tablet viewport.');
assert.match(live, /name: 'desktop-1440', width: 1440, height: 900/,
  'Live Preview capture must include the required 1440×900 desktop viewport.');
assert.match(live, /captureKeySections[\s\S]*sectionTargets/,
  'Live capture must cover core page sections, including the six benefit tiles and footer.');
assert.match(live, /product-detail-direct-open[\s\S]*product-detail-reload/,
  'Live capture must directly open and reload a route derived from a real rendered product.');
assert.match(live, /Path derived from an actual rendered Preview product card/i,
  'Product route checks must be derived from actual Preview card navigation.');
assert.doesNotMatch(live, /\/san-pham\/sd2929|\/sanpham\/giaytay\/sd2929/,
  'Do not probe example product URLs as if their product/category were verified.');
assert.match(compare, /pixelmatch[\s\S]*start-of-work[\s\S]*end-of-work/,
  'The screenshot comparator must compare start/end archives.');
assert.match(compare, /DIMENSION_MISMATCH|PIXEL_CHANGED/,
  'The comparator must report pixel differences and dimension mismatch separately.');

for (const scriptPath of [
  '../scripts/capture-cloudflare-preview.mjs',
  '../scripts/verify-cloudflare-preview-deployment.mjs',
  '../scripts/cloudflare-access-service-token.mjs',
  '../scripts/compare-website-screenshots.mjs',
  '../scripts/validate-cloudflare-preview-url.mjs',
  '../scripts/sanitize-audit-value.mjs',
  '../scripts/cloudflare-access-service-token.mjs',
]) {
  const absolutePath = fileURLToPath(new URL(scriptPath, import.meta.url));
  const syntax = spawnSync(process.execPath, ['--check', absolutePath], { encoding: 'utf8' });
  assert.equal(syntax.status, 0,
    'Script syntax must validate: ' + scriptPath + '\\n' + (syntax.stderr || syntax.stdout || 'no diagnostic'));
}


const validatorPath = fileURLToPath(new URL('../scripts/validate-cloudflare-preview-url.mjs', import.meta.url));
for (const [candidate, expected] of [
  ['https://3ed49bcc.sindarealest2.pages.dev/', 0],
  ['https://preview-fix.sindarealest2.pages.dev/', 0],
  ['https://sindarealest2.pages.dev/', 1],
  ['http://3ed49bcc.sindarealest2.pages.dev/', 1],
  ['https://example.com/', 1],
  ['https://3ed49bcc.sindarealest2.pages.dev/?x=1', 1],
]) {
  const checked = spawnSync(process.execPath, [validatorPath, candidate], { encoding: 'utf8' });
  assert.equal(checked.status, expected,
    'Preview URL allowlist case failed for ' + candidate + ': ' + (checked.stderr || checked.stdout || 'no diagnostic'));
}

assert.equal(sanitizeUrl('https://example.pages.dev/cdn-cgi/access/login?meta=signed.secret&kid=key#token'), 'https://example.pages.dev/cdn-cgi/access/login');
assert.equal(sanitizeUrl('https://example.pages.dev/path?token=secret'), 'https://example.pages.dev/path');
assert.doesNotMatch(sanitizeText('Redirect to https://example.pages.dev/login?meta=secret.jwt&state=signed'), /secret|signed/);

assert.deepEqual(buildCloudflareAccessHeaders({}), {},
  'No service token should be sent when both optional secrets are absent.');
assert.deepEqual(buildCloudflareAccessHeaders({ CF_ACCESS_CLIENT_ID: ' client-id ', CF_ACCESS_CLIENT_SECRET: ' client-secret ' }), {
  'cf-access-client-id': 'client-id',
  'cf-access-client-secret': 'client-secret',
}, 'A configured service token should be trimmed and converted to request headers.');
assert.throws(() => buildCloudflareAccessHeaders({ CF_ACCESS_CLIENT_ID: 'client-id' }),
  /requires both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET/,
  'Incomplete Access credentials must fail closed without exposing secret values.');
assert.throws(() => buildCloudflareAccessHeaders({ CF_ACCESS_CLIENT_SECRET: 'client-secret' }),
  /requires both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET/,
  'A secret without the matching client ID must fail closed.');
assert.match(workflow, /CF_ACCESS_CLIENT_ID:\s*\$\{\{\s*secrets\.CF_ACCESS_CLIENT_ID\s*\}\}/,
  'The live capture workflow must read its client ID from GitHub Actions secrets, never literals.');
assert.match(workflow, /CF_ACCESS_CLIENT_SECRET:\s*\$\{\{\s*secrets\.CF_ACCESS_CLIENT_SECRET\s*\}\}/,
  'The live capture workflow must read its client secret from GitHub Actions secrets, never literals.');

console.log('PASS: Preview capture is source-restricted/read-only, optional Access service-token credentials are paired, isolated to the Preview origin, and never logged; Production URLs are rejected and secrets are redacted.');
