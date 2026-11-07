Warning: truncated output (original token count: 9587)
Total output lines: 285

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateCheckoutQuote } from "../functions/_payments.js";
import { createSepayCheckout, sepayPaymentReady } from "../functions/sepay.js";

const item=(type,unitPrice,quantity=1)=>({fulfillmentType:type,unitPrice,quantity});
const stock=calculateCheckoutQuote([item("in_stock",4500000)]);
assert.equal(stock.eligible,true);
assert.equal(stock.options[0].amount,100000);
assert.equal(stock.options[0].label,'Đặt cọc 100.000đ');
assert.equal(stock.options[1].amount,4275000);
assert.equal(stock.options[1].discountAmount,225000);
assert.equal(stock.options[0].remainingAmount,4400000);
const custom=calculateCheckoutQuote([item("made_to_order",1234567)]);
assert.equal(custom.eligible,true);
assert.equal(custom.options[0].amount,400000,"30% deposit must be rounded up to next 100,000 VND");
assert.equal(custom.options[0].remainingAmount,834567);
assert.equal(custom.options[1].shippingBenefit,"free_shipping");
assert.equal(custom.options[1].amount,1172839);
const lowPrice=calculateCheckoutQuote([item("in_stock",5000)]);
assert.equal(lowPrice.eligible,true,"low-priced product should allow a test deposit");
assert.equal(lowPrice.options[0].amount,2000,"minimum test deposit is 2k VND");
assert.equal(lowPrice.options[0].label,"Đặt cọc 2.000đ");
assert.equal(lowPrice.options[1].amount,4750,"full payment keeps the 5% discount");
const minPrice=calculateCheckoutQuote([item("in_stock",2000)]);
assert.equal(minPrice.eligible,true,"exact 2k total is payable");
assert.equal(minPrice.options[0].amount,2000);
assert.equal(minPrice.options.some(option=>option.value==="full"),false,"payment options below 2k must be hidden");
assert.equal(calculateCheckoutQuote([item("in_stock",1999)]).eligible,false,"bank payments below 2k must be blocked");
const under100k=calculateCheckoutQuote([item("in_stock",99999)]);
assert.equal(under100k.eligible,true,"low-priced stock item deposit must not exceed its total");
assert.equal(under100k.options[0].amount,30000);
assert.equal(calculateCheckoutQuote([item("in_stock",150000),item("made_to_order",500000)]).eligible,true,"mixed carts retain previous payment eligibility");
assert.equal(calculateCheckoutQuote([item("in_stock",150000),item("made_to_order",500000)]).options[0].amount,200000,"mixed carts retain 30% until separate approval");
assert.equal(calculateCheckoutQuote([item("in_stock",4500000),item("in_stock",250000)]).options[0].amount,100000,"all in-stock cart gets one fixed 100k deposit");
assert.equal(calculateCheckoutQuote([item("unclassified",4500000)]).eligible,true);
assert.equal(calculateCheckoutQuote([item("made_to_order",null)]).eligible,false,"unconfirmed price must never be inferred");
assert.equal(calculateCheckoutQuote([item("in_stock",Number.MAX_SAFE_INTEGER)]).eligible,false);
assert.equal(calculateCheckoutQuote([]).eligible,false);
assert.equal(sepayPaymentReady({SEPAY_ENV:"sandbox",SEPAY_MERCHANT_ID:"TEST",SEPAY_MERCHANT_SECRET_KEY:"merchant",SEPAY_IPN_SECRET_KEY:"ipn"}),true);
assert.equal(sepayPaymentReady({SEPAY_ENV:"sandbox",SEPAY_MERCHANT_ID:"TEST",SEPAY_MERCHANT_SECRET_KEY:"merchant"}),false);
assert.equal(typeof createSepayCheckout,"function");

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const accountCss=readFileSync(new URL("../public/customer-auth.css",import.meta.url),"utf8");
assert.doesNotMatch(accountCss,/#accountDrawer\s*\{[^}]*\bbackground\s*:/,'Account base must not repaint over the shared Cart frosted plane');
assert.doesNotMatch(accountCss,/html\.dark #accountDrawer\s*\{[^}]*\bbackground\s*:/,'Dark Account must not have a separate painted background');
const quote=readFileSync(new URL("../functions/api/checkout-quote.js",import.meta.url),"utf8");
const create=readFileSync(new URL("../functions/api/orders.js",import.meta.url),"utf8");
const admin=readFileSync(new URL("../functions/api/admin/orders.js",import.meta.url),"utf8");
const adminUi=readFileSync(new URL("../public/admin/index.html",import.meta.url),"utf8");
const glass=html.match(/<style id="sd-checkout-steps-source-backed-2026-10-27">([\s\S]*?)<\/style>/)?.[1]||"";
assert.ok(glass.includes("var(--sd-reference-surface"),"Checkout must reuse existing Liquid Glass palette, not standalone black-gold");
assert.match(glass,/\.checkout-drawer \.sd-checkout-option/,"Checkout additions must stay inside original drawer");
assert.ok(html.includes('id="sdCheckoutStepper"')&&html.includes('id="sdCheckoutShippingStep"')&&html.includes('id="sdCheckoutPaymentStep"'));
assert.ok(html.includes('id="sdCheckoutItemSummary"'),'Payment step shows the exact products and quantities before the order is sent');
assert.doesNotMatch(html,/id="sdCheckoutReviewStep"/,'Checkout has no duplicate review page');
assert.match(html,/sd-order-reference/,'Order number is prominent after QR');
assert.match(html,/orderStage\.hidden=!paymentConfirmed/,'The public order number stage follows the server payment summary directly');
assert.match(html,/Number\(data\.paymentSummary\?\.shortfall\)===0\)window\.sdCheckoutAdvanceToOrderCode\(true\)/,'The order number appears only when the server confirms the selected amount');
assert.ok(create.includes('`SP-${crypto.randomUUID()'),'SePay receives a separate transfer reference, not the public order number');
assert.match(readFileSync(new URL('../functions/api/sepay/webhook.js',import.meta.url),'utf8'),/SP-\[A-Z0-9\]\{16\}/,'The bank webhook resolves the private transfer reference');
assert.match(html,/sd-payment-transfer-stage[\s\S]*sd-payment-order-stage/,'QR transfer and order reference are separate customer-visible stages');
assert.match(html,/Nhận cọc & xác nhận đơn/,'Order tracking combines deposit receipt and order confirmation into one milestone');
assert.match(html,/data-account-orders-refresh/,'Linked order cards can reload server-confirmed payment state');
assert.match(html,/data-account-payment-topup/,'Partially paid orders offer an explicit additional-transfer action');
assert.match(html,/function accountShowPaymentTopup\(orderNumber,button\)/,'Additional transfer details are fetched on demand');
assert.match(html,/amount===summary.shortfall/,'Customer must receive a server-authoritative exact shortfall before showing QR');
assert.match(html,/QR không nhúng số tiền/,'Additional-transfer QR never implies an embedded amount');
assert.doesNotMatch(html,/\.checkout-drawer\{left:0;right:0;width:100vw;max-width:none;border-radius:0\}/,'Checkout must never flatten the mobile cart-shaped glass shell');
assert.match(html,/\.account-drawer,\.cart-drawer,\.checkout-drawer\{[^}]*background:var\(--sd-reference-surface-strong\)!important;[^}]*-webkit-backdrop-filter:blur\(24px\) saturate\(145%\);[^}]*backdrop-filter:blur\(24px\) saturate\(145%\)/,'The approved Cart and Checkout sheet keeps its frosted background');
assert.match(html,/#cartDrawer,#checkoutDrawer,#accountDrawer\{[\s\S]*?background:transparent!important;[^}]*backdrop-filter:none!important/,'The drawer ancestor must not form a backdrop root');
assert.match(html,/#cartDrawer::before,#checkoutDrawer::before,#accountDrawer::before\{[\s\S]*?background:var\(--sd-reference-surface\);[\s\S]*?backdrop-filter:blur\(24px\) saturate\(145%\)/,'Keep the exact original frosted drawer tone behind the scrolling content');
assert.match(html,/html.dark #cartDrawer \.cart-header,[\s\S]*?html.dark #checkoutDrawer \.sd-checkout-confirm-wrap\{[^}]*background:var\(--sd-glass-shell-strong\)!important/,'Dark Cart and Checkout use the same approved logo Header face');
assert.match(html,/#cartDrawer::before,#checkoutDrawer::before,#accountDrawer::before\{[^}]*position:sticky;[\s\S]*?top:calc\(-1 \* var\(--sd-native-glass-pad-top,0px\)\);[^}]*flex:0 0 var\(--sd-native-glass-height,0px\);[^}]*width:var\(--sd-native-glass-width,100%\);[^}]*margin-left:calc\(-1 \* var\(--sd-native-glass-pad-left,0px\)\);[^}]*margin-top:calc\(-1 \* var\(--sd-native-glass-pad-top,0px\)\);[^}]*margin-bottom:calc\(-1 \* var\(--sd-native-glass-height,0px\) - var\(--sd-native-glass-gap,14px\) \+ var\(--sd-native-glass-pad-top,0px\)\)/,'The frosted sheet fills the padded frame including the top cap, without altering the three glass bars');
assert.match(html,/<script id="sd-native-drawer-glass-geometry">[\s\S]*?const observer=new ResizeObserver\(entries=>entries\.forEach\(\(\{target\}\)=>\{[\s\S]*?update\(target\.id==='checkoutDrawer'\|\|target\.id==='cartDrawer'\|\|target\.id==='accountDrawer'\?target:target\.closest\('#checkoutDrawer'\)\)/,'Observe drawer plus Checkout footer dimensions, without on-scroll JavaScript');
assert.match(html,/#cartDrawer>\.cart-header,\s*#cartDrawer>\.cart-list,\s*#checkoutDrawer>\.checkout-header,\s*#checkoutDrawer>\.checkout-form,\s*#accountDrawer>\.sd-account-header,\s*#accountDrawer>\.sd-account-toast,\s*#accountDrawer>\.account-panel-content\{[^}]*position:relative;[^}]*z-index:1;/,'The scrolling bodies paint over the pinned frost without changing sticky footers');
assert.match(html,/#cartDrawer>\.cart-bottom,\s*#checkoutDrawer>\.sd-checkout-footer\{z-index:2\}/,'Footer z-order is preserved without forcing position relative');
assert.doesNotMatch(html,/<p class="account-note">/,'Remove redundant Google-sync paragraph from Account menu');
assert.match(html,/#accountMenuView>\.account-action\+\.account-action\{margin-top:12px\}/,'Account action cards retain a clear 12px gap');
assert.match(html,/const drawers=\['cartDrawer','checkoutDrawer','accountDrawer'\]/,'Account uses the same native measured backdrop geometry as Cart');
assert.match(html,/function setupMobileBottomNav\(\)\{[^\n]*const tabs=\$\$\('\[data-mobile-tab\]'\);const activate=key=>tabs\.forEach/,'Mobile dock must bind all four tabs, not only the first matching element');
assert.match(html,/#productOverlay::before\{[\s\S]*?background:var\(--sd-reference-surface\);[\s\S]*?backdrop-filter:blur\(24px\) saturate\(145%\);[\s\S]*?pointer-events:none;/,'Product Detail uses the exact same native frosted glass material as Cart');
assert.match(html,/#productOverlay .detail-modal\{[^}]*background:transparent;[^}]*-webkit-backdrop-filter:none;[^}]*backdrop-filter:none;/,'The Detail scroll container must not apply a second blurry tinted surface');
assert.match(html,/window\.__sdSyncProductDetailGlass\?\.\(\)/,'Detail backdrop geometry is positioned synchronously before rendering on open');
assert.match(html,/#productOverlay\.open\{animation:none\}/,'Product Detail cannot animate ancestor opacity or native backdrop blur stops working');
assert.match(html,/@media\(max-width:760px\)\{\s*#productOverlay::before\{\s*left:7px;\s*top:7px;\s*width:calc\(100% - 14px\);\s*height:calc\(100dvh - 14px\);/,'Mobile Detail glass lines up with the exact 7px inset shell');
assert.match(html,/new ResizeObserver\(syncDetailGlass\)\.observe\(panel\)/,'Detail glass follows resize, not scroll');
assert.match(html,/\.cart-drawer:has\(\.cart-row\) \.cart-bottom\{position:sticky;bottom:0;z-index:2/,'Populated Cart payment bar remains sticky on phones');
assert.match(html,/\.account-drawer,\.cart-drawer,\.checkout-drawer\{\s*top:calc\(7px \+ env\(safe-area-inset-top\)\);[\s\S]*?border:1px solid var\(--sd-reference-edge\);border-radius:26px;/,'Mobile drawers share inset geometry and 26px corners');
assert.match(html,/fetch\('\/api\/checkout-quote'/,"Checkout must quote with a real read-only API");
assert.match(html,/sdCheckoutPaymentPayload\(\)/);
assert.match(html,/getElementById|querySelector|#sdCheckoutQrImage/);
assert.match(quote,/sepayBankTransferReady\(env,bank\)/,"Checkout readiness comes from server-side SePay webhook and bank configuration");
assert.match(quote,/paymentProvider:"sepay"/,"The quote identifies SePay as the only checkout provider");
assert.doesNotMatch(quote,/validPublicQrImageKey|payment_qr_active|paymentQrImageKey/,"Checkout quote no longer depends on the uploaded static QR");
assert.match(quote,/transferReferenceAvailableAfterS…3587 tokens truncated…awer \.cart-header h2,#checkoutDrawer \.checkout-heading h2\{[^}]*font:700 25px\/1\.2 SD Serif/,'Both centered heading titles are bold');
assert.doesNotMatch(html,/\.cart-header\{display:flex;align-items:center;justify-content:space-between;padding-bottom:13px;border-bottom:/,'Remove the old cart-wide horizontal header divider');
assert.match(html,/\.cart-bottom\{border-top:0;padding-top:14px;background:transparent\}/,'Cart bottom has no full-width background seam');

const cartMarkup=html.slice(html.indexOf('<div class="cart-drawer"'),html.indexOf('<button type="button" class="checkout-backdrop"'));
const cartCheckoutStart=cartMarkup.indexOf('id="cartCheckout"'),cartSubtotalPos=cartMarkup.indexOf('id="cartSubtotal"');
const cartSummaryStart=cartMarkup.indexOf('class="cart-subtotal-bar cart-summary"'),cartSummaryEnd=cartMarkup.indexOf('</div>',cartSummaryStart);
assert.ok(cartSummaryStart>=0&&cartSummaryStart<cartSubtotalPos&&cartSubtotalPos<cartSummaryEnd&&cartSummaryEnd<cartCheckoutStart,'Subtotal is its own glass bar preceding checkout');
assert.match(cartMarkup,/id="cartCheckoutLabel"/,'The checkout action label remains independently updateable');
assert.doesNotMatch(cartMarkup,/cart-note|Chỉ món được tích sẽ vào đơn|Giá được hệ thống kiểm tra khi đặt hàng/,'Remove the unnecessary note entirely');
assert.doesNotMatch(cartMarkup,/cartZalo|Tư vấn \/ đặt hàng qua Zalo/,'Cart keeps only the integrated payment action, with no Zalo bar');
assert.doesNotMatch(html,/consultCart\(|\$\('#cartZalo'\)/,'Removed cart-only Zalo code must not leave null element handlers');
assert.match(html,/\$\('#cartCheckoutLabel'\)\.textContent=selected\.length/,'Refreshing the cart preserves the subtotal and the integrated checkout action');
assert.match(html,/\.cart-bottom \.cart-subtotal-bar\{[^}]*display:flex;[^}]*min-height:47px/,'Compact subtotal bar');
assert.match(html,/\.cart-bottom \.cart-checkout-bar\{[^}]*display:grid;[^}]*min-height:56px/,'Independent checkout bar');

assert.doesNotMatch(html,/sd-scroll-can-up|sd-scroll-can-down|sd-scroll-fade|sdUpdateDrawerScrollEdges|sdQueueDrawerScrollEdges/,'No unrequested gradient/fade logic is present in checkout');
assert.doesNotMatch(html,/#cartList,#checkoutForm\{[^}]*mask-image/,'Cart and Checkout are not masked or faded at their scroll boundaries');
assert.match(html,/\.cart-list\{[^}]*background:transparent/,'Cart list shares one uninterrupted glass surface with footer');
assert.match(html,/\.checkout-drawer \.checkout-form\{[^}]*background:transparent/,'Checkout content shares one uninterrupted glass surface with footer');
assert.match(html,/\.cart-drawer\{overflow-y:auto!important;overscroll-behavior:contain/,'Mobile cart uses its outer shell as its only scrolling container');
assert.match(html,/\.cart-drawer:has\(\.cart-row\) \.cart-list\{[^}]*overflow:visible!important/,'Both list overflow axes are visible: no implicit clipped inner scrollport');
assert.match(html,/\.cart-drawer:has\(\.cart-row\) \.cart-bottom\{position:sticky;bottom:0;z-index:2;margin-top:auto\}/,'Both glass footer bars remain reachable while outer drawer scrolls');
assert.match(html,/#cartDrawer \.cart-header\{position:sticky;top:0;z-index:2\}/,'Floating cart header remains in place in the unified scroll region');

assert.match(html,/\.checkout-drawer \.sd-checkout-footer\{[^}]*border-top:0;background:transparent;box-shadow:none/,'Checkout footer has no full-width separator or detached glass rectangle');


assert.match(html,/Nhấn vào đây để sao chép mã đơn/,'Order number explains how to copy it');
assert.match(html,/Nếu đặt cọc và chuyển dư, phần dư sẽ trừ vào số tiền thanh toán khi nhận hàng\./,'Deposit overpayment is explained in plain language');
assert.match(html,/Số tiền thanh toán khi nhận hàng '\+formatVnd\(choice\.codExpected\)/,'Payment choices use clear delivery-payment wording');
assert.match(html,/id="sdCheckoutDone"[^>]*>Lấy mã đơn/,'When QR is unavailable, order creation still happens only on explicit action');
assert.match(html,/sd-checkout-success \.sd-checkout-actions\{grid-template-columns:minmax\(0,1fr\)\}/,'Success actions use the full footer width instead of the former narrow left column');
assert.doesNotMatch(html,/Lưu mã đơn bên dưới để tra cứu|Đã gửi đơn\. Thông tin và mã đơn|Chọn phương thức hoặc gửi đơn không đồng nghĩa|COD còn phải thu/,'Old confusing confirmation copy is removed');
const intentCreate=create.slice(create.indexOf('if(selectedPaymentOption){'),create.indexOf('const customerId = crypto.randomUUID()'));
const webhook=readFileSync(new URL('../functions/api/sepay/webhook.js',import.meta.url),'utf8');
const intentStatus=readFileSync(new URL('../functions/api/sepay/checkout-status.js',import.meta.url),'utf8');
assert.match(intentCreate,/INSERT INTO sepay_checkout_intents/,'Starting SePay checkout creates a short-lived payment intent');
assert.doesNotMatch(intentCreate,/INSERT INTO orders|orderNumber/,'The QR request creates no customer order or public order number');
assert.match(webhook,/verifySepayBankWebhook/,'Only an HMAC-authenticated SePay bank webhook can confirm payment');
assert.match(webhook,/COALESCE\(SUM\(amount\),0\)[\s\S]*>=amount/,'Partial receipts must accumulate to the selected payable amount before an order is created');
assert.match(webhook,/INSERT INTO orders[\s\S]*UPDATE sepay_checkout_intents/,'The paid webhook atomically creates the order after reserving its public number');
assert.match(intentStatus,/paymentDetailsForOrder/,'The private intent status route reveals order details only after payment creates the order');
assert.match(html,/sdCheckoutStartIntentPolling\(result\.checkoutIntentId/,'Checkout polls the private intent until the signed webhook creates an order');
assert.match(html,/Quét QR và thanh toán đúng số tiền/,'Checkout keeps the dynamic SePay QR inside the order drawer before revealing the public order code');
assert.match(create,/createSepayVietQr/,"The server builds an amount-specific VietQR using the server-priced checkout");
assert.doesNotMatch(html,/paymentForm\.submit\(\)/,"The inline QR checkout does not navigate to SePay Hosted Checkout");
assert.match(glass,/\.sd-checkout-qr-main\{display:flex;flex-direction:column/,"QR and copyable bank tiles must stack vertically");
assert.match(glass,/\.sd-checkout-qr-art\{[^}]*max-width:340px;aspect-ratio:1\/1/,"QR must be rendered large and square");
assert.match(glass,/#sdCheckoutQrImage\{[^}]*object-fit:contain/,"Do not crop or distort the original QR");
assert.doesNotMatch(glass,/\.sd-checkout-qr-main\{grid-template-columns:/,"Never put QR back into narrow side-by-side grid");
assert.match(html,/sd-checkout-qr-warning/);
assert.match(admin,/AS customer_payment_option/);
assert.match(adminUi,/Nội dung chuyển khoản của khách/,"Admin shows the transfer content saved with the customer order");
assert.match(adminUi,/function orderReceiptState\(summary\)/,"Admin reports payment from the verified receipt total");
// Regression: a successful first order moves the QR tile into its temporary stage.
// Return it to the persistent mount before replaceChildren() destroys the stage;
// otherwise the second order crashes inside openCheckout and never opens payment.
const paymentRender=html.slice(html.indexOf('function renderPaymentInstructions('),html.indexOf('function sdCheckoutBankMessage('));
const restoreQr=paymentRender.indexOf('qrMount.append(existingQr)');
const clearOldStage=paymentRender.indexOf('panel.replaceChildren()');
assert.ok(restoreQr>=0&&clearOldStage>restoreQr,'Keep the live QR node and its listeners across sequential checkouts');
assert.match(html,/\$\('#sdCheckoutQrMount'\)\.append\(\$\('#sdCheckoutQrWrap'\)\)/,'Second checkout mounts the retained QR tile');
assert.match(html,/\$\('#sdCheckoutConfirmRange'\)\.disabled=false/,'Every new checkout re-enables the slider');
assert.match(html,/\$\('#sdCheckoutConfirmLabel'\)\.textContent='Xác nhận đã thanh toán'/,'Every new checkout resets the slider label');
assert.match(html,/if\(sdCheckoutOrderCreating\)return;sdCheckoutOrderCreating=true/,'An in-flight order is protected against duplicate submit');
assert.match(html,/finally\{sdCheckoutOrderCreating=false\}/,'A failed submission unlocks retry');
console.log("PASS: owner-approved Liquid Glass checkout steps; server-authoritative pricing; in-page dynamic SePay QR and signed bank webhook receipt.");


// Checkout stage hierarchy: QR is one glass card, not a card inside a
// separately painted payment panel. The footer is merely a transparent mount.
assert.match(html,/\.payment-instructions\{margin:0;padding:0;border:0;border-radius:0;background:transparent/,'No outer painted payment stage');
assert.match(html,/<div class="sd-checkout-qr-head"><span class="sd-payment-stage-label">BƯỚC 1 \/ 2 · THANH TOÁN<\/span><strong>Chuyển khoản ngân hàng<\/strong><small class="sd-payment-stage-subtitle">Chuyển khoản theo thông tin bên dưới<\/small>/,'Step copy is INSIDE bank-transfer card');
assert.doesNotMatch(html,/add\(transferStage,'p','sd-payment-stage-label'/,'No standalone glass-like step title');
assert.doesNotMatch(html,/Kéo thanh bên dưới để lấy mã đơn|Đơn hàng chỉ được tạo khi lấy mã ở bước này|Thao tác này không xác nhận tiền/,'Remove redundant slider instruction paragraphs');
assert.doesNotMatch(html,/sd-checkout-optical-lens/,'Footer no longer uses JS-positioned optical overlays');
assert.match(html,/<p class="sd-checkout-confirm-note" id="sdCheckoutConfirmNote" hidden><\/p>/,'A legacy hidden compatibility node has no duplicated customer-facing copy');

// The footer is a transparent layout host, not a second pane of dark glass.
assert.match(html,/\.checkout-drawer \.sd-checkout-footer\{[^}]*border:0;border-top:0;background:transparent;box-shadow:none;outline:0;filter:none;isolation:auto;/,'Checkout footer must never draw an outer border or isolated glass plate');
assert.match(html,/\.checkout-drawer \.sd-checkout-actions\{--sd-checkout-optical-shadow:inset 0 1px 0 rgba\(255,255,255,\.55\),0 6px 15px rgba\(103,169,205,\.10\);[^}]*border:0;background:transparent;box-shadow:none;outline:0/,'Action wrapper uses a pale control shadow without a dark enclosure');
assert.doesNotMatch(html,/#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-footer\{isolation:isolate\}/,'Do not isolate the whole footer as a compositing surface');
// Only visual Cart/Checkout changes are permitted after this rollback.
assert.match(html,/#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-actions \.pill-btn,\s*#checkoutDrawer \.sd-checkout-confirm-wrap\{/,'Checkout glass shares Cart material');
assert.doesNotMatch(html,/sd-(?:checkout|cart)-optical-(?:mirror|lens)/,'No synthetic CSS blur mirrors');
assert.doesNotMatch(html,/<script[^>]+src="\/(?:cart|checkout)-glass-optics\.js"/,'No animation-driven JS clipping');
assert.match(html,/#checkoutDrawer \.checkout-header\{position:sticky;top:0;z-index:3;flex-shrink:0\}/,'Sticky glass header preserved');
assert.match(html,/#checkoutDrawer \.sd-checkout-footer\{[^}]*position:sticky;[^}]*top:calc\(100% - var\(--sd-checkout-footer-height,73px\)\);[^}]*bottom:0;[^}]*z-index:3;[^}]*margin-top:auto;[^}]*flex-shrink:0/,'Mobile Checkout footer uses measured top pin and bottom sticky fallback');
assert.match(html,/function sdCheckoutItems\(\)\{return checkoutItemsOverride\?checkoutItemsOverride\.map/,'Restore selected-Cart source for Checkout item summary');
assert.doesNotMatch(html,/checkoutSessionItems|checkoutOpenEpoch|sdCheckoutRetryQuote/,'Visual styling must not alter checkout order/session state');
assert.match(html,/function openCheckout\(options=\{\}\)\{[\s\S]*?prefillCheckoutFromLocalAddress\(\)\.then\(async\(\)=>/,'Checkout address and quote sequencing is back to working flow');
