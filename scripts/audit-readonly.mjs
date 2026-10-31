/**
 * Read-only storefront UI audit. Designed for an isolated CI runner.
 * GET/HEAD only. It never authenticates, submits checkout, writes D1/R2,
 * uses customer phone numbers or logs secrets.
 * Install Playwright in CI only; this adds no storefront runtime dependency.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const target=(process.env.AUDIT_TARGET_URL||'https://sindarealest2.pages.dev').replace(/\\/$/,'');
const folder=process.env.AUDIT_OUTPUT||'audit/before';
const screens=[360,390,768,1280,1920];
const routes=[['home','/'],['catalog','/sanpham']];
await mkdir(join(folder,'screenshots'),{recursive:true});
const report={target,generatedAt:new Date().toISOString(),note:'Read-only public GETs, unprivileged fresh browser context. All failing/unavailable metrics remain null.',routes:{},screenshots:[],errors:[]};
function sanitize(error){return String(error?.message||error||'Unknown error').replace(/https?:\\/\\/[^\\s]+/g,'[URL]').slice(0,240)}
async function documentSource(path){
 try{
  const response=await fetch(target+path,{redirect:'manual',signal:AbortSignal.timeout(16000)});
  const html=await response.text();
  const match=(re)=>html.match(re)?.[1]||null;
  return {status:response.status,contentType:response.headers.get('content-type'),
   title:match(/<title>([^<]*)<\\/title>/i),
   canonical:match(/<link\\s+rel=["']canonical["']\\s+href=["']([^"']+)/i),
   ogTitle:match(/<meta\\s+property=["']og:title["']\\s+content=["']([^"']+)/i),
   twitterTitle:match(/<meta\\s+name=["']twitter:title["']\\s+content=["']([^"']+)/i),
   organizationLD:html.includes('"@type":"Organization"'),
   productLD:html.includes('"@type":"Product"'),
   productCardsStatic:(html.match(/class=["'][^"']*product-card/g)||[]).length
  };
 }catch(error){return {status:null,error:sanitize(error)}}
}
for(const [name,path] of [...routes,['unknown','/qa-this-page-does-not-exist-20261031']]){
 report.routes[name]={source:await documentSource(path),lighthouse:null,fps:null,cls:null,lcpMs:null,longTasks:null};
}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [name,path] of routes){
  const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:'light',reducedMotion:'reduce',deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    window.__auditVitals={lcp:null,cls:0,longTasks:[]};
    try{
      new PerformanceObserver(list=>{for(const e of list.getEntries())window.__auditVitals.lcp=e.startTime})
       .observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__auditVitals.cls+=e.value})
       .observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.duration>50)window.__auditVitals.longTasks.push(e.duration)})
       .observe({type:'longtask',buffered:true});
    }catch{}
  });
  try{
   const client=await context.newCDPSession(page);
   await client.send('Emulation.setCPUThrottlingRate',{rate:4});
   await client.send('Network.enable');
   await client.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:90000});
   const response=await page.goto(target+path,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForTimeout(1800);
   // Test scrolling and browser interaction. No public API writes.
   const framePromise=page.evaluate(()=>new Promise(resolve=>{
     const deltas=[];let previous=0;const until=performance.now()+2600;
     function tick(now){if(previous)deltas.push(now-previous);previous=now;if(now<until)requestAnimationFrame(tick);else resolve(deltas)}
     requestAnimationFrame(tick);
   }));
   for(let j=0;j<12;j++){await page.mouse.wheel(0,300);await page.waitForTimeout(90)}
   const intervals=await framePromise;
   const fps=intervals.filter(x=>x>0).map(x=>Math.min(60,1000/x));
   const vitals=await page.evaluate(()=>window.__auditVitals||{});
   report.routes[name].runtime={httpStatus:response?.status()??null,viewport:390,cpuThrottle:4,network:'150ms RTT, 1.6Mbps download',fpsMin:fps.length?Math.round(Math.min(...fps)*10)/10:null,fpsAvg:fps.length?Math.round(fps.reduce((a,b)=>a+b,0)/fps.length*10)/10:null,lcpMs:vitals.lcp??null,cls:vitals.cls??null,longTaskCount:(vitals.longTasks||[]).length,longTaskMaxMs:(vitals.longTasks||[]).length?Math.round(Math.max(...vitals.longTasks)):0};
  }catch(error){report.routes[name].runtime={error:sanitize(error)}}
  await context.close();
 }
 // Capture real public layouts in fresh unprivileged sessions, without user data.
 for(const [name,path] of routes)for(const colorScheme of ['light','dark'])for(const width of screens){
   const context=await browser.newContext({viewport:{width,height:850},deviceScaleFactor:1,colorScheme,reducedMotion:'reduce',serviceWorkers:'block'});
   const page=await context.newPage();
   await page.addInitScript(()=>{try{sessionStorage.setItem('sd-welcome-seen-in-tab','1')}catch{}});
   try{
    await page.goto(target+path,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(1500);
    const filename=name+'-'+colorScheme+'-'+width+'.png';
    await page.screenshot({path:join(folder,'screenshots',filename),fullPage:true,animations:'disabled',timeout:25000});
    report.screenshots.push(filename);
   }catch(error){report.errors.push({screen:name,colorScheme,width,error:sanitize(error)})}
   await context.close();
 }
}finally{await browser.close()}
await writeFile(join(folder,'public-readonly-metrics.json'),JSON.stringify(report,null,2));
console.log('Public read-only audit complete: '+folder+'; screenshots '+report.screenshots.length+'; no private data accessed.');
