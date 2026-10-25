import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildCloudflareAccessHeaders } from './cloudflare-access-service-token.mjs';
import { isApprovedPreviewExternalRead } from './preview-external-read-allowlist.mjs';

const branch='fix/liquid-glass-audit-2026-10-19';
const preview=new URL(process.env.PREVIEW_URL||'https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/');
const sha=String(process.env.GITHUB_SHA||'').trim();
if(process.env.GITHUB_REF_NAME!==branch || !/^[0-9a-f]{40}$/i.test(sha)
 || preview.protocol!=='https:' || preview.hostname!=='fix-liquid-glass-audit-2026.sindarealest2.pages.dev'
 || preview.pathname!=='/' || preview.search || preview.hash) {
 throw new Error('Refusing non-preview branch, non-approved URL, or missing source SHA');
}
const out=path.resolve('artifacts/scroll-reveal-preview-audit');
await fs.mkdir(out,{recursive:true});
const headers=buildCloudflareAccessHeaders();
const result={sha,branch,preview:preview.origin,results:[],errors:[]};
const browser=await chromium.launch({headless:true});
const cases=[
 {name:'mobile-390-light',width:390,height:844,theme:'light',hasTouch:true},
 {name:'mobile-390-dark',width:390,height:844,theme:'dark',hasTouch:true},
 {name:'desktop-1440-light',width:1440,height:900,theme:'light',hasTouch:false},
 {name:'desktop-1440-dark',width:1440,height:900,theme:'dark',hasTouch:false}
];
try {
 for(const spec of cases){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},
    deviceScaleFactor:1,isMobile:spec.hasTouch,hasTouch:spec.hasTouch,colorScheme:spec.theme});
  await context.addInitScript(theme=>{try{localStorage.setItem('sd-theme-mode',theme)}catch{}},spec.theme);
  const page=await context.newPage();
  const current={context:spec.name,passes:[],errors:[]};
  page.on('pageerror',e=>current.errors.push(String(e.message||e).slice(0,350)));
  await page.route('**/*',async route=>{
   const request=route.request();
   let url;
   try{url=new URL(request.url())}catch{await route.abort();return}
   if(url.origin===preview.origin){
    if(!['GET','HEAD'].includes(request.method())){current.errors.push('Unexpected non-read Preview request '+request.method());await route.abort();return}
    await route.continue({headers:{...request.headers(),...headers}});
   }else if(isApprovedPreviewExternalRead(request.url(),request.method())){
    await route.continue();
   }else{
    await route.abort('blockedbyclient');
   }
  });
  try{
   const response=await page.goto(preview.href,{waitUntil:'domcontentloaded',timeout:45000});
   assert.ok(response?.ok(),'Preview HTTP 2xx');
   await page.waitForFunction(()=>{
    const e=document.querySelector('#welcomeSplash');
    if(!e)return true;
    const s=getComputedStyle(e);
    return e.hidden||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.01;
   },null,{timeout:15000});
   await page.waitForSelector('#catalogGrid .product-card[data-reveal]',{timeout:30000});
   const card=page.locator('#catalogGrid .product-card[data-reveal]').first();
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await card.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForFunction(()=>{
    const el=document.querySelector('#catalogGrid .product-card[data-reveal]');
    return el?.classList.contains('is-visible');
   },null,{timeout:10000});
   await page.waitForTimeout(520);
   const on=await card.evaluate(el=>{
    const style=getComputedStyle(el);
    const box=el.getBoundingClientRect();
    const x=Math.max(0,Math.min(innerWidth-1,box.x+box.width*.5));
    const y=Math.max(0,Math.min(innerHeight-1,box.y+box.height*.5));
    const top=document.elementFromPoint(x,y);
    return {
     opacity:Number(style.opacity),filter:style.filter,
     transform:style.transform,willChange:style.willChange,
     hit:top===el||el.contains(top),zIndex:style.zIndex,
     rect:{x:box.x,y:box.y,width:box.width,height:box.height},
     documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth
    };
   });
   assert.equal(on.filter,'none','No expensive whole-card blur layer');
   assert.equal(on.transform,'none','No persistent full-card transform stacking layer');
   assert.equal(on.willChange,'auto','No pinned full-card GPU layer');
   assert.ok(on.opacity>.98,'Visible product remains readable');
   assert.ok(on.hit,'Product card is not covered by another composited layer');
   assert.ok(on.documentWidth<=on.viewportWidth+2,'No horizontal overflow');
   current.passes.push('Visible product has no filter/transform/pinned compositor and is clickable');
   await page.screenshot({path:path.join(out,spec.name+'-product.png'),fullPage:false});
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.waitForFunction(()=>{
    const el=document.querySelector('#catalogGrid .product-card[data-reveal]');
    return el&&!el.classList.contains('is-visible');
   },null,{timeout:10000});
   const off=await card.evaluate(el=>getComputedStyle(el).transitionDuration);
   assert.ok(off.split(',').every(s=>parseFloat(s)===0),'Offscreen reset must not animate');
   current.passes.push('Fully exited product resets instantly without another animation');
   await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('#catalogGrid .product-card[data-reveal]')?.classList.contains('is-visible'),null,{timeout:10000});
   current.passes.push('Scroll-down reentry reveals again');
   await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
   await page.waitForFunction(()=>!document.querySelector('#catalogGrid .product-card[data-reveal]')?.classList.contains('is-visible'),null,{timeout:10000});
   await card.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelector('#catalogGrid .product-card[data-reveal]')?.classList.contains('is-visible'),null,{timeout:10000});
   current.passes.push('Scroll-up reentry reveals again');
   // Distinct filter button and search should remain visible/clickable after fade.
   const filter=page.locator('#categoryFilters .filter-pill').first();
   await filter.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForTimeout(500);
   const controls=await page.evaluate(()=>{
    const field=document.querySelector('#products .search-field');
    const chip=document.querySelector('#categoryFilters .filter-pill');
    if(!field||!chip)return {valid:false};
    const a=field.getBoundingClientRect(),b=chip.getBoundingClientRect();
    const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
                  Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    return{valid:true,overlap,hit:e===chip||chip.contains(e),
     width:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   assert.ok(controls.valid&&controls.hit,'Category chip remains hittable through glass layers');
   assert.ok(controls.overlap<1,'Search glass does not physically overlap category chip');
   assert.ok(controls.width<=controls.viewport+2,'Catalog controls do not overflow viewport');
   current.passes.push('Glass search/category layers are distinct, accessible and unclipped');
   await page.screenshot({path:path.join(out,spec.name+'-catalog.png'),fullPage:false});
  }catch(e){
   current.errors.push(String(e.stack||e).slice(0,1400));
  }finally{result.results.push(current);await context.close();}
 }
}finally{await browser.close()}
await fs.writeFile(path.join(out,'results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({sha,results:result.results.map(x=>({context:x.context,passes:x.passes,errors:x.errors}))},null,2));
if(result.results.some(x=>x.errors.length))process.exitCode=1;
