import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const adminHtml = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');

function has(value, label) {
  assert.ok(adminHtml.includes(value), `ADMIN contract missing ${label}`);
}

// Approved ADMIN visual tokens and both theme surfaces.
has('--bg:#eaf3fb;', 'ice-blue light background token');
has('--ink:#142a3c;', 'navy light text token');
has('--gold:#5c91b9;', 'blue accent token');
has('--bg:#09131d;', 'dark background token');
has('--ink:#eaf3fb;', 'dark text token');
has('backdrop-filter:blur(22px)', 'liquid-glass blur layer');
has('data-admin-theme="dark"', 'dark-theme rules');
has('id="adminThemeColor" content="#eaf3fb"', 'light Android browser chrome theme color');
has("themeColor.setAttribute('content',dark?'#09131d':'#eaf3fb')", 'dynamic dark/light Android browser chrome color');
assert.ok(adminHtml.indexOf("Apply the saved/system theme before styles paint") < adminHtml.indexOf('<style>'), 'Theme selection must run before CSS to reduce theme flash');
has("$('#backdrop').classList.add('hidden')", 'editor overlay reset before login session check');
has('prefers-reduced-motion:reduce', 'reduced-motion support');
has('@media (forced-colors: active)', 'Windows High Contrast / forced-colors support');
has('outline: 2px solid Highlight;', 'system-color keyboard focus indicator in forced-colors mode');
has('border-color: CanvasText;', 'control boundaries in forced-colors mode');

// System theme is the default until the administrator explicitly chooses light/dark.
has("let adminThemeMode='auto';", 'system theme default');
has("localStorage.getItem('sd-theme-mode')||'auto'", 'system theme fallback when no preference is saved');
has("if(mode==='auto')applyAdminTheme('auto')", 'system theme change listener');

// Preserve authentication markup and the core API integration contract.
for (const id of ['loginView', 'loginForm', 'password', 'appView', 'adminThemeToggle', 'logout']) {
  has(`id="${id}"`, `#${id} element`);
}

for (const route of [
  '/api/admin/session',
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/products',
  '/api/admin/orders',
  '/api/admin/customers',
  '/api/admin/warranties',
  '/api/admin/settings',
  '/api/admin/backup',
  '/api/admin/restore',
  '/api/admin/upload',
  '/api/admin/audit-logs'
]) {
  has(route, `API route ${route}`);
}

assert.equal(adminHtml.split('</style>').length - 1, 1, 'ADMIN must retain one complete style block');
assert.match(adminHtml, /<html[^>]*lang="vi"/i, 'ADMIN should declare Vietnamese document language');

// Accessible names for repeated controls must identify the affected record, not just say "Save".
has('data-order-status="${esc(o.id)}" aria-label="Trạng thái đơn hàng ${esc(o.order_number)}"', 'accessible per-order status select');
has('Đã thanh toán (đã xác minh)', 'payment status must be presented as a ledger-derived, read-only label');
has('data-action="record-payment"', 'admin must have an explicit manual verification action for real bank receipts');
assert.doesNotMatch(adminHtml, /data-payment-status=/, 'payment status must not be directly editable in the order UI');
has('data-action="save-order" data-id="${esc(o.id)}" aria-label="Lưu đơn hàng ${esc(o.order_number)}"', 'accessible per-order save action');
has('data-claim-status="${esc(c.id)}" aria-label="Trạng thái yêu cầu bảo hành ${esc(c.id)}"', 'accessible warranty claim status');
has('data-claim-note="${esc(c.id)}" aria-label="Ghi chú quản trị cho yêu cầu bảo hành ${esc(c.id)}"', 'accessible warranty admin note');
has('data-action="save-claim" data-id="${esc(c.id)}" aria-label="Lưu yêu cầu bảo hành ${esc(c.id)}"', 'accessible warranty claim save action');
has('aria-label="Chuyển ảnh ${i+1} lên"', 'gallery reorder-up accessible name');
has('aria-label="Chuyển ảnh ${i+1} xuống"', 'gallery reorder-down accessible name');
has('aria-label="Xóa ảnh ${i+1}"', 'gallery remove accessible name');
has('id="pPublished" type="checkbox" aria-label="Hiển thị sản phẩm"', 'published toggle accessible name');
has('id="showPrices" type="checkbox" aria-label="Hiển thị giá cho khách hàng"', 'public price toggle accessible name');
has('id="welcomeEnabled" type="checkbox" aria-label="Hiển thị trang chào mừng"', 'welcome page toggle accessible name');
has('id="watermarkEnabled" type="checkbox" aria-label="Bật watermark khi xem chi tiết"', 'watermark toggle accessible name');

