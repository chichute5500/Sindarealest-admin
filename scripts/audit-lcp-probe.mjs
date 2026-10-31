/** GET-only diagnostic: capture actual LCP candidates and network evidence
 * under repeatable mobile throttling. Never submit forms, auth or payments.
 * This does not modify the deployed site's scripts, database or state.
 */
import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const origin=(process.env.AUDIT_TARGET_URL||"https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev").replace(/\/$/,"");
const output=process.env.AUDIT_OUTPUT||"audit/after";
const cases=[
 {path:"/sanpham",width:390,mode:"light",sample:1},
 {path:"/sanpham",width:390,mode:"light",sample:2},
 {path:"/sanpham",width:360,mode:"dark",sample:1},
 {path:"/",width:390,mode:"light",sample:1}
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
try{
 for(const trial of cases){
  const context=await browser.newContext({
   viewport:{width:trial.width,height:844},
   colorScheme:trial.mode,serviceWorkers:"block",reducedMotion:"no-preference"
  });
  const page=await context.newPage();
  const network=[];
  await page.route("**/*",route=>{
   const req=route.request();
   if(!["GET","HEAD"].includes(req.method()))return route.abort("blockedbyclient");
   return route.continue();
  });
  page.on("requestfinished",req=>{
   try{
    const url=new URL(req.url());
    if(url.origin!==origin)return;
    const type=req.resourceType();
    if(type==="image"||type==="font"||type==="fetch")
     network.push({type,path:url.pathname,time:Math.round(Date.now()-started)});
   }catch{}
  });
  await page.addInitScript(()=>{
   window.__lcpCandidates=[];
   window.__lcpStart=performance.now();
   try{new PerformanceObserver(list=>{
    for(const entry of list.getEntries()){
     const el=entry.element;
     window.__lcpCandidates.push({
      time:Math.round(entry.startTime),size:entry.size,
      selector:el?(el.id?"#"+el.id:el.tagName.toLowerCase()+"."+
       String(el.className||"").trim().split(/\s+/).slice(0,2).join(".")):"unknown",
      url:entry.url?new URL(entry.url).pathname:null,
      text:el?.tagName==="IMG"?String(el.alt||"").slice(0,90):
       String(el?.textContent||"").trim().slice(0,90)
     });
    }
   }).observe({type:"largest-contentful-paint",buffered:true})}catch{}
   try{new PerformanceObserver(list=>{
     window.__lcpLongTasks=(window.__lcpLongTasks||[]).concat(
      list.getEntries().map(e=>({time:Math.round(e.startTime),duration:Math.round(e.duration)}))
     );
   }).observe({type:"longtask",buffered:true})}catch{}
  });
  let started=Date.now();
  try{
   const cdp=await context.newCDPSession(page);
   await cdp.send("Network.enable");
   await cdp.send("Network.emulateNetworkConditions",{
    offline:false,latency:150,downloadThroughput:200000,uploadThroughput:80000
   });
   await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
   const response=await page.goto(origin+trial.path,{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForTimeout(12000);
   const observation=await page.evaluate(()=>({
    hydration:document.documentElement.dataset.catalogHydration||"",
    candidates:window.__lcpCandidates||[],
    longTasks:(window.__lcpLongTasks||[]).slice(0,20),
    // Capture per-resource phases so a 10s LCP can be attributed to the
    // network, R2 response or late layout/paint rather than guessing from
    // a single Lighthouse score. No request bodies, cookies or customer data.
    resources:performance.getEntriesByType("resource")
     .filter(e=>["img","link","css","fetch"].includes(e.initiatorType))
     .slice(0,45).map(e=>{
      let path="";
      try{path=new URL(e.name).pathname}catch{}
      return {path,kind:e.initiatorType,start:Math.round(e.startTime),
       responseStart:Math.round(e.responseStart),end:Math.round(e.responseEnd),
       duration:Math.round(e.duration),bytes:e.transferSize||0};
     }),
    totalImages:performance.getEntriesByType("resource")
     .filter(e=>e.initiatorType==="img").length,
    visibleProducts:[...document.querySelectorAll("#catalogGrid article[data-product]")]
     .filter(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).length
   }));
   const record={...trial,status:response.status(),...observation,network:network.slice(0,60)};
   record.closedAccountPaint=record.candidates.some(c=>c.selector==='p.account-note');
   results.push(record);
   const last=record.candidates[record.candidates.length-1]||null;
   console.log("LCP_PROBE "+JSON.stringify({...trial,status:record.status,
    hydration:record.hydration,last,events:record.candidates.length,
    network:record.network.length}));
  }catch(err){
   results.push({...trial,error:String(err.message||err).slice(0,300)});
   console.log("LCP_PROBE_FAIL "+JSON.stringify({...trial,error:String(err.message||err).slice(0,300)}));
  }finally{await context.close()}
 }
}finally{await browser.close()}
await mkdir(output,{recursive:true});
await writeFile(join(output,"lcp-probe.json"),JSON.stringify({origin,results},null,2));
if(results.some(x=>x.error||x.status!==200||x.hydration!=="ready"||x.closedAccountPaint))
 process.exitCode=1;
