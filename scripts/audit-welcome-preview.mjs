import {promises as fs} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {buildCloudflareAccessHeaders} from './cloudflare-access-service-token.mjs';
import {isApprovedPreviewExternalRead} from './preview-external-read-allowlist.mjs';

const branch='fix/liquid-glass-audit-2026-10-19';
const preview='https://fix-liquid-glass-audit-2026.sindarealest2.pages.dev';
const sha=String(process.env.GITHUB_SHA||'').trim();
if(process.env.GITHUB_REF_NAME!==branch||!/^[0-9a-f]{40}$/i.test(sha))throw Error('Refused: fix branch and exact SHA required');
if((process.env.PREVIEW_URL||preview+'/')!==preview+'/')throw Error('Refused: non-Preview origin');
const directory=path.resolve('artifacts/welcome-preview-audit');
await fs.mkdir(directory,{recursive:true});
const matrix=[
 {id:'desktop-1440-light',width:1440,height:900,theme:'light'},
 {id:'desktop-1440-dark',width:1440,height:900,theme:'dark'},
 {id:'desktop-short-1366-light',width:1366,height:608,theme:'light'},
 {id:'desktop-short-1366-dark',width:1366,height:608,theme:'dark'},
 {id:'tablet-1024-light',width:1024,height:640,theme:'light'},
 {id:'tablet-1024-dark',width:1024,height:640,theme:'dark'},
 {id:'mobile-390-light',width:390,height:844,theme:'light'},
 {id:'mobile-390-dark',width:390,height:844,theme:'dark'},
 {id:'mobile-360-light',width:360,height:720,theme:'light'},
 {id:'mobile-360-dark',width:360,height:720,theme:'dark'},
 {id:'mobile-320-light',width:320,height:640,theme:'light'},
 {id:'mobile-320-dark',width:320,height:640,theme:'dark'},
];
const report={auditType:'owner-approved-welcome-pr113-port-parity',sha,branch,preview,originalOwnerApprovedSha:'4df440bc9695ce07998df45bdf3abaac0317cdfd',cases:[],errors:[],timestamp:new Date().toISOString()};
const browser=await chromium.launch({headless:true});
try{
 for(const v of matrix){
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},colorScheme:v.theme,reducedMotion:'reduce',deviceScaleFactor:1});
  await context.addInitScript(theme=>{
   try{localStorage.setItem('sd-theme-mode',theme)}catch{}
   // Hold only Welcome's auto-dismiss while making the actual first-paint screenshot.
   // The separate user-driven dismissal still runs normally.
   const nativeSetTimeout=window.setTimeout.bind(window);
   window.setTimeout=(fn,delay,...args)=>{
    if(typeof fn==='function'&&fn.name==='dismiss'&&delay>=200&&delay<=2500)return nativeSetTimeout(()=>{},60000);
    return nativeSetTimeout(fn,delay,...args);
   };
  },v.theme);
  const access=buildCloudflareAccessHeaders();
  await context.route('**/*',async route=>{
   const req=route.request();let u;
   try{u=new URL(req.url())}catch{await route.abort('blockedbyclient');return}
   if(u.origin===preview&&u.pathname==='/api/settings'&&req.method()==='GET'){
    await route.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":true}'});return;
   }
   if(u.origin===preview&&['GET','HEAD'].includes(req.method())){
    await route.continue({headers:{...req.headers(),...access}});return;
   }
   if(isApprovedPreviewExternalRead(req.url(),req.method())){await route.continue();return}
   await route.abort('blockedbyclient');
  });
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push({id:v.id,kind:'pageerror',error:e.message}));
  try{
   const response=await page.goto(preview+'/',{waitUntil:'domcontentloaded',timeout:45000});
   if(response?.status()!==200)throw Error('Expected authenticated Preview HTTP 200; received '+response?.status());
   const splash=page.locator('#welcomeSplash');
   await splash.waitFor({state:'visible',timeout:10000});
   await page.evaluate(()=>document.fonts.ready);
   const m=await page.evaluate(()=>{
    const splash=document.getElementById('welcomeSplash');
    const panel=splash.querySelector('.welcome-content');
    const overlay=splash.getBoundingClientRect(), box=panel.getBoundingClientRect();
    const ss=getComputedStyle(splash),ps=getComputedStyle(panel);
    const root=getComputedStyle(document.documentElement),body=getComputedStyle(document.body);
    const texture=getComputedStyle(splash.querySelector('.welcome-texture--light'));
    const source=[...document.querySelectorAll('style')].map(x=>x.textContent).join('\n');
    const early=source.match(/\.welcome-content\{display:flex;[^\n]*\}/)?.[0]||'';
    const checks={
     overlayFillsViewport:Math.abs(overlay.x)<2&&Math.abs(overlay.y)<2&&Math.abs(overlay.width-innerWidth)<=3&&Math.abs(overlay.height-innerHeight)<=3,
     contentFitsWidth:box.left>=0&&box.right<=innerWidth+1,
     scrollLocked:root.overflowY==='hidden'&&body.overflowY==='hidden',
     noWhitePanel:ps.backgroundColor==='rgba(0, 0, 0, 0)'&&ps.borderTopWidth==='0px'&&ps.boxShadow==='none',
     noExpensiveBackdrop:ps.backdropFilter==='none'&&ps.webkitBackdropFilter==='none',
     noFullScreenFilter:texture.filter==='none',
     styleBeforeFirstPaint:early.includes('background:transparent')&&!early.includes('background:var(--welcome-panel)'),
     welcomeCopy:!!splash.querySelector('.welcome-title')?.textContent.includes('Dấu ấn da cá sấu'),
     visibleDismissButton:!!splash.querySelector('#skipIntro')&&getComputedStyle(splash.querySelector('#skipIntro')).visibility==='visible',
     desktopFitsHeight:innerWidth<761||panel.scrollHeight-panel.clientHeight<=3,
     responsiveApproved:!!document.getElementById('sd-welcome-desktop-mobile-performance-2026-10-25'),
     approvedHeroIntact:!!document.querySelector('#home.sd-code-hero')
    };
    return {checks,rect:{x:overlay.x,y:overlay.y,width:overlay.width,height:overlay.height},content:{x:box.x,y:box.y,width:box.width,height:box.height,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight}};
   });
   await splash.screenshot({path:path.join(directory,v.id+'-welcome.png'),animations:'disabled'});
   await page.locator('#skipIntro').click();
   await page.waitForFunction(()=>!document.querySelector('#welcomeSplash')&&!document.body.classList.contains('welcome-active'),{timeout:3000});
   const failed=Object.entries(m.checks).filter(([,pass])=>!pass).map(([name])=>name);
   report.cases.push({id:v.id,viewport:{width:v.width,height:v.height},theme:v.theme,...m,pass:failed.length===0&&true,failed});
   if(failed.length)report.errors.push({id:v.id,kind:'welcome-contract',failed});
  }catch(err){report.cases.push({id:v.id,pass:false,error:String(err)});report.errors.push({id:v.id,kind:'capture',error:String(err)})}
  await context.close();
 }
}finally{await browser.close()}
report.pass=report.cases.length===matrix.length&&report.cases.every(x=>x.pass);
await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({pass:report.pass,cases:report.cases.map(x=>({id:x.id,pass:x.pass,failed:x.failed||[],error:x.error})),errors:report.errors},null,2));
if(!report.pass)process.exitCode=1;
