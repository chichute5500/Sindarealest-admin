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
has("$('#backdrop').classList.add('hidden')", 'editor overlay reset before login session check');
has('prefers-reduced-motion:reduce', 'reduced-motion support');

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
has('data-payment-status="${esc(o.id)}" aria-label="Trạng thái thanh toán đơn hàng ${esc(o.order_number)}"', 'accessible per-order payment status select');
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

console.log('PASS ADMIN ice-glass visual tokens, login contract, grouped Preview CSS selector matching, and required API route strings');
