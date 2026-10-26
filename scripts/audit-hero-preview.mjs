import {promises as fs} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {buildCloudflareAccessHeaders} from './cloudflare-access-service-token.mjs';
import {isApprovedPreviewExternalRead} from './preview-external-read-allowlist.mjs';

const expectedBranch='fix/liquid-glass-audit-2026-10-19';
const origin='https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev';
const requestedUrl=process.env.PREVIEW_URL||origin+'/';
const sha=String(process.env.GITHUB_SHA||'').trim();
if(process.env.GITHUB_REF_NAME!==expectedBranch||!/^[0-9a-f]{40}$/i.test(sha))throw Error('Refused: exact authorized fix SHA required');
if(new URL(requestedUrl).href!==origin+'/')throw Error('Refused: non-preview URL');
const out=path.resolve('artifacts/hero-preview-audit');
await fs.mkdir(out,{recursive:true});
const viewports=[['mobile-360',360,800],['mobile-390',390,844],['tablet-768',768,1024],['desktop-mode-980',980,800],['desktop-1280',1280,800],['desktop-1365',1365,768],['desktop-1440',1440,900]];
const report={auditType:'code-only-hero-layout-and-browser-audit',sha,branch:expectedBranch,preview:origin,referenceImageVisualSimilarityPercent:null,visualSimilarityVerifiedOver95:false,explanation:'Actual Chromium screenshots are captured; a user-approved AI bitmap baseline is not machine-registered, so no fabricated pixel fidelity percentage is reported.',results:[],errors:[],createdAt:new Date().toISOString()};
const browser=await chromium.launch({headless:true});
try{
for(const [name,width,height] of viewports){
for(const theme of ['light','dark']){
 const label=name+'-'+theme;
 const context=await browser.newContext({viewport:{width,height},colorScheme:theme,deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(v=>{try{localStorage.setItem('sd-theme-mode',v)}catch{}},theme);
 await context.route('**/*',async route=>{
  const req=route.request();
  try{
   const u=new URL(req.url());
   if(u.origin===origin&&['GET','HEAD'].includes(req.method()))return route.continue({headers:{...req.headers(),...buildCloudflareAccessHeaders()}});
   if(isApprovedPreviewExternalRead(req.url(),req.method()))return route.continue();
   report.errors.push({label,type:'blocked-request',url:u.origin+u.pathname,method:req.method()});
   await route.abort('blockedbyclient');
  }catch(e){report.errors.push({label,type:'route-error',error:String(e)});await route.abort('blockedbyclient').catch(()=>{})}
 });
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push({label,type:'pageerror',error:e.message}));
 try{
  const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:45000});
  if(!response?.ok())throw Error('Preview HTTP '+response?.status());
  await page.waitForFunction(()=>{const x=document.querySelector('#welcomeSplash');if(!x)return true;const s=getComputedStyle(x);return x.hidden||s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')<.01},{timeout:18000});
  await page.evaluate(t=>{document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.dataset.themeMode=t;document.documentElement.classList.remove('theme-transitioning')},theme);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(260);
  const m=await page.evaluate(({width,height,theme})=>{
   const hero=document.querySelector('#home.sd-code-hero');
   const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   if(!hero)return {missing:true};
   const title=hero.querySelector('h1'),copy=hero.querySelector('.sdh-copy'),cta=hero.querySelector('.sdh-cta'),visual=hero.querySelector('.sdh-visual'),glass=hero.querySelector('.sdh-glass-card');
   const spans=[...title.querySelectorAll('span')],r=box(hero),cr=box(copy),vr=box(visual),br=box(cta);
   const css=getComputedStyle(hero),hcss=getComputedStyle(title),fcss=getComputedStyle(glass),ctaStyle=getComputedStyle(cta);
   const checks={
    sectionFound:!!hero,
    noRasterNodes:hero.querySelectorAll('picture,img,video,canvas').length===0,
    noCssRasterBackground:!String(css.backgroundImage).includes('url('),
    titleThreeLines:spans.length===3&&spans.every(x=>getComputedStyle(x).display==='block'),
    headlineVietnamese:spans.map(x=>x.textContent.trim()).join(' ').replace(/\s+/g,' ').trim()==='Phong cách Đẳng cấp từ da cá sấu',
    fontIsSerif:/SD Serif/.test(hcss.fontFamily),
    serifRealLoaded:document.fonts.check('16px "SD Serif"'),
    sansRealLoaded:document.fonts.check('16px "SD Sans"'),
    actionIsLink:cta.tagName==='A'&&cta.getAttribute('href')==='#products',
    actionVisible:br.width>70&&br.height>=33&&ctaStyle.visibility==='visible'&&parseFloat(ctaStyle.opacity)>0,
    noPageHorizontalOverflow:document.documentElement.scrollWidth<=width+1,
    fitsScreenWidth:r.x>=0&&r.right<=width+1,
    compactHeight:width<=760?r.height>=235&&r.height<=271:r.height>=393&&r.height<=422,
    mobileNotFullscreen:width>760||r.height<height*.42,
    copyInside:r.x<=cr.x&&cr.right<=r.right+1&&cr.y>=r.y&&cr.bottom<=r.bottom+1,
    visualInside:r.x<=vr.x&&vr.right<=r.right+1,
    hasGlassBlur:/blur\(/.test(fcss.backdropFilter)||/blur\(/.test(fcss.webkitBackdropFilter),
    themeApplied:document.documentElement.classList.contains('dark')===(theme==='dark'),
    backgroundIsGradient:css.backgroundImage.includes('gradient('),
    noHiddenText:spans.every(x=>{const s=getComputedStyle(x);return s.visibility==='visible'&&s.opacity!=='0'&&box(x).width>0})
   };
   return {rect:r,copy:cr,visual:vr,cta:br,checks,score:Object.values(checks).filter(Boolean).length/Object.keys(checks).length*100,computed:{font:hcss.fontFamily,background:css.backgroundImage,button:ctaStyle.backgroundImage,blur:fcss.backdropFilter},imageCount:hero.querySelectorAll('img').length};
  },{width,height,theme});
  await page.locator('#home.sd-code-hero').screenshot({path:path.join(out,label+'-hero.png')});
  await page.screenshot({path:path.join(out,label+'-viewport.png'),fullPage:false});
  const result={label,viewport:{width,height},theme,...m,pass:!m.missing&&m.score>95};
  report.results.push(result);
  if(!result.pass)report.errors.push({label,type:'layout-contract',failedChecks:Object.entries(m.checks||{}).filter(x=>!x[1]).map(x=>x[0]),score:m.score});
 }catch(e){report.results.push({label,pass:false,error:String(e)});report.errors.push({label,type:'capture',error:String(e)})}
 await context.close();
}}
}finally{await browser.close()}
report.layoutContractPass=report.results.length===14&&report.results.every(x=>x.pass);
await fs.writeFile(path.join(out,'code-hero-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({layoutContractPass:report.layoutContractPass,visualSimilarityVerifiedOver95:false,contexts:report.results.map(x=>({label:x.label,pass:x.pass,score:x.score})),errors:report.errors},null,2));
if(!report.layoutContractPass)process.exitCode=1;
