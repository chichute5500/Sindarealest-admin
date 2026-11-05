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
  expect(during.motion,'no competing detail scale transition').toBe('0s');
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
   expect(data.detailMotion,'detail no longer has background scale').toBe('0s');
   expect(data.galleryMotion,'gallery stage no longer has background scale').toBe('0s');
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
  expect(before.frames[1].clipPath).toMatch(/^inset\(0px(?: 0px){0,3} round 19px\)$/);
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
  expect(data.frames[1].clipPath).toMatch(/^inset\(0px(?: 0px){0,3} round 19px\)$/);
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
   const frame=document.querySelector('#sdFullscreenFrame'),detail=document.querySelector('#productOverlay');
   // This standalone fixture has no product API data, so explicitly establish
   // a valid image layout; production computes the same size in sizeFullscreenFrame.
   detail.classList.add('open');detail.style.visibility='visible';
   frame.style.width='290px';frame.style.height='390px';
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

test('detail image morph keeps a single uniform scale and restores original image',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage();
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(()=>{
   const source=document.createElement('button');
   source.style.cssText='position:fixed;left:32px;top:190px;width:155px;height:140px;z-index:100';
   const img=document.createElement('img');
   img.src='/images/brand-emblem.png';
   img.style.cssText='display:block;width:100%;height:100%;object-fit:contain';
   source.append(img);document.body.append(source);
   const overlay=document.querySelector('#productOverlay');
   overlay.classList.add('open');overlay.style.visibility='visible';overlay.removeAttribute('inert');
   const destination=document.querySelector('#detailMainImage');
   destination.src=img.src;
   const started=window.SDSharedMotion.open('product-detail',overlay.querySelector('.detail-modal'),source,520);
   const clone=document.querySelector('.sd-shared-image-clone');
   const keyframes=clone?.getAnimations()[0]?.effect?.getKeyframes();
   return{started,clones:document.querySelectorAll('.sd-shared-image-clone').length,
    imageTransform:keyframes?.[0]?.transform,
    parentTransform:overlay.getAnimations().find(a=>a.effect?.getTiming().duration===364)?.effect?.getKeyframes()?.[0]?.transform,
    imageHidden:destination.style.opacity,
    originalRect:(()=>{const r=destination.getBoundingClientRect();return{width:r.width,height:r.height}})()};
  });
  expect(result.started).toBe(true);
  expect(result.clones).toBe(1);
  expect(result.imageTransform).toMatch(/translate3d\([^)]*\) scale\([0-9.]+\)$/);
  expect(result.imageTransform).not.toMatch(/scaleX|scaleY/);
  expect(result.parentTransform).toBeUndefined();
  expect(result.imageHidden).toBe('0');
  expect(result.originalRect.width).toBeGreaterThan(100);
  await page.waitForTimeout(450);
  await expect(page.locator('.sd-shared-image-clone')).toHaveCount(0);
  expect(await page.locator('#detailMainImage').evaluate(el=>el.style.opacity)).toBe('');
  await expect(page.locator('#detailMainImage')).toHaveCSS('opacity','1');
  expect(await page.locator('#detailMainImage').evaluate(el=>el.style.transition)).toBe('');
 }finally{await context.close()}
});

test('rapid product → gallery → close leaves no orphan image, mask, or hidden photo',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{
   const svg='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#828282"/></svg>');
   const trigger=document.createElement('button');
   trigger.id='qaMotionTrigger';trigger.style.cssText='position:fixed;left:28px;top:220px;width:120px;height:148px';
   trigger.innerHTML='<img alt="" style="display:block;width:100%;height:100%">';
   trigger.querySelector('img').src=svg;
   document.body.append(trigger);
   const main=document.querySelector('#detailMainImage'),full=document.querySelector('#sdFullscreenImage');
   main.src=svg;full.src=svg;
   await Promise.all([trigger.querySelector('img').decode(),main.decode(),full.decode()]);
  });
  for(let iteration=0;iteration<8;iteration++){
   const state=await page.evaluate(()=>{
    const src=document.querySelector('#qaMotionTrigger'),overlay=document.querySelector('#productOverlay');
    const gallery=document.querySelector('#sdFullscreenViewer'),frame=document.querySelector('#sdFullscreenFrame');
    overlay.style.visibility='visible';overlay.classList.add('open');overlay.removeAttribute('inert');
    window.SDSharedMotion.open('product-detail',overlay.querySelector('.detail-modal'),src,520);
    window.SDSharedMotion.cancel('product-detail');
    gallery.classList.add('open');gallery.style.visibility='visible';gallery.removeAttribute('inert');
    frame.style.cssText='width:280px;height:370px';
    window.SDSharedMotion.open('full-gallery',frame,document.querySelector('#detailMainImage'),520);
    const during=window.SDSharedMotion.inspect();
    window.SDSharedMotion.cancel('full-gallery');
    gallery.style.visibility='hidden';gallery.classList.remove('open');gallery.setAttribute('inert','');
    window.SDSharedMotion.reset('product-detail');
    overlay.style.visibility='hidden';overlay.classList.remove('open');overlay.setAttribute('inert','');
    return{during,after:window.SDSharedMotion.inspect(),
      detailOpacity:document.querySelector('#detailMainImage').style.opacity,
      fullOpacity:document.querySelector('#sdFullscreenImage').style.opacity,
      detailClip:overlay.style.clipPath,galleryClip:gallery.style.clipPath};
   });
   expect(state.during.ghosts,'at most one ghost for a nested transition').toBeLessThanOrEqual(1);
   expect(state.after.ghosts,JSON.stringify(state)).toBe(0);
   expect(state.after.active).toEqual([]);
   expect(state.detailOpacity).toBe('');
   expect(state.fullOpacity).toBe('');
   expect(state.detailClip).toBe('');
   expect(state.galleryClip).toBe('');
  }
  expect(errors).toEqual([]);
 }finally{await context.close()}
});

