import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizePaymentRows, validPublicQrImageKey, createOrderAccessToken, hashOrderAccessToken } from "../functions/_payments.js";
import { fromRow, normalizeFulfillmentType, validateProduct } from "../functions/_lib.js";
import { onRequestGet as servePublicQrImage } from "../functions/payment-qr/[key].js";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
assert.equal(normalizeFulfillmentType("in_stock"), "in_stock");
assert.equal(normalizeFulfillmentType("made_to_order"), "made_to_order");
assert.equal(normalizeFulfillmentType("unclassified"), "unclassified");
assert.equal(normalizeFulfillmentType(undefined), "unclassified", "historical records must never be inferred from stock or name");
assert.equal(normalizeFulfillmentType("stock-positive"), "unclassified", "unknown fulfillment type fails closed");

const baseProduct = { title:"Sản phẩm kiểm thử", sku:"SD-TEST001", category:"wallets", description:"", price:100000, stock:0, published:true, images:[] };
assert.equal(validateProduct({ ...baseProduct, fulfillmentType:"in_stock" }).value.fulfillmentType, "in_stock", "Admin can explicitly classify a product as in stock");
assert.equal(validateProduct({ ...baseProduct, fulfillmentType:"made_to_order" }).value.fulfillmentType, "made_to_order", "Admin can explicitly classify a product as made to order");
assert.equal(validateProduct({ ...baseProduct }).value.fulfillmentType, "unclassified", "new product without an explicit owner choice remains unclassified");
assert.ok(validateProduct({ ...baseProduct, fulfillmentType:"guess-from-stock" }).error, "invalid fulfillment enums must be rejected");
const historicalProduct = fromRow({ id:"fixture-legacy", slug:"legacy", sku:"SD-LEGACY001", sku_verified:0, title:"Fixture legacy", category:"wallets", category_label:"Ví", description:"", price:null, stock:10, published:1, images_json:"[]", source_price_confirmed:0, sort_order:1 });
assert.equal(historicalProduct.fulfillmentType, "unclassified", "legacy rows missing fulfillment_type must not infer from stock or title");
const publicStockProduct = fromRow({ id:"fixture-in-stock", slug:"in-stock", sku:"SD-TEST002", sku_verified:1, title:"Fixture in-stock", category:"wallets", category_label:"Ví", description:"", price:100000, stock:10, published:1, images_json:"[]", source_price_confirmed:1, sort_order:2, fulfillment_type:"in_stock" }, { publicView:true, showPrices:true });
assert.equal(publicStockProduct.fulfillmentType, "in_stock", "public product mapping preserves the explicitly stored fulfillment enum");

assert.equal(validPublicQrImageKey("qr-550e8400-e29b-41d4-a716-446655440000.png"), true);
assert.equal(validPublicQrImageKey("private-originals/qr.png"), false);
assert.equal(validPublicQrImageKey("../qr.png"), false);
assert.equal(validPublicQrImageKey("qr-550e8400-e29b-41d4-a716-446655440000.svg"), false);

const publicQrKey = "qr-550e8400-e29b-41d4-a716-446655440000.png";
async function publicQrResponse(active, activeKey = publicQrKey) {
  const settings = { payment_qr_active: active ? "1" : "0", payment_qr_active_key: activeKey };
  const DB = { prepare() { return { bind(key) { return { first: async () => settings[key] === undefined ? null : { value: settings[key] } }; } }; } };
  const image = {
    body: new Uint8Array([137,80,78,71,13,10,26,10]),
    httpMetadata: { contentType: "image/png" },
    writeHttpMetadata(headers) { headers.set("Content-Type", "image/png"); }
  };
  const IMAGES = { get: async key => key === publicQrKey ? image : null };
  return servePublicQrImage({ params: { key: publicQrKey }, env: { DB, IMAGES } });
}
const activeQrResponse = await publicQrResponse(true);
assert.equal(activeQrResponse.status, 200, "the currently active QR key may be served");
assert.equal(activeQrResponse.headers.get("Cache-Control"), "no-store", "active public QR responses must not stay cached across deactivation/replacement");
const inactiveQrResponse = await publicQrResponse(false);
assert.equal(inactiveQrResponse.status, 404, "a deactivated QR key must immediately stop being served");
const replacedQrResponse = await publicQrResponse(true, "qr-550e8400-e29b-41d4-a716-446655440001.png");
assert.equal(replacedQrResponse.status, 404, "a replaced QR key must immediately stop being served");

