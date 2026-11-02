import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateCheckoutQuote, makeCheckoutTransferReference, checkoutTransferReferenceMatches } from "../functions/_payments.js";
import { onRequestPost as checkoutQuotePost } from "../functions/api/checkout-quote.js";

const item=(type,unitPrice,quantity=1)=>({fulfillmentType:type,unitPrice,quantity});
const stock=calculateCheckoutQuote([item("in_stock",4500000)]);
assert.equal(stock.eligible,true);
assert.equal(stock.options[0].amount,1400000);
assert.equal(stock.options[1].amount,4275000);
assert.equal(stock.options[1].discountAmount,225000);
assert.equal(stock.options[0].remainingAmount,3100000);
const custom=calculateCheckoutQuote([item("made_to_order",1234567)]);
assert.equal(custom.eligible,true);
assert.equal(custom.options[0].amount,400000,"30% deposit must be rounded up to next 100,000 VND");
assert.equal(custom.options[0].remainingAmount,834567);
assert.equal(custom.options[1].shippingBenefit,"free_shipping");
assert.equal(custom.options[1].amount,1172839);
assert.equal(calculateCheckoutQuote([item("in_stock",99999)]).eligible,false,"deposit exceeding full price must not be offered");
assert.equal(calculateCheckoutQuote([item("in_stock",150000),item("made_to_order",500000)]).eligible,true,"all delivery types use the same two payment choices");
assert.equal(calculateCheckoutQuote([item("unclassified",4500000)]).eligible,true);
assert.equal(calculateCheckoutQuote([item("made_to_order",null)]).eligible,false,"unconfirmed price must never be inferred");
assert.equal(calculateCheckoutQuote([item("in_stock",Number.MAX_SAFE_INTEGER)]).eligible,false);
assert.equal(calculateCheckoutQuote([]).eligible,false);
const transferReference=makeCheckoutTransferReference("0900000000","QA-WALLET-001");
assert.match(transferReference,/^SD-[A-Z2-9]{8}$/);
assert.equal(checkoutTransferReferenceMatches(transferReference,"0900000000","QA-WALLET-001"),true);
assert.equal(checkoutTransferReferenceMatches("SD-INVALID","0900000000","QA-WALLET-001"),false);

// Contract: initial Checkout quote must NOT pay for unrelated QR D1 settings
// or remote R2 existence checks. Only explicit payment-method selection may do
// that work. No fake payment receipt or data mutations are allowed in phase 1.
const quoteReads={prices:0,settings:[],r2Heads:0};
const previewProduct={id:"qa-wallet-1",sku:"SD-VN-001",title:"Ví da",category:"wallets",price:4500000,published:1,source_price_confirmed:1,stock:20,fulfillment_type:"in_stock"};
const qrTestKey="qr-00000000-0000-4000-8000-000000000000.png";
const quoteSettings={
 show_prices:"1",payment_qr_active:"1",payment_qr_active_key:qrTestKey,
 payment_qr_bank_name:"VIB",payment_qr_account_number:"123456789",
 payment_qr_account_name:"QA",payment_qr_instructions:""
};
const quoteDB={
 prepare(sql){
  if(sql.startsWith("SELECT id,sku,title,category,price,published,source_price_confirmed,stock,fulfillment_type")){
   return {bind(...ids){return {async all(){quoteReads.prices++;return {results:ids.includes(previewProduct.id)?[previewProduct]:[]}}}}};
  }
  if(sql.startsWith("SELECT value FROM settings WHERE key")){
   return {bind(key){return {async first(){quoteReads.settings.push(key);return {value:quoteSettings[key]??null}}}}};
  }
  throw Error("Unexpected read-only Checkout SQL: "+sql);
 }
};
const quoteEnv={DB:quoteDB,IMAGES:{async head(key){quoteReads.r2Heads++;return key===qrTestKey?{key}:null}}};
const quoteRequest=(choice,quotedTotal)=>new Request("https://preview.test/api/checkout-quote",{
 method:"POST",headers:{"Content-Type":"application/json"},
 body:JSON.stringify({items:[{id:previewProduct.id,option:"",quantity:1}],phone:"0900000000",
  ...(choice?{paymentOption:choice,quotedTotal}:{})})
});
const preflightResponse=await checkoutQuotePost({request:quoteRequest(),env:quoteEnv});
assert.equal(preflightResponse.status,200);
const preflight=await preflightResponse.json();
assert.equal(preflight.quoteReady,true);
assert.equal(preflight.paymentReady,false);
assert.equal(preflight.options.length,2);
assert.equal(preflight.total,4500000);
assert.deepEqual(quoteReads.settings,["show_prices"],"Unselected quote must read only the price visibility gate");
assert.equal(quoteReads.r2Heads,0,"Unselected quote must not wait for R2 QR head");
const chosenResponse=await checkoutQuotePost({request:quoteRequest("deposit",4500000),env:quoteEnv});
assert.equal(chosenResponse.status,200);
const chosen=await chosenResponse.json();
assert.equal(chosen.quoteReady,true);
assert.equal(chosen.paymentReady,true,"QR stays verified on explicit payment choice");
assert.equal(chosen.paymentOption,"deposit");
assert.equal(chosen.selectedPaymentAmount,1400000);
assert.equal(chosen.paymentInstructions.status,"ready");
assert.equal(quoteReads.r2Heads,1,"Only selected payment performs QR verification");
assert.equal(quoteReads.settings.filter(x=>x==="payment_qr_active").length,1);

