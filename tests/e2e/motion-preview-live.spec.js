import {test,expect} from '@playwright/test';

const preview=process.env.SD_MOTION_PREVIEW_URL;
if(!preview)throw new Error('SD_MOTION_PREVIEW_URL is required');

test('actual Preview: product image moves from card without squashing and glass stays native',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(preview,{waitUntil:'domcontentloaded',timeout:35000});
 const welcome=page.locator('#welcomeSplash');
 if(await welcome.count()){
  await page.locator('#skipIntro').click({timeout:15000});
  await expect(welcome).toHaveCount(0,{timeout:15000});
 }
 await expect(page.locator('#productOverlay')).toHaveCount(1);
 await expect.poll(()=>page.locator('[data-open-product]:visible').count(),{timeout:30000}).toBeGreaterThan(0);
 const card=page.locator('[data-open-product]:visible').first();
 await card.scrollIntoViewIfNeeded();
 const sourceImg=card.locator('img').first();
 await expect.poll(()=>sourceImg.evaluate(img=>img.complete&&img.naturalWidth>0),{timeout:20000}).toBe(true);

 const entered=await card.evaluate(node=>{
  const r=node.getBoundingClientRect();
  node.click();
  const overlay=document.querySelector('#productOverlay');
  const clone=document.querySelector('.sd-shared-image-clone');
  const motion=overlay?.getAnimations().find(a=>a.effect?.getTiming().duration>=300&&a.effect?.getTiming().duration<=375);
  const frames=clone?.getAnimations()[0]?.effect?.getKeyframes();
  return{
   source:{x:r.left,y:r.top,w:r.width,h:r.height},
   opened:overlay?.classList.contains('open'),
   blur:getComputedStyle(overlay,'::before').backdropFilter,
   clipFrames:motion?.effect?.getKeyframes(),
   photoTransform:frames?.[0]?.transform,
   photoClones:document.querySelectorAll('.sd-shared-image-clone').length,
   bodyScale:getComputedStyle(overlay.querySelector('.detail-modal')).transform
  };
 });
 expect(entered.opened,JSON.stringify(entered)).toBe(true);
 expect(entered.blur).toContain('blur(');
 expect(entered.clipFrames?.[0]?.clipPath).toContain('inset(');
 expect(entered.photoClones,JSON.stringify(entered)).toBe(1);
 expect(entered.photoTransform).toMatch(/scale\([0-9.]+\)/);
 expect(entered.photoTransform).not.toMatch(/scaleX|scaleY/);
 await page.waitForTimeout(140);
 await page.screenshot({path:testInfo.outputPath('actual-detail-mid-transition.png'),animations:'allow'});
 await expect(page.locator('.sd-shared-image-clone')).toHaveCount(0,{timeout:1500});
 await expect(page.locator('#productOverlay')).toHaveCSS('clip-path','none');
 await page.screenshot({path:testInfo.outputPath('actual-detail-settled.png')});
 
 await page.locator('#detailZoom').click();
 await expect(page.locator('#sdFullscreenViewer')).toBeVisible();
 const gallery=await page.evaluate(()=>{
   const viewer=document.querySelector('#sdFullscreenViewer');
   const photo=document.querySelector('#sdFullscreenImage');
   return{
     blur:getComputedStyle(viewer).backdropFilter,
     frameWidth:document.querySelector('#sdFullscreenFrame')?.getBoundingClientRect().width,
     imageRatio:photo?.getBoundingClientRect().width/photo?.getBoundingClientRect().height,
     mask:viewer.getAnimations().some(a=>a.effect?.getKeyframes().some(f=>f.clipPath?.includes('inset(')))
   };
 });
 expect(gallery.frameWidth,JSON.stringify(gallery)).toBeGreaterThan(80);
 expect(gallery.imageRatio).toBeGreaterThan(0);
 expect(gallery.mask).toBe(true);
 await expect(page.locator('#sdFullscreenViewer')).toHaveCSS('clip-path','none',{timeout:1600});
 await page.screenshot({path:testInfo.outputPath('actual-gallery-settled.png')});
 await page.locator('#sdFullscreenClose').click();
 await expect(page.locator('#sdFullscreenViewer')).toBeHidden({timeout:2500});
 await page.locator('#detailClose').click();
 await expect(page.locator('#productOverlay')).toBeHidden({timeout:2500});
 expect(errors,'no JS error in actual deployed Preview').toEqual([]);
});
