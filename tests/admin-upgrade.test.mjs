import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url).pathname, "utf8");
const admin = read("../public/admin/index.html");
const lib = read("../functions/_lib.js");
const products = read("../functions/api/admin/products.js");
const middleware = read("../functions/_middleware.js");
const ai = read("../functions/api/admin/ai-description.js");
const push = read("../functions/api/admin/push-subscriptions.js");
assert.ok(admin.includes('id="pSku"') && admin.includes('id="pSkuVerified"') && admin.includes("skuVerified:$('#pSkuVerified').checked"), "Admin must allow a commercial SKU to be entered and explicitly verified");
assert.ok(admin.includes("Object.hasOwn(labels,log.action)"), "audit event labels must not resolve inherited prototype properties");
assert.ok(lib.includes("Object.hasOwn(aliases, categoryKey)"), "product category aliases must be prototype-safe");
assert.ok(admin.includes("-webkit-tap-highlight-color: transparent"), "Admin controls should not flash blue when tapped on Android");
assert.ok(admin.includes("sdAdminRoot") && admin.includes("sdAdminGuard"), "Admin Back must remain in admin with route state synchronized");
assert.ok(read("../functions/api/warranty-lookup.js").includes("warranty_lookup:") && !read("../functions/api/warranty-lookup.js").includes("warrantyCode: code"), "Lookup API must return only masked codes plus short-lived action tokens");
assert.ok(read("../functions/_storefront-route.js").includes("isVerifiedCommercialSku(row)") && read("../functions/_storefront-route.js").includes("encodeURIComponent(key)") && middleware.includes("canonicalProductPath(product)"), "Product canonical URL must use a verified SKU or immutable ID and category route");
assert.ok(admin.includes('id="pCategory" class="control" list="categoryOptions"'), "Product category should support selecting existing or typing new categories");
assert.ok(admin.includes("refreshCategoryOptions()"), "Product categories should expand from existing product data");
assert.ok(admin.includes("position:absolute;right:5px"), "Password eye should be compact and placed inside the right edge of the password field");
assert.ok(admin.includes('id="generateDescription"'), "AI description action missing");
assert.ok(admin.includes('id="showPassword"'), "Password visibility toggle missing");
assert.ok(admin.includes('class="password-eye-icon"') && !admin.includes('id="passwordEye"'), "Password eye SVG must not reuse a duplicate DOM id when toggled");
assert.ok(admin.includes('class="bell-icon"'), "Notification button must use a bell icon");
assert.ok(admin.includes('id="notificationCount"'), "Unread notification count badge missing");
assert.ok(admin.includes("sd-admin-last-seen"), "Unread notifications must be tracked against the last-read time");
assert.ok(admin.includes('600000'), "10-minute inactivity logout missing");
assert.ok(admin.includes('id="notificationPanel"'), "Notification center missing");
assert.ok(lib.includes("const SESSION_SECONDS = 10 * 60"), "Session should expire after ten minutes without a renewed request");
assert.ok(middleware.includes("sessionCookie(token)"), "Valid admin API activity should renew session cookie");
assert.ok(products.includes("SELECT sku FROM products"), "SKU generation should use server-side database data");
assert.ok(admin.includes("data-image-index") && admin.includes("text/x-sd-image-index"), "Admin gallery should support drag-and-drop reordering");
assert.ok(admin.includes("Liquid Glass admin skin"), "Admin should use the matching Liquid Glass visual system");
assert.ok(admin.includes('<svg viewBox="0 0 24 24" aria-hidden="true">'), "Admin navigation should use consistent line icons");
assert.ok(middleware.includes("lower(id)=?"), "Product URLs should support immutable IDs");
assert.ok(products.includes("makeCategoryPrefix(normalized)"), "New categories should receive automatic SKU prefixes without a hardcoded category list");
assert.ok(ai.includes("OPENAI_API_KEY"), "AI key must be read server-side");
const resetSkus = read("../functions/api/admin/products/reset-skus.js");
assert.ok(resetSkus.includes("categoryRules[row.categoryKey]"), "SKU reset should support future categories dynamically");
assert.ok(push.includes("requireAdmin"), "Push subscriptions must require admin authentication");
console.log("PASS: admin upgrade static regression checks.");

assert.ok(admin.includes("<h2>Đăng nhập quản trị</h2>") && admin.includes("<p>Luxury in Every Detail</p>"), "Admin login UI should use the approved Vietnamese heading and brand tagline");

const restoreApi = read("../functions/api/admin/restore.js");
assert.ok(admin.includes("f.size>20*1024*1024") && admin.includes("Tệp sao lưu vượt 20 MB."),
  "Admin restore picker must enforce the same 20 MB file limit as the API");
assert.ok(restoreApi.includes("const MAX_BACKUP_BYTES = 20 * 1024 * 1024"),
  "Restore API must retain its 20 MB hard limit");

const previewWorkflow = read("../.github/workflows/admin-preview-diagnostics.yml");
assert.ok(previewWorkflow.includes("uses: actions/checkout@v7"),
  "The isolated ADMIN diagnostic workflow must use a Node.js 24-compatible checkout action");
assert.ok(previewWorkflow.includes("uses: actions/setup-node@v7"),
  "The isolated ADMIN diagnostic workflow must use a Node.js 24-compatible setup-node action");
assert.ok(previewWorkflow.includes("uses: actions/upload-artifact@v7"),
  "Full ADMIN Playwright screenshots must remain available as a run artifact using a Node.js 24-compatible action");
assert.ok(previewWorkflow.includes('group: admin-preview-diagnostics-${{ github.ref }}-${{ github.sha }}'),
  "A hung Preview run for an older SHA must not block evidence for the current Admin branch head");
