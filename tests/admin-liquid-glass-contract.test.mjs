import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const adminHtml = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');

function has(value, label) {
  assert.ok(adminHtml.includes(value), `ADMIN contract missing ${label}`);
}

// Approved ADMIN visual tokens and both theme surfaces.
has('--bg:#eaf3fb;', 'ice-blue light background token');
has('--ink:var(--sd-admin-ink);', 'one shared Admin foreground token');
has('--sd-admin-ink:#091632;', 'reference navy light text token');
has('--gold:#5c91b9;', 'blue accent token');
has('--bg:#061522;', 'dark background token aligned with Storefront');
has('--ink:#edf7ff;', 'dark text token aligned with Storefront');
has('backdrop-filter:blur(22px)', 'liquid-glass blur layer');
has('data-admin-theme="dark"', 'dark-theme rules');
has('id="adminThemeColor" content="#eaf3fb"', 'light Android browser chrome theme color');
has("themeColor.setAttribute('content',dark?'#061522':'#eaf3fb')", 'dynamic dark/light Android browser chrome color');
assert.ok(adminHtml.indexOf("Apply the saved/system theme before styles paint") < adminHtml.indexOf('<style>'), 'Theme selection must run before CSS to reduce theme flash');
has("$('#backdrop').classList.add('hidden')", 'editor overlay reset before login session check');
has('prefers-reduced-motion:reduce', 'reduced-motion support');
has('@media (forced-colors: active)', 'Windows High Contrast / forced-colors support');
has('outline: 2px solid Highlight;', 'system-color keyboard focus indicator in forced-colors mode');
has('border-color: CanvasText;', 'control boundaries in forced-colors mode');

// System theme is the default until the administrator explicitly chooses light/dark.
has("let adminThemeMode='auto';", 'system theme default');
has("sessionStorage.getItem('sd-admin-theme-override-v2')||'auto'", 'system theme fallback when no tab-scoped override is saved');
has("if(mode==='auto')applyAdminTheme('auto')", 'system theme change listener');

has("sessionStorage.setItem('sd-admin-theme-override-v2',next)", 'Admin manual override scoped to current tab');
has("sessionStorage.removeItem('sd-admin-theme-override-v2')", 'Admin restores OS preference on refresh/new entry');
assert.doesNotMatch(adminHtml,/localStorage\.getItem\('sd-theme-mode'\)/,'Admin must not read stale legacy Storefront theme key');
has('color-scheme:only light;', 'protect explicit light UI from browser forced darkening');
has('color-scheme:only dark;', 'protect dark UI from browser forced lightening');

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

// Owner-approved compact product editor: no SKU, stock or visibility input.
for (const [id, label] of [
  ['generateDescription', 'AI description suggestion action'],
  ['pDescription', 'editable product description'],
  ['pPrice', 'optional product price input']
]) has(`id="${id}"`, label);
for(const id of ['pSku','pSkuVerified','pStock','pPublished'])
 assert.ok(!adminHtml.includes('id="'+id+'"'), 'Removed legacy product editor field: '+id);
has("sku:editing?.sku||'',skuVerified:editing?.skuVerified??true", 'existing SKU remains unchanged');
has("stock:editing?.stock??null", 'stored stock remains unchanged');
has("published:editing?.published??true", 'new products default visible; existing status remains');
has('AI chỉ đề xuất nội dung; hãy kiểm tra và chỉnh sửa trước khi lưu.', 'human review before saving AI-suggested copy');
has('class="product-description-heading"', 'description and AI action share heading row');
has('placeholder="Chưa có giá"', 'unknown price is not invented');
has('aria-label="Nhóm thông tin sản phẩm"', 'product editor tabs have an accessible group label');

