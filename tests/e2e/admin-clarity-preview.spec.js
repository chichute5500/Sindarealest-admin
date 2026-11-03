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
  await expect(page.locator('#main .sd-order-overview-heading .status')).toHaveCount(1);
  await expect(page.locator('#main .sd-order-buyer-name strong')).not.toBeEmpty();
  await expect(page.locator('#main .sd-order-buyer-phone')).toBeVisible();
  await expect(page.locator('#main .sd-order-buyer-address')).toBeVisible();
  await expect(page.locator('#main .pagehead .sd-order-number strong')).toBeVisible();
 }
 expect(errors,'Browser must not throw rendering exceptions').toEqual([]);
});
