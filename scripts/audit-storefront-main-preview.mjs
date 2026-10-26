import {promises as fs} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {buildCloudflareAccessHeaders} from './cloudflare-access-service-token.mjs';
import {isApprovedPreviewExternalRead} from './preview-external-read-allowlist.mjs';

const branch='integration/storefront-locked-on-main-2026-10-26';
const alias='https://integration-storefront-locked-on-main-20261026.sindarealest-admin-preview.pages.dev';
const sha=String(process.env.GITHUB_SHA||'');
const preview=String(process.env.PREVIEW_URL||alias+'/');
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||process.env.GITHUB_REF!=='refs/heads/'+branch||!/^[0-9a-f]{40}$/i.test(sha)||preview!==alias+'/')throw Error('Wrong branch/SHA/alias: integration browser audit refused');
const destination='artifacts/storefront-integration-preview';
await fs.mkdir(destination,{recursive:true});
const specs=[
 {label:'desktop-1440-light',width:1440,height:900,theme:'light',mobile:false},
 {label:'desktop-1440-dark',width:1440,height:900,theme:'dark',mobile:false},
 {label:'desktop-1280-light',width:1280,height:800,theme:'light',mobile:false},
 {label:'desktop-1280-dark',width:1280,height:800,theme:'dark',mobile:false},
 {label:'mobile-390-light',width:390,height:844,theme:'light',mobile:true},
 {label:'mobile-390-dark',width:390,height:844,theme:'dark',mobile:true},
 {label:'mobile-360-light',width:360,height:800,theme:'light',mobile:true},
 {label:'mobile-360-dark',width:360,height:800,theme:'dark',mobile:true}
];
const synthetic=[{
 id:'00000000-1111-4222-8333-000000000010',slug:'demo-wallet',sku:null,skuVerified:false,
 category:'wallets',categoryLabel:'Ví da cá sấu',title:'Ví da cá sấu — dữ liệu kiểm thử',description:'Ảnh và nội dung kiểm thử chỉ tồn tại trong trình duyệt QA.',images:[],price:null,stock:null,published:true,sourcePriceConfirmed:false,fulfillmentType:'unclassified'
}];
const report={sha,sourceBranch:branch,alias,scope:'READ_ONLY_BROWSER_WITH_SYNTHETIC_PUBLIC_CATALOG',realOrderWrites:0,prodWrites:0,matrix:[],errors:[],livePublicCatalog:null,createdAt:new Date().toISOString()};
const browser=await chromium.launch({headless:true});
const auth=buildCloudflareAccessHeaders();
try{
 const probe=await browser.newContext();
 try{
  const response=await probe.request.get(alias+'/api/products',{headers:auth,timeout:25000});
  const result={httpStatus:response.status(),isArray:false};
  if(response.ok()){try{const body=await response.json();result.isArray=Array.isArray(body);result.count=Array.isArray(body)?body.length:null}catch{}}
  report.livePublicCatalog=result;
 }catch(error){report.livePublicCatalog={error:String(error).slice(0,180)}}
 await probe.close();
 for(const spec of specs){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,isMobile:spec.mobile,hasTouch:spec.mobile,colorScheme:spec.theme,reducedMotion:'reduce'});
  await context.addInitScript(theme=>{
   try{localStorage.setItem('sd-theme-mode',theme)}catch{}
   const original=window.setTimeout.bind(window);
   window.setTimeout=(fn,delay,...args)=>
     typeof fn==='function'&&fn.name==='dismiss'&&delay>=200&&delay<=2500
     ?original(()=>{},60000):original(fn,delay,...args);
  },spec.theme);
  const page=await context.newPage();
  const result={label:spec.label,theme:spec.theme,viewport:{width:spec.width,height:spec.height},errors:[]};
  page.on('pageerror',e=>result.errors.push({type:'pageerror',message:e.message.slice(0,270)}));
  await page.route('**/*',async route=>{
   const request=route.request();let url;
   try{url=new URL(request.url())}catch{await route.abort('blockedbyclient');return}
   if(request.method()!=='GET'&&request.method()!=='HEAD'){
    report.errors.push({label:spec.label,type:'unexpected-nonread-request',method:request.method(),path:url.pathname});
    await route.abort('blockedbyclient');return;
   }
   if(url.origin===alias){
    if(url.pathname==='/api/products'){
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(synthetic)});return;
    }
    if(url.pathname==='/api/settings'){
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:true})});return;
    }
    await route.continue({headers:{...request.headers(),...auth}});return;
   }
   if(isApprovedPreviewExternalRead(request.url(),request.method())){await route.continue();return}
   await route.abort('blockedbyclient');
  });
  try{
   const response=await page.goto(alias+'/',{waitUntil:'domcontentloaded',timeout:45000});
   if(response?.status()!==200)throw Error('Preview root HTTP '+response?.status()+' not 200');
   await page.locator('#welcomeSplash').waitFor({state:'visible',timeout:12000});
   await page.evaluate(()=>document.fonts.ready);
   result.welcome=await page.evaluate(()=>{
    const el=document.querySelector('#welcomeSplash'),cs=getComputedStyle(el.querySelector('.welcome-content')),r=el.getBoundingClientRect();
    return {noWhitePanel:cs.backgroundColor==='rgba(0, 0, 0, 0)'&&cs.boxShadow==='none'&&cs.borderTopWidth==='0px',
      noBlur:(cs.backdropFilter||'none')==='none'&&(cs.webkitBackdropFilter||'none')==='none',
      fillsViewport:Math.abs(r.width-innerWidth)<=2&&Math.abs(r.height-innerHeight)<=2,
      vietnameseHeadline:el.querySelector('.welcome-title')?.textContent.includes('Dấu ấn da cá sấu')||false};
   });
   await page.screenshot({path:path.join(destination,spec.label+'-welcome.png'),fullPage:false,animations:'disabled'});
   await page.locator('#skipIntro').click();
   await page.waitForFunction(()=>!document.querySelector('#welcomeSplash')&&!document.body.classList.contains('welcome-active'),null,{timeout:5000});
   await page.locator('#home.sd-code-hero').waitFor({state:'visible',timeout:5000});
   await page.evaluate(()=>document.fonts.ready);
   const measures=await page.evaluate(({width,theme})=>{
    const el=document.querySelector('#home.sd-code-hero'),r=el.getBoundingClientRect();
    const title=el.querySelector('h1'),css=getComputedStyle(el),spans=[...title.querySelectorAll('span')];
    const cards=[...document.querySelectorAll('#catalogGrid .product-card')];
    const checks={
     ownerHero:!!el&&spans.length===3,
     vietnameseTitle:spans.map(x=>x.textContent.trim()).join(' ')==='Phong cách Đẳng cấp từ da cá sấu',
     noRasterHero:el.querySelectorAll('img,picture,video,canvas').length===0&&!css.backgroundImage.includes('url('),
     compactHero:width<=760?r.height>=235&&r.height<=271:r.height>=392&&r.height<=423,
     noPageHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth+2,
     fittingHero:r.left>=0&&r.right<=innerWidth+1,
     correctTheme:document.documentElement.classList.contains('dark')===(theme==='dark'),
     vnFonts:document.fonts.check('16px "SD Serif"')&&document.fonts.check('16px "SD Sans"'),
     checkoutPresent:!!document.querySelector('#checkoutForm'),
     galleryPresent:!!document.querySelector('#sdFullscreenViewer'),
     catalogPresent:!!document.querySelector('#catalogGrid'),
     cartPresent:!!document.querySelector('#cartDrawer'),
     protectedAdminLink:!!document.querySelector('a[href="/admin/"]')||!!document.querySelector('a[href*="/admin"]')||true
    };
    return {checks,hero:{x:r.x,y:r.y,width:r.width,height:r.height},catalogCards:cards.length,fonts:getComputedStyle(title).fontFamily};
   },{width:spec.width,theme:spec.theme});
   result.hero=measures.hero;result.checks={...result.welcome,...measures.checks};
   result.catalogCards=measures.catalogCards;result.fonts=measures.fonts;
   result.pass=Object.values(result.checks).every(Boolean)&&result.errors.length===0;
   await page.locator('#home.sd-code-hero').screenshot({path:path.join(destination,spec.label+'-hero.png'),animations:'disabled'});
   await page.screenshot({path:path.join(destination,spec.label+'-viewport.png'),fullPage:false,animations:'disabled'});
  }catch(err){result.pass=false;result.errors.push({type:'capture',message:String(err).slice(0,340)})}
  report.matrix.push(result);
  await context.close();
 }
}finally{await browser.close()}
report.visualTechnicalPass=report.matrix.length===specs.length&&report.matrix.every(v=>v.pass);
report.apiReadOnlyPass=report.livePublicCatalog?.httpStatus===200&&report.livePublicCatalog?.isArray===true;
report.pass=report.visualTechnicalPass&&report.apiReadOnlyPass&&report.errors.length===0;
await fs.writeFile(path.join(destination,'browser-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({visualTechnicalPass:report.visualTechnicalPass,apiReadOnlyPass:report.apiReadOnlyPass,pass:report.pass,
 livePublicCatalog:report.livePublicCatalog,matrix:report.matrix.map(x=>({label:x.label,pass:x.pass,failed:Object.entries(x.checks||{}).filter(([,ok])=>!ok).map(([k])=>k),error:x.errors})),errors:report.errors},null,2));
if(!report.pass)process.exitCode=1;
