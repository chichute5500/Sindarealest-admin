import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

test.use({serviceWorkers:'block'});
const url=process.env.SD_PAYMENT_PREVIEW_URL;
const output='artifacts/storefront-payment-preview';
mkdirSync(output,{recursive:true});
if(!url)throw Error('SD_PAYMENT_PREVIEW_URL is required; this spec is for the deployed Preview only.');

async function swipeToConfirmPayment(page){
 const slider=page.locator('#sdCheckoutConfirmRange'),box=await slider.boundingBox();
 if(!box)throw new Error('Payment confirmation slider is not visible');
 const y=box.y+box.height/2;
 await page.mouse.move(box.x+Math.min(24,box.width*.08),y);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width-Math.min(24,box.width*.08),y,{steps:16});
 await page.mouse.up();
}

test('real Preview checkout: deposit/full amounts, all requested viewports and both themes, no payment receipt writes',async({page})=>{
 const headers={};
 if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET){
  headers['CF-Access-Client-Id']=process.env.CF_ACCESS_CLIENT_ID;
  headers['CF-Access-Client-Secret']=process.env.CF_ACCESS_CLIENT_SECRET;
  const previewOrigin=new URL(url).origin;
  await page.route('**/*',async route=>{
   if(new URL(route.request().url()).origin===previewOrigin)
    await route.continue({headers:{...route.request().headers(),...headers}});
   else await route.continue();
  });
 }
 const errors=[],writes=[],createdOrders=[];let paymentRefreshReads=0;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{const path=new URL(request.url()).pathname;if(path==='/api/order-payment'&&request.method()==='GET')paymentRefreshReads++;if(path==='/api/orders'&&request.method()==='POST')createdOrders.push(request.postDataJSON());if(request.url().includes('/api/')&&!['GET','HEAD'].includes(request.method()))writes.push(request.method()+' '+path)});
 await page.addInitScript(()=>localStorage.setItem('sd-shipping-address',JSON.stringify({fullName:'Khách kiểm tra Preview',phone:'0900000000',email:'',province:'Thành phố Hồ Chí Minh',provinceCode:'79',ward:'Phường Bà Rịa',wardCode:'26560',streetAddress:'Địa chỉ thử nghiệm Preview'})));
 // Keep address selection deterministic in the isolated Preview browser run; the payment/order API remains real.
 let divisionRequests=0;
 await page.route('https://provinces.open-api.vn/api/v2/p/**',async route=>{
  divisionRequests++;
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':route.request().headers()['access-control-request-headers']||'*','Access-Control-Max-Age':'86400'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:cors});return}
  const requestUrl=new URL(route.request().url());
  const payload=requestUrl.searchParams.has('depth')
   ?{code:79,name:'Thành phố Hồ Chí Minh',wards:[{code:26560,name:'Phường Bà Rịa'}]}
   :[{code:79,name:'Thành phố Hồ Chí Minh'}];
  await route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(payload)});
 });
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 expect(response?.status()).toBe(200);
 await expect(page.locator('.nav .brand-symbol')).toBeVisible();
 await expect.poll(()=>page.locator('.nav .brand-symbol').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
 const welcome=page.locator('#welcomeSplash');
 if(await welcome.count())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 const cards=page.locator('#catalogGrid .product-card').filter({hasText:'Giá:'});
 await expect(cards.first()).toBeVisible({timeout:20000});
 const productCard=cards.first(),productLink=productCard.locator('[data-open-product]').first();
 const secondCartProductCard=cards.nth(1);
 await expect(secondCartProductCard).toBeVisible();
 await secondCartProductCard.locator('[data-add]').click();
 if(await page.locator('#productOverlay.open').count()){
  const seedCartOption=page.locator('#detailVariants .sd-product-option-chip:not(:disabled)').first();
  if(await seedCartOption.count())await seedCartOption.click();
  await page.locator('#detailAdd').click();
  await page.locator('#detailClose').click();
 }
 const productId=await productLink.getAttribute('data-open-product');
 await productLink.click();
 await expect(page.locator('#productOverlay')).toHaveClass(/open/);
 const detailOption=page.locator('#detailVariants .sd-product-option-chip:not(:disabled)').first();
 if(await detailOption.count())await detailOption.click();
 await expect(page.locator('#sdDetailPaymentQuote [data-detail-payment-option="deposit"]')).toBeVisible({timeout:15000});
 await page.locator('#sdDetailPaymentQuote [data-detail-payment-option="deposit"]').click();
 await page.locator('#detailBuyNow').click();
 await expect(page.locator('#checkoutDrawer')).toHaveClass(/open/);
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible({timeout:15000});
 expect(divisionRequests).toBeGreaterThan(0);
 await expect(page.locator('#sdCheckoutShippingStep')).toBeHidden();
 await expect(page.locator('#checkoutDrawer input[name="fullName"]')).toHaveValue('Khách kiểm tra Preview');
 await expect(page.locator('#checkoutDrawer input[name="phone"]')).toHaveValue('0900000000');
 await expect(page.locator('#checkoutStreet')).toHaveValue('Địa chỉ thử nghiệm Preview');
 const options=page.locator('#sdCheckoutOptions [data-sd-payment-option]');
 await expect(options).toHaveCount(2,{timeout:15000});
 await expect(page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]')).toHaveAttribute('aria-checked','true');
 await expect(page.locator('#checkoutSubmit')).toHaveText('Tiến hành thanh toán →');
 const buyNowTotal=Number((await page.locator('#sdCheckoutGrossTotal').innerText()).replace(/\D/g,''));
 expect(Number.isSafeInteger(buyNowTotal)&&buyNowTotal>0).toBe(true);
 const buyNowDeposit=Math.ceil(buyNowTotal*.3/100000)*100000;
 const cartTotal=buyNowTotal;
 const cartFullAmount=cartTotal-Math.round(cartTotal*.05);
 await page.emulateMedia({colorScheme:'light'});
 await expect(page.locator('html')).not.toHaveClass(/dark/);

 for(const [width,height] of [[360,800],[390,844],[768,1024],[1440,900]]){
  await page.setViewportSize({width,height});
  for(const theme of ['light','dark']){
   await page.emulateMedia({colorScheme:theme});
   if(theme==='dark')await expect(page.locator('html')).toHaveClass(/dark/);
   else await expect(page.locator('html')).not.toHaveClass(/dark/);
   await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
   await expect(page.locator('#sdCheckoutSelectedAmount')).toContainText(buyNowDeposit.toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutRemaining')).toContainText((buyNowTotal-buyNowDeposit).toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutDiscount')).toContainText('Không áp dụng');
   await expect(page.locator('#sdCheckoutQrWrap')).toBeHidden();
   await page.screenshot({path:join(output,`${width}x${height}-${theme}-buy-now-deposit.png`),fullPage:false,animations:'disabled'});
   await page.locator('#sdCheckoutOptions [data-sd-payment-option="full"]').click();
   await expect(page.locator('#sdCheckoutSelectedAmount')).toContainText(cartFullAmount.toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutDiscount')).toContainText(Math.round(cartTotal*.05).toLocaleString('vi-VN'));
   await expect(page.locator('#sdCheckoutRemaining')).toContainText('0');
   await expect(page.locator('#sdCheckoutQrWrap')).toBeHidden();
   await page.screenshot({path:join(output,`${width}x${height}-${theme}-buy-now-full.png`),fullPage:false,animations:'disabled'});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   expect(overflow,`horizontal overflow at ${width}x${height} ${theme}`).toBe(false);
  }
 }
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
 await expect(page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]')).toHaveAttribute('aria-checked','true');
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
 const assertVerifiedQr=async()=>{
  await expect(qrWrap,'Preview must provide a verified QR for the selected payment option').toBeVisible({timeout:15000});
  await expect.poll(()=>page.locator('#sdCheckoutQrImage').evaluate(image=>image.naturalWidth),{timeout:15000}).toBeGreaterThan(0);
  await expect(page.locator('#sdCheckoutBankName')).not.toBeEmpty();
  await expect(page.locator('#sdCheckoutAccountNumber')).not.toBeEmpty();
  await expect(page.locator('#sdCheckoutTransferContent')).toContainText('SD-');
  await expect(page.locator('#sdCheckoutSaveQr')).toBeVisible();
  await expect(page.locator('#sdCheckoutOpenBank')).toHaveCount(0);
  await expect(page.locator('#sdCheckoutConfirmRange')).toBeVisible();
  await expect(page.locator('#sdCheckoutConfirmNote')).toContainText('Shop sẽ đối chiếu giao dịch');
 };
 await assertVerifiedQr();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:join(output,'390x844-buy-now-deposit-qr-step.png'),fullPage:false,animations:'disabled'});
 const writesBeforeDepositSwipe=writes.length;
 await swipeToConfirmPayment(page);
 expect(writes).toHaveLength(writesBeforeDepositSwipe);
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toContainText('MÃ ĐƠN HÀNG');
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Mã đơn hàng');
 await expect(page.locator('#sdCheckoutStepSubtitle')).toHaveText('Lưu mã đơn bên dưới để theo dõi tiến độ. Shop sẽ cập nhật khi đã nhận thanh toán.');
 await page.screenshot({path:join(output,'390x844-buy-now-deposit-order-code.png'),fullPage:false,animations:'disabled'});
 const buyNowOrderNumber=(await page.locator('#paymentInstructions .sd-order-reference strong').innerText()).trim();
 const buyNowItems=createdOrders.at(-1)?.items||[];
 expect(buyNowItems).toHaveLength(1);
 expect(buyNowItems[0].id).toBe(productId);
 expect(buyNowItems[0].quantity).toBe(1);
 await page.locator('#sdCheckoutDone').click();
 await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);

 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 const buyNowAccountOrder=page.locator('#accountOrdersList [data-order-number="'+buyNowOrderNumber+'"]');
 await expect(buyNowAccountOrder).toContainText('Chờ thanh toán');
 const refreshResponsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/order-payment'&&response.request().method()==='GET');
 await buyNowAccountOrder.locator('[data-order-payment-check]').click();
 const refreshResponse=await refreshResponsePromise;
 expect(refreshResponse.ok(),'Shop payment refresh should return successfully').toBe(true);
 const refreshed=await refreshResponse.json();
 expect(refreshed.orderNumber).toBe(buyNowOrderNumber);
 expect(refreshed.paymentSummary.netReceivedAmount).toBe(0);
 expect(refreshed.paymentSummary.shortfall).toBeGreaterThan(0);
 expect(refreshed.paymentSummary.eligibleToShip).toBe(false);
 await expect.poll(()=>paymentRefreshReads).toBe(1);
 await expect(buyNowAccountOrder.locator('.local-order-payment>strong')).toHaveText('Shop chưa xác nhận nhận tiền');
 await expect(buyNowAccountOrder).not.toContainText('Đủ điều kiện');
 await expect(buyNowAccountOrder.locator('.local-order-delivery')).toHaveCount(0);
 await page.locator('#accountClose').click();

 for(const card of [productCard,secondCartProductCard]){
  await card.locator('[data-add]').click();
  if(await page.locator('#productOverlay.open').count()){
   const cartDetailOption=page.locator('#detailVariants .sd-product-option-chip:not(:disabled)').first();
   if(await cartDetailOption.count())await cartDetailOption.click();
   await page.locator('#detailAdd').click();
   await page.locator('#detailClose').click();
  }
 }
 await page.locator('#cartOpen').click();
 await expect(page.locator('#cartList [data-cart-pick]')).toHaveCount(2);
 const cartPickValues=await page.locator('#cartList [data-cart-pick]').evaluateAll(nodes=>nodes.map(node=>node.dataset.cartPick));
 const selectedCartItemId=cartPickValues[1].split('::')[0];
 await page.locator('#cartList [data-cart-pick]').first().uncheck();
 await expect(page.locator('#cartCheckout')).toContainText('1 sản phẩm');
 await expect(page.locator('#cartCheckout')).toBeEnabled();
 const cartQuoteResponsePromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/checkout-quote'&&response.request().method()==='POST');
 await page.locator('#cartCheckout').click();
 await expect(page.locator('#checkoutDrawer')).toHaveClass(/open/);
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible({timeout:15000});
 await expect(page.locator('#sdCheckoutShippingStep')).toBeHidden();
 await expect(page.locator('#checkoutDrawer input[name="fullName"]')).toHaveValue('Khách kiểm tra Preview');
 const cartQuoteResponse=await cartQuoteResponsePromise;
 expect(cartQuoteResponse.ok(),'Selected-cart price quote should return successfully').toBe(true);
 const cartQuote=await cartQuoteResponse.json();
 expect(cartQuote.quoteReady,cartQuote.reason||'Selected-cart quote should be ready').toBe(true);
 expect(Number.isSafeInteger(cartQuote.total)&&cartQuote.total>0).toBe(true);
 const cartOptions=page.locator('#sdCheckoutOptions [data-sd-payment-option]');
 await expect(cartOptions).toHaveCount(2,{timeout:15000});
 const actualCartTotal=Number((await page.locator('#sdCheckoutGrossTotal').innerText()).replace(/\D/g,''));
 expect(actualCartTotal).toBe(cartQuote.total);
 const expectedCartFullAmount=actualCartTotal-Math.round(actualCartTotal*.05);
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="full"]').click();
 await expect(page.locator('#sdCheckoutSelectedAmount')).toContainText(expectedCartFullAmount.toLocaleString('vi-VN'));
 await expect(page.locator('#sdCheckoutDiscount')).toContainText(Math.round(actualCartTotal*.05).toLocaleString('vi-VN'));
 await expect(page.locator('#sdCheckoutRemaining')).toContainText('0');
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#paymentInstructions')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-payment-transfer-stage')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeHidden();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Chờ thanh toán');
 await expect(page.locator('#paymentInstructions')).toContainText('Thanh toán hết · giảm 5%');
 await expect(page.locator('#paymentInstructions')).toContainText(Math.round(actualCartTotal*.05).toLocaleString('vi-VN'));
 await expect(page.locator('#paymentInstructions')).not.toContainText('Đã thanh toán');
 await assertVerifiedQr();
 await page.screenshot({path:join(output,'390x844-cart-full-qr-step.png'),fullPage:false,animations:'disabled'});
 const writesBeforeFullSwipe=writes.length;
 await swipeToConfirmPayment(page);
 expect(writes).toHaveLength(writesBeforeFullSwipe);
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeVisible();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Mã đơn hàng');
 const cartFullOrderNumber=(await page.locator('#paymentInstructions .sd-order-reference strong').innerText()).trim();
 await page.screenshot({path:join(output,'390x844-cart-full-order-code.png'),fullPage:false,animations:'disabled'});
 await page.locator('#sdCheckoutDone').click();
 await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);

 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 const cartFullAccountOrder=page.locator('#accountOrdersList [data-order-number="'+cartFullOrderNumber+'"]');
 await expect(cartFullAccountOrder).toContainText('Chờ thanh toán');
 const cartRefreshPromise=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/order-payment'&&response.request().method()==='GET');
 await cartFullAccountOrder.locator('[data-order-payment-check]').click();
 const cartRefreshResponse=await cartRefreshPromise;
 expect(cartRefreshResponse.ok(),'Shop payment refresh should return successfully for full payment').toBe(true);
 const cartRefreshed=await cartRefreshResponse.json();
 expect(cartRefreshed.orderNumber).toBe(cartFullOrderNumber);
 expect(cartRefreshed.paymentSummary.netReceivedAmount).toBe(0);
 expect(cartRefreshed.paymentSummary.shortfall).toBeGreaterThan(0);
 expect(cartRefreshed.paymentSummary.eligibleToShip).toBe(false);
 await expect.poll(()=>paymentRefreshReads).toBe(2);
 await expect(cartFullAccountOrder.locator('.local-order-payment>strong')).toHaveText('Shop chưa xác nhận nhận tiền');
 await expect(cartFullAccountOrder).not.toContainText('Đủ điều kiện');
 await expect(cartFullAccountOrder.locator('.local-order-delivery')).toHaveCount(0);
 await page.reload({waitUntil:'domcontentloaded'});
 const reloadWelcome=page.locator('#welcomeSplash');
 if(await reloadWelcome.count()&&await reloadWelcome.isVisible())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 const reloadedBuyNowOrder=page.locator('#accountOrdersList [data-order-number="'+buyNowOrderNumber+'"]');
 const reloadedCartFullOrder=page.locator('#accountOrdersList [data-order-number="'+cartFullOrderNumber+'"]');
 await expect(reloadedBuyNowOrder.locator('.local-order-payment>strong')).toHaveText('Shop chưa xác nhận nhận tiền');
 await expect(reloadedBuyNowOrder).not.toContainText('Đủ điều kiện');
 await expect(reloadedBuyNowOrder.locator('.local-order-delivery')).toHaveCount(0);
 await expect(reloadedCartFullOrder.locator('.local-order-payment>strong')).toHaveText('Shop chưa xác nhận nhận tiền');
 await expect(reloadedCartFullOrder).not.toContainText('Đủ điều kiện');
 await expect(reloadedCartFullOrder.locator('.local-order-delivery')).toHaveCount(0);
 await page.locator('#accountClose').click();
 await page.locator('#sdTrackInput').fill(buyNowOrderNumber);
 await page.locator('#sdTrackSubmit').click();
 const trackedBuyNowOrder=page.locator('#sdTrackResults .sd-track-order');
 await expect(trackedBuyNowOrder).toBeVisible();
 await expect(trackedBuyNowOrder.locator('.sd-track-step')).toHaveCount(5);
 await expect(trackedBuyNowOrder).toContainText('Nhận cọc & xác nhận đơn');
 await expect(trackedBuyNowOrder).not.toContainText('Đã nhận cọc');
 await expect(trackedBuyNowOrder.locator('.sd-track-order-head')).toContainText('Chờ nhận cọc');
 await page.locator('#sdTrackInput').fill(cartFullOrderNumber);
 await page.locator('#sdTrackSubmit').click();
 const trackedCartFullOrder=page.locator('#sdTrackResults .sd-track-order');
 await expect(trackedCartFullOrder).toBeVisible();
 await expect(trackedCartFullOrder.locator('.sd-track-step')).toHaveCount(5);
 await expect(trackedCartFullOrder).toContainText('Nhận đủ tiền & xác nhận đơn');
 await expect(trackedCartFullOrder).not.toContainText('Đã nhận thanh toán');
 await expect(trackedCartFullOrder.locator('.sd-track-order-head')).toContainText('Chờ thanh toán');
 expect(createdOrders).toHaveLength(2);
 expect(createdOrders[0].paymentOption).toBe('deposit');
 expect(createdOrders[0].items).toHaveLength(1);
 expect(createdOrders[0].items[0].id).toBe(productId);
 expect(createdOrders[1].paymentOption).toBe('full');
 expect(createdOrders[1].items).toHaveLength(1);
 expect(createdOrders[1].items[0].id).toBe(selectedCartItemId);
 expect(writes.filter(path=>path==='POST /api/orders'),'Exactly two isolated Preview orders should be created').toHaveLength(2);
 expect(writes.every(path=>path==='POST /api/checkout-quote'||path==='POST /api/orders'||path==='POST /api/order-tracking'),'Only the isolated Preview order and public tracking lookup may be written').toBe(true);
 expect(errors,'Preview should have no browser runtime errors').toEqual([]);
});
