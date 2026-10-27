import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright';

const site=process.env.QA_URL;
assert.ok(/^https:\/\/[a-z0-9-]+\.sindarealest2\.pages\.dev\/?$/.test(site||''),'QA_URL must be a verified Cloudflare Pages deployment for sindarealest2');
const output='artifacts/qa-catalog-landing';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const cases=[
 {path:'/sanpham/mu',heading:'Mũ',cat:'mu',prefix:'SD-MU'},
 {path:'/sanpham/sneaker',heading:'Giày Thể Thao',cat:'sneakers',prefix:'SD-SN'},
 {path:'/sanpham/giaytay',heading:'Giày Tây',cat:'dress-shoes',prefix:'SD-GT'},
 {path:'/sanpham',heading:'Tất cả sản phẩm',cat:'all',prefix:'SD-'}
];
const reports=[];let failures=0;
function mark(record){
 reports.push(record);
 console.log((record.pass?'PASS ':'FAIL ')+JSON.stringify(record));
 if(!record.pass)failures++;
}
try{
qaModes: for (const mode of [
  {name:'desktop',viewport:{width:1440,height:900},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}
]){
 for (const theme of ['light','dark']){
  const ctx=await browser.newContext({...mode,locale:'vi-VN'});
  await ctx.addInitScript(theme=>{try{localStorage.setItem('sd-theme-mode',theme)}catch{}},theme);
  await ctx.route('**/*',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
  for(const test of cases){
   const page=await ctx.newPage();const pageErrors=[];let apiStatus=null;
   page.on('pageerror',e=>pageErrors.push(String(e).slice(0,250)));
   page.on('response',r=>{if(new URL(r.url()).pathname==='/api/products')apiStatus=r.status()});
   try{
    const response=await page.goto(site+test.path,{waitUntil:'domcontentloaded',timeout:50000});
    await page.waitForFunction(()=>window.__sdStorefrontReady===true,null,{timeout:9000});
    await page.waitForFunction(()=>!document.querySelector('#welcomeSplash'),null,{timeout:7000});
    await page.locator('#catalogHeading').waitFor({state:'visible',timeout:12000});
    await page.locator('#catalogGrid .product-card').first().waitFor({state:'visible',timeout:12000});
    await page.waitForTimeout(200);
    const actual=await page.evaluate(()=>{
      const h=document.querySelector('#catalogHeading'),nav=document.querySelector('.nav-wrap'),card=document.querySelector('#catalogGrid .product-card'),strip=document.querySelector('#categoryFilters'),chip=strip?.querySelector('.filter-pill.active');
      const rect=x=>x?.getBoundingClientRect(),b=rect(card),a=rect(chip),list=rect(strip),hh=rect(h),nn=rect(nav);
      const visible=x=>!!x&&getComputedStyle(x).display!=='none'&&getComputedStyle(x).visibility!=='hidden';
      return {
        heading:h?.textContent?.trim(),activeCategory:chip?.dataset.category,
        cards:document.querySelectorAll('#catalogGrid .product-card').length,
        firstSku:card?.querySelector('.product-sku')?.textContent?.trim(),
        firstPhotoLoaded:!!card?.querySelector('img')?.naturalWidth,
        homeHidden:[...document.querySelectorAll('main > section:not(#products)')].every(x=>!visible(x)),
        welcomeHidden:!document.querySelector('#welcomeSplash'),
        navVisible:visible(nav),
        firstCardTop:Math.round(b?.top??9999),headingTop:Math.round(hh?.top??9999),
        navBottom:Math.round(nn?.bottom??0),
        firstCardVisible:!!b&&b.width>0&&b.top<innerHeight&&b.bottom>0,
        selectedChipVisible:!!a&&!!list&&a.left>=list.left-4&&a.right<=list.right+4,
        fake404:document.body.classList.contains('sd-not-found-route'),
        catalogMode:document.documentElement.classList.contains('sd-catalog-route'),
        dark:document.documentElement.classList.contains('dark')
      };
    });
    const pass=response.status()===200&&apiStatus===200&&actual.catalogMode&&!actual.fake404&&actual.homeHidden&&actual.welcomeHidden&&actual.navVisible&&actual.firstCardVisible&&actual.selectedChipVisible&&actual.cards>0&&actual.heading===test.heading&&actual.activeCategory===test.cat&&actual.firstSku?.includes(test.prefix)&&actual.dark===(theme==='dark')&&!pageErrors.length;
    mark({device:mode.name,theme,route:test.path,http:response.status(),apiStatus,pass,...actual,pageErrors});
    await page.screenshot({path:join(output,mode.name+'-'+theme+test.path.replaceAll('/','_')+'.png'),animations:'disabled'});
    if(mode.name==='mobile'&&theme==='light'&&test.path==='/sanpham/mu'){
      const target=page.locator('#categoryFilters .filter-pill[data-category="dress-shoes"]');
      await target.scrollIntoViewIfNeeded();
      await target.click();
      await page.waitForFunction(()=>location.pathname==='/sanpham/giaytay');
      const switched=await page.evaluate(()=>({
       path:location.pathname,heading:document.querySelector('#catalogHeading')?.textContent?.trim(),
       homeHidden:[...document.querySelectorAll('main > section:not(#products)')].every(x=>getComputedStyle(x).display==='none')
      }));
      mark({device:'mobile',theme,route:'chip-switch',pass:switched.path==='/sanpham/giaytay'&&switched.heading==='Giày Tây'&&switched.homeHidden,...switched});
      await page.locator('.brand[href="#home"]').click();
      await page.waitForURL(url=>url.pathname==='/',{timeout:15000});
      const returned=await page.evaluate(()=>({
       path:location.pathname,
       homeVisible:getComputedStyle(document.querySelector('#home')).display!=='none',
       catalogMode:document.documentElement.classList.contains('sd-catalog-route')
      }));
      mark({device:'mobile',theme,route:'home-logo',pass:returned.path==='/'&&returned.homeVisible&&!returned.catalogMode,...returned});
    }
   }catch(e){
    mark({device:mode.name,theme,route:test.path,pass:false,error:String(e).slice(0,650),pageErrors,apiStatus});
    try{await page.screenshot({path:join(output,'FAIL-'+mode.name+'-'+theme+test.path.replaceAll('/','_')+'.png')})}catch{}
   }finally{await page.close()}
   if(failures>=2){console.log('Fast fail: stop after two browser errors; inspect Preview configuration.');break qaModes;}
  }
  await ctx.close();
 }
}
}finally{
 await browser.close();
 writeFileSync(join(output,'report.json'),JSON.stringify({sha:process.env.GITHUB_SHA,site,checks:reports,failures},null,2));
 console.log('QA TOTAL:',reports.length,'FAILURES:',failures);
}
if(failures)process.exitCode=1;
