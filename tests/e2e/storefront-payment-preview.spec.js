import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

test.use({serviceWorkers:'block'});
const url=process.env.SD_PAYMENT_PREVIEW_URL;
const output='artifacts/storefront-payment-preview';
mkdirSync(output,{recursive:true});
if(!url)throw Error('SD_PAYMENT_PREVIEW_URL is required; this spec is for the deployed Preview only.');

test('real Preview checkout: deposit/full amounts, all requested viewports and both themes, no payment receipt writes',async({page})=>{
 const headers={};
 if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET){
  headers['CF-Access-Client-Id']=process.env.CF_ACCESS_CLIENT_ID;
  headers['CF-Access-Client-Secret']=process.env.CF_ACCESS_CLIENT_SECRET;
  await page.context().setExtraHTTPHeaders(headers);
 }
 const errors=[],writes=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(request.url().includes('/api/')&&!['GET','HEAD'].includes(request.method()))writes.push(request.method()+' '+new URL(request.url()).pathname)});
 // Keep address selection deterministic in the isolated Preview browser run; the payment/order API remains real.
 await page.route('https://provinces.open-api.vn/api/v2/p/**',async route=>{
  const requestUrl=new URL(route.request().url());
  const payload=requestUrl.searchParams.has('depth')
   ?{code:79,name:'Thành phố Hồ Chí Minh',wards:[{code:26560,name:'Phường Bà Rịa'}]}
   :[{code:79,name:'Thành phố Hồ Chí Minh'}];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
 });
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 expect(response?.status()).toBe(200);
 const welcome=page.locator('#welcomeSplash');
 if(await welcome.count())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 const cards=page.locator('#catalogGrid .product-card').filter({hasText:'Giá:'});
 await expect(cards.first()).toBeVisible({timeout:20000});
 await cards.first().locator('[data-add]').click();
 if(await page.locator('#productOverlay.open').count()){
  const option=page.locator('#detailVariants .sd-product-option-chip:not(:disabled)').first();
  if(await option.count())await option.click();
  await page.locator('#detailAdd').click();
  await page.locator('#detailClose').click();
 }
 await page.locator('#cartOpen').click();
 await expect(page.locator('#cartCheckout')).toBeEnabled();
 await page.locator('#cartCheckout').click();
 await expect(page.locator('#checkoutDrawer')).toHaveClass(/open/);

 await page.locator('#checkoutDrawer input[name="fullName"]').fill('Khách kiểm tra Preview');
 await page.locator('#checkoutDrawer input[name="phone"]').fill('0900000000');
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
   await expect(page.locator('#sdCheckoutDiscount')).toContainText('Không áp dụng');
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
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#sdCheckoutReviewStep')).toBeVisible();
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#paymentInstructions')).toBeVisible();
 await expect(page.locator('#checkoutMessage')).toContainText('Mã yêu cầu');
 await expect(page.locator('#paymentInstructions')).toContainText('Chờ Shop xác nhận');
 await expect(page.locator('#paymentInstructions')).not.toContainText('Đã thanh toán');
 expect(writes,'Only quote and the isolated Preview test order may be written; no payment receipt is created').toEqual(['POST /api/checkout-quote','POST /api/orders']);
 expect(errors,'Preview should have no browser runtime errors').toEqual([]);
});
