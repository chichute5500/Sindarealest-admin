import {test,expect} from '@playwright/test';
const adminUrl=process.env.ADMIN_TEST_URL;
const password=process.env.ADMIN_TEST_PASSWORD;
test('Admin clarity — mobile dashboards, customers and orders use legible information',async({page})=>{
 if(!adminUrl||!password)throw Error('Isolated Preview credentials not provided');
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(adminUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#loginForm')).toBeVisible();
 await page.locator('#password').fill(password);
 await page.locator('#loginForm button[type="submit"]').click();
 await expect(page.locator('#appView')).toBeVisible({timeout:20000});
 await expect(page.locator('#main .sd-activity-feed')).toBeVisible();
 const feed=page.locator('#main .sd-activity-entry');
 if(await feed.count()){
  await expect(feed.first().locator('.sd-activity-entry-copy strong')).not.toBeEmpty();
  const text=await feed.first().innerText();
  expect(text).not.toMatch(/\bproduct_created\b|\border_updated\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
 }
 await page.goto(new URL('?view=customers',adminUrl).href,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#appView')).toBeVisible({timeout:20000});
 await expect(page.locator('#main .customer-list')).toBeVisible();
 const customer=page.locator('#main .customer-mobile-summary').first();
 if(await customer.count()){
  await expect(customer).toBeVisible();
  await expect(customer.locator('.customer-mobile-contact')).toBeVisible();
  await expect(customer.locator('.customer-mobile-metrics')).toBeVisible();
  await expect(customer.locator('details')).toHaveCount(0);
 }
 for(const width of [360,390,430]){
  await page.setViewportSize({width,height:width===360?800:width===390?844:932});
  await expect(page.locator('#main .customer-list')).toBeVisible();
  const metrics=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(metrics.pageWidth,'Mobile customer list must not create horizontal overflow at '+width).toBeLessThanOrEqual(metrics.viewport+2);
 }
 await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
 await expect(page.locator('#main .customer-list')).toBeVisible();
 await page.goto(new URL('?view=orders',adminUrl).href,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#appView')).toBeVisible({timeout:20000});
 await expect(page.locator('#main .sd-order-cards')).toBeVisible();
 const order=page.locator('#main .sd-order-card').first();
 if(await order.count()){
  await order.click();
  await expect(page.locator('#main .sd-order-detail-page')).toBeVisible();
  await expect(page.locator('#main .pagehead .sd-order-meta-state')).toHaveCount(1);
  await expect(page.locator('#main .sd-order-overview .status')).toHaveCount(0);
  await expect(page.locator('#main .sd-order-buyer-name strong')).not.toBeEmpty();
  await expect(page.locator('#main .sd-order-buyer-phone')).toBeVisible();
  await expect(page.locator('#main .sd-order-buyer-address')).toBeVisible();
  await expect(page.locator('#main .pagehead .sd-order-number strong')).toBeVisible();
  for(const width of [360,390,430]){
   await page.setViewportSize({width,height:width===360?800:width===390?844:932});
   const geometry=await page.evaluate(()=>{
    const rect=selector=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,top:r.top}};
    return {code:rect('#main .sd-order-number strong'),badge:rect('#main .sd-order-meta-state'),name:rect('#main .sd-order-buyer-name'),phone:rect('#main .sd-order-buyer-phone'),panel:rect('#main .sd-order-overview'),nameLabel:rect('#main .sd-order-buyer-name>span'),phoneLabel:rect('#main .sd-order-buyer-phone>span'),bodyWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   expect(geometry.code&&geometry.badge&&geometry.name&&geometry.phone,'All four order fields exist at '+width).toBeTruthy();
   expect(geometry.badge.x,'Status must sit to the right of order code at '+width).toBeGreaterThan(geometry.code.x);
   expect(Math.abs(geometry.badge.bottom-geometry.code.bottom),'Code and status share the same row at '+width).toBeLessThan(24);
   expect(Math.abs(geometry.name.top-geometry.phone.top),'Customer name and phone share the same row at '+width).toBeLessThan(3);
   expect(geometry.nameLabel.top-geometry.panel.top,'Customer name label needs top inset at '+width).toBeGreaterThanOrEqual(12);
   expect(geometry.phoneLabel.top-geometry.panel.top,'Phone label needs top inset at '+width).toBeGreaterThanOrEqual(12);
   expect(geometry.bodyWidth,'No mobile page overflow at '+width).toBeLessThanOrEqual(geometry.viewport+2);
  }

 }
 expect(errors,'Browser must not throw rendering exceptions').toEqual([]);
});


test('Admin dock stays stationary while scrolling and changing primary tabs on mobile',async({page})=>{
 if(!adminUrl||!password)throw Error('Isolated Preview credentials not provided');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 await page.goto(adminUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#loginForm')).toBeVisible();
 await page.locator('#password').fill(password);
 await page.locator('#loginForm button[type="submit"]').click();
 await expect(page.locator('#appView')).toBeVisible({timeout:20000});
 const dock=page.locator('body > nav.mobiletabs');
 await expect(dock).toBeVisible();
 for(const cfg of [
  {width:360,height:800,scheme:'light'},
  {width:390,height:844,scheme:'dark'},
  {width:430,height:932,scheme:'light'}
 ]){
  await page.setViewportSize({width:cfg.width,height:cfg.height});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  for(const view of ['dashboard','products','orders','customers']){
   await dock.locator('[data-view="'+view+'"]').click();
   await expect(dock.locator('[data-view="'+view+'"]')).toHaveClass(/active/);
   await page.evaluate(()=>{document.querySelector('#main').style.minHeight='1800px';window.scrollTo(0,0)});
   const initial=await dock.evaluate(el=>{
    const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
    return {top:rect.top,height:rect.height,width:rect.width,position:style.position,transform:style.transform};
   });
   expect(initial.position).toBe('fixed');
   expect(initial.transform).toBe('none');
   for(const y of [350,850,1500,0]){
    await page.evaluate(y=>{window.scrollTo({top:y,behavior:'instant'})},y);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const after=await dock.evaluate(el=>{
     const rect=el.getBoundingClientRect();
     return {top:rect.top,height:rect.height,width:rect.width};
    });
    expect(Math.abs(after.top-initial.top),cfg.width+'px '+view+': dock moved vertically while swiping').toBeLessThanOrEqual(1);
    expect(after.height,cfg.width+'px '+view+': dock height changed while scrolling').toBe(initial.height);
    expect(after.width,cfg.width+'px '+view+': dock width changed while scrolling').toBe(initial.width);
   }
  }
 }
 expect(errors,'Browser must not throw while scrolling or switching tabs').toEqual([]);
});
