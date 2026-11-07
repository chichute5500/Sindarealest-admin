import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test.use({serviceWorkers:'block'});
const url=process.env.SD_PAYMENT_PREVIEW_URL;
const output='artifacts/storefront-payment-preview';
mkdirSync(output,{recursive:true});
if(!url)throw Error('SD_PAYMENT_PREVIEW_URL is required for the deployed Preview browser test.');

test('Preview checkout creates a hosted SePay payment and returns to IPN-wait state',async({page})=>{
 test.setTimeout(60000);
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 const origin=new URL(url).origin;
 const orderNumber='SD-PREVIEW-001';
 const accessToken='p'.repeat(64);
 const resultUrl=origin+'/payment-result.html?order='+encodeURIComponent(orderNumber)+'&token='+accessToken;
 const products=[{
  id:'qa-wallet',sku:'QA-WALLET-001',title:'Ví QA SePay',category:'wallets',
  categoryLabel:'Ví nam',slug:'qa-wallet-sepay',skuVerified:true,
  images:['images/brand-emblem.png'],description:'Preview fixture; no real purchase.',
  price:100000,sourcePriceConfirmed:true,fulfillmentType:'made_to_order',
  published:true,stock:5
 }];
 const quoteBodies=[],orderBodies=[];
 let formFields={},orderCalls=0;
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
   const fields={
    order_amount:String(amount),merchant:'MERCHANT_TEST',currency:'VND',
    operation:'PURCHASE',order_description:'SinDarealest '+orderNumber,
    order_invoice_number:orderNumber,customer_id:'qa-preview',
    payment_method:'BANK_TRANSFER',success_url:resultUrl,error_url:resultUrl,
    cancel_url:resultUrl,signature:'preview-test-signature'
   };
   await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({
    ok:true,orderNumber,orderAccessToken:accessToken,status:'pending_confirmation',
    priceConfirmationRequired:false,paymentTermsConfirmed:true,paymentReady:true,
    paymentProvider:'sepay',total:100000,selectedPaymentOption:body.paymentOption,
    selectedPaymentAmount:amount,paymentInstructions:{status:'ready',provider:'sepay',amount},
    sepayCheckout:{url:'https://pay-sandbox.sepay.vn/v1/checkout/init',fields},
    message:'Đang chuyển bạn đến SePay.'
   })});return;
  }
  if(requestUrl.origin===origin&&path==='/api/order-payment'&&request.method()==='GET'){
   await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify({
    ok:true,orderNumber,orderStatus:'pending_confirmation',deliveryStatus:'not_shipped',
    priceConfirmationRequired:false,paymentTermsConfirmed:true,paymentReady:false,
    paymentProvider:'sepay',gatewayStatus:'pending',
    paymentSummary:{paymentOption:'deposit',total:100000,requiredAmount:100000,
      netReceivedAmount:0,shortfall:100000,codRemaining:0}
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
  if(requestUrl.origin==='https://sandbox.pay.sepay.vn'&&path==='/v1/checkout/init'&&request.method()==='POST'){
   formFields=Object.fromEntries(new URLSearchParams(request.postData()||'').entries());
   await route.fulfill({status:303,headers:{Location:resultUrl}});return;
  }
  await route.fallback();
 });

 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
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
 await expect(page.locator('#paymentInstructions .sd-sepay-intro')).toContainText('QR đúng số tiền');
 await expect(page.locator('#paymentInstructions .sd-sepay-amount')).toContainText('100.000');
 await expect(page.locator('#paymentInstructions img')).toHaveCount(0);
 await expect(page.locator('#sdCheckoutDone')).toContainText('Tạo đơn & thanh toán');
 expect(orderCalls).toBe(0);
 await page.locator('#paymentInstructions').screenshot({path:output+'/sepay-hosted-payment-mobile.png'});
 await page.locator('#sdCheckoutDone').click();
 await expect.poll(()=>orderCalls).toBe(1);
 await expect.poll(()=>formFields.order_invoice_number).toBe(orderNumber);
 expect(orderBodies[0].items).toEqual([{id:'qa-wallet',option:'',quantity:1}]);
 expect(orderBodies[0].paymentOption).toBe('deposit');
 expect(formFields.payment_method).toBe('BANK_TRANSFER');
 expect(formFields.order_amount).toBe('100000');
 expect(formFields.signature).toBe('preview-test-signature');
 await expect(page).toHaveURL(/\/payment-result(?:\.html)?(?:\?|$)/);
 await expect(page.locator('#status')).toContainText('Đang chờ SePay xác nhận giao dịch.');
 await expect(page.locator('#detail')).toContainText(orderNumber);
 await page.screenshot({path:output+'/sepay-ipn-pending-result.png',fullPage:true});
 expect(quoteBodies.some(body=>body.paymentOption==='deposit')).toBe(true);
 expect(orderCalls).toBe(1);
});
