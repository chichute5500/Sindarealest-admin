import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const authJs=readFileSync(new URL("../public/customer-auth-ui.js",import.meta.url),"utf8");
const adminOrders=readFileSync(new URL("../functions/api/admin/orders.js",import.meta.url),"utf8");
const d1Migration=readFileSync(new URL("../migrations/0015_d1_rows_read_indexes.sql",import.meta.url),"utf8");

// One integration branch/PR protects both the earlier D1 performance fix and
// this storefront SEO/UX/CRO pass. CI fails if any half is dropped.
assert.match(d1Migration,/idx_audit_entity_action_created/);
assert.match(adminOrders,/LEFT JOIN audit_logs ac ON ac\.id=/);
assert.match(html,/<a[^>]+href="tel:0827049192"[^>]+aria-label="Gọi điện tới 0827 049 192"/);
assert.match(html,/<template id="sdNotFoundTemplate"><main id="notFoundPage"/);
assert.doesNotMatch(html,/<\/template>\s*<main id="notFoundPage"/);
assert.match(html,/document\.body\.appendChild\(template\.content\.cloneNode\(true\)\)/);
assert.match(html,/<div id="orderDetailsPanel" class="order-details-panel">/);
assert.match(html,/aria-expanded="true" aria-controls="orderDetailsPanel"/);
assert.match(html,/sessionStorage\.getItem\('sindarealest_welcomed'\)==='true'/);
assert.match(html,/sessionStorage\.setItem\('sindarealest_welcomed','true'\)/);
assert.doesNotMatch(html,/Mailjet Stats|Email trên Preview phải xác minh/);
assert.match(html,/Không bắt buộc đăng nhập để đặt hàng/);
assert.match(html,/Đăng nhập nhanh bằng Google/);
assert.match(authJs,/Đăng nhập nhanh bằng Google/);
assert.match(html,/accountSyncMode==='cloud'\s*\?'Thông tin giao hàng được đồng bộ an toàn với tài khoản của bạn\.'/);
assert.match(html,/accountSyncMode='cloud';updateAccountAddressPrivacy\(\)/);
assert.match(html,/accountSyncMode='guest';cloudOrderHistory=\[\];updateAccountAddressPrivacy\(\)/);
assert.match(html,/Báo giá theo yêu cầu chế tác/);
assert.match(html,/function productZaloMessage\(product,option=/);
assert.match(html,/productZaloMessage\(x\.p,x\.option,x\.q\)/);
assert.match(html,/window\.open\(ZALO,'_blank','noopener,noreferrer'\)/);
assert.match(html,/cartClipboardToast/);
assert.match(html,/const lookupNextAt=\{order:0,warranty:0\}/);
assert.match(html,/lookupNextAt\[kind\]=now\+2500/);
assert.match(html,/replace\(\/\[\^A-Za-z0-9-\]\/g,''\)/);
assert.match(html,/a\.rel='noopener noreferrer'/);
// Preserve core functions and product-image watermark only in detail/gallery.
for(const id of ["sdTrackForm","warrantyLookupForm","cartDrawer","sdCheckoutStepper","sdFullscreenViewer","detailImageStage"])
 assert.ok(html.includes('id="'+id+'"'),"Cannot drop core feature "+id);
assert.match(html,/\.detail-image-stage,#sdFullscreenFrame/);
assert.doesNotMatch(html,/<div class="product-card[^"]*">\s*<img[^>]*watermark/);
const targets=[...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map(m=>m[0]);
for(const a of targets)assert.match(a,/rel="[^"]*noopener[^"]*noreferrer[^"]*"/,"Blank target missing rel "+a.slice(0,120));
console.log("PASS: unified D1 + Storefront account/SEO/Zalo/lookup regression contract.");
