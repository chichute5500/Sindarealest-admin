/**
 * Browser regression on a locally served, disposable Storefront. Absolutely no
 * real checkout, login or remote database writes: POST requests are intercepted.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const origin=process.env.AUDIT_LOCAL_URL||"http://127.0.0.1:8788";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce",colorScheme:"light"});
const page=await context.newPage();
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
   assert.equal(payload.items.length,2);
   assert.equal(payload.paymentOption,"deposit");
   await new Promise(resolve=>setTimeout(resolve,300));
   return route.fulfill(json({ok:true,orderNumber:"QA-NO-DB-ORDER",orderAccessToken:"mock",
     status:"pending_confirmation",priceConfirmationRequired:true,total:null,message:"Đã ghi nhận đơn thử nghiệm trong trình duyệt.",
     selectedPaymentOption:"deposit",selectedPaymentAmount:900000,selectedRemainingAmount:2100000,
     selectedDiscountAmount:0,transferReference:"QA-STATIC-ONLY"},201));
 }
 if(req.method()!=="GET"&&req.method()!=="HEAD"){
   allRequests.push(path);return route.abort("blockedbyclient");
 }
 return route.continue();
});
await page.addInitScript(()=>{try{sessionStorage.setItem("sd-welcome-seen-in-tab","1")}catch{}});
try{
 const response=await page.goto(origin+"/sanpham",{waitUntil:"domcontentloaded",timeout:35000});
 assert.equal(response.status(),200);
 await page.locator('#catalogGrid [data-add="qa-wallet"]').waitFor({timeout:20000});
 await page.locator('#catalogGrid [data-add="qa-wallet"]').click();
 await page.locator('#catalogGrid [data-add="qa-clutch"]').click();
 await page.evaluate(()=>document.querySelector("#cartOpen").click());
 await page.locator("#cartDrawer.open").waitFor();
 assert.match(await page.locator("#cartSubtotal").innerText(),/chưa gồm sản phẩm chờ báo giá/);
 await page.keyboard.press("Escape");
 await page.waitForFunction(()=>!document.querySelector("#cartDrawer").classList.contains("open"));
 await page.evaluate(()=>document.querySelector("#cartOpen").click());
 await page.locator("#cartCheckout").click();
 await page.locator("#checkoutDrawer.open").waitFor();
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
 assert.match(await page.locator("#sdCheckoutAmount").innerText(),/900/);
 await page.locator("#checkoutSubmit").click();
 await page.waitForFunction(()=>!document.querySelector("#sdCheckoutReviewStep").hidden);
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
 await page.locator('#catalogGrid article[data-product]').first().waitFor({timeout:25000});
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
 await page.evaluate(()=>window.scrollTo(0,1100));
 await page.waitForTimeout(180);
 const scrolledNav=await navState();
 assert.ok(Math.abs(scrolledNav.top-beforeNav.top)<3,'Mobile navigation must not move during content scrolling');
 console.log("PASS: single four-tab mobile bottom navigation remains fixed and contained after reload and scroll.");
 console.log("PASS: browser-mocked checkout: mixed prices, phone validation, 3 steps, Back persistence, Esc, deposit and no duplicate submission; 0 real writes.");
}finally{await context.close();await browser.close()}
