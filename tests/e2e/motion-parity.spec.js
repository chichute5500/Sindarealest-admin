import {test,expect} from '@playwright/test';
import {readFile,stat} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';

const publicDir=resolve('public');
const contentType={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.svg':'image/svg+xml'};
async function motionFixture(page){
 await page.route('https://motion-fixture.invalid/**',async route=>{
  const url=new URL(route.request().url()),path=decodeURIComponent(url.pathname);
  if(path.startsWith('/api/')){
   if(path==='/api/admin/session')return route.fulfill({json:{}});
   return route.fulfill({json:{products:[],orders:[],customers:[],warranties:[],claims:[],logs:[],settings:{},active:false,showPrices:false}});
  }
  const file=resolve(join(publicDir,path==='/'?'index.html':path==='/admin/'?'admin/index.html':path.slice(1)));
  if(file!==publicDir&&!file.startsWith(publicDir+'/'))return route.fulfill({status:404});
  try{
   const info=await stat(file);
   if(!info.isFile())return route.fulfill({status:404});
   return route.fulfill({status:200,contentType:contentType[extname(file)]||'application/octet-stream',body:await readFile(file)});
  }catch{return route.fulfill({status:404,body:''})}
 });
}

test('storefront detail/gallery closes smoothly without changing the glass backdrop',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  const detail=page.locator('#productOverlay');
  await expect(detail).toBeHidden();
  const sample=await page.evaluate(()=>{
   const overlay=document.querySelector('#productOverlay');
   return {glass:getComputedStyle(overlay,'::before').backdropFilter,opacity:getComputedStyle(overlay).opacity};
  });
  await page.evaluate(()=>document.querySelector('#productOverlay').classList.add('open'));
  await expect(detail).toHaveCSS('visibility','visible');
  await page.waitForTimeout(320);
  await page.evaluate(()=>document.querySelector('#productOverlay').classList.remove('open'));
  const during=await detail.evaluate(el=>({visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity,glass:getComputedStyle(el,'::before').backdropFilter,
    motion:getComputedStyle(el.querySelector('.detail-modal')).transitionDuration}));
  expect(during.visibility).toBe('visible');
  expect(during.opacity).toBe('1');
  expect(during.glass).toBe(sample.glass);
  expect(during.motion).toContain('0.28s');
  await expect(detail).toHaveCSS('visibility','hidden',{timeout:1200});
  const gallery=page.locator('#sdFullscreenViewer');
  await page.evaluate(()=>document.querySelector('#sdFullscreenViewer').classList.add('open'));
  await expect(gallery).toHaveCSS('visibility','visible');
  await page.waitForTimeout(240);
  await page.evaluate(()=>document.querySelector('#sdFullscreenViewer').classList.remove('open'));
  await expect(gallery).toHaveCSS('visibility','hidden',{timeout:1200});
  expect(errors,'no browser JS error during open and close').toEqual([]);
 }finally{await context.close()}
});

test('account pane has 180ms exit and 280ms entry without changing the drawer',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
   const account=document.querySelector('#accountDrawer');
   account.style.visibility='';account.classList.add('open');account.removeAttribute('inert');
   document.querySelector('#accountFavoritesAction').click();
  });
  await expect(page.locator('#accountFavoritesView')).toBeVisible();
  await expect(page.locator('#accountMenuView')).toHaveAttribute('data-sd-motion-leaving','1');
  await page.waitForTimeout(300);
  await expect(page.locator('#accountMenuView')).toBeHidden();
  await page.locator('#accountFavoritesBack').click();
  await expect(page.locator('#accountMenuView')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator('#accountFavoritesView')).toBeHidden();
  expect(errors).toEqual([]);
 }finally{await context.close()}
});

test('admin editor and More menu have closing transitions, with Back history intact',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/admin/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appView')).toBeVisible({timeout:15000});
  await page.locator('.mobiletabs [data-view="products"]').click();
  await expect(page.locator('[data-action="add"]').first()).toBeVisible({timeout:6000});
  await page.locator('[data-action="add"]').first().click();
  await expect(page.locator('#backdrop')).toBeVisible();
  await page.locator('#editorClose').click();
  await expect(page.locator('#backdrop')).toHaveAttribute('data-sd-motion-closing','1');
  await expect(page.locator('#backdrop')).toBeHidden({timeout:1800});
  const more=page.locator('#mobileMorePanel'),trigger=page.locator('#mobileMoreTrigger');
  await trigger.click();
  await expect(more).toBeVisible();
  await trigger.click();
  await expect(more).toHaveAttribute('data-sd-motion-closing','1');
  await expect(more).toBeHidden({timeout:1300});
  expect(errors).toEqual([]);
 }finally{await context.close()}
});

test('reduced motion disables supplementary transitions',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
 const page=await context.newPage();
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  const style=await page.locator('#productOverlay>.detail-modal').evaluate(el=>getComputedStyle(el).transitionDuration);
  expect(style).toBe('0s');
 }finally{await context.close()}
});
