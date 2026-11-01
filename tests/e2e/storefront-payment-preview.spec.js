import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

test.use({serviceWorkers:'block'});
const url=process.env.SD_PAYMENT_PREVIEW_URL;
const output='artifacts/storefront-payment-preview';
mkdirSync(output,{recursive:true});
if(!url)throw Error('SD_PAYMENT_PREVIEW_URL is required; this spec is for the deployed Preview only.');

test('real Preview checkout: deposit/full amounts, all requested viewports and both themes, no payment/order writes',async({page})=>{
 const headers={};
 if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET){
  headers['CF-Access-Client-Id']=process.env.CF_ACCESS_CLIENT_ID;
  headers['CF-Access-Client-Secret']=process.env.CF_ACCESS_CLIENT_SECRET;
  await page.context().setExtraHTTPHeaders(headers);
 }
 const errors=[],writes=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(request.url().includes('/api/')&&!['GET','HEAD'].includes(request.method()))writes.push(request.method()+' '+new URL(request.url()).pathname)});
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 expect(response?.status()).toBe(200);
 const welcome=page.locator('#welcomeSplash');
 if(await welcome.count())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 const cards=page.locator('#catalogGrid .product-card').filter({hasText:'Giá:'});
 await expect(cards.first()).toBeVisible({timeout:20000});
 await cards.first().locator('[data-add]').click();
 if(await page.locator('#productOverlay.open').count())await page.locator('#detailClose').click();
 await page.locator('#cartOpen').click();
 await expect(page.locator('#cartCheckout')).toBeEnabled();
 await page.locator('#cartCheckout').click();
 await expect(page.locator('#checkoutDrawer')).toHaveClass(/open/);

 await page.locator('input[name="fullName"]').fill('Khách kiểm tra Preview');
 await page.locator('input[name="phone"]').fill('0900000000');
 await page.locator('#checkoutStreet').fill('Địa chỉ thử nghiệm Preview');
 const province=page.locator('#checkoutProvince');
 await expect.poll(()=>province.locator('option').count(),{timeout:15000}).toBeGreaterThan(1);
 await province.selectOption({index:1});
 const ward=page.locator('#checkoutWard');
 await expect.poll(()=>ward.locator('option').count(),{timeout:15000}).toBeGreaterThan(1);
 await ward.selectOption({index:1});
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible();
 const options=page.locator('#sdCheckoutOptions [data-sd-payment-option]');
 await expect(options).toHaveCount(2,{timeout:15000});
 const total=Number((await page.locator('#sdCheckoutGrossTotal').innerText()).replace(/\D/g,''));
 expect(Number.isSafeInteger(total)&&total>0).toBe(true);
 const deposit=Math.ceil(total*.3/100000)*100000;
 const full=total-Math.round(total*.05);
 await page.emulateMedia({colorScheme:'light'});
 await expect(page.locator('html')).not.toHaveClass(/dark/);

 for(const [width,height] of [[360,800],[390,844],[768,1024],[1440,900]]){
  await page.setViewportSize({width,height});
  for(const theme of ['light','dark']){
   await page.emulateMedia({colorScheme:theme});
   if(theme==='dark')await expect(page.locator('html')).toHaveClass(/dark/);
   else await expect(page.locator('html')).not.toHaveClass(/dark/);
   await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
   await expect(page.locator('#sdCheckoutSelectedAmount')).toContainText(deposit.toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutRemaining')).toContainText((total-deposit).toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutDiscount')).toContainText('0');
   await expect(page.locator('#sdCheckoutQrWrap')).toBeHidden();
   await page.screenshot({path:join(output,`${width}x${height}-${theme}-deposit.png`),fullPage:false,animations:'disabled'});
   await page.locator('#sdCheckoutOptions [data-sd-payment-option="full"]').click();
   await expect(page.locator('#sdCheckoutSelectedAmount')).toContainText(full.toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutDiscount')).toContainText(Math.round(total*.05).toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutRemaining')).toContainText('0');
   await expect(page.locator('#sdCheckoutQrWrap')).toBeHidden();
   await page.screenshot({path:join(output,`${width}x${height}-${theme}-full.png`),fullPage:false,animations:'disabled'});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   expect(overflow,`horizontal overflow at ${width}x${height} ${theme}`).toBe(false);
  }
 }
 expect(writes,'Preview may create exactly one isolated test order, but must not claim payment receipt').toEqual(['POST /api/orders']);
 expect(errors,'Preview should have no browser runtime errors').toEqual([]);
});
