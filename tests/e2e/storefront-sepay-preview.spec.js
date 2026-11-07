import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test.use({serviceWorkers:'block'});
const url=process.env.SD_PAYMENT_PREVIEW_URL;
const output='artifacts/storefront-payment-preview';
mkdirSync(output,{recursive:true});
if(!url)throw Error('SD_PAYMENT_PREVIEW_URL is required for the deployed Preview browser test.');

test('Preview checkout keeps the dynamic SePay QR inside the order drawer',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 const origin=new URL(url).origin;
 const orderNumbers=['SD-PREVIEW-OLD','SD-PREVIEW-NEW'],checkoutIntentIds=['preview-intent-00000000-0000-4000-8000-000000000001','preview-intent-00000000-0000-4000-8000-000000000002'];
 const accessToken='p'.repeat(64);
 const transferReference='SP0123456789ABCDEF';
 let paymentChecks=0,paidStatusChecks=0,oldPaid=false,newPaid=false,holdNextStatus=false,heldStatusStarted=false,releasedOldStatus=false,releaseHeldStatus=null;
 const products=[{
  id:'qa-wallet',sku:'QA-WALLET-001',title:'Ví QA SePay',category:'wallets',
  categoryLabel:'Ví nam',slug:'qa-wallet-sepay',skuVerified:true,
  images:['images/brand-emblem.png'],description:'Preview fixture; no real purchase.',
  price:100000,sourcePriceConfirmed:true,fulfillmentType:'made_to_order',
  published:true,stock:5
 }];
 const quoteBodies=[],orderBodies=[];
 let orderCalls=0;
 await page.route('**/*',async route=>{
  const request=route.request(),requestUrl=new URL(request.url()),path=requestUrl.pathname;
  if(requestUrl.origin===origin&&path==='/api/products'&&request.method()==='GET'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(products)});return;
  }
  if(requestUrl.origin===origin&&path==='/api/settings'&&request.method()==='GET'){
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:false})});return;
  }
  if(requestUrl.origin===origin&&path==='/api/checkout-quote'&&request.method()==='POST'){
   const body=request.postDataJSON();quoteBodies.push(body);
   const amount=body.paymentOption==='full'?95000:100000;
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,quoteReady:true,paymentReady:true,paymentProvider:'sepay',total:100000,
    options:[
     {value:'deposit',label:'Đặt cọc 30%',amount:100000,discountAmount:0,codExpected:0},
     {value:'full',label:'Thanh toán hết · giảm 5%',amount:95000,discountAmount:5000,codExpected:0}
    ],
    ...(body.paymentOption?{paymentOption:body.paymentOption,selectedPaymentAmount:amount,
      paymentInstructions:{status:'ready',provider:'sepay',amount}}:{})
   })});return;
  }
  if(requestUrl.origin===origin&&path==='/api/orders'&&request.method()==='POST'){
   const body=request.postDataJSON();orderBodies.push(body);orderCalls++;
   const amount=body.paymentOption==='full'?95000:100000;
   await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({
    ok:true,checkoutIntentId:checkoutIntentIds[Math.min(orderCalls-1,1)],orderAccessToken:accessToken,
    priceConfirmationRequired:false,paymentTermsConfirmed:true,paymentReady:true,
    paymentProvider:'sepay',total:100000,selectedPaymentOption:body.paymentOption,transferReference,
    selectedPaymentAmount:amount,paymentInstructions:{status:'ready',provider:'sepay',amount,qrImageUrl:'https://vietqr.app/img?acc=1234567890&bank=VCB&amount='+amount+'&des='+transferReference,qrIncludesAmount:true,bankName:'Vietcombank',accountNumber:'1234567890',accountName:'QA TEST OWNER',transferContent:transferReference},
    message:'QR SePay đã sẵn sàng trong khung đặt hàng.'
   })});return;
  }
  if(requestUrl.origin===origin&&path==='/api/sepay/checkout-status'&&request.method()==='GET'){
   const intentId=requestUrl.searchParams.get('intentId');
   if(holdNextStatus){holdNextStatus=false;heldStatusStarted=true;await new Promise(resolve=>{releaseHeldStatus=resolve});releasedOldStatus=true}
   const paid=intentId===checkoutIntentIds[0]?oldPaid:newPaid,orderNumber=intentId===checkoutIntentIds[0]?orderNumbers[0]:orderNumbers[1];
   paymentChecks++;if(paid)paidStatusChecks++;
   await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify({
    ok:true,paid,...(paid?{orderNumber,orderStatus:'confirmed',deliveryStatus:'not_shipped',priceConfirmationRequired:false,paymentTermsConfirmed:true,paymentProvider:'sepay',paymentReady:false}:{paymentProvider:'sepay',paymentReady:true,transferReference}),
    paymentSummary:{paymentOption:'deposit',total:100000,requiredAmount:100000,
      netReceivedAmount:paid?100000:0,shortfall:paid?0:100000,codRemaining:0}
   })});return;
  }
  if(requestUrl.origin===origin){
   await route.continue({headers:{...request.headers(),
    'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID||'',
    'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET||''}});
   return;
  }
  if(requestUrl.hostname==='vietqr.app'&&requestUrl.pathname==='/img'){
   await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="white"/><path d="M8 8h36v36H8zm8 8v20h20V16zm68-8h36v36H84zm8 8v20h20V16zM8 84h36v36H8zm8 8v20h20V92zm44-72h8v8h-8zm16 16h8v8h-8zm-16 16h8v8h-8zm16 16h8v8h-8zm-16 16h8v8h-8zm16 16h8v8h-8zm16 0h8v8h-8zm16 0h8v8h-8z" fill="black"/></svg>'});return;
  }
  if(requestUrl.hostname==='provinces.open-api.vn'&&requestUrl.pathname.startsWith('/api/v2/p')){
   const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'*','Access-Control-Max-Age':'86400'};
   if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:cors});return;}
   const body=requestUrl.searchParams.has('depth')
    ?{code:79,name:'Thành phố Hồ Chí Minh',wards:[{code:26560,name:'Phường Bà Rịa'}]}
    :[{code:79,name:'Thành phố Hồ Chí Minh'}];
   await route.fulfill({status:200,contentType:'application/json',headers:cors,body:JSON.stringify(body)});return;
  }
  await route.fallback();
 });

 const previewUrl=new URL(url);previewUrl.searchParams.set('qa',process.env.GITHUB_SHA||String(Date.now()));
 const response=await page.goto(previewUrl.toString(),{waitUntil:'domcontentloaded'});
 expect(response?.status()).toBe(200);
 const welcome=page.locator('#welcomeSplash');if(await welcome.count())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 await page.locator('[data-open-product="qa-wallet"]').first().evaluate(node=>node.click());
 await page.locator('#detailAdd').click();
 await page.locator('#detailClose').click();
 await page.locator('#cartOpen').click();
 await page.locator('#cartCheckout').click();
 await page.locator('#checkoutForm input[name="fullName"]').fill('Khách QA Sandbox');
 await page.locator('#checkoutForm input[name="phone"]').fill('0900000000');
 await page.locator('#checkoutStreet').fill('Địa chỉ kiểm tra Preview');
 const province=page.locator('#checkoutProvince');
 await expect.poll(()=>province.locator('option').count()).toBeGreaterThan(1);
 await province.selectOption({index:1});
 const ward=page.locator('#checkoutWard');
 await expect.poll(()=>ward.locator('option').count()).toBeGreaterThan(1);
 await ward.selectOption({index:1});
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible();
 await expect(page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]')).toBeVisible();
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
 await page.locator('#checkoutSubmit').click();
 await expect.poll(()=>orderCalls).toBe(1);
 expect(orderBodies[0].items).toEqual([{id:'qa-wallet',option:'',sizeOption:'',imageVariant:'',quantity:1}]);
 expect(orderBodies[0].paymentOption).toBe('deposit');
 await expect(page.locator('#paymentInstructions img')).toHaveAttribute('src',/vietqr\.app\/img.*amount=100000/);
 await expect(page.locator('#sdCheckoutQrWarning')).toHaveText('QR đã điền sẵn số tiền và nội dung chuyển khoản. VUI LÒNG KHÔNG THAY ĐỔI THÔNG TIN');
 await expect(page.locator('#sdCheckoutNoticeReference')).toHaveText(transferReference);
 await expect(page.locator('#sdCheckoutNoticeAmount')).toHaveText('100,000 VND');
 await expect(page.locator('#sdCheckoutQrWrap')).toContainText('XIN LƯU Ý');
 await expect(page.locator('#sdCheckoutQrWrap')).toContainText('Mỗi mã QR chỉ được sử dụng một lần.');
 await expect(page.locator('#sdCheckoutQrWrap')).toContainText('Vui lòng lưu lại biên lai chuyển khoản');
 expect(await page.locator('#sdCheckoutQrImage').evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('#sdCheckoutSaveQr'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 expect(await page.locator('#sdCheckoutSaveQr').evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('.sd-checkout-transfer-notice'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 expect(await page.locator('#sdCheckoutQrWarning').evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('#sdCheckoutQrImage'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await expect(page.locator('#paymentInstructions')).not.toContainText('Tiếp tục đến QR');
 await expect(page.locator('#paymentInstructions')).not.toContainText(orderNumbers[0]);
 await expect(page.locator('#paymentInstructions')).toContainText('Số tiền cần chuyển');
 await expect(page.locator('#paymentInstructions .sd-sepay-loading')).toHaveCount(0);
 await page.locator('#paymentInstructions').screenshot({path:output+'/sepay-inline-qr-pending-mobile.png'});
 await expect(page).toHaveURL(previewUrl.toString());
 await expect.poll(()=>paymentChecks,{timeout:10000}).toBeGreaterThan(0);
 await expect(page.locator('#paymentInstructions img')).toHaveAttribute('src',/vietqr\.app\/img.*amount=100000/);
 await expect(page.locator('#paymentInstructions .sd-payment-order-stage')).toBeHidden();
 await expect(page.locator('#paymentInstructions .sd-payment-order-stage')).not.toBeVisible();
 await expect(page.locator('#paymentInstructions')).toContainText(transferReference);
 holdNextStatus=true;
 await expect.poll(()=>heldStatusStarted,{timeout:12000}).toBe(true);
 await page.locator('#sdCheckoutDone').click();
 await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);
 await page.locator('#cartOpen').click();
 await page.locator('#cartCheckout').click();
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible();
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
 await page.locator('#checkoutSubmit').click();
 await expect.poll(()=>orderCalls).toBe(2);
 await expect(page.locator('#paymentInstructions img')).toHaveAttribute('src',/vietqr\.app\/img.*amount=100000/);
 oldPaid=true;releaseHeldStatus?.();
 await expect.poll(()=>releasedOldStatus,{timeout:5000}).toBe(true);
 await page.waitForTimeout(250);
 await expect(page.locator('#paymentInstructions .sd-payment-success-stage')).toHaveCount(0);
 await expect(page.locator('#paymentInstructions')).not.toContainText(orderNumbers[0]);
 await expect(page.locator('#paymentInstructions')).toContainText(transferReference);
 newPaid=true;
 await expect.poll(()=>paidStatusChecks,{timeout:10000}).toBeGreaterThan(1);
 await expect(page.locator('#paymentInstructions .sd-payment-success-stage')).toBeVisible({timeout:10000});
 await expect(page.locator('#paymentInstructions .sd-payment-success-stage')).toContainText('Thanh toán thành công');
 await expect(page.locator('#paymentInstructions .sd-payment-order-stage')).toBeHidden();
 await expect(page.locator('#paymentInstructions .sd-payment-order-stage')).toBeVisible({timeout:10000});
 await expect(page.locator('#paymentInstructions')).not.toContainText('Shop chỉ xác nhận tiền đã nhận sau khi đối chiếu sao kê');
 await expect(page.locator('#paymentInstructions .sd-order-received-note')).toHaveText('Đã nhận cọc và xác nhận đơn. Shop sẽ cập nhật tiến độ làm hàng và gửi hàng.');
 await expect(page.locator('#paymentInstructions')).toContainText(orderNumbers[1]);
 await expect(page.locator('#sdCheckoutDone')).toHaveText('Đóng');
 await expect(page.locator('#paymentInstructions img')).toHaveCount(0);
 await page.locator('#paymentInstructions').screenshot({path:output+'/sepay-inline-qr-mobile.png'});
 expect(quoteBodies.some(body=>body.paymentOption==='deposit')).toBe(true);
 expect(orderCalls).toBe(2);
});
