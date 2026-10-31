/** Read-only browser probe for large layout shifts. No stateful API calls or private data. */
import {chromium} from "playwright";
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
const target=(process.env.AUDIT_TARGET_URL||"https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev").replace(/\/$/,"");
const output=process.env.AUDIT_OUTPUT||"audit/after";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const results=[];
try{
 for(const [route,viewport,scheme,motion] of [
 ["/",390,"light","no-preference"],["/",390,"light","reduce"],
 ["/",1280,"light","no-preference"],["/",1280,"light","reduce"],
 ["/",1280,"dark","no-preference"],
 ["/sanpham",390,"light","no-preference"],["/sanpham",390,"light","reduce"],
 ["/sanpham",1280,"light","no-preference"]
 ]){
  const context=await browser.newContext({viewport:{width:viewport,height:850},colorScheme:scheme,reducedMotion:motion,serviceWorkers:"block"});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    window.__clsProbe=[];
    try{
      new PerformanceObserver(entries=>{
        for(const entry of entries.getEntries()){
          if(entry.hadRecentInput)continue;
          window.__clsProbe.push({value:entry.value,time:entry.startTime,sources:(entry.sources||[]).slice(0,6).map(item=>({
            tag:item.node?.tagName||null,
            id:item.node?.id||null,
            className:typeof item.node?.className==="string"?item.node.className.slice(0,100):"",
            previous:item.previousRect,current:item.currentRect
          }))});
        }
      }).observe({type:"layout-shift",buffered:true});
    }catch{}
  });
  try{
    await page.goto(target+route,{waitUntil:"domcontentloaded",timeout:40000});
    await page.waitForTimeout(4000);
    const snapshot=await page.evaluate(()=>({
      hydration:document.documentElement.dataset.catalogHydration||"",
      entries:window.__clsProbe||[],
      theme:document.documentElement.className,
      bg:[...document.querySelectorAll(".theme-bg")].map(el=>{
        const r=el.getBoundingClientRect();return {rect:{x:r.x,y:r.y,width:r.width,height:r.height},style:getComputedStyle(el).position};
      })
    }));
    const total=snapshot.entries.reduce((n,e)=>n+Number(e.value||0),0);
    results.push({route,viewport,scheme,motion,CLS:Math.round(total*10000)/10000,...snapshot});
    console.log(JSON.stringify({route,viewport,scheme,motion,CLS:Math.round(total*10000)/10000,
      topShifts:snapshot.entries.sort((a,b)=>b.value-a.value).slice(0,3)}));
  }catch(error){
    results.push({route,viewport,scheme,motion,error:String(error?.message||error).slice(0,260)});
    console.log("CLS probe unavailable",route,viewport,scheme,error.message);
  }finally{await context.close()}
 }
}finally{await browser.close()}
await mkdir(output,{recursive:true});
await writeFile(join(output,"cls-probe.json"),JSON.stringify({target,results},null,2));
