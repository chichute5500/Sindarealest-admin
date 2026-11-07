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
 const orderNumber='SD-PREVIEW-001',checkoutIntentId='preview-intent-00000000-0000-4000-8000-000000000001';
 const accessToken='p'.repeat(64);
 const transferReference='SP-0123456789ABCDEF';
 let paymentChecks=0,paymentReceived=false;
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
    ok:true,checkoutIntentId,orderAccessToken:accessToken,
    priceConfirmationRequired:false,paymentTermsConfirmed:true,paymentReady:true,
    paymentProvider:'sepay',total:100000,selectedPaymentOption:body.paymentOption,transferReference,
    selectedPaymentAmount:amount,paymentInstructions:{status:'ready',provider:'sepay',amount,qrImageUrl:'https://vietqr.app/img?acc=1234567890&bank=VCB&amount='+amount+'&des='+transferReference,qrIncludesAmount:true,bankName:'Vietcombank',accountNumber:'1234567890',accountName:'QA TEST OWNER',transferContent:transferReference},
    message:'QR SePay đã sẵn sàng trong khung đặt hàng.'
   })});return;
  }
  if(requestUrl.origin===origin&&path==='/api/sepay/checkout-status'&&request.method()==='GET'){
   paymentChecks++;
   await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify({
    ok:true,paid:paymentReceived,...(paymentReceived?{orderNumber,orderStatus:'pending_confirmation',deliveryStatus:'not_shipped',priceConfirmationRequired:false,paymentTermsConfirmed:true,paymentProvider:'sepay',paymentReady:false}:{paymentProvider:'sepay',paymentReady:true,transferReference}),
    paymentSummary:{paymentOption:'deposit',total:100000,requiredAmount:100000,
      netReceivedAmount:paymentReceived?100000:0,shortfall:paymentReceived?0:100000,codRemaining:0}
   })});return;
  }
  if(requestUrl.origin===origin){
   await route.continue({headers:{...request.headers(),
    'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID||'',
    'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET||''}});
   return;
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
 await expect(page.locator('#paymentInstructions .sd-sepay-intro')).toContainText('Mã đơn sẽ hiện');
 await expect(page.locator('#paymentInstructions .sd-sepay-amount')).toContainText('100.000');
 await expect(page.locator('#paymentInstructions img')).toHaveCount(0);
 await expect(page.locator('#sdCheckoutDone')).toContainText('Tiếp tục đến QR');
 expect(orderCalls).toBe(0);
 await page.locator('#paymentInstructions').screenshot({path:output+'/sepay-hosted-payment-mobile.png'});
 await page.locator('#sdCheckoutDone').click();
 await expect.poll(()=>orderCalls).toBe(1);
 expect(orderBodies[0].items).toEqual([{id:'qa-wallet',option:'',quantity:1}]);
 expect(orderBodies[0].paymentOption).toBe('deposit');
 await expect(page).toHaveURL(previewUrl.toString());
 await expect.poll(()=>paymentChecks,{timeout:10000}).toBeGreaterThan(0);
 await expect(page.locator('#paymentInstructions img')).toHaveAttribute('src',/vietqr\.app\/img.*amount=100000/);
 await expect(page.locator('#paymentInstructions .sd-payment-order-stage')).toBeHidden();
 await expect(page.locator('#paymentInstructions .sd-payment-order-stage')).not.toBeVisible();
 await expect(page.locator('#paymentInstructions')).toContainText(transferReference);
 paymentReceived=true;
 await expect.poll(()=>paymentChecks,{timeout:10000}).toBeGreaterThan(1);
 await expect(page.locator('#paymentInstructions .sd-payment-order-stage')).toBeVisible({timeout:10000});
 await expect(page.locator('#paymentInstructions')).toContainText(orderNumber);
 await expect(page.locator('#sdCheckoutDone')).toHaveText('Đóng');
 await expect(page.locator('#paymentInstructions img')).toHaveCount(0);
 await page.locator('#paymentInstructions').screenshot({path:output+'/sepay-inline-qr-mobile.png'});
 expect(quoteBodies.some(body=>body.paymentOption==='deposit')).toBe(true);
 expect(orderCalls).toBe(1);
});
