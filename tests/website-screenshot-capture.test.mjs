import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sanitizeText, sanitizeUrl } from '../scripts/sanitize-audit-value.mjs';
import { buildCloudflareAccessHeaders } from '../scripts/cloudflare-access-service-token.mjs';

const workflow = readFileSync(new URL('../.github/workflows/liquid-glass-visual-preview.yml', import.meta.url), 'utf8');
const live = readFileSync(new URL('../scripts/capture-cloudflare-preview.mjs', import.meta.url), 'utf8');
const compare = readFileSync(new URL('../scripts/compare-website-screenshots.mjs', import.meta.url), 'utf8');

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
assert.match(compare, /pixelmatch[\s\S]*start-of-work[\s\S]*end-of-work/,
  'The screenshot comparator must compare start/end archives.');
assert.match(compare, /DIMENSION_MISMATCH|PIXEL_CHANGED/,
  'The comparator must report pixel differences and dimension mismatch separately.');

for (const scriptPath of [
  '../scripts/capture-cloudflare-preview.mjs',
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