// Screen 8 customer cards should be compact on phones without inventing missing totals or profile photos.
has("class='customer-mobile-summary'", 'compact customer mobile summary');
has('#main .customer-table .customer-desktop-identity{display:none!important}', 'desktop customer identity stays hidden despite later desktop identity styles when the compact phone card is active');
has("class='customer-mobile-details'", 'progressively disclosed customer contact/address details');
has("customer-mobile-last-order", 'last order date based only on server-returned customer data');
has("#main .customer-table tbody tr:has(.customer-mobile-summary)>td:nth-child(n+2){display:none!important}", 'phone cards avoid repeating the verbose desktop table cells');
has("class=\"pagehead customer-pagehead\"", 'customer page heading has a scope for compact mobile layout');
assert.match(adminHtml, /customer-mobile-extra[\\s\\S]*?c\\.email\\|\\|'Chưa cung cấp'[\\s\\S]*?c\\.address\\|\\|'Chưa cung cấp'/,
  'Email and address remain available in an accessible details disclosure');
assert.doesNotMatch(adminHtml, /customer-mobile-(?:total|revenue|amount)/,
  'Customer cards must not invent order totals/revenue that the endpoint does not return');

// Owner-approved order redesign: tappable cards and a focused detail screen.
for(const token of ['const filteredOrders=orders.filter','id="orderSearchBox"','id="orderStatusFilter"','id="orderPaymentFilter"','id="orderResultSummary"',
 'class="sd-order-cards"','data-order-open="${esc(o.id)}"','sd-order-advanced"','data-action="record-payment"',
 'data-action="record-refund"','data-next-status="${nextStatus}"','sdAdminEditor:true']){
 has(token,'focused order workflow: '+token);
}
has('#main .sd-order-cards{display:grid','card layout and responsive styles');
has("card.addEventListener('keydown'",'keyboard support for whole order cards');
has("if(!$('#backdrop').classList.contains('hidden'))",'history Back checks editor first');
// The product editor remains a modal; Order detail is a standalone screen with an Escape-to-list route.
has('function activateAdminModal(backdrop,initialFocusSelector)', 'modal initial focus setup');
has('function deactivateAdminModal(backdrop)', 'modal aria-hidden and focus restoration');
has('function trapAdminModalFocus(e)', 'modal keyboard focus trap');
has("document.addEventListener('keydown',trapAdminModalFocus)", 'shared keyboard handler for both modal dialogs');
has("if(e.key==='Escape'&&view==='order-detail'){e.preventDefault();closeOrderDetails()}", 'Escape leaves the dedicated Order detail screen');
has("if(e.key==='Escape'){e.preventDefault();closeEditor();return}", 'Escape closes the currently open product editor modal');

// Accessible names for repeated controls must identify the affected record, not just say "Save".
has('Đã thanh toán (đã xác minh)', 'payment status must be presented as a ledger-derived, read-only label');
has('data-action="record-payment"', 'admin must have an explicit manual verification action for real bank receipts');
assert.doesNotMatch(adminHtml, /data-payment-status=/, 'payment status must not be directly editable in the order UI');

