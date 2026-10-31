/**
 * Read-only storefront UI audit. Designed for an isolated CI runner.
 * GET/HEAD only. It never authenticates, submits checkout, writes D1/R2,
 * uses customer phone numbers or logs secrets.
 * Install Playwright in CI only; this adds no storefront runtime dependency.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const target=(process.env.AUDIT_TARGET_URL||'https://sindarealest2.pages.dev').replace(/\/$/,'');
const folder=process.env.AUDIT_OUTPUT||'audit/before';
const screens=[360,390,768,1280,1920];
const routes=[['home','/'],['catalog','/sanpham']];
await mkdir(join(folder,'screenshots'),{recursive:true});
const report={target,generatedAt:new Date().toISOString(),note:'Read-only public GETs, unprivileged fresh browser context. All failing/unavailable metrics remain null.',routes:{},screenshots:[],errors:[]};
function sanitize(error){return String(error?.message||error||'Unknown error').replace(/https?:\/\/[^\s]+/g,'[URL]').slice(0,240)}
// A screenshot is valid only after real hydrated product cards AND at least
// one decoded image are present. Static headings / SSR placeholders alone do
// not establish that the interactive storefront finished loading.
async function waitForCatalogPaint(page,section){
 const selector=section==='home'?'#featuredGrid article[data-product]':'#catalogGrid article[data-product]';
 await page.waitForFunction((selector)=>{
   if(document.documentElement.dataset.catalogHydration==='failed')throw new Error('Catalog API hydration failed');
   const cards=[...document.querySelectorAll(selector)];
   return cards.length>0&&cards.some(card=>[...card.querySelectorAll('img')].some(img=>img.complete&&img.naturalWidth>0));
 },selector,{timeout:35000,polling:250});
 // Await visual stabilization after first image paint, not a fixed delay
 // from DOMContentLoaded (which previously produced empty catalog screenshots).
 await page.waitForTimeout(350);
 return await page.locator(selector).count();
}
async function loadGridImagesForScreenshot(page,section){
 // Screenshots are full-page; native lazy loading does not fetch the final
 // below-the-fold cards unless we request them. This affects QA only.
 return page.evaluate(async section=>{
   // Full-page screenshots include both the featured carousel and the
   // below-the-fold catalog on Home. Eager-load both sets for QA only,
   // otherwise screenshots show empty lazy thumbnails unrelated to the UI.
   const grids=(section==='home'?['#featuredGrid','#catalogGrid']:['#catalogGrid'])
     .map(selector=>document.querySelector(selector)).filter(Boolean);
   if(!grids.length)return {requested:0,loaded:0,broken:0};
   const images=grids.flatMap(grid=>[...grid.querySelectorAll('article img')]);
   // Full-page capture alone doesn't load below-fold editorial artwork.
   // Warm only this read-only browser screenshot, not real visitors.
   if(section==='home')images.push(...document.querySelectorAll('#artSlide,#craftTileImage,#materialTile img.mosaic-photo'));
   for(const img of images){
     if(img.dataset.src&&!img.getAttribute('src'))img.src=img.dataset.src;
     img.loading='eager';
   }
   await Promise.race([
     Promise.allSettled(images.map(img=>img.decode().catch(()=>null))),
     new Promise(resolve=>setTimeout(resolve,10000))
   ]);
   const loaded=images.filter(img=>img.complete&&img.naturalWidth>0).length;
   const craft=document.getElementById('artSlide');
   return {requested:images.length,loaded,broken:images.filter(img=>img.complete&&img.naturalWidth===0).length,
     craftLoaded:section!=='home'||Boolean(craft&&craft.complete&&craft.naturalWidth>0)};
 },section);
}
async function documentSource(path){
 try{
  const response=await fetch(target+path,{redirect:'manual',signal:AbortSignal.timeout(16000)});
  const html=await response.text();
  const match=(re)=>html.match(re)?.[1]||null;
  return {status:response.status,contentType:response.headers.get('content-type'),
   title:match(/<title>([^<]*)<\/title>/i),
   canonical:match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i),
   ogTitle:match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)/i),
   twitterTitle:match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)/i),
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
   const renderedProducts=await waitForCatalogPaint(page,name);
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
   report.routes[name].runtime={httpStatus:response?.status()??null,renderedProducts,viewport:390,cpuThrottle:4,network:'150ms RTT, 1.6Mbps download',fpsMin:fps.length?Math.round(Math.min(...fps)*10)/10:null,fpsAvg:fps.length?Math.round(fps.reduce((a,b)=>a+b,0)/fps.length*10)/10:null,lcpMs:vitals.lcp??null,cls:vitals.cls??null,longTaskCount:(vitals.longTasks||[]).length,longTaskMaxMs:(vitals.longTasks||[]).length?Math.round(Math.max(...vitals.longTasks)):0};
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
    const renderedProducts=await waitForCatalogPaint(page,name);
    const chipLayout=await page.evaluate(()=>{
      const chips=document.querySelector('#categoryFilters');
      if(!chips)return null;
      const style=getComputedStyle(chips);
      return {count:chips.querySelectorAll('.filter-pill').length,flexWrap:style.flexWrap,
        overflowX:style.overflowX,scrollWidth:chips.scrollWidth,clientWidth:chips.clientWidth};
    });
    if(process.env.AUDIT_STRICT_VISUAL==='1'&&width<=390&&chipLayout?.count>3&&
       (chipLayout.flexWrap!=='nowrap'||chipLayout.overflowX!=='auto'))
      throw Error('Mobile catalog chips must stay in one horizontally scrollable row: '+JSON.stringify(chipLayout));
    const images=await loadGridImagesForScreenshot(page,name);
    if(images.broken||!images.craftLoaded)throw Error('Image delivery failures in '+name+': '+JSON.stringify(images));
    // Previously missing nav emblem left a broken icon in every mobile shot.
    await page.locator('.brand-symbol').evaluate(async img=>{
      if(!img.complete||!img.naturalWidth)await img.decode();
      if(!img.naturalWidth)throw Error('Navigation brand image is broken');
    });
    const filename=name+'-'+colorScheme+'-'+width+'.png';
    await page.screenshot({path:join(folder,'screenshots',filename),fullPage:true,animations:'disabled',timeout:25000});
    report.screenshots.push({filename,route:name,colorScheme,width,renderedProducts,chipLayout,images,ready:true});
   }catch(error){report.errors.push({screen:name,colorScheme,width,error:sanitize(error)})}
   await context.close();
 }
}finally{await browser.close()}
await writeFile(join(folder,'public-readonly-metrics.json'),JSON.stringify(report,null,2));
if(report.errors.length||routes.some(([name])=>report.routes[name].runtime?.error)){
 throw new Error('Audit incomplete: '+report.errors.length+' unready screenshots and '+routes.filter(([name])=>report.routes[name].runtime?.error).map(([name])=>name).join(',')+' runtime failures. Inspect public-readonly-metrics.json; do not use blank or unhydrated screenshots for visual parity.');
}
console.log('Public read-only audit complete: '+folder+'; screenshots '+report.screenshots.length+'; no private data accessed.');
