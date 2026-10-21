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

// Product and order dialogs share keyboard focus management, Escape handling, and focus restoration.
has('function activateAdminModal(backdrop,initialFocusSelector)', 'modal initial focus setup');
has('function deactivateAdminModal(backdrop)', 'modal aria-hidden and focus restoration');
has('function trapAdminModalFocus(e)', 'modal keyboard focus trap');
has("document.addEventListener('keydown',trapAdminModalFocus)", 'shared keyboard handler for both modal dialogs');
has("if(backdrop.id==='orderDetailBackdrop')closeOrderDetails();else closeEditor();", 'Escape closes the currently open Admin modal');

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
assert.match(baselineSpec, /setInputFiles\((?:\[|galleryFixtures\.map\()/,
  'The visual matrix should supply synthetic image files to the local gallery using the shared fixture list');
assert.match(baselineSpec, /naturalWidth > 0/,
  'Gallery screenshots should verify local thumbnails are actually loaded');
assert.match(baselineSpec, /fixtureImages: 6/,
  'Gallery evidence should record the six synthetic visual-only images and thumbnail rail');

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
const dashboardStart = adminHtml.indexOf('function dashboard(){');
const dashboardEnd = adminHtml.indexOf('\nfunction ', dashboardStart + 20);
const dashboardSource = adminHtml.slice(dashboardStart, dashboardEnd > dashboardStart ? dashboardEnd : undefined);
assert.ok(dashboardStart >= 0 && dashboardEnd > dashboardStart, 'Dashboard source should remain a discrete render function');
assert.ok(dashboardSource.includes('products.length'), 'Dashboard product count must come from loaded product data');
assert.ok(dashboardSource.includes('stat-icon'), 'Dashboard metric icons should be included');
assert.ok(dashboardSource.includes('aria-hidden'), 'Decorative metric icons must remain hidden from assistive technology');
assert.ok(dashboardSource.includes('dashboard-shortcuts'), 'Dashboard should use the compact primary-action layout');
assert.equal((dashboardSource.match(/dashboard-shortcut.{0,60}data-(?:action|view)=/g) || []).length, 4, 'Dashboard should prioritize exactly four compact shortcuts');
assert.match(dashboardSource, /data-action=\\?"add\\?"/, 'Dashboard should preserve the create-product action');
assert.match(dashboardSource, /data-view=\\?"orders\\?"/, 'Dashboard should preserve orders navigation');
assert.match(dashboardSource, /data-view=\\?"customers\\?"/, 'Dashboard should preserve customers navigation');
assert.match(dashboardSource, /data-action=\\?"backup\\?"/, 'Dashboard should preserve backup action');
has('.dashboard-shortcuts{grid-template-columns:repeat(4,minmax(0,1fr))', 'four-column compact dashboard action layout');
assert.ok(dashboardSource.includes('dashboard-activity-table'), 'Dashboard should keep the audit table source for desktop and mobile');
for (const label of ['Thời điểm', 'Thao tác', 'Đối tượng', 'Actor']) assert.ok(dashboardSource.includes('data-label="' + label + '"'), 'Responsive audit cell should expose the ' + label + ' label');
has('.dashboard-activity-table table{width:100%;min-width:520px}', 'desktop audit table sizing');
has('.dashboard-activity-table table{display:block;width:100%;min-width:0!important;border-collapse:separate;border-spacing:0}', 'mobile audit table card layout');
has('.dashboard-activity-table td::before{content:attr(data-label)', 'mobile audit cards show each field label');



// Product editor uses accessible tabbed groups while keeping required identity fields visible.
for (const [id, label] of [
  ['productEditorTabs', 'product editor tablist'],
  ['productTabDetails', 'basic information tab'],
  ['productTabGallery', 'image tab'],
  ['productTabPricing', 'other/fulfillment tab'],
  ['productPanelDetails', 'basic information tab panel'],
  ['productPanelGallery', 'image tab panel'],
  ['productPanelPricing', 'other tab panel']
]) has('id="' + id + '"', label);
has('role="tablist" aria-label="Nhóm thông tin sản phẩm"', 'named product tablist');
has('role="tabpanel" aria-labelledby="productTabDetails"', 'basic panel relationship');
has('role="tabpanel" aria-labelledby="productTabGallery" hidden', 'initially hidden image panel');
has('role="tabpanel" aria-labelledby="productTabPricing" hidden', 'initially hidden other panel');
assert.ok(adminHtml.indexOf('id="pPrice"') < adminHtml.indexOf('id="productPanelGallery"'), 'price belongs to the basic info panel before the images tab');
assert.ok(adminHtml.indexOf('id="pStock"') < adminHtml.indexOf('id="productPanelGallery"'), 'stock belongs to the basic info panel before the images tab');
assert.ok(adminHtml.indexOf('id="productPanelGallery"') < adminHtml.indexOf('id="productPanelPricing"'), 'images tab appears before the other tab');
has("function setProductEditorTab(name,moveFocus=false)", 'shared editor tab state handler');
has("setProductEditorTab(tabs[next].dataset.productTab,true)", 'Arrow/Home/End tab keyboard navigation');
has("function openEditor(p){setProductEditorTab('details');", 'product editor resets to the details tab when opened');
has('<form id="productForm" novalidate>', 'custom product validation can reveal invalid controls hidden in another tab');
has("const invalidInput=$('#productForm').querySelector(':invalid')", 'product editor preserves native required/min/step validity checks');
has('setProductEditorTab(panel.dataset.productPanel)', 'invalid form fields reveal their owning tab before focus moves');
has('invalidInput.focus()', 'product form focuses the invalid control after opening its tab');
has('white-space:nowrap;overflow-wrap:normal;letter-spacing:-.025em', 'product editor tabs keep Vietnamese labels on a single line');
has('grid-template-columns:minmax(0,1.35fr) minmax(0,1fr) minmax(0,.65fr)', 'basic information tab receives enough width for its Vietnamese label');
has("el.tabIndex>=0&&el.getClientRects().length>0", 'modal focus trap excludes inactive tabs');
assert.match(baselineSpec, /await expect\(page\.locator\('#productTabDetails'\)\)\.toHaveAttribute\('aria-selected', 'true'\);/,
  'Playwright should verify the product editor defaults to its details tab');
assert.match(baselineSpec, /await page\.keyboard\.press\('ArrowRight'\);[\s\S]*productTabGallery/,
  'Playwright should exercise keyboard navigation to the gallery tab');
assert.match(baselineSpec, /await page\.locator\('#productTabGallery'\)\.click\(\);[\s\S]*setInputFiles\(/,
  'Synthetic image fixture should switch to the visible gallery tab before interacting');

has('aria-label="Ghi chú điều kiện đơn hàng ${esc(o.order_number)}"', 'accessible order payment terms note');
 
// Mobile gallery layout must give the primary cover priority without hiding controls or losing narrow-screen support.
has('function renderGalleryItem(g,i)', 'shared gallery thumbnail renderer');
has('class="image-cover-slot"', 'featured cover occupies its own responsive row');
has('class="image-rail" role="group" aria-label="Dải ảnh thu nhỏ, vuốt ngang để xem thêm"', 'thumbnail rail has an accessible Vietnamese group label');
has('#imageGrid .image-cover-slot .imageitem img{aspect-ratio:1.55/1;object-fit:contain;background:rgba(218,235,247,.40)}', 'cover image keeps its full composition visible on mobile');
has('#imageGrid .image-rail{display:flex;grid-column:1/-1;max-width:100%;gap:8px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:thin;padding-bottom:4px;-webkit-overflow-scrolling:touch}', 'supporting thumbnails form a horizontally scrollable rail');
has('#imageGrid .image-rail .imageitem{flex:0 0 74px;width:74px;scroll-snap-align:start}', 'thumbnail rail uses fixed mobile targets and snap points');


has('#backdrop>.editor{display:flex;flex-direction:column;padding-bottom:0}', 'product editor does not leave a trailing gutter below its sticky footer');
has('#backdrop>.editor>form{display:flex;flex:1 0 auto;flex-direction:column;min-height:0}', 'short editor tabs stretch to reserve space for sticky actions');
has('#backdrop>.editor>form>.editorcontent{flex:1 0 auto;padding-bottom:calc(24px + env(safe-area-inset-bottom))}', 'product gallery content can scroll clear of the fixed actions and Android safe area');

has('@media(max-width:360px){#imageGrid .image-rail .imageitem{flex-basis:68px;width:68px}}', 'thumbnail rail remains touchable on narrow phones');
has(':root[data-admin-theme="dark"] #imageGrid .image-cover-slot .imageitem img{background:rgba(5,14,23,.62)}', 'dark theme gallery cover background');
has('aria-label="Chuyển ảnh ${i+1} lên"', 'accessible gallery reorder controls remain present');
has("gallery.slice(1).map((item,index)=>renderGalleryItem(item,index+1)).join('')", 'all supporting images are rendered inside the mobile thumbnail rail');

has('#backdrop>.editor{display:flex;flex-direction:column;padding-bottom:0}', 'mobile editor footer remains flush with the dialog edge');
has('#backdrop>.editor>form>.editorcontent{flex:1 0 auto;padding-bottom:calc(24px + env(safe-area-inset-bottom))}', 'mobile editor safe-area scroll clearance');
has('#backdrop>.editor>form>.editorfooter{flex-shrink:0;margin-top:auto}', 'mobile editor action footer does not shrink');



console.log('PASS ADMIN ice-glass visual tokens, accessible SVG gallery controls, login contract, CSS selector matching, responsive order-row capture, and required API route strings');
