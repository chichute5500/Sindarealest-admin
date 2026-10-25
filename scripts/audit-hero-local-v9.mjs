// Isolated no-deploy Hero V9 QA: screenshots compared to owner-approved WebP art.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('public'),out=resolve('artifacts/hero-v9-isolated-browser-qa');
await mkdir(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4175');
  const path=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!path.startsWith(root+sep))throw Error('Unsafe path');
  const bytes=await readFile(path);
  res.writeHead(200,{'content-type':types[extname(path)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404,{'content-type':'application/json'});res.end('{}');}
});
await new Promise(ok=>server.listen(4175,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const matrix=[['mobile-320',320,640],['mobile-360',360,800],['mobile-390',390,844],['tablet-768',768,1024],['desktop-mode-980',980,700],['desktop-1280',1280,800],['desktop-1440',1440,900]];
const report=[];
try{
 for(const [name,width,height] of matrix)for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height},colorScheme:theme,deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const response=await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response?.status(),200,'Homepage status');
  await page.waitForFunction(()=>{const img=document.querySelector('#heroReferenceArt');return img?.complete&&img.naturalWidth>0;});
  if(await page.locator('#skipIntro').count())await page.locator('#skipIntro').evaluate(el=>el.click()).catch(()=>{});
  // Real welcome dismiss uses a 360ms exit and focus trap: do not test CTA until that finishes.
  await page.waitForFunction(()=>!document.body.classList.contains('welcome-active'),null,{timeout:5000});
  await page.waitForTimeout(100);
  // Hero-specific visual QA bypasses the separate welcome overlay.
  await page.addStyleTag({content:'#welcomeSplash{display:none!important}body{overflow:auto!important}'});
  const status=await page.evaluate(()=>{
   const h=document.querySelector('#home'),a=h.querySelector('.hero-actions a'),img=h.querySelector('#heroReferenceArt');
   const hr=h.getBoundingClientRect(),ar=a.getBoundingClientRect();
   return {src:img.currentSrc,hero:{x:hr.x,y:hr.y,width:hr.width,height:hr.height},cta:{x:ar.x,y:ar.y,width:ar.width,height:ar.height},headline:h.querySelector('h1')?.textContent||'',href:a.getAttribute('href')};
  });
  assert.ok(status.src.includes(width<=760?'hero-reference-mobile.webp':'hero-reference-desktop.webp'),name+' picture selection');
  assert.equal(status.href,'#products');
  assert.ok(status.headline.includes('Phong cách')&&status.headline.includes('da cá sấu'));
  assert.ok(status.cta.width>20&&status.cta.height>15);
  assert.ok(status.cta.x>=status.hero.x-2&&status.cta.x+status.cta.width<=status.hero.x+status.hero.width+2);
  assert.ok(Math.abs(status.hero.width/status.hero.height-1779/884)<.025,name+' geometry');
  const screenshot=await page.locator('#home').screenshot({path:out+'/'+name+'-'+theme+'.png',animations:'disabled'});
  const similarity=await page.evaluate(async b64=>{
   const decode=src=>new Promise((yes,no)=>{const i=new Image();i.onload=()=>yes(i);i.onerror=no;i.src=src;});
   const shot=await decode('data:image/png;base64,'+b64),ref=await decode(document.querySelector('#heroReferenceArt').currentSrc);
   const w=shot.width,h=shot.height;
   const canvas=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c.getContext('2d',{willReadFrequently:true});};
   const a=canvas(),b=canvas();
   a.imageSmoothingQuality='high';a.drawImage(ref,0,0,w,h);b.drawImage(shot,0,0,w,h);
   const x=a.getImageData(0,0,w,h).data,y=b.getImageData(0,0,w,h).data;
   let err=0,close=0;
   for(let p=0;p<x.length;p+=4){const d=(Math.abs(x[p]-y[p])+Math.abs(x[p+1]-y[p+1])+Math.abs(x[p+2]-y[p+2]))/3;err+=d;if(d<=24)close++;}
   return {pixelMeanError:err/(w*h),pixelsWithin24:close/(w*h),width:w,height:h};
  },screenshot.toString('base64'));
  assert.ok(similarity.pixelMeanError<13,name+' '+theme+' mean pixel divergence '+JSON.stringify(similarity));
  assert.ok(similarity.pixelsWithin24>.93,name+' '+theme+' parity '+JSON.stringify(similarity));
  await page.locator('#home .hero-actions .pill-btn').focus();
  const focused=await page.evaluate(()=>document.activeElement?.matches('#home .hero-actions .pill-btn'));
  assert.ok(focused,name+' CTA must receive keyboard focus after Welcome closes');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>location.hash==='#products',null,{timeout:2500});
  report.push({name,theme,...status,...similarity,pass:true});
  console.log('PASS '+name+' / '+theme+' '+JSON.stringify(similarity));
  await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify({pass:true,report},null,2)+'\n');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