assert.match(adminHtml, /data-action=\"save-order-detail-status\"/, 'Order detail must provide a direct update action instead of requiring navigation back to the orders list');
assert.match(adminHtml, /main\.querySelectorAll\('\[data-action=save-order-detail-status\]'\)/, 'The dedicated order-detail update action must be wired to the existing Admin orders PATCH API');

has('data-claim-status="${esc(c.id)}" aria-label="Trạng thái yêu cầu bảo hành ${esc(c.id)}"', 'accessible warranty claim status');
has('data-claim-note="${esc(c.id)}" aria-label="Ghi chú quản trị cho yêu cầu bảo hành ${esc(c.id)}"', 'accessible warranty admin note');
has('data-action="save-claim" data-id="${esc(c.id)}" aria-label="Lưu yêu cầu bảo hành ${esc(c.id)}"', 'accessible warranty claim save action');
has('Giữ để phóng to, kéo để đổi vị trí, phím Delete để gỡ ảnh.', 'whole-image gallery keyboard and screenreader instructions');
has('id="galleryTrash" class="gallery-trash" role="region" aria-label="Thả ảnh vào đây để xóa khỏi bộ ảnh"', 'single accessible gallery drop-to-trash zone');
has("galleryGrid.addEventListener('keydown'", 'keyboard image reorder/remove fallback');
has('data-toggle-published=', 'publish toggle appears on product card');
has('role="switch" aria-checked=', 'switch accessible state');
has('id="showPrices" type="checkbox" aria-label="Hiển thị giá trên website"', 'public price toggle accessible name');
has('id="welcomeEnabled" type="checkbox" aria-label="Bật lớp phủ chào mừng"', 'welcome overlay toggle accessible name');
has('id="watermarkEnabled" type="checkbox" aria-label="Bật watermark"', 'watermark toggle accessible name');

// The approved Screen 10 order puts website controls ahead of QR payment configuration.
const websiteSettingsOrder = [
  adminHtml.indexOf('id="showPrices"'),
  adminHtml.indexOf('id="welcomeEnabled"'),
  adminHtml.indexOf('id="watermarkEnabled"'),
  adminHtml.indexOf('id="paymentQrFile"')
];
assert.ok(websiteSettingsOrder.every((position, index) =>
  position >= 0 && (index === 0 || websiteSettingsOrder[index - 1] < position)
), 'Screen 10 should place price, welcome and watermark controls before the separate QR payment panel');

// Screen 10 and Screen 11 are separate views, not one long Settings page.
const settingsPageStart = adminHtml.indexOf('function settingsPage(){');
const backupPageStart = adminHtml.indexOf('function backupPage(){');
const renderFunctionStart = adminHtml.indexOf('function render(motion=null){');
assert.ok(settingsPageStart >= 0 && backupPageStart > settingsPageStart && renderFunctionStart > backupPageStart,
  'Website settings and Backup/Restore must have distinct render functions');
const settingsPageSource = adminHtml.slice(settingsPageStart, backupPageStart);
const backupPageSource = adminHtml.slice(backupPageStart, renderFunctionStart);
assert.match(settingsPageSource, /head\('Thiết lập','Cài đặt website'/, 'Screen 10 should be titled Cài đặt website');
assert.doesNotMatch(settingsPageSource, /id="backupBtn"|id="restoreFile"|Sao lưu & khôi phục/,
  'Screen 10 must not contain the Backup/Restore panel');
assert.match(backupPageSource, /head\('Dữ liệu','Sao lưu \/ Khôi phục'/, 'Screen 11 should have its own Backup/Restore heading');
assert.match(backupPageSource, /id="backupBtn"[\s\S]*id="restoreFile"/, 'Backup/Restore controls should exist only on Screen 11');
assert.match(adminHtml, /view==='backup'\?backupPage\(\)/, 'The main router should render the dedicated Backup/Restore view');
assert.match(adminHtml, /data-view="backup"[\s\S]{0,900}Sao lưu \/ Khôi phục/, 'Desktop navigation should expose Backup/Restore separately');
assert.match(adminHtml, /mobile-more-item" data-view="backup"[\s\S]{0,300}Sao lưu \/ Khôi phục/, 'Mobile More menu should expose Backup/Restore separately');
assert.match(adminHtml, /if\(view==='backup'\)\{\$\('#backupBtn'\)\.addEventListener\('click',downloadBackup\)/,
  'Backup controls should bind only while the Backup/Restore view is rendered');

// Preview CSSOM rules can group multiple selectors. Guard against regressions that
// compare the complete selectorText string to just one member of that list.
const previewSpec = readFileSync(new URL('./e2e/admin-isolated-preview.spec.js', import.meta.url), 'utf8');
has('body:has(#loginView:not(.hidden)) .topbar>.brand,', 'grouped login-shell CSS selector list');
assert.match(previewSpec, /const splitSelectorList = value => \{/, 'Preview diagnostics should parse CSS selector lists');
assert.match(previewSpec, /splitSelectorList\(rule\.selectorText\)\.includes\(normalizedHideSelector\)/,
  'Preview diagnostics should match an individual selector inside a CSS rule list');
assert.doesNotMatch(previewSpec, /normalizeSelector\(rule\.selectorText\)\s*===\s*normalizedHideSelector/,
  'Preview diagnostics must not compare a grouped selector list as one selector');

const baselineSpec = readFileSync(new URL('./e2e/admin-static-baseline.spec.js', import.meta.url), 'utf8');

// Guard the required viewport matrix so future edits cannot silently drop a required device size.
for (const [width, height] of [
  [320, 640], [360, 800], [375, 812], [390, 844],
  [412, 915], [768, 1024], [1280, 800], [1440, 900]
]) {
  assert.match(
    baselineSpec,
    new RegExp(String.raw`\{ width: ${width}, height: ${height} \}`),
    `Required ADMIN screenshot viewport ${width}x${height} must remain in the baseline matrix`
  );
}
assert.match(baselineSpec, /for \(const theme of \['light', 'dark'\]\)/,
  'The required viewport matrix must continue capturing both light and dark themes');
assert.match(adminHtml, /\.editorhead\{[^}]*background:var\(--sd-admin-sheet-face\);color:var\(--ink\)/,
  'Editor header must follow the active theme surface/text tokens');
assert.match(adminHtml, /\.editorfooter\{[^}]*background:var\(--sd-admin-sheet-face\);color:var\(--ink\)/,
  'Editor footer must follow the active theme surface/text tokens');
assert.match(adminHtml, /id="editorClose"[^>]*aria-label="Quay lại danh sách sản phẩm"[^>]*><svg[^>]*aria-hidden="true"/,
  'Editor back control should use an accessible SVG icon');
assert.match(adminHtml, /id="editorClose"[^>]*aria-label="Quay lại danh sách sản phẩm"[^>]*><svg[^>]*aria-hidden="true"[\s\S]*?<path d="M15 18 9 12 15 6">/,
  'Editor back control should use the reference back-chevron');
assert.ok(adminHtml.includes('<button id="deleteProduct" class="btn danger hidden" type="button" aria-label="Xóa sản phẩm">Xóa</button>'),
  'Product editor should use a compact visible delete label with a descriptive accessible name');
assert.ok(adminHtml.includes('<button id="saveProduct" class="btn primary" type="submit" aria-label="Lưu sản phẩm">Lưu</button>'),
  'Product editor should use a compact visible save label with a descriptive accessible name');
assert.ok(adminHtml.includes("b.disabled=true;b.textContent='Đang lưu…';b.setAttribute('aria-label','Đang lưu sản phẩm')"),
  'The save button accessible name should communicate the in-progress state');
assert.ok(adminHtml.includes("b.textContent='Lưu';b.setAttribute('aria-label','Lưu sản phẩm')"),
  'The save button should restore its compact visible label and full accessible name after completion');
assert.match(adminHtml, /:root\[data-admin-theme="dark"\] \.btn\.danger\{[^}]*background:rgba\(165,67,67,\.18\)/,
  'Destructive controls should maintain readable dark-theme contrast');
assert.match(baselineSpec, /chromeColors\.headerBg, 'Dark editor header should use the navy glass surface'\)\.toContain\('17, 34, 49'\)/,
  'The screenshot matrix should assert dark editor header contrast');

assert.match(adminHtml, /function galleryImageSrc\(value\)\s*\{/,
  'Gallery thumbnail URLs should be normalized by the dedicated helper');
assert.match(adminHtml, /esc\(galleryImageSrc\(g\.url\)\)/,
  'Gallery rendering should preserve blob/data/http image URLs and relative paths');
assert.match(baselineSpec, /setInputFiles\((?:\[|galleryFixtures\.map\()/,
  'The visual matrix should supply synthetic image files to the local gallery using the shared fixture list');
assert.match(baselineSpec, /naturalWidth > 0/,
  'Gallery screenshots should verify local thumbnails are actually loaded');
assert.match(baselineSpec, /fixtureImages: 6/,
  'Gallery evidence should record the six synthetic visual-only images and thumbnail rail');

// Guard the visual-capture harness against flaky scrolling of hidden desktop-only table rows.
assert.match(baselineSpec, /if \(prepare\) await prepare\(variant\);/,
  'Visual capture should pass viewport/theme context into screen-specific setup');
assert.match(adminHtml