quoteSettings.show_prices="0";
const hiddenPrice=await (await checkoutQuotePost({request:quoteRequest(),env:quoteEnv})).json();
assert.equal(hiddenPrice.quoteReady,false,"A hidden-price product must never receive an invented amount");
assert.equal(hiddenPrice.paymentReady,false);
quoteSettings.show_prices="1";

previewProduct.source_price_confirmed=0;
const unverifiedPrice=await (await checkoutQuotePost({request:quoteRequest(),env:quoteEnv})).json();
assert.equal(unverifiedPrice.quoteReady,false,"Unverified prices cannot offer deposit/full checkout");
previewProduct.source_price_confirmed=1;

previewProduct.published=0;
const unpublished=await checkoutQuotePost({request:quoteRequest(),env:quoteEnv});
assert.equal(unpublished.status,409,"Unpublished products must fail instead of entering an empty payment step");
previewProduct.published=1;

const qrBeforeMissing=quoteReads.r2Heads;
quoteEnv.IMAGES.head=async()=>{quoteReads.r2Heads++;return null};
const missingQr=await (await checkoutQuotePost({request:quoteRequest("full",4500000),env:quoteEnv})).json();
assert.equal(missingQr.quoteReady,true,"Price quote remains valid when QR storage is unavailable");
assert.equal(missingQr.paymentReady,false,"Never offer a QR when the R2 image is missing");
assert.equal(quoteReads.r2Heads,qrBeforeMissing+1,"Missing QR must be rechecked on explicit choice");

const staleAmount=await checkoutQuotePost({request:quoteRequest("deposit",1000000),env:quoteEnv});
assert.equal(staleAmount.status,409,"Server must reject any outdated client quote");


