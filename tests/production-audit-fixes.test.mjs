/** Read-only release regressions. No D1, R2 or Production network access. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const deploy=read('.github/workflows/deploy.yml');
assert.doesNotMatch(deploy,/run:\s*node scripts\/cutover-production-catalog-2026-10-27\.mjs/,
  'An ordinary deployment must never execute an old destructive catalog cutover');
assert.match(deploy,/npm run check/);
assert.match(deploy,/npm test/);
const store=read('public/index.html');
const opens=[...store.matchAll(/<style(?:\s|>)/gi)].length;
const closes=[...store.matchAll(/<\/style\s*>/gi)].length;
assert.equal(opens,closes,'Storefront CSS raw-text elements must not be nested');
assert.doesNotMatch(store,/<style id="sd-catalog-liquid-glass-reference-2026-10-23">/,
  'Previously invalid nested CSS token must not be reintroduced');
assert.match(store,/Removed historical nested style token and the invalid first :root rule/);
assert.equal([...store.matchAll(/\.welcome-content>\*\{animation:none!important\}/g)].length,2,
  'Only the base and reduced-motion Welcome motion guards should remain');
assert.doesNotMatch(store,/class="theme-watermark"/,
  'An invisible full-screen decorative watermark must not steal LCP or network bandwidth');
assert.doesNotMatch(store,/@keyframes sdLiquidGlassDrift/,
  'Do not animate a full-viewport background transform: Lighthouse attributed CLS 1.0 to it');
assert.match(store,/html\.js-enabled body\.welcome-active main\{visibility:hidden!important\}/,
  'Background storefront layout must stay visually hidden under the opaque Welcome splash');
assert.match(store,/height:min\(700px,calc\(100dvh - 16px\)\)!important;/,
  'Mobile Welcome must reserve its centered content box to prevent first-paint shifts');

assert.match(store,/<img class="brand-symbol" src="images\/brand-emblem-nav\.webp"/,
  'The mobile nav must reference the approved compact emblem');
assert.match(read('scripts/build-logo-asset.py'),/nav_dst=Path\("public\/images\/brand-emblem-nav\.webp"\)/,
  'Every build must generate the nav emblem to avoid a broken image');
assert.match(read('.github/workflows/audit-preview.yml'),/test -s public\/images\/brand-emblem-nav\.webp/,
  'Isolated Preview must verify that the nav emblem was built');
assert.match(deploy,/test -s public\/images\/brand-emblem-nav\.webp/,
  'Production deploy must generate the nav emblem before release');

const admin=read('public/admin/index.html');
assert.match(admin,/expectedProduct:JSON\.parse\(JSON\.stringify\(editing\)\)/,
  'Full Admin edit must send original immutable snapshot');
assert.match(admin,/type="password" autocomplete="current-password"/,
  'Restore confirmation must not expose a plain-text password input');
assert.match(admin,/X-SD-Restore-Password/);
const product=read('functions/api/admin/products/[id].js');
assert.match(product,/fields\.some\(key => JSON\.stringify\(expected\[key\]\)/);
assert.match(product,/AND updated_at IS \?/,
  'Full save must CAS all raw field values atomically before writing');
const restore=read('functions/api/admin/restore.js');
assert.match(restore,/constantTimeTextEqual\(reauth, context\.env\.ADMIN_PASSWORD\)/);
assert.match(restore,/return fail\("Cần xác thực lại mật khẩu quản trị/);
assert.match(store,/<img class="mosaic-photo" id="craftTileImage"[^>]*loading="lazy"/);
assert.ok(store.includes('src="images/brand-emblem.png"'),'Retain owner-approved gallery emblem');
assert.match(read('scripts/audit-readonly.mjs'),/#artSlide,#craftTileImage/);
// Closed account overlay appears before later material CSS and must never
// compete for Largest Contentful Paint on catalog entry.
assert.match(store,/<aside class="account-drawer glass" id="accountDrawer" style="visibility:hidden"/);
assert.match(store,/panel\.style\.visibility='';panel\.removeAttribute\('inert'\)/);
console.log('PASS: production deployment is D1 read-only, editor PUT uses CAS, CSS nested markup repaired, Restore requires fresh password.');
