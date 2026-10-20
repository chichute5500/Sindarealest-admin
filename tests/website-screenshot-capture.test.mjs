import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

console.log('PASS: live Preview capture is source-restricted/read-only, source URL allowlist rejects Production, and capture/diff scripts pass Node syntax validation.');