const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
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
assert.match(html,/sd-payment-transfer-stage[\s\S]*sd-payment-order-stage/,'QR transfer and order reference are separate customer-visible stages');
assert.match(html,/Nhận cọc & xác nhận đơn/,'Order tracking combines deposit receipt and order confirmation into one milestone');
assert.match(html,/data-account-orders-refresh/,'Linked order cards can reload server-confirmed payment state');
assert.doesNotMatch(html,/\.checkout-drawer\{left:0;right:0;width:100vw;max-width:none;border-radius:0\}/,'Checkout must never flatten the mobile cart-shaped glass shell');
assert.match(html,/#cartDrawer,#checkoutDrawer\{background:var\(--sd-reference-surface\)!important\}/,'Cart and Checkout use the same outer glass material');
assert.match(html,/\.account-drawer,\.cart-drawer,\.checkout-drawer\{\s*top:calc\(7px \+ env\(safe-area-inset-top\)\);[\s\S]*?border:1px solid var\(--sd-reference-edge\);border-radius:26px;/,'Mobile drawers share inset geometry and 26px corners');
assert.match(html,/fetch\('\/api\/checkout-quote'/,"Checkout must quote with a real read-only API");
const firstStage=quote.indexOf('if(!selectedOption)return json({');
const qrSettingsQuery=quote.indexOf('const keys=await Promise.all(');
assert.ok(firstStage>0&&qrSettingsQuery>firstStage,'The preflight response must return before any QR D1 settings or R2 request');


const quoteLoadStart=html.indexOf('async function sdCheckoutLoadQuote(){');
const quoteLoadEnd=html.indexOf('async function sdCheckoutLoadPaymentInstructions(){',quoteLoadStart);
const quoteLoadBody=html.slice(quoteLoadStart,quoteLoadEnd);
assert.match(quoteLoadBody,/signal:controller\.signal/,'Read-only payment quote requests support abort after a bounded wait');
assert.match(quoteLoadBody,/setTimeout\(\(\)=>controller\.abort\(\),12000\)/,'Slow quote API must not leave an endless pending message');
assert.match(quoteLoadBody,/if\(epoch!==checkoutOpenEpoch\)return/,'Responses from a closed or replaced checkout session cannot overwrite the current quote');
assert.match(quoteLoadBody,/sdCheckoutRenderQuote\(\);\s*sdCheckoutRefreshChoice\(\)/,'Quote completion updates actual amount and payment choices without waiting for province/ward API');
const openCheckoutBody=html.slice(html.indexOf('function openCheckout(options={}){'),html.indexOf('function closeCheckout(',html.indexOf('function openCheckout(options={}){')));
const prefillIndex=openCheckoutBody.indexOf('const prefillPromise=prefillCheckoutFromLocalAddress()');
const quoteIndex=openCheckoutBody.indexOf('const quickQuote=maySkipAddress?loadQuoteSafely():null');
const waitIndex=openCheckoutBody.indexOf('prefillPromise.then(async()=>');
assert.ok(prefillIndex>=0&&quoteIndex>prefillIndex&&waitIndex>quoteIndex,'Start read-only quote in parallel instead of serially after administrative division loading');
assert.match(openCheckoutBody,/\$\('#sdCheckoutOptions'\)\.replaceChildren\(\)/,'Do not display stale payment methods from a previous checkout session');
assert.match(openCheckoutBody,/\$\('#sdCheckoutQuoteText'\)\.textContent='Đang kiểm tra tình trạng hàng và giá từ hệ thống…'/,'Waiting state resets cleanly on each checkout open');
assert.doesNotMatch(openCheckoutBody,/fetch\('\/api\/orders'/,'Prefilling and fetching a quote must not create an order');

assert.match(html,/let checkoutItemsOverride=null,checkoutFromCart=true,checkoutSessionItems=null/,'An open payment checkout has a stable item snapshot');

assert.match(html,/function savedCheckoutAddressComplete\(saved\)\{[\s\S]*?saved\.provinceCode[\s\S]*?saved\.wardCode/,'Only saved addresses with explicit province and ward codes qualify to skip address entry');
assert.match(html,/sdCheckoutSetStep\(checkoutAddressComplete\(\)\?2:1\)/,'Payment step must not show before address selects are hydrated and validated');
assert.doesNotMatch(html,/sdCheckoutSetStep\(maySkipAddress\?2:1\)/,'The presence of saved names alone cannot show an empty Payment address card');

assert.match(html,/function sdCheckoutItems\(\)\{return \(checkoutSessionItems\|\|\[\]\)\.map/,'Quote, summary, and final order always read the same selection');
assert.match(openCheckoutBody,/checkoutSessionItems=entries\.map\(item=>\(\{/,'The selected cart entries are captured once at payment opening');
assert.match(html,/checkoutOpenEpoch\+\+;checkoutSessionItems=null/,'Closing checkout invalidates stale items and in-flight quotes');
assert.match(html,/id="sdCheckoutQuoteText"/,'Checkout has a stable inline progress/error text node');
assert.match(html,/id="sdCheckoutRetryQuote" hidden/,'A failed price fetch can be retried without replacing the order');
assert.match(html,/\$\('#sdCheckoutRetryQuote'\)\.addEventListener\('click',async\(\)=>\{/,'Retry button invokes read-only quote API only after explicit tap');


assert.match(html,/sdCheckoutPaymentPayload\(\)/);
assert.match(html,/getElementById|querySelector|#sdCheckoutQrImage/);
assert.match(quote,/paymentReady:false/,"Selecting a method must not mean Shop has confirmed a payment request");
assert.match(quote,/validPublicQrImageKey/,"Only a verified active Shop QR can make the quote payment-ready");
assert.match(quote,/env\.IMAGES\.head/,"The configured QR object must exist before it is considered ready");
assert.match(quote,/makeCheckoutTransferReference/,"The server derives transfer reference readiness from the customer phone and catalog SKU");
assert.match(quote,/selectedOption\?\{paymentOption:selectedOption,selectedPaymentAmount:selected\.amount,paymentInstructions:paymentDetails,transferReference:configured\?transferReference:"",paymentQrImageKey:configured\?key:""\}/,"QR details are returned only after the customer selects a payment option");
assert.doesNotMatch(quote,/order_payment_transactions|payment_status\s*=/,"Quote must not verify or mutate bank transactions");
assert.match(create,/calculateCheckoutQuote\(items\.map/,"Submit re-evaluates amount from server DB");
assert.match(create,/quotedTotal !== serverQuote\.total/,"Stale quote must fail closed");
assert.match(create,/selectedPaymentAmount:selectedAmount/,"Selected amount must come from server, not the browser");
assert.match(html,/sdCheckoutRemaining/);
assert.match(html,/sdCheckoutTransferContent/);
assert.match(html,/sdCheckoutSaveQr/);
assert.doesNotMatch(html,/sdCheckoutOpenBank|Mở ứng dụng ngân hàng/,'Checkout no longer offers a bank-app launch action');
assert.match(html,/id="sdCheckoutConfirmRange" type="range" min="0" max="100" step="1"/,'The transfer confirmation is a continuous swipe slider');
assert.match(glass,/--progress:0%/,'The slider track starts empty');
assert.match(glass,/\.sd-checkout-confirm-wrap::before\{[^}]*width:var\(--progress\)[^}]*linear-gradient\(100deg,#8ed29d,#6dbb81\)[^}]*transition:width 55ms linear/,'The rounded slider fill follows the thumb smoothly in green');
assert.match(glass,/\.dark \.checkout-drawer \.sd-checkout-confirm-wrap::before\{background:linear-gradient\(100deg,#328653,#246b42\)\}/,'Dark mode uses a deeper green for readable slider progress');
assert.match(glass,/\.sd-checkout-confirm-range::-webkit-slider-runnable-track\{height:6px;border-radius:999px;background:transparent\}/,'The native range track stays clear above the full-height fill');
assert.match(glass,/\.sd-checkout-confirm-range::-webkit-slider-thumb\{box-sizing:border-box;width:56px;height:56px;margin-top:-25px/,'The arrow thumb fills the slider interior height');
assert.match(glass,/\.sd-checkout-confirm-range::-webkit-slider-thumb\{[^\n]*linear-gradient\(135deg,#a2e6b0,#67bd81\)/,'The arrow thumb itself is green, not glass-white');
assert.match(glass,/\.dark \.checkout-drawer \.sd-checkout-confirm-range::-webkit-slider-thumb,[^\n]*linear-gradient\(135deg,#328653,#246b42\)/,'The dark theme keeps the thumb green');
assert.match(html,/sdCheckoutConfirmWrap'\)\.style\.setProperty\('--progress',progress\+'%'\)/,'Slider fill updates continuously while moving');
assert.match(html,/Xác nhận đã thanh toán/,'The slider uses the owner-requested confirmation copy');
assert.match(html,/Tiến hành thanh toán →/,'The payment step uses a clear payment action label');
assert.match(html,/function sdCheckoutAdvanceToOrderCode\(\)/,'The finalized order reveals its order-code stage');
const confirmFlow=html.match(/function sdCheckoutAdvanceToOrderCode\(\)\{([\s\S]*?)\n\}/)?.[1]||'';
assert.doesNotMatch(confirmFlow,/\bfetch\s*\(/,'The slider cannot write or refresh a payment receipt');
assert.doesNotMatch(confirmFlow,/paymentSummary|netReceivedAmount|payment_status|payment-transactions/,'The slider cannot mutate payment truth');
assert.match(html,/async function sdCheckoutFinalizeOrder\(\)[\s\S]*fetch\('\/api\/orders'/,'Only the completed slider creates the order');
const checkoutSubmit=html.match(/\$\('#checkoutForm'\)\.addEventListener\('submit',[\s\S]*?(?=\$\('#detailOrderLink')/)?.[0]||'';
assert.match(checkoutSubmit,/sdCheckoutLoadPaymentInstructions/,'The payment step prepares a read-only QR quote');
assert.doesNotMatch(checkoutSubmit,/fetch\('\/api\/orders'/,'Opening the QR does not create an order');
assert.match(create,/requestedTransferReference&&\(!qrSnapshot/,'Finalization refuses a stale or changed QR snapshot');
assert.match(html,/progress>=100\?'Đang lấy mã đơn'/,'The slider changes to the requested loading label at completion');
assert.match(html,/sdCheckoutConfirmRange'\)\.setAttribute\('aria-valuetext','0%'\)/,'Reopening checkout resets the slider accessibility value');
assert.match(html,/sdCheckoutOrderCreated\)return/,'The code stage cannot appear before order creation succeeds');
assert.match(html,/button\.dataset\.detailPaymentOption=choice\.value/,'Product detail renders selectable deposit and full payment choices');
assert.match(html,/Thanh toán hết · giảm 5%/,'Product detail clearly displays the full-payment discount');
assert.match(html,/openCheckout\(\{items:\[\{id,option,quantity:1\}\],paymentChoice:detailPaymentChoice\}\)/,'Buy now carries the payment choice into checkout');
assert.match(html,/async function saveCheckoutAddressFromForm\(\)/,'A successfully placed order saves its address for the next order');
assert.match(html,/function loadLocalShippingAddress\(\)\{if\(accountSyncMode==='cloud'\)/,'Local saved addresses remain available if account sync is guest, loading, or failed');
assert.match(html,/Lưu mã đơn bên dưới để theo dõi tiến độ\. Shop sẽ cập nhật khi đã nhận thanh toán\./,'Success view uses the requested progress message');
assert.match(html,/sd-order-received-note[\s\S]*Shop sẽ xác nhận đơn và bắt đầu làm hàng sau khi nhận đủ khoản thanh toán đã chọn\./,'Order confirmation explains when production starts');
assert.match(html,/\.checkout-drawer \[hidden\]\{display:none!important\}/,'Hidden checkout actions remain hidden after order submission');
// The reviewed address belongs directly beneath the completed "Thông tin" step,
// not between the product summary and the payment choices.
const addressCard=html.indexOf('id="sdCheckoutReviewAddressRow"');
const progressNav=html.indexOf('id="sdCheckoutStepper"');
const paymentIntro=html.indexOf('class="checkout-intro"');
const paymentPanel=html.indexOf('id="sdCheckoutPaymentStep"');
assert.ok(progressNav<addressCard&&addressCard<paymentIntro&&paymentIntro<paymentPanel,'Address card follows the information step and precedes the payment title');
assert.equal(html.split('id="sdCheckoutReviewAddress"').length-1,1,'Only one reviewed address exists');
assert.match(html,/id="sdCheckoutReviewAddressRow" hidden><strong>Địa chỉ nhận hàng<\/strong>/,'The address has a bold heading and is initially hidden');
assert.match(html,/\$\('#sdCheckoutReviewAddressRow'\)\.hidden=sdCheckoutStep!==2/,'Only the payment choice step displays the address card');
assert.match(html,/classList\.add\('sd-checkout-success'\);\$\('#sdCheckoutReviewAddressRow'\)\.hidden=true/,'The QR and order-code screens do not retain the address card');
assert.match(glass,/\.checkout-drawer \.sd-checkout-review-row\{[^}]*margin:2px 5px 4px;padding:13px 15px/,'Address insets are scoped to the reviewed-address tile');

// Header/footer remain on the drawer shell; every stepper, address and QR
// belongs to one continuous Checkout content stream; mobile scrolls the sheet itself, desktop scrolls the form.
const checkoutMarkup=html.slice(html.indexOf('<aside class="checkout-drawer glass"'),html.indexOf('<div class="toast"'));
const markupForm=checkoutMarkup.indexOf('<form id="checkoutForm"'),markupStepper=checkoutMarkup.indexOf('id="sdCheckoutStepper"');
const markupAddress=checkoutMarkup.indexOf('id="sdCheckoutReviewAddressRow"'),markupIntro=checkoutMarkup.indexOf('class="checkout-intro"');
const markupQr=checkoutMarkup.indexOf('id="paymentInstructions"'),markupFormClose=checkoutMarkup.indexOf('</form>');
const markupHeader=checkoutMarkup.indexOf('class="cart-header checkout-header"'),markupFooter=checkoutMarkup.indexOf('class="sd-checkout-footer"');
assert.ok(markupHeader<markupForm&&markupForm<markupStepper&&markupStepper<markupAddress&&markupAddress<markupIntro&&markupIntro<markupQr&&markupQr<markupFormClose&&markupFormClose<markupFooter,'Stepper, address, payment title and QR remain in ONE content stream between the floating glass bars');
assert.match(html,/\.checkout-drawer \.checkout-form\{[^}]*overflow-y:auto[^}]*display:grid/,'Desktop Checkout preserves its original self-scrolling form');
assert.match(html,/\.checkout-heading h2\{[^}]*left:50%;top:50%;transform:translate\(-50%,-50%\);[^}]*font:700 25px\/1\.2 SD Serif/,'Bold order title stays physically centered in every stage');
assert.match(html,/#checkoutDrawer\.sd-checkout-success \.checkout-backlink\{visibility:hidden;pointer-events:none\}/,'Success step does not shift header geometry');
assert.match(html,/#cartDrawer \.cart-header,#checkoutDrawer \.checkout-header\{[^}]*border-radius:22px/,'Floating headers preserve the same geometry');
assert.match(html,/\.nav-wrap \.nav\{[\s\S]*?background:var\(--sd-glass-shell-strong\)!important/,'Original Storefront Header material remains unchanged');
assert.match(html,/#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-actions \.pill-btn,\s*#checkoutDrawer \.sd-checkout-confirm-wrap\{/,'Checkout uses the Cart glass source rule for every floating bar');
assert.match(html,/html.dark #cartDrawer \.cart-header,[\s\S]*?html.dark #checkoutDrawer \.sd-checkout-confirm-wrap\{/,'Checkout light and dark glass stay in sync with Cart');
assert.match(html,/\.checkout-drawer \.sd-checkout-confirm-wrap\{[^}]*border-radius:999px/,'Keep the user-approved round green slider shape and stroke');

assert.doesNotMatch(html,/#checkoutDrawer \.checkout-header\{[^}]*background:/,'No second standalone checkout header film may override the Cart source');
assert.doesNotMatch(html,/#checkoutDrawer \.sd-checkout-actions \.pill-btn\{[^}]*background:/,'Checkout buttons must not restack a second glass face');
assert.doesNotMatch(html,/\.checkout-drawer \.sd-checkout-confirm-wrap\{[^}]*background:/,'The slider shell inherits Cart glass; its green fill remains a separate ::before layer');
assert.match(html,/#cartDrawer \.cart-header,[\s\S]*?#checkoutDrawer \.sd-checkout-confirm-wrap\{[^}]*-webkit-backdrop-filter:blur\(56\.784px\) saturate\(114%\);\s*backdrop-filter:blur\(56\.784px\) saturate\(114%\)/,'Both drawers share the same real filter, not screenshot-derived static gray');


assert.match(html,/#cartDrawer \.cart-header,\s*#cartDrawer \.cart-subtotal-bar,\s*#cartDrawer #cartCheckout,\s*#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-actions \.pill-btn,\s*#checkoutDrawer \.sd-checkout-confirm-wrap\{[\s\S]*?background:linear-gradient\(145deg,rgba\(255,255,255,\.70\),rgba\(255,255,255,\.55\)\)!important;[\s\S]*?box-shadow:var\(--sd-3d-shadow\)!important/,'Cart and Checkout controls share one locally frosted film without changing either drawer');
assert.doesNotMatch(html,/#cartDrawer \.cart-header,\s*#cartDrawer \.cart-subtotal-bar,\s*#cartDrawer #cartCheckout,\s*#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-actions \.pill-btn,\s*#checkoutDrawer \.sd-checkout-confirm-wrap\{\s*background-color:/,'The three Cart bars must not have a painted static base');
assert.match(html,/#cartDrawer \.cart-header,\s*#cartDrawer \.cart-subtotal-bar,\s*#cartDrawer #cartCheckout,\s*#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-actions \.pill-btn,\s*#checkoutDrawer \.sd-checkout-confirm-wrap\{[\s\S]*?background:linear-gradient\(145deg,rgba\(255,255,255,\.70\),rgba\(255,255,255,\.55\)\)!important/,'Checkout reuses Cart optics without repainting or dimming either drawer');
assert.match(html,/#cartDrawer \.cart-header,\s*#cartDrawer \.cart-subtotal-bar,\s*#cartDrawer #cartCheckout,\s*#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-actions \.pill-btn,\s*#checkoutDrawer \.sd-checkout-confirm-wrap\{[\s\S]*?-webkit-backdrop-filter:blur\(56\.784px\) saturate\(114%\);\s*backdrop-filter:blur\(56\.784px\) saturate\(114%\)/,'Checkout header, actions and slider reuse the exact Cart backdrop without brightness tint');
assert.doesNotMatch(html,/#cartDrawer \.cart-header,\s*#cartDrawer \.cart-subtotal-bar,\s*#cartDrawer #cartCheckout,\s*#checkoutDrawer \.checkout-header,\s*#checkoutDrawer \.sd-checkout-actions \.pill-btn,\s*#checkoutDrawer \.sd-checkout-confirm-wrap\{[^}]*brightness\(/,'Cart or Checkout glass must never darken real photographs with brightness()');
assert.match(html,/<script defer src="\/cart-glass-optics\.js"><\/script>/,'Cart optical lens runs without touching order code');
assert.match(html,/#cartDrawer \.sd-cart-optical-lens\{[^}]*pointer-events:none/,'Optical mirrors do not intercept checkout interaction');
assert.doesNotMatch(html,/background-color:rgba\(115,111,104,\.88\)!important|background-color:rgba\(9,27,43,\.88\)!important/,'Remove legacy light and dark gray tint overrides');
assert.match(html,/#cartDrawer \.cart-header h2,#checkoutDrawer \.checkout-heading h2\{[^}]*font:700 25px\/1\.2 SD Serif/,'Both centered heading titles are bold');
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

const checkoutOptics=readFileSync(new URL('../public/checkout-glass-optics.js',import.meta.url),'utf8');
assert.match(html,/<script defer src="\/checkout-glass-optics\.js"><\/script>/,'Mobile Checkout optical lens must be loaded');
assert.match(html,/#checkoutDrawer \.sd-checkout-optical-lens\{[^}]*overflow:hidden;border-radius:inherit/,'Checkout optics are clipped to the actual glass bars');
assert.match(html,/#checkoutDrawer \.sd-checkout-optical-mirror\{[^}]*filter:blur\(14px\)/,'Checkout mirrors use the same 14px source blur as Cart');
assert.match(checkoutOptics,/drawer\.querySelector\('\.checkout-header'\)/,'Checkout header has an optical lens');
assert.match(checkoutOptics,/drawer\.querySelector\('\.sd-checkout-footer'\)/,'Checkout footer has an optical lens');
assert.match(checkoutOptics,/clone\.style\.removeProperty\('mask-image'\)/,'Mirrors may not inherit the source occlusion mask');
assert.match(checkoutOptics,/block\.style\.setProperty\('mask-image',mask\)/,'Sharp source text is suppressed only where actually covered by glass');
assert.match(checkoutOptics,/requestAnimationFrame\(render\)/,'Scroll optics are framed and do not run synchronous layout on each scroll event');
assert.doesNotMatch(checkoutOptics,/\bfetch\(|\/api\/|localStorage|sessionStorage|\bsubmit\(/,'Checkout optical code cannot change payments, network, or order state');

assert.match(html,/\.cart-drawer\{overflow-y:auto!important;overscroll-behavior:contain/,'Mobile cart uses its outer shell as its only scrolling container');
assert.match(html,/\.cart-drawer:has\(\.cart-row\) \.cart-list\{[^}]*overflow:visible!important/,'Both list overflow axes are visible: no implicit clipped inner scrollport');
assert.match(html,/\.cart-drawer:has\(\.cart-row\) \.cart-bottom\{position:sticky;bottom:0;z-index:2;margin-top:auto\}/,'Both glass footer bars remain reachable while outer drawer scrolls');
assert.match(html,/#cartDrawer \.cart-header\{position:sticky;top:0;z-index:2\}/,'Floating cart header remains in place in the unified scroll region');
assert.match(html,/\.checkout-drawer\{overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none\}/,'Mobile Checkout scrolls outer frosted sheet, like Cart');
assert.match(html,/#checkoutDrawer \.checkout-header\{position:sticky;top:0;z-index:3;flex-shrink:0\}/,'Checkout title stays fixed while fields pass behind the glass');
assert.match(html,/#checkoutDrawer \.checkout-form\{flex:0 0 auto!important;overflow:visible!important;min-height:0;max-height:none;align-self:stretch\}/,'No clipped inner form or horizontal cut edge on mobile');
assert.match(html,/#checkoutDrawer \.sd-checkout-footer\{position:sticky;bottom:0;z-index:3;margin-top:auto;flex-shrink:0\}/,'Checkout CTA floats above passing content, exactly as Cart');
assert.match(html,/function resetCheckoutScrollPosition\(\)\{[\s\S]*?drawer\.scrollTop=0;/,'Checkout step changes reset the actual mobile scroll container');


assert.match(html,/\.checkout-drawer \.sd-checkout-footer\{[^}]*border-top:0;background:transparent;box-shadow:none/,'Checkout footer has no full-width separator or detached glass rectangle');


assert.match(html,/Nhấn vào đây để sao chép mã đơn/,'Order number explains how to copy it');
assert.match(html,/Nếu đặt cọc và chuyển dư, phần dư sẽ trừ vào số tiền thanh toán khi nhận hàng\./,'Deposit overpayment is explained in plain language');
assert.match(html,/Số tiền thanh toán khi nhận hàng '\+formatVnd\(choice\.codExpected\)/,'Payment choices use clear delivery-payment wording');
assert.match(html,/id="sdCheckoutDone"[^>]*>Lấy mã đơn/,'When QR is unavailable, order creation still happens only on explicit action');
assert.match(html,/sd-checkout-success \.sd-checkout-actions\{grid-template-columns:minmax\(0,1fr\)\}/,'Success actions use the full footer width instead of the former narrow left column');
assert.doesNotMatch(html,/Lưu mã đơn bên dưới để tra cứu|Đã gửi đơn\. Thông tin và mã đơn|Chọn phương thức hoặc gửi đơn không đồng nghĩa|COD còn phải thu/,'Old confusing confirmation copy is removed');
assert.match(create,/paymentRequestWriteIndex[\s\S]*customer_checkout/,'Checkout creates a payment request from the Shop QR without writing a receipt');
assert.match(create,/payment_terms_confirmed_by[\s\S]*customer_checkout/,'A confirmed catalog price and explicit customer choice define checkout terms');
assert.match(create,/customerPaymentVerified:false/,'Creating a QR request must not mark money received');
assert.match(html,/<div class="sd-checkout-qr-art"><img id="sdCheckoutQrImage"/,"QR must have a dedicated full-width square");
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
const paymentRender=html.slice(html.indexOf('function renderPaymentInstructions('),html.indexOf('async function sdCopyCheckoutText('));
const restoreQr=paymentRender.indexOf('qrMount.append(existingQr)');
const clearOldStage=paymentRender.indexOf('panel.replaceChildren()');
assert.ok(restoreQr>=0&&clearOldStage>restoreQr,'Keep the live QR node and its listeners across sequential checkouts');
assert.match(html,/\$\('#sdCheckoutQrMount'\)\.append\(\$\('#sdCheckoutQrWrap'\)\)/,'Second checkout mounts the retained QR tile');
assert.match(html,/\$\('#sdCheckoutConfirmRange'\)\.disabled=false/,'Every new checkout re-enables the slider');
assert.match(html,/\$\('#sdCheckoutConfirmLabel'\)\.textContent='Xác nhận đã thanh toán'/,'Every new checkout resets the slider label');
assert.match(html,/if\(sdCheckoutOrderCreating\)return;sdCheckoutOrderCreating=true/,'An in-flight order is protected against duplicate submit');
assert.match(html,/finally\{sdCheckoutOrderCreating=false\}/,'A failed submission unlocks retry');
console.log("PASS: owner-approved Liquid Glass checkout steps; server-authoritative deposits; QR fail-closed; Admin choice recorded without marking paid.");
