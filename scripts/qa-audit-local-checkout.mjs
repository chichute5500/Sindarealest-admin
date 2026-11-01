/**
 * Browser regression on a locally served, disposable Storefront. Absolutely no
 * real checkout, login or remote database writes: POST requests are intercepted.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {mkdir} from "node:fs/promises";
import {join} from "node:path";
const origin=process.env.AUDIT_LOCAL_URL||"http://127.0.0.1:8788";
const evidenceDir=process.env.AUDIT_CHECKOUT_EVIDENCE||"audit/checkout-mocked";
await mkdir(evidenceDir,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce",colorScheme:"light"});
const page=await context.newPage();
// CI evidence contains invented products and a dummy phone only; never real customer data.
const screenshot=async file=>page.screenshot({path:join(evidenceDir,file),animations:"disabled",timeout:30000});
const sample=[
 {id:"qa-wallet",slug:"qa-wallet",sku:"SD-VN-QA",skuVerified:true,title:"Ví nam da cá sấu QA",category:"wallets",categoryLabel:"Ví nam",images:["images/theme-croc-dark.webp"],price:3000000,sourcePriceConfirmed:true,fulfillmentType:"made_to_order",published:true},
 {id:"qa-clutch",slug:"qa-clutch",sku:"SD-CL-QA",skuVerified:true,title:"Clutch thử nghiệm QA",category:"clutch",categoryLabel:"Clutch",images:["images/theme-croc-dark.webp"],price:null,sourcePriceConfirmed:false,fulfillmentType:"made_to_order",published:true}
];
const json=(data,status=200)=>({status,contentType:"application/json",body:JSON.stringify(data)});
let sentOrders=0;
const allRequests=[];
await page.route("**/*",async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname;
 if(path==="/api/products")return route.fulfill(json(sample));
 if(path==="/api/settings")return route.fulfill(json({welcomeEnabled:false}));
 if(path==="/api/customer/session")return route.fulfill(json({active:false}));
 if(url.hostname==="provinces.open-api.vn"&&path==="/api/v2/p/")return route.fulfill(json([{code:79,name:"TP Hồ Chí Minh"}]));
 if(url.hostname==="provinces.open-api.vn"&&path.startsWith("/api/v2/p/"))return route.fulfill(json({wards:[{code:27123,name:"Phường Bến Nghé"}]}));
 if(path==="/api/checkout-quote"){
   assert.equal(req.method(),"POST");
   const quoteItems=JSON.parse(req.postData()||"{}").items||[];
   if(quoteItems.some(i=>i.id==="qa-clutch")){
     return route.fulfill(json({ok:true,paymentReady:false,fulfillmentType:"made_to_order",reason:"Sản phẩm chưa có giá xác nhận. Shop sẽ liên hệ tư vấn.",options:[]}));
   }
   assert.deepEqual(quoteItems.map(i=>i.id),["qa-wallet"],"Deposits only quoted after unpriced item is removed");
   return route.fulfill(json({ok:true,paymentReady:true,fulfillmentType:"made_to_order",total:3000000,
      options:[{value:"deposit",label:"Đặt cọc 30%",amount:900000,remainingAmount:2100000,discountAmount:0},
               {value:"full",label:"Thanh toán toàn bộ",amount:2850000,remainingAmount:0,discountAmount:150000}],
      qrImageUrl:"",transferReference:"QA-STATIC-ONLY"}));
 }
 if(path==="/api/orders"){
   assert.equal(req.method(),"POST");
   sentOrders++;
   const payload=JSON.parse(req.postData()||"{}");
   assert.equal(payload.phone,"0900000000");
   assert.equal(payload.items.length,1,"Deposit order must contain only the priced item");
   assert.equal(payload.paymentOption,"deposit");
   await new Promise(resolve=>setTimeout(resolve,300));
   return route.fulfill(json({ok:true,orderNumber:"QA-NO-DB-ORDER",orderAccessToken:"mock",
     status:"pending_confirmation",priceConfirmationRequired:false,total:3000000,message:"Đã ghi nhận đơn thử nghiệm trong trình duyệt.",
     selectedPaymentOption:"deposit",selectedPaymentAmount:900000,selectedRemainingAmount:2100000,
     selectedDiscountAmount:0,transferReference:"QA-STATIC-ONLY"},201));
 }
 if(req.method()!=="GET"&&req.method()!=="HEAD"){
   allRequests.push(path);return route.abort("blockedbyclient");
 }
 return route.continue();
});
await page.addInitScript(()=>{
 try{sessionStorage.setItem("sd-welcome-seen-in-tab","1")}catch{}
 // Check *during streaming HTML parsing*, before the later drawer CSS arrives.
 // This reproduces the brief checkout panel revealed by Android refresh.
 window.__sdFirstPaintDrawerLeaks=[];
 window.__sdHeaderFirstPaint=[];
 const ids=['accountDrawer','cartDrawer','checkoutBackdrop','checkoutDrawer'];
 const captured=new Set();
 const observer=new MutationObserver(()=>{
   if(window.__sdHeaderFirstPaint.length===0){
     const header=document.querySelector('.nav-wrap .nav .brand-copy');
     if(header){
       const text=header.querySelector('.brand-name');
       const computed=getComputedStyle(header),nameStyle=getComputedStyle(text);
       window.__sdHeaderFirstPaint.push({display:computed.display,direction:computed.flexDirection,nowrap:nameStyle.whiteSpace});
     }
   }
   for(const id of ids){
     if(captured.has(id))continue;
     const el=document.getElementById(id);
     if(!el)continue;
     captured.add(id);
     const style=getComputedStyle(el);
     if(style.display!=='none'&&style.visibility!=='hidden'){
       window.__sdFirstPaintDrawerLeaks.push({id,display:style.display,visibility:style.visibility});
     }
   }
   if(captured.size===ids.length)observer.disconnect();
 });
 observer.observe(document,{childList:true,subtree:true});
});
try{
 const response=await page.goto(origin+"/sanpham",{waitUntil:"domcontentloaded",timeout:35000});
 assert.equal(response.status(),200);
 assert.deepEqual(await page.evaluate(()=>window.__sdFirstPaintDrawerLeaks),[],
  'No drawer or checkout backdrop can paint before the late motion CSS is parsed');
 assert.deepEqual(await page.evaluate(()=>window.__sdHeaderFirstPaint),[
  {display:'flex',direction:'column',nowrap:'nowrap'}
 ],'Header must be fully styled at the first DOM paint, including brand name and tagline');
 await page.locator('#catalogGrid [data-add="qa-wallet"]').waitFor({timeout:20000});
 await page.locator('#catalogGrid [data-add="qa-wallet"]').click();
 await page.locator('#catalogGrid [data-add="qa-clutch"]').click();
 await page.evaluate(()=>document.querySelector("#cartOpen").click());
 await page.locator("#cartDrawer.open").waitFor();
 await screenshot("01-cart-mixed-price-390x844.png");
 assert.match(await page.locator("#cartSubtotal").innerText(),/chưa gồm sản phẩm chờ báo giá/);
 await page.keyboard.press("Escape");
 await page.waitForFunction(()=>!document.querySelector("#cartDrawer").classList.contains("open"));
 await page.evaluate(()=>document.querySelector("#cartOpen").click());
 await page.locator("#cartCheckout").click();
 await page.locator("#checkoutDrawer.open").waitFor();
 await screenshot("02-checkout-shipping-390x844.png");
 await page.locator('#checkoutForm [name="fullName"]').fill("Nguyễn Văn QA");
 await page.locator('#checkoutForm [name="phone"]').fill("123456");
 await page.locator('#checkoutForm [name="streetAddress"]').fill("01 Đường Thử Nghiệm");
 await page.waitForFunction(()=>document.querySelector("#checkoutProvince")?.options.length>1);
 await page.locator("#checkoutProvince").selectOption("TP Hồ Chí Minh");
 await page.waitForFunction(()=>document.querySelector("#checkoutWard")?.options.length>1);
 await page.locator("#checkoutWard").selectOption("Phường Bến Nghé");
 await page.locator("#checkoutSubmit").click();
 assert.match(await page.locator("#checkoutMessage").innerText(),/số di động Việt Nam hợp lệ/);
 await page.locator('#checkoutForm [name="phone"]').fill("0900000000");
 await page.locator("#checkoutSubmit").click();
 await page.waitForFunction(()=>!document.querySelector("#sdCheckoutPaymentStep").hidden);
 assert.match(await page.locator("#sdCheckoutQuoteNotice").innerText(),/chưa có giá xác nhận/);
 assert.match(await page.locator("#sdCheckoutStepSubtitle").innerText(),/Chưa cần chuyển khoản/);
 assert.match(await page.locator("#checkoutSubmit").innerText(),/gửi yêu cầu/);
 assert.equal(await page.locator("#sdCheckoutOptions .sd-checkout-option").count(),0,"Unpriced products must not offer false deposits");
 assert.equal(await page.locator("#sdCheckoutQrWrap").isVisible(),false,"Unpriced products must not show banking QR");
 await screenshot("03a-checkout-unpriced-no-payment-390x844.png");
 // Go back to the cart and remove the unquoted item before running the real deposit path.
 await page.locator("#sdCheckoutPrev").click();
 await page.locator("#sdCheckoutPrev").click();
 await page.locator("#cartDrawer.open").waitFor();
 await page.locator('#cartDrawer [data-remove="qa-clutch"]').click();
 assert.equal(await page.locator('#cartDrawer [data-remove="qa-clutch"]').count(),0);
 await page.locator("#cartCheckout").click();
 await page.locator("#checkoutDrawer.open").waitFor();
 await page.locator('#checkoutForm [name="fullName"]').fill("Nguyễn Văn QA");
 await page.locator('#checkoutForm [name="phone"]').fill("0900000000");
 await page.locator('#checkoutForm [name="streetAddress"]').fill("01 Đường Thử Nghiệm");
 await page.waitForFunction(()=>document.querySelector("#checkoutProvince")?.options.length>1);
 await page.locator("#checkoutProvince").selectOption("TP Hồ Chí Minh");
 await page.waitForFunction(()=>document.querySelector("#checkoutWard")?.options.length>1);
 await page.locator("#checkoutWard").selectOption("Phường Bến Nghé");
 await page.locator("#checkoutSubmit").click();
 await page.waitForFunction(()=>!document.querySelector("#sdCheckoutPaymentStep").hidden);
 await screenshot("03-checkout-payment-390x844.png");
 assert.match(await page.locator("#sdCheckoutAmount").innerText(),/900/);
 await page.locator("#checkoutSubmit").click();
 await page.waitForFunction(()=>!document.querySelector("#sdCheckoutReviewStep").hidden);
 await screenshot("04-checkout-review-390x844.png");
 await page.locator("#sdCheckoutPrev").click();
 await page.locator("#sdCheckoutPrev").click();
 assert.equal(await page.locator('#checkoutForm [name="phone"]').inputValue(),"0900000000");
 assert.equal(await page.locator('#checkoutForm [name="streetAddress"]').inputValue(),"01 Đường Thử Nghiệm");
 await page.locator("#checkoutSubmit").click();
 await page.waitForFunction(()=>!document.querySelector("#sdCheckoutPaymentStep").hidden);
 await page.locator("#checkoutSubmit").click();
 await page.waitForFunction(()=>!document.querySelector("#sdCheckoutReviewStep").hidden);
 await page.locator("#checkoutSubmit").click();
 await page.evaluate(()=>document.querySelector("#checkoutForm").requestSubmit());
 await page.waitForTimeout(1000);
 assert.equal(sentOrders,1,"Duplicate checkout must remain blocked while sending");
 assert.equal(allRequests.length,0,"Never send unmocked POST to any server");
 // Regression: Android-style reload must not duplicate or detach bottom nav.
 // This runs on local mock data and never invokes checkout after reload.
 await page.reload({waitUntil:"domcontentloaded",timeout:30000});
 assert.deepEqual(await page.evaluate(()=>window.__sdFirstPaintDrawerLeaks),[],
  'Android-style refresh must not flash the checkout or cart drawer during parsing');
 assert.deepEqual(await page.evaluate(()=>window.__sdHeaderFirstPaint),[
  {display:'flex',direction:'column',nowrap:'nowrap'}
 ],'After mobile refresh, the brand lockup must not briefly render as joined inline text');
 await page.locator('#catalogGrid article[data-product]').first().waitFor({timeout:25000});
 // Screenshot only after first catalog thumbnail decodes; loading an article
 // does not mean its image has reached the compositor on a cold Android reload.
 await page.waitForFunction(()=>{
   const image=document.querySelector('#catalogGrid article[data-product] .product-photo img');
   return image?.complete&&image.naturalWidth>0&&getComputedStyle(image).visibility==='visible';
 },{},{timeout:20000});
 await page.locator('#catalogGrid article[data-product] .product-photo img').first().evaluate(async image=>{
   try{await image.decode()}catch{}
 });
 await page.waitForTimeout(300);
 const navState=async()=>page.evaluate(()=>{
   const nav=document.querySelector('#mobileBottomNav');
   if(!nav)return {count:0};
   const rect=nav.getBoundingClientRect(),cs=getComputedStyle(nav);
   const tabs=[...nav.querySelectorAll('[data-mobile-tab]')];
   return {count:document.querySelectorAll('#mobileBottomNav').length,
     position:cs.position,top:rect.top,bottom:rect.bottom,width:rect.width,
     viewportWidth:innerWidth,viewportHeight:innerHeight,tabs:tabs.length,
     outside:tabs.some(t=>{const r=t.getBoundingClientRect();return r.left<rect.left-3||r.right>rect.right+3})};
 });
 const beforeNav=await navState();
 assert.equal(beforeNav.count,1,'Reload must not duplicate the mobile bottom navigation');
 assert.equal(beforeNav.position,'fixed','Mobile navigation must stay fixed after reload');
 assert.equal(beforeNav.tabs,4,'Keep exactly four approved mobile destinations');
 assert.ok(!beforeNav.outside&&beforeNav.width<=beforeNav.viewportWidth-8,'Nav/tabs must not stretch beyond mobile viewport');
 assert.ok(beforeNav.bottom<=beforeNav.viewportHeight+3&&
           beforeNav.viewportHeight-beforeNav.bottom<38,'Nav must remain anchored to bottom safe-area');
 await screenshot("05-mobile-nav-after-reload-390x844.png");
 await page.evaluate(()=>window.scrollTo(0,1100));
 await page.waitForTimeout(180);
 const scrolledNav=await navState();
 assert.ok(Math.abs(scrolledNav.top-beforeNav.top)<3,'Mobile navigation must not move during content scrolling');
 // A separate fake-data browser tests external address-service failure and retry.
 // No production credentials, phone verification, or real orders are used.
 const retryContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
 const retryPage=await retryContext.newPage();
 let provinceFailures=0;
 await retryPage.route("**/*",async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;
   if(path==="/api/products")return route.fulfill(json(sample));
   if(path==="/api/settings")return route.fulfill(json({welcomeEnabled:false}));
   if(path==="/api/customer/session")return route.fulfill(json({active:false}));
   if(url.hostname==="provinces.open-api.vn"&&path==="/api/v2/p/"){
     provinceFailures++;
     return route.fulfill(provinceFailures===1?json({error:"offline"},503):json([{code:79,name:"TP Hồ Chí Minh"}]));
   }
   if(url.hostname==="provinces.open-api.vn"&&path.startsWith("/api/v2/p/"))
     return route.fulfill(json({wards:[{code:27123,name:"Phường Bến Nghé"}]}));
   if(req.method()!=="GET"&&req.method()!=="HEAD")return route.abort("blockedbyclient");
   return route.continue();
 });
 await retryPage.addInitScript(()=>{try{sessionStorage.setItem("sd-welcome-seen-in-tab","1")}catch{}});
 try{
   await retryPage.goto(origin+"/sanpham",{waitUntil:"domcontentloaded",timeout:35000});
   await retryPage.locator('#catalogGrid [data-add="qa-wallet"]').waitFor();
   await retryPage.locator('#catalogGrid [data-add="qa-wallet"]').click();
   await retryPage.evaluate(()=>document.querySelector("#cartOpen").click());
   await retryPage.locator("#cartCheckout").click();
   await retryPage.waitForFunction(()=>{
     const message=document.querySelector("#checkoutAddressMessage");
     const retry=document.querySelector("#checkoutAddressRetry");
     return message?.textContent.includes("Thử tải lại")&&retry&&!retry.hidden;
   },null,{timeout:12000});
   assert.equal(await retryPage.locator("#checkoutProvince").isDisabled(),true);
   await retryPage.screenshot({path:join(evidenceDir,"06-address-offline-390x844.png"),animations:"disabled"});
   assert.match((await retryPage.locator("#checkoutAddressMessage").textContent())||"",/Thử tải lại/);
   assert.equal(await retryPage.locator("#checkoutAddressRetry").isVisible(),true,
     "Offline state must expose a visible retry button");
   await retryPage.locator("#checkoutAddressRetry").click();
   await retryPage.waitForFunction(()=>document.querySelector("#checkoutProvince")?.options.length>1);
   assert.equal(await retryPage.locator("#checkoutAddressRetry").isVisible(),false);
   assert.equal(provinceFailures,2,"Address API should retry only after the visitor asks");
   console.log("PASS: offline province lookup shows a clear retry; customer can retry without reloading/losing checkout.");
 }finally{await retryContext.close()}
 // Repeated drawer visits must release scroll locks and must never clone mobile tabs.
 for(let cycle=0;cycle<20;cycle++){
   await page.locator("#mobileAccountNav").click();
   await page.locator("#accountDrawer.open").waitFor();
   await page.locator("#accountClose").click();
   await page.waitForFunction(()=>!document.querySelector("#accountDrawer").classList.contains("open"));
 }
 const afterCycles=await page.evaluate(()=>({
   navCount:document.querySelectorAll("#mobileBottomNav").length,
   bodyOverflow:document.body.style.overflow,
   accounts:document.querySelectorAll("#accountDrawer").length
 }));
 assert.deepEqual(afterCycles,{navCount:1,bodyOverflow:"",accounts:1});
 console.log("PASS: 20 guest account drawer open/close cycles without duplicated nav or retained body scroll lock.");
 console.log("PASS: single four-tab mobile bottom navigation remains fixed and contained after reload and scroll.");
 console.log("PASS: browser-mocked checkout: mixed cart requires quote (no deposit/QR); priced-only cart validates deposit and 3 steps, Back persistence, Esc, no duplicate submission; 0 real writes.");
}finally{await context.close();await browser.close()}