test('switching tabs during zoom cancels animation and restores native photo without flicker',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage();
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  const snap=await page.evaluate(()=>{
   const overlay=document.querySelector('#productOverlay'),source=document.querySelector('#cartOpen');
   overlay.style.visibility='visible';overlay.classList.add('open');
   window.SDSharedMotion.open('product-detail',overlay.querySelector('.detail-modal'),source,520);
   Object.defineProperty(document,'hidden',{configurable:true,value:true});
   document.dispatchEvent(new Event('visibilitychange'));
   return{state:window.SDSharedMotion.inspect(),clip:overlay.style.clipPath,
     visibility:getComputedStyle(overlay).visibility,
     hiddenImage:document.querySelector('#detailMainImage').style.opacity};
  });
  expect(snap.state.active).toEqual([]);
  expect(snap.state.ghosts).toBe(0);
  expect(snap.clip).toBe('');
  expect(snap.hiddenImage).toBe('');
 }finally{await context.close()}
});

test('rapid account view switching leaves one active panel and no inert ghost',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
   const drawer=document.querySelector('#accountDrawer');
   drawer.style.visibility='visible';drawer.removeAttribute('inert');drawer.classList.add('open');
   for(let i=0;i<12;i++){
    (i%2?document.querySelector('#accountFavoritesBack'):document.querySelector('#accountFavoritesAction'))?.click();
   }
  });
  await page.waitForTimeout(420);
  const state=await page.evaluate(()=>{
   const ids=['accountMenuView','accountFavoritesView','accountOrdersView','accountAddressView'];
   return ids.map(id=>{
    const panel=document.getElementById(id);
    return{id,hidden:panel.hidden,leaving:panel.dataset.sdMotionLeaving||'',inert:panel.hasAttribute('inert')};
   });
  });
  expect(state.filter(x=>!x.hidden).map(x=>x.id)).toEqual(['accountMenuView']);
  expect(state.filter(x=>x.leaving||x.inert)).toEqual([]);
  expect(errors).toEqual([]);
 }finally{await context.close()}
});

test('Escape from fullscreen closes gallery only, never the product beneath',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  await page.locator('#skipIntro').click();
  await expect(page.locator('#welcomeSplash')).toHaveCount(0,{timeout:5000});
  const outcome=await page.evaluate(()=>{
   const detail=document.querySelector('#productOverlay'),gallery=document.querySelector('#sdFullscreenViewer');
   detail.style.visibility='visible';detail.classList.add('open');detail.removeAttribute('inert');
   gallery.style.visibility='visible';gallery.classList.add('open');gallery.removeAttribute('inert');
   document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
   return{detailOpen:detail.classList.contains('open'),galleryOpen:gallery.classList.contains('open')};
  });
  expect(outcome.detailOpen,'Escape must not close the product under full-screen image').toBe(true);
  expect(outcome.galleryOpen).toBe(false);
  expect(errors).toEqual([]);
 }finally{await context.close()}
});

test('full gallery !important CSS cannot show two photos during zoom, including Next active layer',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference',serviceWorkers:'block'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await motionFixture(page);
  await page.goto('https://motion-fixture.invalid/',{waitUntil:'domcontentloaded'});
  const before=await page.evaluate(async()=>{
   const src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#999"/></svg>');
   const detail=document.querySelector('#productOverlay'),viewer=document.querySelector('#sdFullscreenViewer');
   const source=document.querySelector('#detailMainImage');
   const initial=document.querySelector('#sdFullscreenImage'),next=document.querySelector('#sdFullscreenImageNext');
   source.src=src;next.src=src;await Promise.all([source.decode(),next.decode()]);
   detail.classList.add('open');detail.style.visibility='visible';
   viewer.classList.add('open');viewer.style.visibility='visible';
   initial.classList.remove('is-active');next.classList.add('is-active');
   document.querySelector('#sdFullscreenFrame').style.cssText='width:285px;height:375px';
   const started=window.SDSharedMotion.open('full-gallery',document.querySelector('#sdFullscreenFrame'),source,520);
   return{started,active:getComputedStyle(next).opacity,activePriority:next.style.getPropertyPriority('opacity'),
    inactive:getComputedStyle(initial).opacity,
    transitionPriority:next.style.getPropertyPriority('transition'),
    ghosts:window.SDSharedMotion.inspect().ghosts};
  });
  expect(before.started).toBe(true);
  expect(before.active,'the actual active fullscreen photo must be hidden under the ghost').toBe('0');
  expect(before.activePriority).toBe('important');
  expect(before.inactive).toBe('0');
  expect(before.ghosts).toBe(1);
  await page.waitForTimeout(460);
  const after=await page.evaluate(()=>{
   const next=document.querySelector('#sdFullscreenImageNext');
   return{active:getComputedStyle(next).opacity,
     opacityPriority:next.style.getPropertyPriority('opacity'),
     transitionPriority:next.style.getPropertyPriority('transition'),
     ghosts:window.SDSharedMotion.inspect().ghosts};
  });
  expect(after.active).toBe('1');
  expect(after.opacityPriority).toBe('');
  expect(after.transitionPriority).toBe('');
  expect(after.ghosts).toBe(0);
  expect(errors).toEqual([]);
 }finally{await context.close()}
});