// Preview CSSOM rules can group multiple selectors. Guard against regressions that
// compare the complete selectorText string to just one member of that list.
const previewSpec = readFileSync(new URL('./e2e/admin-preview.spec.js', import.meta.url), 'utf8');
has('body:has(#loginView:not(.hidden)) .topbar>.brand,', 'grouped login-shell CSS selector list');
assert.match(previewSpec, /const splitSelectorList = value => \{/, 'Preview diagnostics should parse CSS selector lists');
assert.match(previewSpec, /splitSelectorList\(rule\.selectorText\)\.includes\(normalizedHideSelector\)/,
  'Preview diagnostics should match an individual selector inside a CSS rule list');
assert.doesNotMatch(previewSpec, /normalizeSelector\(rule\.selectorText\)\s*===\s*normalizedHideSelector/,
  'Preview diagnostics must not compare a grouped selector list as one selector');

const baselineSpec = readFileSync(new URL('./e2e/admin-static-baseline.spec.js', import.meta.url), 'utf8');
assert.match(adminHtml, /\.editorhead\{[^}]*background:var\(--paper\);color:var\(--ink\)/,
  'Editor header must follow the active theme surface/text tokens');
assert.match(adminHtml, /\.editorfooter\{[^}]*background:var\(--paper\);color:var\(--ink\)/,
  'Editor footer must follow the active theme surface/text tokens');
assert.match(adminHtml, /id="editorClose"[^>]*aria-label="Đóng cửa sổ chỉnh sửa"[^>]*><svg[^>]*aria-hidden="true"/,
  'Editor close control should use an accessible SVG icon');
assert.match(adminHtml, /:root\[data-admin-theme="dark"\] \.btn\.danger\{[^}]*background:rgba\(165,67,67,\.18\)/,
  'Destructive controls should maintain readable dark-theme contrast');
assert.match(baselineSpec, /chromeColors\.headerBg, 'Dark editor header should use the navy glass surface'\)\.toContain\('17, 34, 49'\)/,
  'The screenshot matrix should assert dark editor header contrast');

assert.match(adminHtml, /function galleryImageSrc\(value\)\s*\{/,
  'Gallery thumbnail URLs should be normalized by the dedicated helper');
assert.match(adminHtml, /esc\(galleryImageSrc\(g\.url\)\)/,
  'Gallery rendering should preserve blob/data/http image URLs and relative paths');
assert.match(baselineSpec, /setInputFiles\(\[/,
  'The visual matrix should supply synthetic image files to the local gallery');
assert.match(baselineSpec, /naturalWidth > 0/,
  'Gallery screenshots should verify local thumbnails are actually loaded');
assert.match(baselineSpec, /fixtureImages: 2/,
  'Gallery evidence should record the two synthetic visual-only images');

// Guard the visual-capture harness against flaky scrolling of hidden desktop-only table rows.
assert.match(baselineSpec, /if \(prepare\) await prepare\(variant\);/,
  'Visual capture should pass viewport/theme context into screen-specific setup');
assert.match(adminHtml, /mobilecards/,
  'Responsive order tables should provide the mobile-card layout checked by the visual matrix');
assert.match(baselineSpec, /captureView\('order-row-details'/,
  'The visual matrix should exercise order details without relying on a hidden desktop-table scroll path');
assert.match(baselineSpec, /await page\.locator\('\[data-action="view-order-details"\]:visible'\)\.first\(\)\.click\(\);/,
  'Order-detail capture should activate a visible details control');
assert.match(baselineSpec, /await expect\(page\.locator\('#orderDetailBackdrop'\)\)\.toBeVisible\(\);/,
  'Order-detail capture should wait for the detail dialog to become visible');

// The reorder/remove gallery controls use SVG artwork, not Unicode text glyphs, while
// retaining record-specific accessible names and remaining legible in both themes.
for (const action of ['up', 'down', 'remove']) {
  assert.match(adminHtml, new RegExp('data-gallery="' + action + '"[^>]*><svg[^>]*aria-hidden="true"'),
    'Gallery action ' + action + ' should render an aria-hidden inline SVG icon');
}
assert.doesNotMatch(adminHtml, /data-gallery="(?:up|down|remove)"[^>]*>(?:←|→|×)<\/button>/,
  'Gallery controls must not fall back to Unicode arrow/delete glyphs');

assert.match(adminHtml, /<option value="all">Tất cả<\/option>/, 'Mobile category filter should use a short all-categories label');
assert.match(adminHtml, /placeholder="Ví dụ: Bảo hành đường may"/, 'Warranty-policy placeholder should fit small phone widths');
assert.doesNotMatch(adminHtml, /placeholder="Ví dụ: Bảo hành đường may — theo chính sách đã duyệt"/, 'Warranty-policy placeholder must not regress to long clipped help text');

// Reference copy: keep the Admin header and dashboard titles aligned with the approved mobile UI.
const topbarStart = adminHtml.indexOf('<header class="topbar">');
const topbarEnd = adminHtml.indexOf('</header>', topbarStart);
assert.ok(topbarStart >= 0 && topbarEnd > topbarStart
  && adminHtml.slice(topbarStart, topbarEnd).includes('<p>Luxury in Every Detail</p>'),
  'Admin chrome should use the approved brand tagline');
assert.ok(adminHtml.includes("head('Tổng quan','Tổng quan','Chào mừng, quản trị viên.'"),
  'Dashboard heading should match the approved reference rather than a marketing-style label');

console.log('PASS ADMIN ice-glass visual tokens, accessible SVG gallery controls, login contract, CSS selector matching, responsive order-row capture, and required API route strings');
