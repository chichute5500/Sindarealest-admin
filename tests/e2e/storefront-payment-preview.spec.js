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
 const errors=[],writes=[];let paymentRefreshReads=0;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{const path=new URL(request.url()).pathname;if(path==='/api/order-payment'&&request.method()==='GET')paymentRefreshReads++;if(request.url().includes('/api/')&&!['GET','HEAD'].includes(request.method()))writes.push(request.method()+' '+path)});
 await page.addInitScript(()=>localStorage.setItem('sd-shipping-address',JSON.stringify({fullName:'Khách kiểm tra Preview',phone:'0900000000',email:'',province:'Thành phố Hồ Chí Minh',provinceCode:'79',ward:'Phường Bà Rịa',wardCode:'26560',streetAddress:'Địa chỉ thử nghiệm Preview'})));
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
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible();
 await expect(page.locator('#sdCheckoutShippingStep')).toBeHidden();
 await expect(page.locator('#checkoutDrawer input[name="fullName"]')).toHaveValue('Khách kiểm tra Preview');
 await expect(page.locator('#checkoutDrawer input[name="phone"]')).toHaveValue('0900000000');
 await expect(page.locator('#checkoutStreet')).toHaveValue('Địa chỉ thử nghiệm Preview');
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
 await expect(page.locator('#paymentInstructions')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-payment-transfer-stage')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeHidden();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Chờ thanh toán');
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeHidden();
 await expect(page.locator('#paymentInstructions .sd-order-received-note')).toHaveText('Shop sẽ xác nhận đơn và bắt đầu làm hàng sau khi nhận đủ khoản thanh toán đã chọn.');
 await expect(page.locator('#paymentInstructions')).toContainText('Số tiền thanh toán khi nhận hàng');
 await expect(page.locator('#paymentInstructions')).not.toContainText('Đã thanh toán');
 const qrWrap=page.locator('#sdCheckoutQrWrap');
 if(await qrWrap.isVisible()){
  await expect.poll(()=>page.locator('#sdCheckoutQrImage').evaluate(image=>image.naturalWidth),{timeout:10000}).toBeGreaterThan(0);
  await expect(page.locator('#sdCheckoutBankName')).not.toBeEmpty();
  await expect(page.locator('#sdCheckoutAccountNumber')).not.toBeEmpty();
  await expect(page.locator('#sdCheckoutTransferContent')).toContainText('SD-');
  await expect(page.locator('#sdCheckoutSaveQr')).toBeVisible();
  await expect(page.locator('#sdCheckoutOpenBank')).toBeVisible();
 }else{
  await expect(page.locator('#paymentInstructions')).toContainText('QR chuyển khoản chưa sẵn sàng');
 }
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:join(output,'390x844-qr-step-before-order-code.png'),fullPage:false,animations:'disabled'});
 await page.locator('#sdCheckoutDone').click();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toContainText('MÃ ĐƠN HÀNG');
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Mã đơn hàng');
 await expect(page.locator('#sdCheckoutStepSubtitle')).toHaveText('Lưu mã đơn bên dưới để theo dõi tiến độ. Shop sẽ cập nhật khi đã nhận thanh toán.');
 await page.screenshot({path:join(output,'390x844-order-code-after-qr.png'),fullPage:false,animations:'disabled'});
 const orderNumber=(await page.locator('#paymentInstructions .sd-order-reference strong').innerText()).trim();
 await page.locator('#sdCheckoutDone').click();
 await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);

 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 const accountOrder=page.locator('#accountOrdersList [data-order-number="'+orderNumber+'"]');
 await expect(accountOrder).toContainText('Chờ thanh toán');
 const refreshResponsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/order-payment'&&response.request().method()==='GET');
 await accountOrder.locator('[data-order-payment-check]').click();
 const refreshResponse=await refreshResponsePromise;
 expect(refreshResponse.ok(),'Shop payment refresh should return successfully').toBe(true);
 const refreshed=await refreshResponse.json();
 expect(refreshed.orderNumber).toBe(orderNumber);
 expect(refreshed.paymentSummary.netReceivedAmount).toBe(0);
 expect(refreshed.paymentSummary.shortfall).toBeGreaterThan(0);
 expect(refreshed.paymentSummary.eligibleToShip).toBe(false);
 await expect.poll(()=>paymentRefreshReads).toBe(1);
 await expect(accountOrder.locator('.local-order-payment>strong')).toHaveText('Shop chưa xác nhận nhận tiền');
 await expect(accountOrder).not.toContainText('Đủ điều kiện');
 await expect(accountOrder.locator('.local-order-delivery')).toHaveCount(0);
 await page.reload({waitUntil:'domcontentloaded'});
 const reloadWelcome=page.locator('#welcomeSplash');
 if(await reloadWelcome.count()&&await reloadWelcome.isVisible())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 const reloadedOrder=page.locator('#accountOrdersList [data-order-number="'+orderNumber+'"]');
 await expect(reloadedOrder.locator('.local-order-payment>strong')).toHaveText('Shop chưa xác nhận nhận tiền');
 await expect(reloadedOrder).not.toContainText('Đủ điều kiện');
 await expect(reloadedOrder.locator('.local-order-delivery')).toHaveCount(0);
 await page.locator('#accountClose').click();
 await page.locator('#sdTrackInput').fill(orderNumber);
 await page.locator('#sdTrackSubmit').click();
 const trackedOrder=page.locator('#sdTrackResults .sd-track-order');
 await expect(trackedOrder).toBeVisible();
 await expect(trackedOrder.locator('.sd-track-step')).toHaveCount(5);
 await expect(trackedOrder).toContainText('Nhận cọc & xác nhận đơn');
 await expect(trackedOrder).not.toContainText('Xác nhận đơn');
 await expect(trackedOrder).not.toContainText('Đã nhận cọc');
 await expect(trackedOrder.locator('.sd-track-order-head')).toContainText('Chờ nhận cọc');
 expect(writes.filter(path=>path==='POST /api/orders'),'Only the isolated Preview order may be created').toHaveLength(1);
 expect(writes.every(path=>path==='POST /api/checkout-quote'||path==='POST /api/orders'||path==='POST /api/order-tracking'),'Only the isolated Preview order and public tracking lookup may be written').toBe(true);
 expect(errors,'Preview should have no browser runtime errors').toEqual([]);
});
