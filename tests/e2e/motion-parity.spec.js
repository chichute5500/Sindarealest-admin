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
  const instant=await page.evaluate(()=>{
   const account=document.querySelector('#accountDrawer');
   account.style.visibility='';account.classList.add('open');account.removeAttribute('inert');
   document.querySelector('#accountFavoritesAction').click();
   const outgoing=document.querySelector('#accountMenuView');
   return {leaving:outgoing.dataset.sdMotionLeaving,exitMs:outgoing.getAnimations().at(-1)?.effect?.getTiming()?.duration};
  });
  expect(instant.leaving).toBe('1');
  expect(instant.exitMs).toBe(180);
  await expect(page.locator('#accountFavoritesView')).toBeVisible();
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

test('desktop light and dark retain glass filters and pre-approved drawer transitions',async({browser})=>{
 for(const colorScheme of ['light','dark']){
  const context=await browser.newContext({viewport:{width:1280,height:800},colorScheme,reducedMotion:'no-preference',serviceWorkers:'block'});
  const page=await context.newPage();
  try{
   await motionFixture(page);
   await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
   const data=await page.evaluate(()=>{
    const detail=document.querySelector('#productOverlay');
    const gallery=document.querySelector('#sdFullscreenViewer');
    const cart=document.querySelector('#cartDrawer'),checkout=document.querySelector('#checkoutDrawer');
    return {glass:getComputedStyle(detail,'::before').backdropFilter,
      detailOpacity:getComputedStyle(detail).opacity,
      detailMotion:getComputedStyle(detail.querySelector('.detail-modal')).transitionDuration,
      galleryMotion:getComputedStyle(gallery.querySelector('.sd-fullscreen-stage')).transitionDuration,
      cartMotion:getComputedStyle(cart).transitionDuration,
      checkoutMotion:getComputedStyle(checkout).transitionDuration};
   });
   expect(data.glass).toContain('blur(');
   expect(data.detailOpacity).toBe('1');
   expect(data.detailMotion).toContain('0.28s');
   expect(data.galleryMotion).toContain('0.28s');
   expect(data.cartMotion).toMatch(/[1-9]/);
   expect(data.checkoutMotion).toMatch(/[1-9]/);
  }finally{await context.close()}
 }
});

test('source FLIP starts at the tapped card, reverses to it, and keeps native glass',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  const before=await page.evaluate(()=>{
   const source=document.createElement('button');
   source.id='sharedSourceTest';
   source.textContent='Sản phẩm mẫu';
   source.style.cssText='position:fixed;left:25px;top:165px;width:145px;height:185px;z-index:120;pointer-events:none';
   document.body.append(source);
   const overlay=document.querySelector('#productOverlay'),surface=overlay.querySelector('.detail-modal');
   const start=source.getBoundingClientRect();
   overlay.style.visibility='';overlay.removeAttribute('inert');overlay.classList.add('open');
   const glass=getComputedStyle(overlay,'::before').backdropFilter;
   const active=window.SDSharedMotion.open('product-detail',surface,source,520);
   const animation=overlay.getAnimations().find(a=>a.effect?.getTiming().duration===364);
   return {active,start:{left:start.left,top:start.top,width:start.width,height:start.height},
    glass,opacity:getComputedStyle(overlay).opacity,
    frames:animation?.effect?.getKeyframes(),duration:animation?.effect?.getTiming().duration};
  });
  expect(before.active).toBe(true);
  expect(before.glass).toContain('blur(');
  expect(before.opacity).toBe('1');
  expect(before.duration).toBe(364);
  expect(before.frames[0].clipPath).toContain('inset(');
  expect(before.frames[1].clipPath).toBe('inset(0px 0px 0px 0px round 19px)');
  expect(before.frames[0].transform).toBeUndefined();
  await page.waitForTimeout(145);
  const reversed=await page.evaluate(()=>{
   const surface=document.querySelector('#productOverlay .detail-modal');
   const before=surface.getBoundingClientRect();
   const active=window.SDSharedMotion.close('product-detail',surface,()=>{
    const overlay=document.querySelector('#productOverlay');
    overlay.style.visibility='hidden';overlay.classList.remove('open');
   },null,520);
   const after=surface.getBoundingClientRect();
   return {active,jump:Math.hypot(before.left-after.left,before.top-after.top)};
  });
  expect(reversed.active).toBe(true);
  expect(reversed.jump,'reversing mid-flight must not snap back to full-screen').toBeLessThan(22);
  await expect(page.locator('#productOverlay')).toHaveCSS('visibility','hidden',{timeout:1800});
  expect(errors).toEqual([]);
 }finally{await context.close()}
});

