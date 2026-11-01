/** Compare a few isolated first-paint hypotheses in a read-only browser.
 * This NEVER changes the deployed site; CSS is injected into the fetched
 * document in memory, and all non-GET/HEAD requests are blocked.
 */
import {chromium} from "playwright";
import {writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const base=(process.env.AUDIT_TARGET_URL||"https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev").replace(/\/$/,"");
const dir=process.env.AUDIT_OUTPUT||"audit/after";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const cases=[
 {route:"/",width:390,name:"baseline"},
 {route:"/",width:390,name:"no-welcome-motion",css:"#welcomeSplash .welcome-content{animation:none!important;transform:none!important}"},
 {route:"/",width:390,name:"fixed-welcome-box",css:"#welcomeSplash .welcome-content{height:min(700px,calc(100dvh - 16px))!important;box-sizing:border-box}"},
 {route:"/",width:390,name:"stable-settings",staticSettings:true},
 {route:"/",width:390,name:"no-theme-layer",css:".theme-bg{display:none!important}"},
 {route:"/sanpham",width:390,name:"baseline"},
 {route:"/sanpham",width:390,name:"no-theme-layer",css:".theme-bg{display:none!important}"},
 {route:"/sanpham",width:390,name:"contain-paint",css:".theme-bg{contain:paint!important}"},
 {route:"/sanpham",width:390,name:"contain-layout-paint",css:".theme-bg{contain:layout paint!important}"},
 {route:"/sanpham",width:390,name:"contain-strict",css:".theme-bg{contain:strict!important}"},
 {route:"/sanpham",width:390,name:"promote-composite",css:".theme-bg{will-change:opacity!important;backface-visibility:hidden!important}"},
 {route:"/sanpham",width:390,name:"no-hydration",blockProducts:true}
];
const results=[];
try{
 for(const t of cases){
  const context=await browser.newContext({viewport:{width:t.width,height:850},colorScheme:"light",reducedMotion:"no-preference",serviceWorkers:"block"});
  const page=await context.newPage();
  await page.addInitScript(()=>{
   window.__auditShift=[];
   try{new PerformanceObserver(list=>{
    for(const e of list.getEntries()){
     if(e.hadRecentInput)continue;
     window.__auditShift.push({value:e.value,time:e.startTime,
      elements:(e.sources||[]).slice(0,4).map(s=>s.node?.id||s.node?.className||s.node?.tagName||"unknown")});
    }
   }).observe({type:"layout-shift",buffered:true})}catch{}
  });
  await page.route("**/*",async route=>{
   const req=route.request(),url=new URL(req.url());
   if(!["GET","HEAD"].includes(req.method()))return route.abort("blockedbyclient");
   if(t.blockProducts&&url.pathname==="/api/products")return route.abort("blockedbyclient");
   if(t.staticSettings&&url.pathname==="/api/settings")return route.fulfill({
    status:200,contentType:"application/json",
    body:JSON.stringify({welcomeEnabled:true,
      welcomeTitleLine1:"Dấu ấn da cá sấu.",
      welcomeTitleLine2:"Tinh tế trong từng chi tiết.",
      welcomeText:"Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu."})
   });
   if(t.css&&req.isNavigationRequest()&&req.resourceType()==="document"){
    const response=await route.fetch();
    const html=(await response.text()).replace("</head>",'<style id="ab-only">'+t.css+"</style></head>");
    return route.fulfill({response,body:html});
   }
   return route.continue();
  });
  try{
   await page.goto(base+t.route,{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForTimeout(3000);
   const d=await page.evaluate(()=>{
    const a=window.__auditShift||[];
    return {CLS:Number(a.reduce((s,e)=>s+e.value,0).toFixed(4)),
      hydration:document.documentElement.dataset.catalogHydration||"",
      top:a.sort((x,y)=>y.value-x.value).slice(0,3)};
   });
   const record={name:t.name,route:t.route,width:t.width,...d};
   results.push(record);
   console.log("LAYOUT_AB "+JSON.stringify(record));
  }catch(e){
   const record={name:t.name,route:t.route,error:String(e.message||e).slice(0,250)};
   results.push(record);console.log("LAYOUT_AB_FAIL "+JSON.stringify(record));
  }finally{await context.close()}
 }
}finally{await browser.close()}
await mkdir(dir,{recursive:true});
await writeFile(join(dir,"layout-ab.json"),JSON.stringify({base,results},null,2));
