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
 // Capture the FIRST visit separately. Returning-visitor screenshots bypass
 // Welcome, but Lighthouse measures a cold navigation and the disappearing
 // heading can produce NO_LCP on slow throttled devices.
 {
  const ctx=await browser.newContext({
   viewport:{width:390,height:844},colorScheme:"light",deviceScaleFactor:1,serviceWorkers:"block"
  });
  await ctx.addInitScript(()=>{
   window.__firstLcp=[];
   window.__longTasks=[];
   try{new PerformanceObserver(list=>{
    for(const entry of list.getEntries())window.__firstLcp.push({
     ms:entry.startTime,size:entry.size,
     element:entry.element?.className||entry.element?.tagName||null
    });
   }).observe({type:"largest-contentful-paint",buffered:true})}catch{}
   try{new PerformanceObserver(list=>{
    for(const entry of list.getEntries())window.__longTasks.push({
     ms:entry.startTime,duration:entry.duration
    });
   }).observe({type:"longtask",buffered:true})}catch{}
  });
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e.message||e)));
  const response=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response?.status(),200,"Fresh mobile entry must load");
  const introAtStart=await page.locator("#welcomeSplash").isVisible();
  await page.waitForTimeout(1800);
  const firstVisit=await page.evaluate(()=>({
   lcp:window.__firstLcp||[],
   longTasks:window.__longTasks||[],
   fontReady:document.documentElement.classList.contains("sd-welcome-font-ready"),
   serifReady:document.documentElement.classList.contains("sd-welcome-serif-ready"),
   welcomeVisible:!!document.querySelector("#welcomeSplash")&&
    getComputedStyle(document.querySelector("#welcomeSplash")).visibility==="visible",
   firstContentfulPaint:performance.getEntriesByType("paint").find(x=>x.name==="first-contentful-paint")?.startTime??null,
   transferBytes:performance.getEntriesByType("resource").reduce((sum,e)=>sum+(e.transferSize||0),0)
  }));
  assert.ok(firstVisit.lcp.length>0,"First Welcome visit must record browser-native LCP");
  assert.ok(introAtStart,"Fresh entry must present Owner-approved Welcome");
  assert.equal(firstVisit.welcomeVisible,false,"Welcome must finish after approved intro");
  assert.deepEqual(errors,[],"Fresh mobile entry must have no script errors");
  await page.screenshot({path:"artifacts/perf-mobile-20261104/mobile-first-visit.png",animations:"disabled"});
  results.scenarios.push({name:"mobile-first-visit",introAtStart,metrics:firstVisit,errors});
  await ctx.close();
 }
 // Measure first-visit LCP under real Chromium network+CPU throttling.
 // Lighthouse has intermittently emitted NO_LCP even when its final screenshot
 // contains content. This independent native browser trace is not a substitute
 // for Lighthouse's score; save both to distinguish measurement failures.
 {
  const ctx=await browser.newContext({viewport:{width:390,height:844},
   colorScheme:"light",deviceScaleFactor:1,serviceWorkers:"block"});
  await ctx.addInitScript(()=>{
   window.__throttledLcp=[];
   new PerformanceObserver(list=>{
    for(const e of list.getEntries())window.__throttledLcp.push({
     ms:e.startTime,size:e.size,element:e.element?.className||e.element?.tagName||null
    });
   }).observe({type:"largest-contentful-paint",buffered:true});
  });
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e.message||e)));
  const cdp=await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions",{
   offline:false,latency:150,downloadThroughput:200000,uploadThroughput:90000
  });
  await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
  const r=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:60000});
  assert.equal(r?.status(),200,"Throttled cold mobile entry should load");
  await page.waitForFunction(()=>!document.querySelector("#welcomeSplash"),null,{timeout:30000});
  await page.locator("#sdh-title").waitFor({state:"visible",timeout:15000});
  await page.waitForTimeout(1200);
  const metrics=await page.evaluate(()=>({
   lcp:window.__throttledLcp||[],
   lcpMs:window.__throttledLcp?.at(-1)?.ms??null,
   fcpMs:performance.getEntriesByType("paint").find(x=>x.name==="first-contentful-paint")?.startTime??null
  }));
  assert.ok(metrics.lcpMs>0,"Native Chrome under 4x CPU/slow network must report LCP");
  assert.deepEqual(errors,[],"Throttled first visit must have no JS errors");
  results.scenarios.push({name:"mobile-cdp-throttled-cold-visit",metrics,errors});
  await ctx.close();
 }
 // Reproduce cold mobile font stalls without changing approved visual content.
 // The old fixed 1050ms timer could dismiss Welcome before its Serif heading
 // painted, causing repeated Lighthouse NO_LCP under slow DevTools throttling.
 {
  const ctx=await browser.newContext({viewport:{width:390,height:844},
   colorScheme:"light",deviceScaleFactor:1,serviceWorkers:"block"});
  let delayedFonts=0;
  await ctx.route("**/fonts/NotoSerif-Regular.woff2",async route=>{
   delayedFonts++;
   await new Promise(resolve=>setTimeout(resolve,1700));
   await route.continue();
  });
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e.message||e)));
  const response=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response?.status(),200,"Slow-font first visit must load");
  // The approved 950ms slow-font watchdog can close the intro after two
  // paints + 400ms, so do not mistakenly require it to remain after 1200ms
  // measured from DOMContentLoaded rather than from splash initialization.
  await page.waitForTimeout(300);
  assert.ok(delayedFonts>0,"Cold load must actually delay the Serif font request");
  const stillActive=await page.locator("#welcomeSplash").evaluate(el=>
   !el.classList.contains("is-leaving")&&getComputedStyle(el).visibility==="visible");
  assert.ok(stillActive,"Welcome must remain until the fallback has a paint opportunity");
  await page.waitForFunction(()=>document.documentElement.classList.contains("sd-welcome-font-fallback"),null,{timeout:8000});
  const fallbackPaintable=await page.locator("#welcomeSplash .welcome-title").evaluate(el=>
   getComputedStyle(el).visibility==="visible"&&el.getBoundingClientRect().height>0);
  assert.ok(fallbackPaintable,"Slow-font fallback heading must become visible before closing");
  await page.waitForFunction(()=>!document.querySelector("#welcomeSplash"),null,{timeout:12000});
  assert.deepEqual(errors,[],"Slow-font Welcome must not throw");
  results.scenarios.push({name:"mobile-slow-serif-lcp-guard",delayedFonts,stillActive,errors});
  await ctx.close();
 }
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
  const page=await context.newPage(),errors=[],calls=[],hiddenGalleryLoads=[];
  page.on("pageerror",e=>errors.push(String(e.message||e)));
  page.on("request",request=>{
   const u=new URL(request.url());
   if(u.pathname==="/api/lookup-challenge-config"||u.pathname==="/api/customer/session")
    calls.push(u.pathname);
   if(u.pathname==="/images/brand-emblem.png")hiddenGalleryLoads.push(u.pathname);
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
  assert.equal(hiddenGalleryLoads.length,0,name+" must not fetch fullscreen-only brand mark before user opens gallery");
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
 // The lower mosaic must not steal font bandwidth during the first viewport,
 // but its original visuals must still load as the visitor approaches it.
 {
  const context=await browser.newContext({viewport:{width:390,height:844},
   colorScheme:"light",serviceWorkers:"block"});
  await context.addInitScript(()=>sessionStorage.setItem("sd-welcome-seen-in-tab","1"));
  const page=await context.newPage(),requested=[],galleryScripts=[];
  const mosaicNames=["2c341b173eff94f1.webp","theme-croc-dark-tile.webp",
   "theme-croc-albino-tile.webp"];
  page.on("request",req=>{
   const path=new URL(req.url()).pathname;
   if(path==="/material-gallery.js")galleryScripts.push(path);
   if(mosaicNames.some(name=>path.endsWith("/"+name)))requested.push(path);
  });
  const r=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(r?.status(),200,"Deferred mosaic scenario must load");
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,null,{timeout:35000});
  await page.waitForTimeout(700);
  assert.deepEqual(requested,[],
   "Craft/material mosaic imagery must not compete with cold Hero font requests");
  assert.deepEqual(galleryScripts,[],
   "Optional material gallery code must stay off the first-viewport critical path");
  const artSlide=page.locator("#artSlide");
  assert.equal(await artSlide.getAttribute("src"),null,
   "Original art image must not fetch before entering the viewport");
  await artSlide.scrollIntoViewIfNeeded({timeout:15000});
  await page.waitForFunction(()=>{
   const img=document.querySelector("#artSlide");
   return Boolean(img?.currentSrc&&img.complete&&img.naturalWidth>0);
  },null,{timeout:20000});
  for(const selector of ["#craftTileImage",
   "#materialTile .material-photo--dark","#materialTile .material-photo--light"]){
   await page.locator(selector).scrollIntoViewIfNeeded({timeout:15000});
   await page.waitForFunction(s=>{
    const el=document.querySelector(s);
    return el&&el.currentSrc&&el.complete&&el.naturalWidth>0;
   },selector,{timeout:20000});
  }
  assert.equal(new Set(requested).size,3,
   "All three mosaic images must load only when the user scrolls near them");
  await page.waitForFunction(()=>Boolean(document.querySelector('#materialGallery .sd-material-slide')),
   null,{timeout:20000});
  assert.equal(galleryScripts.length,1,
   "Material gallery code must load once when its tile approaches the viewport");
  results.scenarios.push({name:"mobile-mosaic-on-approach",requests:requested});
  await context.close();
 }
 // Below-fold sections are rendered lazily only on the Home mobile route.
 // Validate that native scrolling reveals fully painted, interactive content
 // instead of a blank/reserved rectangle or a collapsed grid.
 {
  const ctx=await browser.newContext({viewport:{width:390,height:844},
   colorScheme:"light",serviceWorkers:"block"});
  await ctx.addInitScript(()=>sessionStorage.setItem("sd-welcome-seen-in-tab","1"));
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(String(err.message||err)));
  const response=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response?.status(),200,"Home lazy-section QA must load");
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,null,{timeout:35000});
  for(const id of ["featured","collections","products"]){
   const section=page.locator("#"+id);
   await section.scrollIntoViewIfNeeded({timeout:20000});
   await page.waitForTimeout(350);
   const visible=await section.evaluate(el=>{
    const rect=el.getBoundingClientRect();
    return {visibility:getComputedStyle(el).contentVisibility,
      height:rect.height,inner:el.querySelectorAll("article,a,button").length,
      viewport:innerHeight,top:rect.top,bottom:rect.bottom};
   });
   assert.equal(visible.visibility,"auto",id+" Home should skip offscreen layout only");
   assert.ok(visible.height>160&&visible.inner>0,
    id+" must reveal its real interactive content on approach");
   assert.ok(visible.top<visible.viewport&&visible.bottom>0,
    id+" must actually enter the viewport without anchor jump");
   results.scenarios.push({name:"mobile-on-approach-"+id,metrics:visible});
  }
  assert.deepEqual(errors,[],"Mobile scroll hydration must not throw");
  await ctx.close();
 }
 // Confirm the mobile optimization also behaves at the Owner's narrow and
 // wide phone acceptance widths, not only the default 390px screenshot.
 for(const [width,scheme] of [[360,"light"],[430,"dark"]]){
  const ctx=await browser.newContext({viewport:{width,height:844},
   colorScheme:scheme,deviceScaleFactor:1,serviceWorkers:"block"});
  await ctx.addInitScript(()=>sessionStorage.setItem("sd-welcome-seen-in-tab","1"));
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(String(e.message||e)));
  const response=await page.goto(base+"/",{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response?.status(),200,width+"px entry failed");
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,null,{timeout:35000});
  for(const id of ["featured","collections","products"]){
   const section=page.locator("#"+id);
   await section.scrollIntoViewIfNeeded({timeout:20000});
   await page.waitForTimeout(300);
   const geometry=()=>section.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {height:r.height,top:r.top,bottom:r.bottom,viewport:innerHeight,
     overflow:document.documentElement.scrollWidth-innerWidth,
     links:el.querySelectorAll("a,button,article").length,
     visibility:getComputedStyle(el).contentVisibility};
   });
   const before=await geometry();
   await page.waitForTimeout(250);
   const after=await geometry();
   assert.equal(after.visibility,"auto",width+"px "+id+" must retain mobile layout isolation");
   assert.ok(after.height>160&&after.links>0,width+"px "+id+" must render content");
   assert.ok(after.top<after.viewport&&after.bottom>0,width+"px "+id+" must stay onscreen");
   assert.ok(after.overflow<=2,width+"px "+id+" introduced horizontal overflow");
   assert.ok(Math.abs(after.height-before.height)<120,
    width+"px "+id+" changed section height after scroll (possible jump)");
   results.scenarios.push({name:"mobile-layout-"+width+"-"+id,metrics:{before,after}});
  }
  assert.deepEqual(errors,[],width+"px mobile responsive scroll errors");
  await page.screenshot({path:"artifacts/perf-mobile-20261104/mobile-layout-"+width+".png",animations:"disabled"});
  await ctx.close();
 }
 // No-JS SSR exists specifically for usable, crawlable product links. Without
 // script execution there is no Welcome timer, so the splash must never trap
 // scrolling or cover the real catalog. Verify actual browser CSS behavior.
 for(const path of ["/","/sanpham"]){
  const ctx=await browser.newContext({viewport:{width:390,height:844},
   javaScriptEnabled:false,colorScheme:"light"});
  const page=await ctx.newPage();
  const response=await page.goto(base+path,{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response?.status(),200,"No-JS "+path+" route must load");
  const state=await page.evaluate(()=>{
   const splash=document.querySelector("#welcomeSplash");
   const items=[...document.querySelectorAll("#catalogGrid article")];
   const fallback=items.flatMap(el=>[...el.querySelectorAll("img[src]:not([data-src])")]);
   return {splashDisplay:splash?getComputedStyle(splash).display:"none",
    scrollOverflow:getComputedStyle(document.documentElement).overflowY,
    bodyOverflow:getComputedStyle(document.body).overflowY,
    height:document.documentElement.scrollHeight,viewport:innerHeight,
    items:items.length,images:fallback.length,
    hrefs:items.filter(el=>el.querySelector("a[href^='/sanpham/']")).length};
  });
  assert.equal(state.splashDisplay,"none","No-JS Welcome must not cover SSR "+path);
  assert.notEqual(state.bodyOverflow,"hidden","No-JS body must scroll");
  assert.notEqual(state.scrollOverflow,"hidden","No-JS HTML must scroll");
  assert.ok(state.height>state.viewport+200,"No-JS catalog must extend below viewport");
  assert.ok(state.items>0&&state.images>0&&state.hrefs>0,
   "No-JS public SSR catalog must keep real linked products and fallback images");
  results.scenarios.push({name:"no-js-ssr-"+(path==="/"?"home":"catalog"),metrics:state});
  await ctx.close();
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
