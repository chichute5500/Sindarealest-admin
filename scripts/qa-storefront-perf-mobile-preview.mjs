/**
 * Bounded read-only Storefront QA for one pinned isolated Preview candidate.
 * Only GETs, user-interface clicks, and unsubmitted synthetic phone input.
 * No order/payment writes, Production DB changes or private data.
 */
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium} from "playwright";

const base="https://perf-mobile-20261104.sindarealest-admin-preview.pages.dev";
const expected=process.env.PERF_CANDIDATE_SHA;
assert.match(expected||"",/^[a-f0-9]{40}$/);
const results={sha:expected,base,scenarios:[]};
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
await mkdir("artifacts/perf-mobile-20261104",{recursive:true});
try{
 for(const [name,width,scheme] of [
  ["mobile-light",390,"light"],["mobile-dark",390,"dark"],
  ["desktop-light",1280,"light"],["desktop-dark",1280,"dark"]]){
  const context=await browser.newContext({
    viewport:{width,height:844},colorScheme:scheme,deviceScaleFactor:1,serviceWorkers:"block"
  });
  await context.addInitScript(()=>{
   try{sessionStorage.setItem("sd-welcome-seen-in-tab","1")}catch{}
   window.__perfLcp=[];
   try{new PerformanceObserver(list=>{
     for(const entry of list.getEntries())window.__perfLcp.push({ms:entry.startTime,size:entry.size});
   }).observe({type:"largest-contentful-paint",buffered:true})}catch{}
  });
  const page=await context.newPage(),errors=[],calls=[];
  page.on("pageerror",e=>errors.push(String(e.message||e)));
  page.on("request",request=>{
   const u=new URL(request.url());
   if(u.pathname==="/api/lookup-challenge-config"||u.pathname==="/api/customer/session")
    calls.push(u.pathname);
  });
  const response=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response?.status(),200,name+" home must return HTTP 200");
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,null,{timeout:35000});
  await page.locator("#sdh-title").waitFor({state:"visible",timeout:15000});
  await page.waitForTimeout(1200);
  const metrics=await page.evaluate(()=>{
   const root=document.documentElement,nav=document.querySelector(".nav");
   return {htmlWidth:document.documentElement.scrollWidth,viewport:innerWidth,
     dark:root.classList.contains("dark"),hydration:root.dataset.catalogHydration||"",
     cards:document.querySelectorAll("#catalogGrid article").length,
     glass:getComputedStyle(nav).backdropFilter,
     lcpMs:window.__perfLcp?.at(-1)?.ms??null,
     firstContentfulPaintMs:performance.getEntriesByType("paint").find(x=>x.name==="first-contentful-paint")?.startTime??null};
  });
  assert.equal(metrics.dark,scheme==="dark",name+" theme first-paint mismatch");
  assert.ok(metrics.htmlWidth<=metrics.viewport+2,name+" horizontal overflow");
  assert.ok(metrics.cards>0,name+" product cards not rendered");
  assert.notEqual(metrics.hydration,"failed",name+" catalog API hydration failed");
  assert.ok(Number.isFinite(metrics.lcpMs)&&metrics.lcpMs>0,name+" missing browser-native LCP on returning-visitor UI");
  assert.match(metrics.glass,/blur\(/,name+" Glass nav missing");
  assert.equal(calls.filter(x=>x==="/api/lookup-challenge-config").length,0,
   name+" premature phone challenge config request");
  await page.screenshot({path:"artifacts/perf-mobile-20261104/"+name+".png",animations:"disabled"});
  if(scheme==="light"){
   // A real account click must not trigger two session requests even when the idle
   // callback and the user's click arrive close together.
   const id=width<760?"#mobileAccountNav":"#accountOpen";
   await page.locator(id).click({timeout:15000});
   await page.waitForTimeout(1700);
   assert.ok(calls.filter(x=>x==="/api/customer/session").length<=1,
    name+" duplicate initial account session fetch");
   await page.locator("#accountClose").click({timeout:15000});
   const code=page.locator("#sdTrackInput");
   await code.fill("SDW-ABCD");
   await page.waitForTimeout(250);
   assert.equal(calls.filter(x=>x==="/api/lookup-challenge-config").length,0,
    name+" code lookup must bypass Turnstile config fetch");
   await code.fill("0900000000");
   await page.waitForTimeout(1000);
   assert.equal(calls.filter(x=>x==="/api/lookup-challenge-config").length,1,
    name+" phone number must fetch exactly one challenge config");
  }
  assert.deepEqual(errors,[],name+" unexpected script exceptions: "+errors.join("; "));
  results.scenarios.push({name,metrics,requests:calls,errors});
  await context.close();
 }
 const requestContext=await browser.newContext();
 const page=await requestContext.newPage();
 for(const path of ["/sanpham","/tra-cuu-don-hang","/bao-hanh"]){
  const r=await page.goto(base+path,{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(r?.status(),200,path+" expected HTTP 200");
  results.scenarios.push({path,status:r.status()});
 }
 await requestContext.close();
}finally{await browser.close()}
await writeFile("artifacts/perf-mobile-20261104/browser-qa.json",JSON.stringify(results,null,2));
console.log("PASS: pinned isolated Preview Browser smoke "+JSON.stringify(results.scenarios.map(x=>x.name||x.path)));
