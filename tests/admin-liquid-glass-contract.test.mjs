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
const renderFunctionStart = adminHtml.indexOf('function render(){');
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
assert.match(adminHtml, /\.editorhead\{[^}]*background:var\(--paper\);color:var\(--ink\)/,
  'Editor header must follow the active theme surface/text tokens');
assert.match(adminHtml, /\.editorfooter\{[^}]*background:var\(--paper\);color:var\(--ink\)/,
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
assert.match(adminHtml, /sd-order-cards/,
  'Responsive order cards work at desktop and mobile widths');
assert.match(baselineSpec, /captureView\('order-detail', 'orders'/,
  'The visual matrix should exercise Order detail as a dedicated route from the Orders screen');
assert.match(adminHtml, /\.activity-log-cards\{display:none\}/, 'Activity log should keep an explicit desktop/table and mobile/card presentation split');
assert.match(adminHtml, /id="activityAdvancedToggle"/, 'Screen 12 should expose expandable advanced search controls rather than pushing the event list below mobile navigation');
assert.match(adminHtml, /activity-log-push-settings/, 'Screen 12 should show a notification-permission settings card with a real action');
assert.match(adminHtml, /id="activityLogEnablePush"/, 'Screen 12 log-tab notification action must use a unique DOM id distinct from the notifications-tab action');
assert.match(baselineSpec, /toContainText\(fixtureProduct\.title\)/, 'Compact mobile activity cards should assert their visible event summary, not hidden entity identifiers');

assert.match(baselineSpec, /await advancedToggle\.click\(\)/, 'Screen 12 tests should open/close advanced filters before the mobile screenshot is captured');
assert.match(adminHtml, /data-activity-entity-filter=/, 'Activity log should expose working entity-category filter buttons');
assert.match(adminHtml, /id="activityActorFilter"/, 'Activity log should provide a source-backed actor filter');
assert.match(adminHtml, /id="activityDateFrom"/, 'Activity log should provide date-range filtering from existing audit timestamps');
assert.match(baselineSpec, /Mobile activity cards should stay within the viewport/, 'Screen 12 mobile event cards should be checked for horizontal overflow');
assert.match(adminHtml, /data-action="view-order-customer"/, 'The order-detail customer card should expose a read-only view-profile action rather than an unsupported edit control');
assert.match(adminHtml, /async function showOrderCustomerProfile\(searchTerm\)/, 'The customer shortcut should route to the customer list with a searchable contact key');
assert.match(baselineSpec, /await expect\(page\.locator\('\.order-detail-page'\)\)\.toBeVisible\(\);/,
  'Order-detail capture should wait for the dedicated page to render');

// Owner replaced per-image buttons with whole-image gestures and one small
// accessible SVG trash drop target beneath the gallery. Keep them absent.
assert.match(adminHtml, /id="galleryTrash"[^>]*>[\\s\\S]*?<svg[^>]*aria-hidden="true"/,
  'Bottom-only photo trash zone must contain decorative line-art SVG');
assert.doesNotMatch(adminHtml, /data-gallery="(?:up|down|remove)"|data-image-drag-handle/,
  'Gallery must not show old arrows, per-image bins or drag grips');

assert.match(adminHtml, /<option value="all">Tất cả<\/option>/, 'Mobile category filter should use a short all-categories label');
assert.match(adminHtml, /placeholder="Ví dụ: Bảo hành đường may"/, 'Warranty-policy placeholder should fit small phone widths');
assert.doesNotMatch(adminHtml, /placeholder="Ví dụ: Bảo hành đường may — theo chính sách đã duyệt"/, 'Warranty-policy placeholder must not regress to long clipped help text');

// Reference copy: keep the Admin header and dashboard titles aligned with the approved mobile UI.
const topbarStart = adminHtml.indexOf('<header class="topbar">');
const topbarEnd = adminHtml.indexOf('</header>', topbarStart);
assert.ok(topbarStart >= 0 && topbarEnd > topbarStart
  && adminHtml.slice(topbarStart, topbarEnd).includes('<p>Luxury in Every Detail</p>'),
  'Admin chrome should use the approved brand tagline');
assert.ok(adminHtml.includes("head('BẢNG ĐIỀU KHIỂN','Tổng quan','Chào mừng, quản trị viên.'"),
  'Dashboard now has a single Tổng quan title with a separate BẢNG ĐIỀU KHIỂN eyebrow, per owner direction');
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
for (const label of ['Thời điểm', 'Thao tác', 'Đối tượng', 'Người thực hiện']) assert.ok(dashboardSource.includes('data-label="' + label + '"'), 'Responsive audit cell should expose the ' + label + ' label');
has('.dashboard-activity-table table{width:100%;min-width:520px}', 'desktop audit table sizing');
has('.dashboard-activity-table table{display:block;width:100%;min-width:0!important;border-collapse:separate;border-spacing:0}', 'mobile audit table card layout');
has('.dashboard-activity-table td::before{content:attr(data-label)', 'mobile audit cards show each field label');



// Product editor uses accessible tabbed groups while keeping required identity fields visible.
for (const [id, label] of [
  ['productEditorTabs', 'product editor tablist'],
  ['productTabDetails', 'basic information tab'],
  ['productTabGallery', 'image tab'],
  ['productPanelDetails', 'basic information tab panel'],
  ['productPanelGallery', 'image tab panel'],
  ['pFulfillmentToggle', 'order type toggle in basic information']
]) has('id="' + id + '"', label);
has('#productPanelDetails #pPrice{width:100%;min-width:0!important;max-width:100%;font-size:11px}', 'mobile editor keeps price accessible');
has('id="pPrice" class="control" type="number" min="0" step="1" inputmode="numeric" placeholder="Chưa có giá" title="Để trống nếu chưa có giá"', 'optional VND price remains');
has('role="tablist" aria-label="Nhóm thông tin sản phẩm"', 'named product tablist');
has('role="tabpanel" aria-labelledby="productTabDetails"', 'basic panel relationship');
has('role="tabpanel" aria-labelledby="productTabGallery" hidden', 'initially hidden image panel');
has('id="pFulfillmentType" type="hidden" value="made_to_order"', 'new products default to made-to-order without an extra tab');
has('id="pFulfillmentToggle" class="product-fulfillment-toggle"', 'basic info provides a direct order-type button');
assert.ok(!adminHtml.includes('id="productTabPricing"')&&!adminHtml.includes('id="productPanelPricing"'), 'the empty Other tab is removed');
assert.ok(adminHtml.indexOf('id="pPrice"') < adminHtml.indexOf('id="productPanelGallery"'), 'price belongs to the basic info panel before the images tab');
assert.ok(!adminHtml.includes('id="pStock"'), 'stock entry removed');
assert.ok(adminHtml.indexOf('id="pFulfillmentToggle"') < adminHtml.indexOf('id="productPanelGallery"'), 'order type must appear alongside category in Basic Info');
has('class="field span2 product-category-duo"', 'category and order type belong to one side-by-side row');
has('#backdrop>.editor>form>.editorcontent{flex:1 1 0%;min-height:0;overflow-y:auto;align-content:start;grid-auto-rows:max-content;', 'grid editor content must not stretch the tabs to fill spare height');
has('grid-template-columns:repeat(2,minmax(0,1fr));height:52px;min-height:52px;max-height:52px;align-self:start;', 'two equal tabs stay a fixed height on desktop');
has(' #productEditorTabs{position:sticky;top:0;height:48px;min-height:48px;max-height:48px;', 'mobile tabs stay 48px high on both panels');
has('#productPanelDetails .product-category-duo .product-category-input-row #pCategory,#productPanelDetails .product-fulfillment-toggle{height:48px;min-height:48px;max-height:48px;box-sizing:border-box}', 'category and order-type controls share identical 48px sizing');
has('#productPanelDetails .product-category-duo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))', 'two equal-width fields stay alongside each other even on narrow screens');
has("field.value=field.value==='in_stock'?'made_to_order':'in_stock'", 'one tap alternates made-to-order and ready stock');
has("!$('#pFulfillmentToggle').contains(event.target))setProductCategoryGridOpen(false)", 'outside-click dismissal must not steal the first pointer tap on the type toggle while the category grid is open');
has("p?.fulfillmentType==='in_stock'?'in_stock':'made_to_order';syncFulfillmentToggle()", 'new products default to made-to-order and editing preserves ready stock');
has("function setProductEditorTab(name,moveFocus=false)", 'shared editor tab state handler');
has("for(const panel of $$('.editor-tab-panel'))panel.hidden=panel.dataset.productPanel!==name", 'all editor tab panels are iterated without throwing when the editor opens');
has("const editorContent=$('#backdrop .editorcontent');if(editorContent)editorContent.scrollTop=0", 'switching editor tabs resets the shared scroll position so the selected panel starts at its heading');
has("setProductEditorTab(tabs[next].dataset.productTab,true)", 'Arrow/Home/End tab keyboard navigation');
has("function openEditor(p,initialTab='details'){setProductEditorTab('details');", 'product editor defaults to details, while allowing image tap to open gallery');
has('<form id="productForm" novalidate>', 'custom product validation can reveal invalid controls hidden in another tab');
has('function syncProductIdentityValidity()', 'product editor rejects whitespace-only identity fields');
has("title.setCustomValidity(title.value.trim()||(!title.required&&title.placeholder)?'':'Vui lòng nhập tên sản phẩm.')", 'title validation permits a blank value only for a new catalog product with a canonical default');
has('input.required=!isNewOfficial', 'existing products and unknown categories still require a typed name');
has("input.placeholder=DEFAULT_PRODUCT_LABELS[key]+' VIP Da Cá Sấu Mẫu #'+suffix", 'category-specific default is only a muted placeholder, never filled text');
has("category.setCustomValidity(category.value.trim()?'':'Vui lòng chọn hoặc nhập danh mục.')", 'category validation is based on trimmed content');
has("const invalidInput=$('#productForm').querySelector(':invalid')", 'product editor preserves native required/min/step validity checks');
has('setProductEditorTab(panel.dataset.productPanel)', 'invalid form fields reveal their owning tab before focus moves');
has('invalidInput.focus()', 'product form focuses the invalid control after opening its tab');
has('white-space:nowrap;overflow-wrap:normal;letter-spacing:-.025em', 'product editor tabs keep Vietnamese labels on a single line');
has('grid-template-columns:repeat(2,minmax(0,1fr));height:52px;min-height:52px;max-height:52px', 'the two remaining editor tabs share equal widths and have compact fixed height');
has("el.tabIndex>=0&&el.getClientRects().length>0", 'modal focus trap excludes inactive tabs');
assert.match(baselineSpec, /await expect\(page\.locator\('#productTabDetails'\)\)\.toHaveAttribute\('aria-selected', 'true'\);/,
  'Playwright should verify the product editor defaults to its details tab');
assert.match(baselineSpec, /await page\.keyboard\.press\('ArrowRight'\);[\s\S]*productTabGallery/,
  'Playwright should exercise keyboard navigation to the gallery tab');
assert.match(baselineSpec, /await page\.locator\('#productTabGallery'\)\.click\(\);[\s\S]*setInputFiles\(/,
  'Synthetic image fixture should switch to the visible gallery tab before interacting');

 
// Mobile gallery layout must give the primary cover priority without hiding controls or losing narrow-screen support.
has('function renderGalleryItem(g,i)', 'shared gallery thumbnail renderer');
has('class="image-cover-slot"', 'featured cover occupies its own responsive row');
has('class="image-rail" role="group" aria-label="Dải ảnh thu nhỏ"', 'thumbnail rail has an accessible Vietnamese group label');
has('#imageGrid .image-cover-slot .imageitem img{aspect-ratio:1.75/1;object-fit:contain;background:rgba(218,235,247,.40)}', 'cover image keeps its full composition visible on mobile');
has('#imageGrid .image-rail{display:flex;grid-column:1/-1;max-width:100%;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:none;scrollbar-width:thin;padding-bottom:3px;-webkit-overflow-scrolling:touch}', 'supporting thumbnails form a horizontally scrollable rail');
has('#imageGrid .image-rail .imageitem{flex:0 0 56px;width:56px;scroll-snap-align:start}', 'thumbnail rail uses fixed mobile targets and snap points');


has('#backdrop>.editor{display:flex;flex-direction:column;padding-bottom:0}', 'product editor does not leave a trailing gutter below its sticky footer');
has('@media(min-width:681px){#backdrop>.editor>.editorhead{padding-top:10px;padding-bottom:10px}#backdrop>.editor>form>.editorcontent{gap:12px}}', 'desktop product price and stock fields clear the sticky action footer at the initial scroll position');
has('#backdrop>.editor>form>.editorcontent{flex:1 1 0%;min-height:0;overflow-y:auto;align-content:start;grid-auto-rows:max-content;padding-bottom:calc(24px + env(safe-area-inset-bottom))}', 'editor content remains scrollable inside its bounded region while not stretching tab rows');
has('#backdrop{top:70px;bottom:calc(60px + env(safe-area-inset-bottom));align-items:stretch;justify-content:stretch;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}', 'mobile product editor stays below the app header with breathing room above bottom navigation');
has('#backdrop>.editor{width:100%;max-width:none;height:100%;max-height:100%;border-radius:20px;box-shadow:var(--sd-admin-shadow);background:var(--sd-admin-sheet-face);overflow:hidden}', 'mobile product editor fills only the space between app chrome and keeps footer layout contained');
has('#productEditorTabs{position:sticky;top:0;height:48px;min-height:48px;max-height:48px;gap:3px;padding:4px}', 'mobile product editor tabs stay compact without covering form fields');
has('.product-editor-tabs{position:sticky;top:0;z-index:3;', 'desktop editor tabs stick at the top of their own scroll viewport without covering gallery headings');
has('.product-mobile-status,.product-mobile-meta,.product-mobile-actions,.product-mobile-inline-meta{display:none}', 'mobile-only product facts and actions do not alter desktop table layout');
has('#main .product-table tbody tr td:nth-child(n+2){display:none!important}', 'mobile product card consolidates existing table facts without duplicating visible rows');
const repeatedGlassRule = adminHtml.match(/#main \.mobilecards tbody tr[^{}]*\.order-detail-item\s*\{([^}]*)\}/)?.[1] || '';
assert.match(repeatedGlassRule, /sd-admin-shadow/, 'repeated glass rows keep their shared shell and contact shadow');
assert.doesNotMatch(repeatedGlassRule, /backdrop-filter/, 'repeated rows avoid stacking expensive blur layers on long lists');
const productListMarkup = adminHtml.match(/function productList\(\)\{[\s\S]*?\nfunction orderProductImageMarkup/)?.[0] || '';
assert.doesNotMatch(productListMarkup, /data-action="edit"/, 'product rows open the editor without a separate edit button');
assert.doesNotMatch(productListMarkup, /Tồn kho|Chưa kiểm kê|Hết hàng|stock\(p\)/, 'inventory remains out of the product list');
has('class="thumb product-thumb-placeholder" role="img" aria-label="Chưa có ảnh sản phẩm"', 'missing product images use an explicitly labelled placeholder, not a generic branded texture');
has('.product-thumb-placeholder{display:grid;place-items:center;box-sizing:border-box;', 'missing-image placeholder remains a visual, bounded thumbnail');
has('#main .product-table .product-mobile-inline-meta{display:grid;grid-template-columns:minmax(0,1fr);gap:5px;align-items:start;margin-top:3px;max-width:100%}', 'mobile product price appears beneath product identity without adding inventory');
has('#main .product-table .product-mobile-inline-metric{display:flex;align-items:baseline;gap:3px;min-width:0;font-size:9px;line-height:1.1;white-space:nowrap}', 'mobile price label remains compact and readable');
has('#main .product-table .prodname{font-size:11px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}', 'long product titles truncate neatly without increasing mobile card height');
has('#main .product-table .product-row-info .sku{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}', 'SKU/category context wraps to two lines on 320–360px phones instead of losing its visible tail');
has('class="prodname" title="${esc(p.title)}"', 'full product titles remain available via a title attribute when visually truncated');
has('#main:has(#searchBox) .toolbar{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"search search" "category fulfillment";gap:7px;padding:10px}', 'product search spans the full mobile toolbar row');
has('.activity-log-filters .field:first-child{grid-column:1/-1}', 'activity-log search gets a full-width row on mobile');
has('.activity-log-filters .field:nth-child(2){grid-column:1}', 'activity filter select remains usable on mobile');
has('.activity-log-filters .field:nth-child(3){grid-column:2}', 'clear-filters button stays beside the activity select on mobile');
has('#main .product-table .product-visibility-toggle{min-width:59px;padding:4px 0;min-height:60px}', 'mobile card has large green/red switch');
has('function toggleProductPublished(button)', 'switch saves via CAS PATCH');
has('#main:has(#searchBox) #productResultSummary{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}', 'product result live summary remains accessible without consuming a visible row');
has('#backdrop>.editor>form{display:flex;flex:1 1 0%;flex-direction:column;min-height:0;overflow:hidden}', 'editor form is bounded above sticky actions so short and long tabs remain usable');
has('#backdrop>.editor>form>.editorcontent{flex:1 1 0%;min-height:0;overflow-y:auto;align-content:start;grid-auto-rows:max-content;padding-bottom:calc(24px + env(safe-area-inset-bottom))}', 'product gallery content can scroll clear of the fixed actions and Android safe area');

has('@media(max-width:360px){#imageGrid .image-rail .imageitem{flex-basis:52px;width:52px}}', 'thumbnail rail remains touchable on narrow phones');
has(':root[data-admin-theme="dark"] #imageGrid .image-cover-slot .imageitem img{background:rgba(5,14,23,.62)}', 'dark theme gallery cover background');
has('role="group" tabindex="0" aria-label="Ảnh ', 'whole-photo keyboard-focusable gallery entries remain accessible');
has("gallery.slice(1).map((item,index)=>renderGalleryItem(item,index+1)).join('')", 'all supporting images are rendered inside the mobile thumbnail rail');

has('#backdrop>.editor{display:flex;flex-direction:column;padding-bottom:0}', 'mobile editor footer remains flush with the dialog edge');
has('#backdrop>.editor>form>.editorcontent{flex:1 1 0%;min-height:0;overflow-y:auto;align-content:start;grid-auto-rows:max-content;padding-bottom:calc(24px + env(safe-area-inset-bottom))}', 'mobile editor safe-area scroll clearance');
has('#backdrop>.editor>form>.editorfooter{flex-shrink:0;margin-top:auto}', 'mobile editor action footer does not shrink');
has('@media(max-width:360px){#backdrop>.editor>form>.editorfooter{gap:6px;padding-left:8px;padding-right:8px}', 'narrow-phone gallery actions use a compact single-row footer');
has('#backdrop>.editor>form>.editorfooter .btn{padding-inline:9px;font-size:10px;white-space:nowrap}', 'narrow-phone gallery action labels remain on one line');



console.log('PASS ADMIN ice-glass visual tokens, accessible SVG gallery controls, login contract, CSS selector matching, responsive order-row capture, and required API route strings');

const renderStart = adminHtml.indexOf('function render(){');
assert.ok(renderStart >= 0 && adminHtml.slice(renderStart, renderStart + 600).includes("settingsPage();$$('[data-view]').forEach"),
  "Admin render must iterate every navigation button; single-element querySelector cannot be used with forEach");
console.log("PASS: Admin render iterates all nav controls via querySelectorAll helper.");
