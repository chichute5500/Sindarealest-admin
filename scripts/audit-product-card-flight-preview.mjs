import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildCloudflareAccessHeaders } from './cloudflare-access-service-token.mjs';
import { isApprovedPreviewExternalRead } from './preview-external-read-allowlist.mjs';

const PREVIEW='https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev/';
const sha=String(process.env.GITHUB_SHA||'');
const branch=String(process.env.GITHUB_REF_NAME||'');
const url=new URL(process.env.PREVIEW_URL||PREVIEW);
if(branch!=='fix/liquid-glass-audit-2026-10-19'||!/^[0-9a-f]{40}$/i.test(sha)||
 url.href!==PREVIEW)throw Error('Refuse non-Preview URL or non-authorized branch/source');
const access=buildCloudflareAccessHeaders();
const out=path.resolve('artifacts/product-card-flight-audit');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={sha,branch,cases:[]};
const viewports=[
 {name:'mobile-390-light',width:390,height:844,theme:'light',mobile:true},
 {name:'mobile-390-dark',width:390,height:844,theme:'dark',mobile:true},
 {name:'desktop-1440-light',width:1440,height:900,theme:'light',mobile:false},
 {name:'desktop-1440-dark',width:1440,height:900,theme:'dark',mobile:false},
];
try{
 for(const item of viewports){
  const ctx=await browser.newContext({viewport:{width:item.width,height:item.height},
    deviceScaleFactor:1,hasTouch:item.mobile,isMobile:item.mobile,colorScheme:item.theme,reducedMotion:'no-preference'});
  await ctx.addInitScript(theme=>{try{localStorage.setItem('sd-theme-mode',theme)}catch{}},item.theme);
  const page=await ctx.newPage();
  const sample={name:item.name,passed:[],errors:[]};
  page.on('pageerror',e=>sample.errors.push(String(e.message||e).slice(0,400)));
  await page.route('**/*',async route=>{
   const req=route.request();
   let u;
   try{u=new URL(req.url())}catch{await route.abort();return}
   if(u.origin===url.origin){
    if(!['GET','HEAD'].includes(req.method().toUpperCase())){
     sample.errors.push('Unexpected server mutation '+req.method()+' '+u.pathname);
     await route.abort('blockedbyclient');return;
    }
    await route.continue({headers:{...req.headers(),...access}});
   }else if(isApprovedPreviewExternalRead(req.url(),req.method())){
    await route.continue();
   }else await route.abort('blockedbyclient');
  });
  try{
   const response=await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:45000});
   assert.ok(response?.ok(),'Preview HTTP 2xx');
   await page.waitForFunction(()=>{
    const e=document.querySelector('#welcomeSplash');
    if(!e)return true;
    const s=getComputedStyle(e);
    return e.hidden||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<.01;
   },null,{timeout:14000});
   const card=page.locator('#catalogGrid .product-card[data-product]').first();
   await card.waitFor({state:'visible',timeout:25000});
   const add=card.locator('button[data-add]').first();
   await add.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#catalogGrid .product-card[data-product]')?.classList.contains('is-visible'),null,{timeout:10000});
   await page.waitForTimeout(470);
   const initial=await card.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {x:r.left,y:r.top,width:r.width,height:r.height,
      text:el.querySelector('.product-title')?.textContent.trim(),
      photo:el.querySelector('.product-photo img')?.currentSrc};
   });
   assert.ok(initial.width>70&&initial.height>95,'Full product card has positive dimensions');
   const expectedTarget=item.mobile?'mobileCartNav':'cartOpen';
   const startCount=Number(await page.locator('#cartCount').textContent())||0;
   await add.click();
   const flight=page.locator('.sd-fly-to-cart-clone');
   await flight.waitFor({state:'attached',timeout:2500});
   const start=await flight.evaluate(el=>{
    const snap=el.querySelector('.sd-fly-to-cart-snapshot');
    const box=el.getBoundingClientRect();
    return {x:parseFloat(el.style.left),y:parseFloat(el.style.top),
      width:parseFloat(el.style.width),height:parseFloat(el.style.height),
      sourceType:el.dataset.sourceType,cartTargetId:el.dataset.cartTargetId,
      duration:Number(el.dataset.durationMs),progress:Number(el.dataset.flightProgress),
      photoCount:snap?.querySelectorAll('img').length,title:snap?.querySelector('.product-title')?.textContent.trim(),
      inert:el.hasAttribute('inert'),hidden:el.getAttribute('aria-hidden'),
      pointer:getComputedStyle(el).pointerEvents,duplicateIds:snap?.querySelectorAll('[id]').length};
   });
   assert.equal(start.sourceType,'product-card','The complete card must be the flight source');
   assert.equal(start.cartTargetId,expectedTarget,'Landing control must match active viewport cart');
   assert.equal(start.duration,900,'Flight is 0.9s as requested');
   assert.ok(Math.abs(start.x-initial.x)<12&&Math.abs(start.y-initial.y)<12,
      'Flight must originate at actual card top-left, not the plus button or image center');
   assert.ok(Math.abs(start.width-initial.width)<2&&Math.abs(start.height-initial.height)<2,
      'Clone geometry must match full source tile dimensions');
   assert.equal(start.title,initial.text,'Product title must travel with image');
   assert.ok(start.photoCount>0,'Whole card clone must include product photo');
   assert.equal(start.duplicateIds,0,'Flight clone must not duplicate interactive IDs');
   assert.equal(start.inert,true);assert.equal(start.hidden,'true');assert.equal(start.pointer,'none');
   sample.passed.push('Exact full-card origin, real photo/title, mobile/desktop cart target, inert pointer-safe clone');
   await page.waitForTimeout(430);
   const middle=await flight.evaluate(el=>{
    const style=getComputedStyle(el),matrix=new DOMMatrixReadOnly(style.transform);
    return {progress:Number(el.dataset.flightProgress),scale:matrix.a,
      opacity:Number(style.opacity),target:el.dataset.cartTargetId};
   });
   assert.ok(middle.progress>.15&&middle.progress<.98,'Animation has visible mid-flight frames');
   assert.ok(middle.scale>.16&&middle.scale<1,'Whole tile shrinks smoothly');
   assert.ok(middle.opacity>.60,'Full tile stays visible most of the trajectory');
   assert.equal(middle.target,expectedTarget);
   sample.passed.push('Slow readable intermediate frame and shrinking full card');
   await page.screenshot({path:path.join(out,item.name+'-midflight.png'),fullPage:false});
   await page.waitForFunction(()=>!document.querySelector('.sd-fly-to-cart-clone'),null,{timeout:4000});
   const newCount=Number(await page.locator('#cartCount').textContent())||0;
   assert.equal(newCount,startCount+1,'Real cart quantity increments exactly once');
   const cartState=await page.evaluate(()=>{
    const targets=[document.getElementById('cartOpen'),document.getElementById('mobileCartNav')].filter(Boolean);
    return targets.map(x=>({id:x.id,bump:x.classList.contains('sd-cart-bump'),
      confirmed:x.classList.contains('sd-cart-confirmed')}));
   });
   assert.ok(cartState.some(x=>x.bump||x.confirmed),'Cart icon acknowledges landing');
   sample.passed.push('Flight cleans up at landing, cart count increments once, icon confirms');
   await page.emulateMedia({reducedMotion:'reduce'});
   await add.click();
   assert.equal(await flight.count(),0,'Reduced motion must not create a flying layer');
   assert.equal(Number(await page.locator('#cartCount').textContent()),startCount+2,
     'Reduced motion must preserve add-to-cart functionality');
   sample.passed.push('Reduced-motion accessibility: immediate add without flight');
  }catch(e){sample.errors.push(String(e.stack||e).slice(0,1300))}
  report.cases.push(sample);
  await ctx.close();
 }
}finally{await browser.close()}
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(report.cases.some(x=>x.errors.length))process.exitCode=1;