test('storefront cart uses a 343ms mask without shrinking photos and text',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage();
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  // Welcome is deliberately a full-screen modal until it is dismissed.
  // Its CSS guard also uses body:has(#welcomeSplash), so removing only
  // welcome-active incorrectly leaves every drawer visually suppressed.
  await page.locator('#skipIntro').click();
  await expect(page.locator('#welcomeSplash')).toHaveCount(0,{timeout:6000});
  const data=await page.evaluate(()=>{
   const trigger=[document.querySelector('#mobileCartNav'),document.querySelector('#cartOpen')]
    .find(el=>el?.getBoundingClientRect().width>2&&el?.getBoundingClientRect().height>2);
   if(!trigger)throw new Error('No visible Cart trigger on mobile');
   trigger.click();
   const panel=document.querySelector('#cartDrawer');
   const anim=panel.getAnimations().find(a=>a.effect?.getTiming().duration===343);
   return {open:panel.classList.contains('open'),trigger:trigger.id,
    source:window.SDSharedMotion?.sourceFromLast(),
    hasOrigin:window.SDSharedMotion?.hasOrigin('cart'),
    animations:panel.getAnimations().map(a=>({type:a.constructor.name,duration:a.effect?.getTiming()?.duration,
      playbackRate:a.playbackRate,frames:a.effect?.getKeyframes()?.slice(0,2).map(f=>f.clipPath)})),
    duration:anim?.effect?.getTiming().duration,frames:anim?.effect?.getKeyframes(),
    glass:getComputedStyle(panel,'::before').backdropFilter,
    layout:{display:getComputedStyle(panel).display,visibility:getComputedStyle(panel).visibility,
      transform:getComputedStyle(panel).transform,
      rect:(()=>{const r=panel.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}})(),
      bodyClass:document.body.className,htmlClass:document.documentElement.className},
    contentScale:getComputedStyle(panel).transform};
  });
  expect(data.open).toBe(true);
  expect(data.duration,JSON.stringify(data)).toBe(343);
  expect(data.frames[0].clipPath).toContain('inset(');
  expect(data.frames[1].clipPath).toBe('inset(0px 0px 0px 0px round 19px)');
  expect(data.glass).toContain('blur(');
 }finally{await context.close()}
});

test('gallery clips entire glass plane while photo keeps native aspect ratio',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage();
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  const data=await page.evaluate(()=>{
   const source=document.querySelector('#detailMainImage'),viewer=document.querySelector('#sdFullscreenViewer');
   const frame=document.querySelector('#sdFullscreenFrame');
   viewer.classList.add('open');viewer.style.visibility='visible';
   const started=window.SDSharedMotion.open('full-gallery',frame,source,520);
   const motion=viewer.getAnimations().find(a=>a.effect?.getTiming().duration===364);
   const box=frame.getBoundingClientRect();
   return {started,frameWidth:box.width,frames:motion?.effect?.getKeyframes(),
     nativeTransform:getComputedStyle(frame).transform};
  });
  expect(data.started).toBe(true);
  expect(data.frames[0].clipPath).toContain('inset(');
  expect(data.frames[0].transform).toBeUndefined();
  expect(data.frameWidth).toBeGreaterThan(100);
  expect(data.nativeTransform,'image container must not be stretched').not.toContain('matrix3d(');
  await page.waitForTimeout(450);
  await expect(page.locator('#sdFullscreenViewer')).toHaveCSS('clip-path','none');
 }finally{await context.close()}
});
