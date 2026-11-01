import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const base=process.env.SD_OPTIONS_BASE_URL||'http://127.0.0.1:4173';
const dir='artifacts/product-options';
mkdirSync(dir,{recursive:true});
test.use({serviceWorkers:'block'});
const items=[
 {id:'qa-shoe',sku:'QA-SHOE-001',title:'Giày lười kiểm thử',category:'loafers',categoryLabel:'Giày lười'},
 {id:'qa-belt',sku:'QA-BELT-001',title:'Thắt lưng kiểm thử',category:'belts',categoryLabel:'Thắt lưng'},
 {id:'qa-phone',sku:'QA-PHONE-001',title:'Ốp điện thoại kiểm thử',category:'phone-cases',categoryLabel:'Ốp điện thoại'},
 {id:'qa-wallet',sku:'QA-WALLET-001',title:'Ví không size',category:'wallets',categoryLabel:'Ví nam'},
 {id:'qa-boot',sku:'QA-BOOT-001',title:'Giày boot kiểm thử',category:'giay-boot',categoryLabel:'Giày boot'}
].map(p=>({...p,slug:p.id,skuVerified:true,images:['images/brand-emblem.png'],description:'Mock data, no real purchases',price:100000,sourcePriceConfirmed:true,fulfillmentType:'made_to_order',published:true}));
for(const cfg of [
 {label:'mobile-light',w:390,h:844,scheme:'light'},
 {label:'mobile-dark',w:390,h:844,scheme:'dark'},
 {label:'desktop-light',w:1366,h:900,scheme:'light'},
 {label:'desktop-dark',w:1366,h:900,scheme:'dark'}
]){
 test('Catalog options and cart responsive '+cfg.label,async({page})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(items)}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:false})}));
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:12000});
  const open=async id=>{
   await page.locator('[data-open-product="'+id+'"]').first().evaluate(el=>el.click());
   await expect(page.locator('#productOverlay')).toHaveClass(/open/);
  };
  const close=async()=>{await page.locator('#detailClose').click();await expect(page.locator('#productOverlay')).not.toHaveClass(/open/)};
  await open('qa-shoe');
  await expect(page.locator('#detailVariants')).toBeVisible();
  await expect(page.locator('#sdDetailOption')).toHaveCount(1);
  await expect(page.locator('#detailVariants .sd-product-option-chip')).toHaveCount(7);
  await page.locator('#detailAdd').click();
  await expect(page.locator('#sdDetailOptionMessage')).toContainText('Vui lòng chọn');
  await page.locator('#detailVariants [data-option-value="42"]').click();
  await expect(page.locator('[data-option-value="42"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-option-value="43"]')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#sdDetailOption')).toHaveValue('42');
  await expect(page.locator('#detailVariants .sd-product-option-choices')).toHaveCSS('flex-wrap','wrap');
  // Inspect the ORIGINAL heart's computed style: its high-specificity !important
  // rules override the later unified icon gradient. The size chip must use
  // that restrained real glass material, not added metallic chrome rims.
  const surfaces=await page.evaluate(()=>{
   const style=node=>{
    const css=getComputedStyle(node),rect=node.getBoundingClientRect();
    return {width:rect.width,height:rect.height,radius:css.borderRadius,
     background:css.backgroundColor,border:css.borderTopColor,
     backdrop:css.backdropFilter,webkitBackdrop:css.webkitBackdropFilter,
     shadow:css.boxShadow,backgroundImage:css.backgroundImage,
     before:getComputedStyle(node,'::before').content,
     after:getComputedStyle(node,'::after').content};
   };
   return {heart:style(document.querySelector('#detailFavorite')),
    idle:style(document.querySelector('[data-option-value="41"]')),
    selected:style(document.querySelector('[data-option-value="42"]'))};
  });
  for(const surface of [surfaces.heart,surfaces.idle,surfaces.selected]){
   expect(surface.width).toBe(40);
   expect(surface.height).toBe(40);
   expect(surface.radius).toBe('50%');
   expect(surface.backdrop).toBe(surfaces.heart.backdrop);
   expect(surface.backdrop).toContain('blur(22px)');
  }
  // The idle chip must match the approved heart's thin border + soft inset
  // shadow exactly; the lighter panel needs only a modest transparent tint.
  expect(surfaces.idle.shadow).toBe(surfaces.heart.shadow);
  expect(surfaces.idle.border).toBe(surfaces.heart.border);
  expect(surfaces.idle.before).toBe('none');
  expect(surfaces.idle.after).toBe('none');
  expect(surfaces.selected.before).toBe('none');
  expect(surfaces.selected.after).toBe('none');
  expect(surfaces.selected.border).not.toBe(surfaces.idle.border);
  expect(surfaces.selected.background).not.toBe(surfaces.idle.background);
  if(cfg.scheme==='light'){
   expect(surfaces.heart.backgroundImage).toBe('none');
   expect(surfaces.idle.backgroundImage).toContain('radial-gradient');
   expect(surfaces.idle.background).toContain('99, 128, 148');
   expect(surfaces.selected.background).toContain('78, 144, 187');
  }else{
   expect(surfaces.idle.backgroundImage).toBe('none');
   expect(surfaces.idle.background).toBe(surfaces.heart.background);
   expect(surfaces.selected.background).toContain('42, 99, 139');
  }
    const chipMetrics=await page.locator('#detailVariants .sd-product-option-chip').evaluateAll(nodes=>nodes.map(x=>({
   w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height,
   text:x.textContent,viewWidth:window.innerWidth,
   outerRight:x.getBoundingClientRect().right
  })));
  expect(chipMetrics).toHaveLength(7);
  for(const metric of chipMetrics){
   expect(metric.w).toBe(40);
   expect(metric.h).toBe(40);
   expect(metric.outerRight).toBeLessThanOrEqual(metric.viewWidth+1);
   expect(metric.text).toMatch(/^(38|39|40|41|42|43|44)$/);
  }
  await page.locator('[data-option-value="42"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#sdDetailOption')).toHaveValue('43');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#sdDetailOption')).toHaveValue('42');
  await page.screenshot({path:dir+'/shoe-'+cfg.label+'.png',animations:'disabled'});
  await page.locator('#detailAdd').click();
  await close();
  await open('qa-shoe');
  await page.locator('#detailVariants [data-option-value="43"]').click();
  await page.locator('#detailAdd').click();
  await close();
  await open('qa-belt');
  await expect(page.locator('#detailVariants .sd-product-option-chip')).toHaveCount(2);
  await page.locator('#detailVariants [data-option-value="4.0"]').click();
  await expect(page.locator('[data-option-value="4.0"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#sdDetailOption')).toHaveValue('4.0');
  await expect(page.locator('[data-option-value="4.0"]')).toHaveText('4,0');
  await expect(page.locator('[data-option-value="4.0"]')).toHaveCSS('border-radius','50%');
  const beltCircle=await page.locator('[data-option-value="4.0"]').boundingBox();
  expect(beltCircle.width).toBe(40);expect(beltCircle.height).toBe(40);
  await page.screenshot({path:dir+'/belt-'+cfg.label+'.png',animations:'disabled'});
  await page.locator('#detailAdd').click();
  await close();
  await open('qa-phone');
  await expect(page.locator('#sdDetailOption')).toHaveAttribute('maxlength','80');
  const phoneGlass=await page.locator('#sdDetailOption').evaluate(node=>{
   const css=getComputedStyle(node);
   return {backdrop:css.backdropFilter,webkitBackdrop:css.webkitBackdropFilter,shadow:css.boxShadow,width:node.getBoundingClientRect().width};
  });
  expect(phoneGlass.backdrop+' '+phoneGlass.webkitBackdrop).toContain('blur(18px)');
  expect(phoneGlass.shadow).not.toBe('none');
  expect(phoneGlass.width).toBeLessThanOrEqual(281);
  await page.locator('#detailAdd').click();
  await expect(page.locator('#sdDetailOptionMessage')).toContainText('Vui lòng nhập');
  await page.locator('#sdDetailOption').fill('iPhone 16 Pro Max');
  await page.screenshot({path:dir+'/phone-'+cfg.label+'.png',animations:'disabled'});
  await page.locator('#detailAdd').click();
  await close();
  await open('qa-boot');
  await expect(page.locator('#detailVariants .sd-product-option-chip')).toHaveCount(7);
  await close();
  await open('qa-wallet');
  await expect(page.locator('#detailVariants')).toBeHidden();
  await close();
  await page.locator(cfg.w<=760?'#mobileCartNav':'#cartOpen').click();
  await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
  await expect(page.locator('#cartList .cart-row')).toHaveCount(4);
  const list=await page.locator('#cartList').innerText();
  for(const value of ['Size 42','Size 43','Bản dây 4.0 cm','iPhone 16 Pro Max'])expect(list).toContain(value);
  await page.screenshot({path:dir+'/cart-'+cfg.label+'.png',animations:'disabled'});
  const dimensions=await page.evaluate(()=>({body:document.body.scrollWidth,cart:document.querySelector('#cartDrawer').scrollWidth,cartWidth:document.querySelector('#cartDrawer').getBoundingClientRect().width}));
  expect(dimensions.body).toBeLessThanOrEqual(cfg.w+1);
  expect(dimensions.cart).toBeLessThanOrEqual(Math.ceil(dimensions.cartWidth)+1);
  await page.locator('#cartCheckout').click();
  await expect(page.locator('#checkoutDrawer')).toHaveClass(/open/);
  await expect(page.locator('#sdCheckoutItemSummary .sd-checkout-item')).toHaveCount(4);
  await expect(page.locator('#sdCheckoutShippingStep')).toBeVisible();
  const summary=await page.locator('#sdCheckoutItemSummary').textContent();
  for(const value of ['Size 42','Size 43','Bản dây 4.0 cm','iPhone 16 Pro Max'])expect(summary).toContain(value);
  await page.screenshot({path:dir+'/checkout-'+cfg.label+'.png',animations:'disabled'});
  expect(errors).toEqual([]);
 });
 test('Legacy cart requires a selection and preserves quantity '+cfg.label,async({page,context})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>{
   localStorage.setItem('sd-cart',JSON.stringify({'qa-shoe':2,'qa-wallet':1}));
  });
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(items)}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:false})}));
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:12000});
  await page.locator(cfg.w<=760?'#mobileCartNav':'#cartOpen').click();
  await expect(page.locator('#cartList .cart-row')).toHaveCount(2);
  await expect(page.locator('[data-cart-select="qa-shoe"]')).toBeVisible();
  await page.locator('#cartCheckout').click();
  await expect(page.locator('#productOverlay')).toHaveClass(/open/);
  await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);
  await page.locator('#detailVariants [data-option-value="42"]').click();
  await page.locator('#detailAdd').click();
  await page.locator('#detailClose').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sd-cart')||'{}'));
  expect(saved).toMatchObject({'qa-shoe::42':2,'qa-wallet':1});
  expect(saved).not.toHaveProperty('qa-shoe');
  await page.locator(cfg.w<=760?'#mobileCartNav':'#cartOpen').click();
  await expect(page.locator('#cartList')).toContainText('Size 42');
  await expect(page.locator('#cartList')).not.toContainText('Chọn size');
  await page.locator('#cartCheckout').click();
  await expect(page.locator('#checkoutDrawer')).toHaveClass(/open/);
  await expect(page.locator('#sdCheckoutItemSummary')).toContainText('Size 42');
  expect(errors).toEqual([]);
 });

 test('Aggregate quantity ceiling applies across shoe sizes '+cfg.label,async({page,context})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   localStorage.setItem('sd-cart',JSON.stringify({'qa-shoe::42':49,'qa-shoe::43':1}));
  });
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(items)}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":false}'}));
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:12000});
  await page.locator('[data-open-product="qa-shoe"]').first().evaluate(el=>el.click());
  await page.locator('#detailVariants [data-option-value="43"]').click();
  await page.locator('#detailAdd').click();
  const afterAdd=await page.evaluate(()=>JSON.parse(localStorage.getItem('sd-cart')||'{}'));
  expect(afterAdd).toMatchObject({'qa-shoe::42':49,'qa-shoe::43':1});
  await page.locator('#detailClose').click();
  await page.locator(cfg.w<=760?'#mobileCartNav':'#cartOpen').click();
  const inc=page.locator('[data-qty="1"][data-id="qa-shoe::43"]');
  await inc.click();
  const afterIncrement=await page.evaluate(()=>JSON.parse(localStorage.getItem('sd-cart')||'{}'));
  expect(afterIncrement).toMatchObject({'qa-shoe::42':49,'qa-shoe::43':1});
 });

 test('Changed category preserves cart but requires a compatible choice '+cfg.label,async({page,context})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   localStorage.setItem('sd-cart',JSON.stringify({'qa-shoe::42':3}));
  });
  const moved=items.map(p=>p.id==='qa-shoe'?{...p,category:'belts',categoryLabel:'Thắt lưng'}:p);
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(moved)}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":false}'}));
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:12000});
  await page.locator(cfg.w<=760?'#mobileCartNav':'#cartOpen').click();
  await expect(page.locator('#cartList .cart-row')).toHaveCount(1);
  await expect(page.locator('[data-cart-select="qa-shoe"]')).toContainText('bản dây');
  let persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('sd-cart')||'{}'));
  expect(persisted).toMatchObject({'qa-shoe':3});
  expect(persisted).not.toHaveProperty('qa-shoe::42');
  await page.locator('#cartCheckout').click();
  await expect(page.locator('#productOverlay')).toHaveClass(/open/);
  await page.locator('#detailVariants [data-option-value="3.5"]').click();
  await page.locator('#detailAdd').click();
  persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('sd-cart')||'{}'));
  expect(persisted).toMatchObject({'qa-shoe::3.5':3});
  expect(persisted).not.toHaveProperty('qa-shoe');
 });

}

