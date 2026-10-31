/**
 * Browser-only regression for PR #155's actual Storefront source.
 *
 * Load the local static site and intercept all /api calls; never write to
 * Cloudflare, Products, Orders, Mailjet, D1, R2, or Production.
 * Run at mobile / desktop and OS light / dark with motion enabled.
 */
import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
import {chromium} from "playwright";

const ROOT=process.env.SD_BROWSER_QA_URL||"http://127.0.0.1:4173/";
assert.match(ROOT,/^http:\/\/127\.0\.0\.1:4173\/$/);
const OUTPUT="artifacts/storefront-fluid-browser";
mkdirSync(OUTPUT,{recursive:true});
const stamp="2026-10-30 09:00:00";
const products=[
 {id:"qa-sneaker",slug:"qa-sneaker",sku:"SD-SNQA-001",skuVerified:true,
  title:"Giày Thể Thao VIP Da Cá Sấu QA",category:"sneakers",categoryLabel:"Giày Thể Thao",
  price:1500000,sourcePriceConfirmed:true,published:1,fulfillmentType:"in_stock",
  created_at:stamp,images:["images/theme-croc-dark.webp"]},
 {id:"qa-wallet",slug:"qa-wallet",sku:"SD-VNQA-002",skuVerified:true,
  title:"Ví Nam VIP Da Cá Sấu QA",category:"vi-nam",categoryLabel:"Ví Nam",
  price:2500000,sourcePriceConfirmed:true,published:1,fulfillmentType:"made_to_order",
  created_at:"2026-10-29 09:00:00",images:["images/theme-croc-albino.webp"]}
];
const cases=[
 {name:"mobile-light",width:390,height:844,dark:false,mobile:true},
 {name:"mobile-dark",width:390,height:844,dark:true,mobile:true},
 {name:"desktop-light",width:1365,height:900,dark:false,mobile:false},
 {name:"desktop-dark",width:1365,height:900,dark:true,mobile:false}
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const summary={kind:"LOCAL_BROWSER_NO_REMOTE_WRITE",cases:[]};
try{
 for(const c of cases){
  const ctx=await browser.newContext({
   viewport:{width:c.width,height:c.height},colorScheme:c.dark?"dark":"light",
   isMobile:c.mobile,hasTouch:c.mobile,deviceScaleFactor:1
  });
  await ctx.addInitScript(()=>{
    try{sessionStorage.setItem("sindarealest_welcomed","true")}catch{}
  });
  const page=await ctx.newPage();
  const errors=[],blockedWrites=[];
  let mockedQuotes=0;
  page.on("pageerror",e=>errors.push(String(e.message).slice(0,240)));
  page.on("request",req=>{if(!["GET","HEAD"].includes(req.method()))blockedWrites.push(req.method()+" "+new URL(req.url()).pathname)});
  await page.route("**/*",route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.method()==="POST"&&url.origin===new URL(ROOT).origin&&url.pathname==="/api/checkout-quote"){
    ++mockedQuotes;
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
     ok:true,paymentReady:false,reason:"QA: Không sử dụng QR hoặc tài khoản ngân hàng thật.",
     options:[],total:2500000
    })});
   }
   if(req.method()!=="GET"&&req.method()!=="HEAD")return route.abort("blockedbyclient");
   if(url.hostname==="provinces.open-api.vn"&&url.pathname==="/api/v2/p/"){
    return route.fulfill({status:200,contentType:"application/json",
     body:JSON.stringify([{code:"79",name:"Hồ Chí Minh"}])});
   }
   if(url.hostname==="provinces.open-api.vn"&&url.pathname==="/api/v2/p/79"){
    return route.fulfill({status:200,contentType:"application/json",
     body:JSON.stringify({wards:[{code:"QA-001",name:"Phường QA"}]})});
   }
   if(url.pathname==="/api/products")
    return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({products})});
   if(url.pathname.startsWith("/api/"))
    return route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({authenticated:false})});
   if(url.origin!==new URL(ROOT).origin)return route.abort("blockedbyclient");
   // Cloudflare Pages serves the SPA entrypoint for /sanpham; the local
   // python static server cannot. Preserve this deployed routing behavior
   // during reload rather than reporting a false modal regression.
   if(req.isNavigationRequest() && (url.pathname==="/sanpham" || url.pathname.startsWith("/sanpham/")))
    return route.continue({url:ROOT+"index.html"});
   return route.continue();
  });
  const result={name:c.name,passed:false,steps:[],pageErrors:errors};
  const checkpoint=name=>result.steps.push(name);
  try{
   const response=await page.goto(ROOT,{waitUntil:"domcontentloaded",timeout:20000});
   assert.equal(response?.status(),200);
   await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
   await page.waitForFunction(()=>!document.getElementById("welcomeSplash"),{timeout:6000});
   checkpoint("first-paint and Welcome bypass");
   const state=await page.evaluate(()=>({
    dark:document.documentElement.classList.contains("dark"),
    dataTheme:document.documentElement.dataset.theme,
    css:getComputedStyle(document.documentElement).getPropertyValue("--page").trim(),
    font:getComputedStyle(document.body).fontFamily,
    newStylesheet:[...document.styleSheets].some(sh=>sh.href?.includes("storefront-fluid-unified.css"))
   }));
   assert.equal(state.dark,c.dark,"OS-first palette");
   assert.equal(state.dataTheme,c.dark?"dark":"light");
   assert.equal(state.newStylesheet,true,"Unified glass stylesheet must load");
   checkpoint("OS-first theme and unified CSS");

   const cards=page.locator("#catalogGrid .product-card");
   await cards.first().waitFor({state:"attached",timeout:12000});
   assert.equal(await cards.count(),products.length);
   const hasCategory=await page.locator('#categoryFilters [data-category="vi-nam"]').count();
   assert.equal(hasCategory,1);
   await page.locator('#categoryFilters [data-category="vi-nam"]').click({timeout:13000});
   await page.waitForTimeout(550);
   const catalog=await page.evaluate(()=>{
    const grid=document.getElementById("catalogGrid"),
      strip=document.getElementById("categoryFilters"),
      active=strip?.querySelector(".filter-pill.active"),
      glider=strip?.querySelector(".sd-filter-active-glider");
    const box=glider?.getBoundingClientRect(),selected=active?.getBoundingClientRect();
    return {heading:document.getElementById("catalogHeading")?.textContent,
      cards:grid?.querySelectorAll(".product-card").length,
      active:active?.dataset.category,gliderWidth:box?.width||0,
      overlap:box&&selected?Math.abs(box.left-selected.left):1e4,
      cardStagger:grid?.querySelector(".product-card")?.style.getPropertyValue("--sd-stagger"),
      gridMinHeight:grid?.style.minHeight||""};
   });
   assert.equal(catalog.active,"vi-nam");
   assert.equal(catalog.cards,1);
   assert.ok(catalog.gliderWidth>20,"Active glass pill must have measurable width");
   assert.ok(catalog.overlap<5,"Active glass pill must align with selected category");
   assert.ok(catalog.cardStagger!==undefined,"Catalog cards have stagger token");
   checkpoint("category transition and sliding glass pill");

   const accountTrigger=c.mobile?"#mobileAccountNav":"#accountOpen";
   await page.locator(accountTrigger).click({timeout:13000});
   await page.waitForFunction(()=>document.getElementById("accountDrawer").classList.contains("open"),{timeout:5000});
   assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("has-open-overlay")),true);
   if(c.mobile){
    assert.equal(await page.locator("#mobileBottomNav").evaluate(el=>getComputedStyle(el).display),"none",
      "Mobile nav must disappear when Account drawer is open");
   }
   await page.screenshot({path:OUTPUT+"/"+c.name+"-account-open.png",animations:"disabled"});
   await page.locator("#accountFavoritesAction").click({timeout:12000});
   // setAccountView intentionally starts entry animation on the next rAF.
   // Read the material state only after the browser has committed that frame.
   await page.waitForFunction(()=>
     document.getElementById("accountFavoritesView").classList.contains("sd-fluid-account-enter"),
     null,{timeout:3000}
   );
   const account=await page.evaluate(()=>({
    visible:!document.getElementById("accountFavoritesView").hidden,
    animated:document.getElementById("accountFavoritesView").classList.contains("sd-fluid-account-enter"),
    backdrop:getComputedStyle(document.querySelector(".nav")).backdropFilter
   }));
   assert.equal(account.visible,true);
   assert.equal(account.animated,true);
   assert.equal(account.backdrop,"none","Obscured navigation should not double-blur");
   checkpoint("account drawer and animated content");
   await page.locator("#accountClose").click({timeout:12000});
   await page.waitForFunction(()=>!document.getElementById("accountDrawer").classList.contains("open"),{timeout:5000});
   await page.waitForFunction(()=>!document.body.classList.contains("has-open-overlay"),{timeout:5000});
   if(c.mobile)assert.notEqual(await page.locator("#mobileBottomNav").evaluate(el=>getComputedStyle(el).display),"none",
     "Mobile nav must reappear when every drawer has closed");
   checkpoint("overlay cleanup");

   // Exercise the actual checkout buttons, never call the application's
   // private step function (it lives in a closure and is not window-global).
   // A request for the quote is fulfilled locally with no payment-ready QR.
   await page.locator("#catalogGrid .mini-add").first().click({timeout:12000});
   await page.locator(c.mobile?"#mobileCartNav":"#cartOpen").click({timeout:12000});
   await page.locator("#cartCheckout").waitFor({state:"visible",timeout:10000});
   await page.waitForFunction(()=>document.body.classList.contains("has-open-overlay"),null,{timeout:2500});
   const cartGeometry=await page.evaluate(()=>{
    const rect=document.getElementById("cartDrawer").getBoundingClientRect();
    const nav=document.getElementById("mobileBottomNav");
    return {top:rect.top,bottom:rect.bottom,viewport:innerHeight,
      nav:getComputedStyle(nav).display,
      open:document.getElementById("cartDrawer").classList.contains("open")};
   });
   assert.equal(cartGeometry.open,true);
   assert.equal(await page.locator(".sd-fly-to-cart-clone:visible").count(),0,
      "Product fly-to-cart snapshot must never float above open Cart");
   if(c.mobile){
    assert.equal(cartGeometry.nav,"none","Bottom nav must not float over the cart");
    assert.ok(cartGeometry.bottom>=cartGeometry.viewport-44,
      "Populated cart cannot stop 96px above the viewport: "+JSON.stringify(cartGeometry));
    assert.ok(cartGeometry.top<=32,"Cart must use only a narrow safe-area top inset");
   }
   await page.screenshot({path:OUTPUT+"/"+c.name+"-cart-open.png",animations:"disabled"});
   checkpoint("full-height cart without bottom navigation bleed-through");
   await page.locator("#cartCheckout").click({timeout:12000});
   await page.waitForFunction(()=>document.getElementById("checkoutDrawer").classList.contains("open"),null,{timeout:6000});
   assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("has-open-overlay")),true);
   if(c.mobile)assert.equal(await page.locator("#mobileBottomNav").evaluate(el=>getComputedStyle(el).display),"none");
   const initialCheckout=await page.evaluate(()=>({
    cartVisible:getComputedStyle(document.getElementById("cartDrawer")).visibility,
    accountVisible:getComputedStyle(document.getElementById("accountDrawer")).visibility,
    checkoutVisible:getComputedStyle(document.getElementById("checkoutDrawer")).visibility,
    navVisible:getComputedStyle(document.getElementById("mobileBottomNav")).display
   }));
   assert.equal(initialCheckout.checkoutVisible,"visible");
   assert.equal(await page.locator(".sd-fly-to-cart-clone:visible").count(),0,
      "Product fly-to-cart snapshot must never cover Checkout form");
   assert.equal(initialCheckout.cartVisible,"hidden","Cart cannot peek out underneath Checkout");
   assert.equal(initialCheckout.accountVisible,"hidden","Account cannot peek out underneath Checkout");
   await page.screenshot({path:OUTPUT+"/"+c.name+"-checkout-open.png",animations:"disabled"});
   await page.locator('#checkoutForm input[name="fullName"]').fill("Khách kiểm thử");
   await page.locator('#checkoutForm input[name="phone"]').fill("0900000000");
   await page.locator("#checkoutStreet").fill("01 Đường QA");
   await page.waitForFunction(()=>document.getElementById("checkoutProvince").options.length>1,null,{timeout:7000});
   await page.locator("#checkoutProvince").selectOption({label:"Hồ Chí Minh"});
   await page.waitForFunction(()=>!document.getElementById("checkoutWard").disabled,null,{timeout:7000});
   await page.locator("#checkoutWard").selectOption({label:"Phường QA"});
   await page.locator("#checkoutSubmit").click({timeout:13000});
   await page.waitForFunction(()=>!document.getElementById("sdCheckoutPaymentStep").hidden,null,{timeout:7000});
   assert.equal(await page.locator("#checkoutDrawer").getAttribute("data-step-direction"),"forward");
   assert.equal(mockedQuotes,1,"Exactly one local-only quote request is allowed");
   checkpoint("real checkout form -> locally mocked quote -> step 2");
   await page.locator("#checkoutSubmit").click({timeout:12000});
   await page.waitForFunction(()=>!document.getElementById("sdCheckoutReviewStep").hidden,null,{timeout:5000});
   assert.deepEqual(await page.locator("#sdCheckoutStepper>i").evaluateAll(
     els=>els.map(x=>x.classList.contains("is-complete"))),[true,true]);
   checkpoint("checkout step 3 and golden connectors");
   await page.locator("#sdCheckoutPrev").click({timeout:12000});
   await page.waitForFunction(()=>!document.getElementById("sdCheckoutPaymentStep").hidden,null,{timeout:5000});
   assert.equal(await page.locator("#checkoutDrawer").getAttribute("data-step-direction"),"backward");
   await page.locator("#sdCheckoutPrev").click({timeout:12000});
   await page.waitForFunction(()=>!document.getElementById("sdCheckoutShippingStep").hidden,null,{timeout:5000});
   checkpoint("checkout back navigation and 3-step reset");

   // Regression from owner's mobile screenshots: force a fast overlay switch
   // and confirm that the outgoing checkout becomes visually hidden at once.
   // This simulated click targets the actual header action even if an older
   // browser session left the navigation inaccessible under a dialog.
   await page.locator("#accountOpen").evaluate(el=>el.click());
   await page.waitForFunction(()=>document.getElementById("accountDrawer").classList.contains("open"),null,{timeout:5000});
   const switched=await page.evaluate(()=>{
    const state=id=>({open:document.getElementById(id).classList.contains("open"),
      visibility:getComputedStyle(document.getElementById(id)).visibility});
    return {account:state("accountDrawer"),cart:state("cartDrawer"),
      checkout:state("checkoutDrawer"),
      nav:getComputedStyle(document.getElementById("mobileBottomNav")).display};
   });
   assert.equal(switched.account.open,true);
   assert.equal(switched.account.visibility,"visible");
   for(const name of ["cart","checkout"]){
    assert.equal(switched[name].open,false,"Only one drawer can be logically active");
    assert.equal(switched[name].visibility,"hidden","Outgoing drawer must not be visible behind Account");
   }
   if(c.mobile)assert.equal(switched.nav,"none");
   await page.screenshot({path:OUTPUT+"/"+c.name+"-switch-account.png",animations:"disabled"});
   checkpoint("rapid Checkout→Account replacement without stacked drawers");

   await page.reload({waitUntil:"load"});
   await page.waitForFunction(()=>window.__sdStorefrontReady===true,null,{timeout:14000});
   await page.waitForFunction(()=>!document.getElementById("welcomeSplash"),null,{timeout:6000});
   const refreshed=await page.evaluate(()=>{
    const ids=["cartDrawer","accountDrawer","checkoutDrawer","productOverlay","sdFullscreenViewer"];
    const opened=ids.filter(id=>document.getElementById(id).classList.contains("open"));
    const visible=ids.filter(id=>getComputedStyle(document.getElementById(id)).visibility==="visible");
    return {url:location.href,route:location.pathname,
      bodyDisplay:getComputedStyle(document.body).display,
      catalogDisplay:document.getElementById("products")?getComputedStyle(document.getElementById("products")).display:"missing",
      notFound:!!document.getElementById("notFoundPage"),
      notFoundRoute:document.body.classList.contains("sd-not-found-route"),
      welcome:!!document.getElementById("welcomeSplash"),
      open:opened,visible,
      nav:getComputedStyle(document.getElementById("mobileBottomNav")).display,
      bodyClass:document.body.className,htmlClass:document.documentElement.className,
      modalBudget:document.body.classList.contains("has-open-overlay"),
      viewport:window.innerWidth,navBounds:document.getElementById("mobileBottomNav").getBoundingClientRect().toJSON()};
   });
   result.afterReload=refreshed;
   console.log("RELOAD_DIAG "+c.name+" "+JSON.stringify(refreshed));
   assert.ok(refreshed.open.length<=1,"Reload cannot restore several open overlays: "+JSON.stringify(refreshed));
   assert.ok(refreshed.visible.length<=1,"Reload cannot show several overlays: "+JSON.stringify(refreshed));
   if(c.mobile){
    if(refreshed.open.length)assert.equal(refreshed.nav,"none","Modal open => mobile nav hidden");
    else assert.notEqual(refreshed.nav,"none","No modal => mobile nav visible: "+JSON.stringify(refreshed));
   }
   await page.screenshot({path:OUTPUT+"/"+c.name+"-after-reload.png",animations:"disabled"});
   checkpoint("reload after overlay switch never stacks cart / checkout / account");

   await page.screenshot({path:OUTPUT+"/"+c.name+".png",animations:"disabled"});
   assert.deepEqual(errors,[],"No uncaught browser exceptions");
   assert.deepEqual(blockedWrites.filter(x=>!x.endsWith("/api/checkout-quote")),[],
     "No order/payment/backend writes during QA");
   assert.equal(mockedQuotes,1,"One mocked quote is the only permitted POST");
   result.passed=true;
  }catch(e){
   result.error=String(e.stack||e).slice(0,1300);
   await page.screenshot({path:OUTPUT+"/"+c.name+"-FAILED.png",animations:"disabled"}).catch(()=>{});
  }
  summary.cases.push(result);
  console.log((result.passed?"PASS ":"FAIL ")+c.name+" :: "+result.steps.join(" -> ")+(result.error?" | "+result.error:""));
  await ctx.close();
 }
}finally{await browser.close()}
writeFileSync(OUTPUT+"/summary.json",JSON.stringify(summary,null,2)+"\n");
assert.equal(summary.cases.filter(x=>x.passed).length,cases.length,
 "Local browser fluid QA must pass every PC/mobile × light/dark case");
console.log("PASS: Storefront PR-only Chromium fluid UI matrix, zero remote writes.");