const adminFeatureDeployWorkflow = read("../.github/workflows/deploy-admin-isolated-preview.yml");
assert.ok(adminFeatureDeployWorkflow.includes("CLOUDFLARE_PAGES_PROJECT: sindarealest-admin-preview"),
  "Manual ADMIN feature deployments must be pinned to the dedicated Admin Pages project");
assert.ok(!adminFeatureDeployWorkflow.includes("vars.CLOUDFLARE_PAGES_PROJECT"),
  "Admin Preview deployment must not read the shared storefront Pages project variable");
assert.ok(adminFeatureDeployWorkflow.includes('test "$CLOUDFLARE_PAGES_PROJECT" = "sindarealest-admin-preview"'),
  "Manual ADMIN Preview deployment must refuse any Pages target except the isolated Admin project");
assert.ok(adminFeatureDeployWorkflow.includes("uses: actions/checkout@v7") &&
  adminFeatureDeployWorkflow.includes("uses: actions/setup-node@v7"),
  "Manual ADMIN Preview deployment must use Node.js 24-compatible Actions versions");

assert.ok(previewWorkflow.includes("uses: actions/upload-artifact@v7"),
  "Raw ADMIN screenshots and metadata must be stored in GitHub Actions artifacts");
assert.ok(previewWorkflow.includes("artifacts/admin-preview-evidence/") &&
  previewWorkflow.includes("test-results/") && previewWorkflow.includes("playwright-report/"),
  "The Actions artifact must include screenshots, per-test results, and the Playwright report");
assert.ok(previewWorkflow.includes("Verify branch HEAD still matches the tested SHA"),
  "The workflow must verify that the branch still points to the exact tested commit");
assert.ok(!previewWorkflow.includes("contents: write") &&
  !previewWorkflow.includes("git commit") && !previewWorkflow.includes("git push"),
  "The diagnostic workflow must not write evidence commits back to the source branch");
assert.ok(!previewWorkflow.includes("docs/admin-ui-reference/handoff/**"),
  "Evidence-only handoff updates must not trigger another diagnostic run");
assert.ok(previewWorkflow.includes("retention-days: 14"),
  "The screenshot artifact retention window must remain explicit");

assert.ok(admin.includes("function activityLogPage()"), "Dedicated activity-log screen must exist");
assert.ok(admin.includes("view==='activity'?activityLogPage()"), "Activity-log route must render a dedicated screen");
assert.ok(admin.includes("data-view=\"activity\""), "Activity-log screen must be reachable from navigation");
assert.ok(admin.includes("id=\"activityLogSearch\"") && admin.includes("id=\"activityActionFilter\""), "Activity log must support search and action filtering");
assert.ok(admin.includes("id=\"refreshActivityLogs\"") && admin.includes("api('/api/admin/audit-logs')"), "Activity log must refresh from the existing authenticated read endpoint");
assert.ok(admin.includes("auditLogLoadError=optional[3].status!=='fulfilled'"), "Activity log must distinguish a failed load from a genuinely empty log");
assert.ok(admin.includes("Tối đa 200 bản ghi gần nhất từ máy chủ"), "Activity log must disclose the existing server-side record limit");
console.log("PASS: dedicated read-only activity-log screen and route contracts.");

assert.ok(admin.includes("function orderDetailMarkup(order)"), "Order detail panels must reuse a single source-backed renderer");
assert.ok(admin.includes("function orderDetailPage()"), "Order detail must render as its own Admin screen");
assert.ok(admin.includes("view==='order-detail'?orderDetailPage()"), "The Admin view router must render the dedicated order detail screen");
assert.ok(admin.includes("selectedOrderId=new URLSearchParams(location.search).get('orderId')||''"), "Order detail deep links must restore the selected existing order");
assert.ok(admin.includes('data-action="order-detail-to-row"'), "Order detail must provide a real route back to the matching order's management controls");
assert.ok(!admin.includes('<div id="orderDetailBackdrop"'), "Order detail must not regress to a modal overlay");
console.log("PASS: dedicated Order detail screen, deep-link state and return-to-actions contracts.");

const staticBaseline = read("../tests/e2e/admin-static-baseline.spec.js");
assert.match(staticBaseline, /['"]\/api\/admin\/settings['"]\s*:\s*\{\s*showPrices:\s*true,/,
  "Screen 10 baseline fixture must match the approved reference's public-price-enabled state.");
assert.ok(staticBaseline.includes("await expect(page.locator('#showPrices')).toBeChecked()"),
  "Screen 10 screenshot capture must assert the reference state rather than silently capturing a different setting.");

for (const referenceHeading of [
  'Hiển thị giá sản phẩm công khai',
  'Hiển thị giá trên website',
  'Lớp phủ chào mừng (Welcome Overlay)',
  'Cài đặt watermark'
]) {
  assert.ok(admin.includes(referenceHeading), `Screen 10 must retain reference-aligned settings copy: ${referenceHeading}`);
}
assert.ok(admin.includes('class="settingsgrid website-settings"'),
  "Screen 10 must have a dedicated layout hook so mobile compaction does not affect Backup/Restore.");
assert.ok(admin.includes('#main:has(.website-settings) > .pagehead .eyebrow'),
  "Screen 10 mobile heading must collapse without affecting the Backup/Restore pagehead.");
assert.ok(admin.includes('.website-settings>section:nth-of-type(-n+3)>p{display:none}'),
  "Mobile compaction may hide only explanatory copy on the three reference panels; QR payment and Reset SKU safety guidance must remain visible.");
assert.ok(!admin.includes('.website-settings>.setting>p{display:none}'),
  "Do not hide safety instructions across the entire Settings page on mobile.");
