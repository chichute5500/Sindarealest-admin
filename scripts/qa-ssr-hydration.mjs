/** GET-only deterministic SSR-to-CSR hydration guard on isolated Preview. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const base=(process.env.AUDIT_TARGET_URL||"https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev").replace(/\/$/,"");
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 for(const width of [360,390]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:"reduce",serviceWorkers:"block"});
  const page=await context.newPage();
  await page.route("**/*",async route=>{
   const req=route.request();
   if(!["GET","HEAD"].includes(req.method()))return route.abort("blockedbyclient");
   if(new URL(req.url()).pathname==="/api/products")
    await new Promise(resolve=>setTimeout(resolve,1200));
   return route.continue();
  });
  try{
   const response=await page.goto(base+"/sanpham",{waitUntil:"domcontentloaded",timeout:45000});
   assert.equal(response.status(),200);
   const ssr=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll("#catalogGrid article[data-ssr-product]")];
    window.__firstSSRImage=cards[0]?.querySelector(".product-photo img")||null;
    return cards.map(c=>c.dataset.ssrProduct);
   });
   assert.ok(ssr.length>=2,"No real server cards to compare");
   await page.waitForFunction(()=>document.documentElement.dataset.catalogHydration==="ready",null,{timeout:35000});
   const hydrated=await page.evaluate(()=>({
    ids:[...document.querySelectorAll("#catalogGrid article[data-product]")].map(c=>c.dataset.product),
    sameImage:window.__firstSSRImage===document.querySelector("#catalogGrid article[data-product] .product-photo img")
   }));
   assert.deepEqual(hydrated.ids.slice(0,ssr.length),ssr,
    "SSR cards moved/replaced after hydration: initial sort or filtering disagrees with SQL");
   assert.equal(hydrated.sameImage,true,"First visible SSR image node was discarded despite same source");
   console.log("PASS: stable SSR -> CSR order and preserved LCP image at "+width+"px");
  }finally{await context.close()}
 }
 // Prove SSR fallback remains genuinely usable when JavaScript is off:
 // the no-JS <noscript> images replace invisible JS placeholders in each card.
 const noJs=await browser.newContext({viewport:{width:390,height:844},
  javaScriptEnabled:false,serviceWorkers:"block",reducedMotion:"reduce"});
 const noJsPage=await noJs.newPage();
 await noJsPage.route("**/*",route=>
  ["GET","HEAD"].includes(route.request().method())?route.continue():route.abort("blockedbyclient")
 );
 try{
  const response=await noJsPage.goto(base+"/sanpham",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response.status(),200,"No-JS direct catalog should load");
  const original=noJsPage.locator("#catalogGrid .sd-ssr-deferred-img");
  const fallback=noJsPage.locator("#catalogGrid noscript img");
  assert.equal(await original.count(),6,"Expected six delayed JS placeholders");
  assert.equal(await fallback.count(),6,"Expected six real no-JS product photos");
  assert.equal(await original.first().evaluate(img=>getComputedStyle(img).display),"none",
   "No-JS mode must hide blank placeholders without doubling image geometry");
  assert.notEqual(await fallback.first().evaluate(img=>getComputedStyle(img).display),"none",
   "The no-JS fallback photo must retain visible layout");
  assert.ok((await fallback.first().getAttribute("src"))?.startsWith("/"),
   "No-JS product photo must use an approved same-origin source");
  console.log("PASS: no-JS catalog retains all six deferred product images and stable media boxes");
 }finally{await noJs.close()}
}finally{await browser.close()}