const token = createOrderAccessToken();
assert.ok(token.length >= 60 && token.length <= 100);
assert.equal(await hashOrderAccessToken(token), await hashOrderAccessToken(token));
assert.notEqual(await hashOrderAccessToken(token), await hashOrderAccessToken(token + "x"));
const summary = summarizePaymentRows([{direction:"received",amount:30000},{direction:"received",amount:20000},{direction:"refunded",amount:5000}],100000);
assert.deepEqual(summary, {receivedAmount:50000,refundedAmount:5000,netReceivedAmount:45000,remainingBalance:55000,overpaidAmount:0});
assert.equal(summarizePaymentRows([], null).remainingBalance, null);
assert.equal(summarizePaymentRows([{direction:"received",amount:250}], 100).overpaidAmount, 150);
const adminOrders = read("../functions/api/admin/orders.js");
assert.match(adminOrders, /body\?\.paymentStatus !== undefined/, "Admin order PATCH must reject direct paymentStatus updates");
assert.doesNotMatch(adminOrders, /SET status=\?,payment_status=COALESCE/, "order PATCH must never set payment status from a client field");
const paymentRequestApi = read("../functions/api/admin/payment-requests.js");
assert.match(paymentRequestApi, /Object\.hasOwn\(body, "amount"\)/, "client-supplied amount must be rejected");
assert.match(paymentRequestApi, /Math\.ceil\(\(total \* 0\.3\)\/100000\)\*100000/, "made-to-order deposit must round up to a 100k VND increment");
assert.match(paymentRequestApi, /: 100000;/, "in-stock deposit must be fixed at 100,000 VND");
assert.match(paymentRequestApi, /fulfillmentTypes\.size !== 1/, "mixed fulfillment order must fail closed");
assert.match(paymentRequestApi, /fulfillmentType === "unclassified"/, "unclassified items must require manual consultation");
assert.match(paymentRequestApi, /shippingBenefit = "free_shipping"/, "full payment alone grants free shipping");
assert.match(paymentRequestApi, /summary\.remainingBalance/, "balance amount must be based on the ledger-calculated remaining balance");
assert.doesNotMatch(read("../public/admin/index.html"), /data-payment-amount=/, "Admin must not send a client-controlled amount");
const transactionApi = read("../functions/api/admin/payment-transactions.js");
assert.match(transactionApi, /payment_received_verified/, "verified receipts need an audit action");
assert.match(transactionApi, /UNIQUE constraint/i, "duplicate bank references must map to a conflict response");
assert.match(transactionApi, /amount>netReceived/, "refunds must not exceed previously verified net receipts");
const orderPaymentApi = read("../functions/api/order-payment.js");
assert.match(orderPaymentApi, /Cache-Control.*private, no-store/, "capability-token payment responses must not be cached");
assert.match(orderPaymentApi, /ORDER BY CASE WHEN status=\x27pending\x27 THEN 0 ELSE 1 END, created_at DESC, id DESC LIMIT 1/, "current pending installment must win timestamp ties");
assert.match(orderPaymentApi, /const freeShipping = order\.payment_status === "paid" && freeShippingEligible/, "freeship is applied only after verified total is paid");
assert.match(orderPaymentApi, /Referrer-Policy/, "capability-token payment details must disable referrer leakage");
assert.match(orderPaymentApi, /public_access_token_hash/, "public order payment must be capability-token scoped");
assert.match(orderPaymentApi, /payment_terms_confirmed_at/, "payment details must wait for server-side price and terms confirmation");
assert.doesNotMatch(read("../functions/api/payment-settings.js"), /ADMIN_PASSWORD|SESSION_SECRET|ORIGINALS/, "public QR settings must not expose secrets or private bindings");
assert.match(read("../functions/payment-qr/[key].js"), /activeKey !== key/, "pending QR assets must not be publicly served");
assert.match(read("../functions/payment-qr/[key].js"), /Cache-Control.*no-store/, "public QR cache must re-check active state immediately after deactivation/replacement");
assert.match(read("../functions/api/admin/payment-qr-upload.js"), /payment_qr_pending_key/, "new QR upload must stay pending until manual verification/activation");
assert.match(read("../functions/api/admin/payment-qr-upload.js"), /MAX_BYTES = 5 \* 1024 \* 1024/, "QR upload size limit must be explicit");
assert.match(read("../functions/api/admin/payment-qr-preview.js"), /requireAdmin/, "pending QR preview is Admin-authenticated");
assert.match(read("../functions/api/admin/payment-qr-preview.js"), /pendingKey !== key/, "pending QR preview only serves the current pending image");
assert.match(read("../functions/api/admin/payment-qr-preview.js"), /private, no-store/, "pending QR preview must not be publicly cached");
assert.ok(read("../functions/api/admin/payment-qr.js").includes("/api/admin/payment-qr-preview?key="), "Admin settings must return the authenticated pending QR preview URL");
assert.ok(read("../functions/api/admin/payment-qr-upload.js").includes("/api/admin/payment-qr-preview?key="), "Upload must return the authenticated pending QR preview URL");
assert.match(read("../functions/api/orders.js"), /public_access_token_hash/, "only a hash of the one-time order token is stored");
assert.match(read("../functions/api/orders.js"), /orderAccessToken,/, "checkout returns the one-time order access token");
assert.match(read("../functions/api/orders.js"), /fulfillment_type\) VALUES/, "order item snapshots fulfillment type");
assert.match(read("../public/admin/index.html"), /id="pFulfillmentType"/, "Admin can set fulfillment type explicitly");
assert.match(read("../public/admin/index.html"), /id="fulfillmentBox"/, "Admin can filter all, unclassified, in-stock, and made-to-order");
assert.match(read("../public/admin/index.html"), /id="paymentQrVerified"/, "QR activation requires explicit human verification");
const qrAdminHtml = read("../public/admin/index.html");
assert.ok(qrAdminHtml.includes('<label class="btn qr-file-picker" for="paymentQrFile">Chọn ảnh QR ngân hàng<input id="paymentQrFile" type="file" accept="image/png,image/jpeg,image/webp" class="qr-file-input"></label><span id="paymentQrFileName" class="tiny muted">Chưa chọn tệp QR.</span>'), "QR file picker must avoid showing the browser's untranslated native file control");
assert.ok(qrAdminHtml.includes(".qr-file-picker{position:relative;display:flex;align-items:center;justify-content:center;min-height:44px;overflow:hidden;cursor:pointer}.qr-file-picker:focus-within{outline:3px solid #5c91b9;outline-offset:2px}.qr-file-input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}"), "QR file picker must remain keyboard focus-visible and fit its glass button");
assert.ok(qrAdminHtml.includes("$('#paymentQrFile').addEventListener('change',e=>{$('#paymentQrFileName').textContent=e.target.files?.[0]?.name||'Chưa chọn tệp QR.'});"), "QR upload must show the selected filename before upload");
assert.match(qrAdminHtml, /Object\.keys\(normalizedDraft\)\.some\(key=>normalizedDraft\[key\]!==normalizedSaved\[key\]\)/, "QR activation must reject unsaved bank-detail edits");
assert.ok(qrAdminHtml.indexOf("Thông tin ngân hàng đã thay đổi. Hãy lưu thông tin nháp trước khi kích hoạt QR.") < qrAdminHtml.indexOf("action:'activate',verified:true"), "QR activation must show the unsaved-draft guard before issuing the activation request");
assert.doesNotMatch(read("../public/admin/index.html"), /data-payment-status=/, "payment status must be read-only in the order form");

const refundUiHtml = read("../public/admin/index.html");
assert.match(refundUiHtml, /data-action=["']record-refund["']/,
  "Order Detail must expose an Admin action to record an already-completed refund in the verified payment ledger");
assert.match(refundUiHtml, /direction:\s*["']refunded["']/,
  "the refund action must send direction=refunded, not reuse the receipt operation");
assert.match(refundUiHtml, /không thực hiện chuyển tiền/i,
  "the refund UI must explicitly say it records the ledger only and does not move money");
assert.match(refundUiHtml, /amount>netReceived/,
  "the refund UI must reject amounts above the verified net receipt before sending");
assert.match(refundUiHtml, /!Number\.isSafeInteger\(netReceived\)\|\|netReceived<=0/,
  "the refund UI must fail closed if verified net receipts are missing, malformed or non-positive");
assert.match(refundUiHtml, /maxRefundAmount=Number\.isSafeInteger\(netReceived\)&&netReceived>0\?netReceived:0/,
  "refund entry must be disabled for orders with no positive verified net receipts");

console.log("PASS fulfillment/payment contract: explicit classification, token scoping, QR allowlist, verified-only payment ledger and Admin UI regression guards.");