test('Buy now and cart selection submit only the intended items',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});
 const quoteBodies=[],orderBodies=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
 await context.addInitScript(()=>localStorage.setItem('sd-cart',JSON.stringify({'qa-shoe::42':1,'qa-wallet':1})));
 await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(items)}));
 await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":false}'}));
 await page.route('https://provinces.open-api.vn/api/v2/p/**',async route=>{
  const requestUrl=new URL(route.request().url());
  const payload=requestUrl.searchParams.has('depth')?{code:79,name:'Thành phố Hồ Chí Minh',wards:[{code:26560,name:'Phường Bà Rịa'}]}:[{code:79,name:'Thành phố Hồ Chí Minh'}];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)});
 });
 await page.route('**/api/checkout-quote',async route=>{
  const body=route.request().postDataJSON();quoteBodies.push(body);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,quoteReady:true,paymentReady:false,total:100000,options:[{value:'deposit',label:'Đặt cọc 30%',amount:100000,discountAmount:0,codExpected:0},{value:'full',label:'Thanh toán toàn bộ, giảm 5%',amount:95000,discountAmount:5000,codExpected:0}]})});
 });
 let paymentRefreshRequests=0;
 await page.route('**/api/order-payment?*',async route=>{paymentRefreshRequests++;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,orderNumber:'SD-TEST-001',orderStatus:'pending_confirmation',deliveryStatus:'not_shipped',paymentReady:false,paymentTermsConfirmed:true,priceConfirmationRequired:false,total:100000,paymentSummary:{status:'paid_in_full',total:100000,paymentOption:'deposit',requiredAmount:100000,discountAmount:0,receivedAmount:100000,refundedAmount:0,netReceivedAmount:100000,shortfall:0,overpaidAmount:0,codExpected:0,codRemaining:0,codReceivedAmount:0,eligibleToShip:true,paidInFull:true}})})});
 await page.route('**/api/orders',async route=>{
  orderBodies.push(route.request().postDataJSON());
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,orderNumber:'SD-TEST-001',orderAccessToken:'preview-access-token-1234567890123456789012345678901234567890',status:'pending_confirmation',priceConfirmationRequired:false,total:100000,message:'Shop sẽ xác nhận đơn.',paymentSummary:{status:'waiting_shop_confirmation',total:100000,paymentOption:'deposit',requiredAmount:100000,discountAmount:0,netReceivedAmount:0,shortfall:100000,overpaidAmount:0,codExpected:0,codRemaining:0,codReceivedAmount:0,eligibleToShip:false}})});
 });
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:12000});
 await page.locator('[data-open-product="qa-wallet"]').first().evaluate(el=>el.click());
 await expect(page.locator('#sdDetailPaymentQuote [data-detail-payment-option="deposit"]')).toContainText('Đặt cọc 30%');
 expect(await page.locator('#detailVariants').evaluate((node,quote)=>!!(node.compareDocumentPosition(document.querySelector(quote))&Node.DOCUMENT_POSITION_FOLLOWING),'#sdDetailPaymentQuote')).toBe(true);
 await expect(page.locator('#sdDetailPaymentQuote [data-detail-payment-option="full"]')).toContainText('giảm 5%');
 await page.locator('#sdDetailPaymentQuote [data-detail-payment-option="deposit"]').click();
 await expect(page.locator('#sdDetailPaymentQuote [data-detail-payment-option="deposit"]')).toHaveAttribute('aria-checked','true');
 await page.locator('#detailBuyNow').click();
 await expect(page.locator('#checkoutDrawer')).toHaveClass(/open/);
 await expect(page.locator('#checkoutDrawer')).toHaveCSS('width','390px');
 await page.locator('#checkoutDrawer input[name="fullName"]').fill('Khách mua ngay');
 await page.locator('#checkoutDrawer input[name="phone"]').fill('0900000000');
 await page.locator('#checkoutStreet').fill('Địa chỉ kiểm thử');
 const province=page.locator('#checkoutProvince');await expect.poll(()=>province.locator('option').count()).toBeGreaterThan(1);await province.selectOption({index:1});
 const ward=page.locator('#checkoutWard');await expect.poll(()=>ward.locator('option').count()).toBeGreaterThan(1);await ward.selectOption({index:1});
 await page.locator('#checkoutSubmit').click();await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible();
 await expect(page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]')).toHaveAttribute('aria-checked','true');
 expect(quoteBodies.at(-1).items).toEqual([{id:'qa-wallet',option:'',quantity:1}]);
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
 await page.locator('#checkoutSubmit').click();await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeHidden();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Chờ thanh toán');
 await expect(page.locator('#sdCheckoutDone')).toHaveText('Xem mã đơn →');
 await page.locator('#sdCheckoutDone').click();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toContainText('SD-TEST-001');
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Mã đơn hàng');
 await expect(page.locator('#sdCheckoutStepSubtitle')).toHaveText('Lưu mã đơn bên dưới để theo dõi tiến độ. Shop sẽ cập nhật khi đã nhận thanh toán.');
 await expect(page.locator('#sdCheckoutDone')).toBeVisible();
 await expect(page.locator('#checkoutSubmit')).toBeHidden();
 await expect(page.locator('#paymentInstructions')).not.toContainText('Shop chưa xác nhận nhận tiền');
 await expect(page.locator('#paymentInstructions')).not.toContainText('COD còn phải thu');
 const savedAddress=await page.evaluate(()=>JSON.parse(localStorage.getItem('sd-shipping-address')||'null'));
 expect(savedAddress).toMatchObject({fullName:'Khách mua ngay',phone:'0900000000',streetAddress:'Địa chỉ kiểm thử'});
 expect(orderBodies).toHaveLength(1);expect(orderBodies[0].items).toEqual([{id:'qa-wallet',option:'',quantity:1}]);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('sd-cart')||'{}'));
 expect(saved).toEqual({'qa-shoe::42':1,'qa-wallet':1});
 await page.locator('#sdCheckoutDone').click();await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);
 await page.locator('#mobileAccountNav').click();await page.locator('#accountOrdersAction').click();
 const orderCard=page.locator('#accountOrdersList [data-order-number="SD-TEST-001"]');await expect(orderCard).toContainText('Chờ thanh toán');await expect(orderCard.locator('img')).toHaveCount(1);await expect(orderCard).not.toContainText('Giao hàng');
 await orderCard.locator('[data-order-payment-check]').click();await expect(orderCard).toContainText('Shop đã nhận đủ tiền');await expect(orderCard).toContainText('Đủ điều kiện');await expect(orderCard).toContainText('Chờ gửi hàng');await expect(orderCard).toContainText('Đã đồng bộ với Shop');expect(paymentRefreshRequests).toBe(1);
 await page.locator('#accountClose').click();await page.locator('#cartOpen').click();
 await page.locator('[data-cart-pick="qa-shoe::42"]').uncheck();
 await expect(page.locator('#cartCheckout')).toContainText('1 sản phẩm');
 const quoteCountBeforeSavedAddressCheckout=quoteBodies.length;await page.locator('#cartCheckout').click();await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible();await expect(page.locator('#sdCheckoutShippingStep')).toBeHidden();await expect.poll(()=>quoteBodies.length).toBeGreaterThan(quoteCountBeforeSavedAddressCheckout);await expect(page.locator('#checkoutDrawer input[name="fullName"]')).toHaveValue('Khách mua ngay');await expect(page.locator('#checkoutDrawer input[name="fullName"]')).not.toBeFocused();await expect(page.locator('#checkoutDrawer input[name="phone"]')).toHaveValue('0900000000');await expect(page.locator('#checkoutStreet')).toHaveValue('Địa chỉ kiểm thử');
 expect(quoteBodies.at(-1).items).toEqual([{id:'qa-wallet',option:'',quantity:1}]);
 await expect(page.locator('#checkoutDrawer')).toHaveCSS('width','390px');
 expect(errors).toEqual([]);
});
