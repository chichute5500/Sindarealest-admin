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
 await page.mouse.move(box.x+1,y);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width-1,y,{steps:16});
 await expect(page.locator('#sdCheckoutConfirmLabel')).toHaveText('Đang lấy mã đơn');
 await page.mouse.up();
}

async function assertCheckoutScrollAndHeader(page,requireScroll){
 const state=await page.evaluate(()=>{
  const drawer=document.querySelector('#checkoutDrawer'),form=document.querySelector('#checkoutForm');
  const header=document.querySelector('.checkout-header'),footer=document.querySelector('#checkoutDrawer .sd-checkout-footer');
  const title=header.querySelector('h2'),nav=document.querySelector('#sdCheckoutStepper'),intro=document.querySelector('.checkout-intro');
  const address=document.querySelector('#sdCheckoutReviewAddressRow'),rect=node=>node.getBoundingClientRect();
  // Mobile scroll root is the Checkout drawer itself, exactly like Cart.
  // Desktop deliberately retains its original nested form scroller.
  const mobile=innerWidth<=760,scrollOwner=mobile?drawer:form;
  form.scrollTop=0;drawer.scrollTop=0;
  const titleBox=rect(title),frame=rect(drawer),headY=rect(header).top,footerY=rect(footer).top,navY=rect(nav).top,introY=rect(intro).top,navVisible=nav.getClientRects().length>0;
  scrollOwner.scrollTop=scrollOwner.scrollHeight;
  const scroll=scrollOwner.scrollTop;
  const result={
   titleCentered:Math.abs((titleBox.left+titleBox.right)/2-(frame.left+frame.right)/2),
   titleWeight:parseInt(getComputedStyle(title).fontWeight,10),titleFont:getComputedStyle(title).fontFamily,
   oneScrollBody:nav.parentElement===form&&intro.parentElement===form&&address.parentElement===form&&document.querySelector('#paymentInstructions').parentElement===form&&header.parentElement===drawer&&footer.parentElement===drawer,
   headerShift:Math.abs(rect(header).top-headY),footerShift:Math.abs(rect(footer).top-footerY),
   navShift:navY-rect(nav).top,navVisible,introShift:introY-rect(intro).top,scroll,
   mobile,drawerOverflow:getComputedStyle(drawer).overflowY,formOverflow:getComputedStyle(form).overflowY,
   headerGlass:getComputedStyle(header).backgroundImage,footerGlass:getComputedStyle(footer).backgroundImage,
   cartHeaderGlass:getComputedStyle(document.querySelector('#cartDrawer .cart-header')).backgroundImage,
   cartHeaderRadius:getComputedStyle(document.querySelector('#cartDrawer .cart-header')).borderRadius,
   checkoutHeaderRadius:getComputedStyle(header).borderRadius,
   cartHeaderShadow:getComputedStyle(document.querySelector('#cartDrawer .cart-header')).boxShadow,
   checkoutHeaderShadow:getComputedStyle(header).boxShadow,
   cartTitleWeight:parseInt(getComputedStyle(document.querySelector('#cartDrawer .cart-header h2')).fontWeight,10),
   footerBorder:getComputedStyle(footer).borderTopWidth,
   cartScrollMask:getComputedStyle(document.querySelector('#cartList')).maskImage,
   checkoutScrollMask:getComputedStyle(form).maskImage,
   cartListBackground:getComputedStyle(document.querySelector('#cartList')).backgroundColor,
   checkoutFormBackground:getComputedStyle(form).backgroundColor,
   cartFooterBorder:getComputedStyle(document.querySelector('#cartDrawer .cart-bottom')).borderTopWidth,
   cartSurface:getComputedStyle(document.querySelector('#cartDrawer')).backgroundColor,
   checkoutSurface:getComputedStyle(drawer).backgroundColor,
   cartRadius:getComputedStyle(document.querySelector('#cartDrawer')).borderRadius,
   checkoutRadius:getComputedStyle(drawer).borderRadius,
   drawerLeft:frame.left,drawerRight:innerWidth-frame.right,
   outerShadow:getComputedStyle(drawer).boxShadow
  };
  form.scrollTop=0;drawer.scrollTop=0;
  return result;
 });
 // Payment product rows must be present immediately on step two; the
 // network price quote may load later, but it must never erase cart items.
 if(await page.locator('#sdCheckoutPaymentStep').isVisible()){
  const rows=await page.locator('#sdCheckoutItemSummary .sd-checkout-item').count();
  expect(rows,'Payment cannot show a blank "Sản phẩm trong đơn" tile').toBeGreaterThan(0);
 }
 expect(state.oneScrollBody).toBe(true);
 expect(state.titleCentered).toBeLessThanOrEqual(2);
 expect(state.titleWeight).toBeGreaterThanOrEqual(700);
 expect(state.titleFont).toContain('SD Serif');
 expect(state.headerShift).toBeLessThanOrEqual(1.5);
 expect(state.footerShift).toBeLessThanOrEqual(1.5);
 expect(state.cartHeaderGlass,'Cart uses a transmissive glass film within the already-blurred drawer').toContain('gradient');
 expect(state.headerGlass).toContain('gradient');
 expect(state.checkoutHeaderRadius).toBe(state.cartHeaderRadius);
 expect(state.cartHeaderShadow,'Cart preserves the existing optical Header shadow').toBe(state.checkoutHeaderShadow);
 expect(state.cartTitleWeight).toBeGreaterThanOrEqual(700);
 expect(state.footerGlass,'Footer must blend into the shared glass sheet').toBe('none');
 expect(state.footerBorder,'No horizontal line across bottom checkout').toBe('0px');
 expect(state.cartFooterBorder,'No horizontal line across cart bottom').toBe('0px');
 expect(state.checkoutSurface,'Same glass material as Cart').toBe(state.cartSurface);
 expect(state.cartScrollMask,'Cart items must stay fully legible, no edge fading').toBe('none');
 expect(state.checkoutScrollMask,'Checkout items must stay fully legible, no edge fading').toBe('none');
 expect(state.cartListBackground,'Cart scroll surface must have no separate strip').toBe('rgba(0, 0, 0, 0)');
 expect(state.checkoutFormBackground,'Checkout scroll surface must have no separate strip').toBe('rgba(0, 0, 0, 0)');
 if(page.viewportSize().width<=760){
  expect(state.drawerOverflow,'Mobile Checkout must scroll the real sheet like Cart').toBe('auto');
  expect(state.formOverflow,'No clipping strip from an inner mobile form scroller').toBe('visible');
  expect(state.checkoutRadius,'Checkout must use same rounding as cart').toBe(state.cartRadius);
  expect(parseFloat(state.checkoutRadius)).toBeGreaterThanOrEqual(24);
  expect(state.drawerLeft).toBeGreaterThanOrEqual(6);
  expect(state.drawerRight).toBeGreaterThanOrEqual(6);
 }
 if(requireScroll){
  expect(state.scroll,'Mobile step content must scroll together').toBeGreaterThan(12);
  if(state.navVisible)expect(state.navShift).toBeGreaterThan(10);
  expect(state.introShift).toBeGreaterThan(10);
 }
}

test('real Preview checkout: deposit/full amounts, all requested viewports and both themes, no payment receipt writes',async({page})=>{
 // Real mobile scroll evidence now captures both themes at 360px and 390px,
 // alongside the existing deposit/full and account flows. Give screenshot I/O
 // enough headroom without hiding assertion or visual-parity failures.
 test.setTimeout(90000);
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
 page.on('request',request=>{const path=new URL(request.url()).pathname;if(path==='/api/order-payment'&&request.method()==='GET')paymentRefreshReads++;if(path==='/api/orders'&&request.method()==='POST')createdOrders.push(request.postDataJSON());if(request.url().includes('/api/')&&!['GET','HEAD'].includes(request.method())&&path!=='/api/checkout-quote')writes.push(request.method()+' '+path)});
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
 // Capture the actual Cart material before checkout at the owner's mobile size,
 // rather than judging the result only from CSS tokens.
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'light'});
 await page.locator('.nav-wrap .nav').screenshot({path:join(output,'390x844-original-logo-header-material.png'),animations:'disabled'});
 // Compare optical glass under the same photographic product context as Owner's mobile reference.
 await page.evaluate(()=>{
  const item=document.querySelector('#catalogGrid .product-card');
  if(item)window.scrollTo({top:Math.max(0,item.getBoundingClientRect().top+window.scrollY-35),behavior:'instant'});
 });
 await expect(page.locator('.nav-wrap .nav')).toBeVisible();
 await page.waitForTimeout(250);
 await page.locator('.nav-wrap .nav').screenshot({path:join(output,'390x844-logo-header-over-products.png'),animations:'disabled'});
 await page.locator('#mobileCartNav').click();
 await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
 // Wait until both independent sliding layers have settled; an immediate
 // screenshot can blend the closing product viewer over the entering cart.
 await expect(page.locator('#productOverlay')).not.toHaveClass(/open/);
 await expect.poll(()=>page.locator('#cartDrawer').evaluate(el=>{
  const box=el.getBoundingClientRect();
  return Math.round(Math.max(Math.abs(box.left-7),Math.abs(innerWidth-box.right-7)));
 })).toBeLessThanOrEqual(2);
 await page.waitForTimeout(550);
 await expect(page.locator('#cartDrawer .cart-subtotal-bar #cartSubtotal')).toBeVisible();
 await expect(page.locator('#cartDrawer .cart-subtotal-bar #cartSubtotal')).not.toHaveText('—');
 await expect(page.locator('#cartCheckoutLabel')).toContainText('Thanh toán');
 await expect(page.locator('#cartDrawer .cart-note')).toHaveCount(0);
 await expect(page.locator('#cartZalo')).toHaveCount(0);
 const cartBarLayout=await page.locator('#cartCheckout').evaluate(button=>{
  const summary=button.previousElementSibling,subtotal=summary?.querySelector('#cartSubtotal');
  const s=summary?.getBoundingClientRect(),t=subtotal?.getBoundingClientRect(),b=button.getBoundingClientRect(),f=button.closest('.cart-bottom').getBoundingClientRect();
  const mat=el=>getComputedStyle(el);
  return {separate:summary?.classList.contains('cart-subtotal-bar')&&!button.contains(subtotal),summaryAbove:s&&s.bottom+4<=b.top,subtotalInside:s&&t&&t.top>=s.top&&t.bottom<=s.bottom,buttonInside:f.top<=b.top&&f.bottom>=b.bottom,material:mat(summary).backgroundImage===mat(button).backgroundImage&&mat(button).backgroundImage.includes('gradient'),shadow:mat(summary).boxShadow===mat(button).boxShadow&&mat(button).boxShadow===mat(document.querySelector('.nav-wrap .nav')).boxShadow};
 });
 expect(cartBarLayout.separate&&cartBarLayout.summaryAbove&&cartBarLayout.subtotalInside&&cartBarLayout.buttonInside).toBe(true);
 expect(cartBarLayout.material&&cartBarLayout.shadow,'Cart footer bars match the Storefront Header film').toBe(true);
 const cartMaterial=await page.evaluate(()=>{
  const nav=getComputedStyle(document.querySelector('.nav-wrap .nav'));
  const nodes=['#cartDrawer .cart-header','#cartDrawer .cart-subtotal-bar','#cartCheckout'];
  return nodes.map(selector=>{
   const el=document.querySelector(selector),s=getComputedStyle(el),edge=getComputedStyle(el,'::after');
   const alphaMatch=s.backgroundColor.match(/rgba?\(([^)]+)\)/);
   const alpha=alphaMatch?(alphaMatch[1].split(',')[3]===undefined?1:Number(alphaMatch[1].split(',')[3])):0;
   return {selector,alpha,backgroundMatches:s.backgroundImage===nav.backgroundImage,
    shadowMatches:s.boxShadow===nav.boxShadow,filterMatches:s.backdropFilter===nav.backdropFilter && s.webkitBackdropFilter===nav.webkitBackdropFilter && !s.backdropFilter.includes('brightness('),
    rim:edge.backgroundImage,overflow:s.overflow};
  });
 });
 for(const mat of cartMaterial){
  expect(mat.shadowMatches,'Cart preserves original logo Header shadow: '+mat.selector).toBe(true);
   expect(mat.filterMatches,'Nested drawer must not impersonate the Header filter: '+mat.selector).toBe(false);
  expect(mat.alpha,'Cart glass must be genuinely transparent so the scroll backdrop changes its appearance: '+mat.selector).toBe(0);
  expect(mat.rim).toContain('gradient');
 }
 // Verify the restored light-mode transparency (only the blur strength changes).
 const cartGlassFaces=await page.locator('#cartDrawer').evaluate(drawer=>
  ['.cart-header','.cart-subtotal-bar','#cartCheckout'].map(sel=>
   getComputedStyle(drawer.querySelector(sel)).backgroundImage)
 );
 for(const face of cartGlassFaces){
  // Chromium may quantize alpha to 8-bit channels.
  const alphas=[...face.matchAll(/rgba\(255, 255, 255, ([0-9.]+)\)/g)].map(m=>Number(m[1]));
  expect(alphas).toHaveLength(2);
  expect(Math.abs(alphas[0]-.70)).toBeLessThanOrEqual(.005);
  expect(Math.abs(alphas[1]-.55)).toBeLessThanOrEqual(.005);
 }
 // Check actual mobile computed filters: values must beat every other CSS selector.
 const cartFilterCascade=await page.evaluate(()=>{
  const targets=['#cartDrawer .cart-header','#cartDrawer .cart-subtotal-bar','#cartDrawer #cartCheckout'];
  const matches=targets.map(selector=>{
   const element=document.querySelector(selector),style=getComputedStyle(element);
   return {selector,backdrop:style.backdropFilter,webkit:style.webkitBackdropFilter,
    background:style.backgroundImage,ancestor:element.parentElement?.className||''};
  });
  return matches;
 });
 for(const lens of cartFilterCascade){
  expect(lens.backdrop).toContain('blur(56.784px)');
  if(lens.webkit)expect(lens.webkit).toContain('blur(56.784px)'); // Chromium may omit the vendor alias.
  expect(lens.background).toContain('linear-gradient(');
 }
 console.log('CART_THREE_BARS_COMPUTED_CASCADE',JSON.stringify(cartFilterCascade));
 await page.locator('#cartDrawer .cart-header').screenshot({path:join(output,'390x844-cart-title-glass.png'),animations:'disabled'});
 await page.locator('#cartDrawer .cart-subtotal-bar').screenshot({path:join(output,'390x844-cart-subtotal-glass.png'),animations:'disabled'});
 await page.locator('#cartCheckout').screenshot({path:join(output,'390x844-cart-checkout-glass.png'),animations:'disabled'});
 await page.screenshot({path:join(output,'390x844-cart-reference.png'),fullPage:false,animations:'disabled'});
 await page.locator('#cartClose').click();
 await expect(page.locator('#cartDrawer')).not.toHaveClass(/open/);
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
 // A saved address may already be hydrated from cache. Only the actual
 // province/ward codes are required; a new API request is not.
 const divisionState=await page.locator('#checkoutDrawer').evaluate(drawer=>({
  province:drawer.querySelector('#checkoutProvince')?.selectedOptions[0]?.dataset.code,
  ward:drawer.querySelector('#checkoutWard')?.selectedOptions[0]?.dataset.code
 }));
 expect(divisionState.province,'Checkout province must be valid').toMatch(/^\d+$/);
 expect(divisionState.ward,'Checkout ward must be valid').toMatch(/^\d+$/);
 const review=page.locator('#sdCheckoutReviewAddressRow');
 await expect(review).toBeVisible();
 await expect(review.locator('strong')).toHaveText('Địa chỉ nhận hàng');
 await expect(page.locator('#sdCheckoutReviewAddress')).toContainText('Khách kiểm tra Preview');
 await expect(page.locator('#sdCheckoutReviewAddress')).toContainText('Địa chỉ thử nghiệm Preview');
 const addressLayout=await review.evaluate(card=>{
  const b=card.getBoundingClientRect(),drawer=document.querySelector('#checkoutDrawer').getBoundingClientRect(),nav=document.querySelector('#sdCheckoutStepper').getBoundingClientRect(),intro=document.querySelector('.checkout-intro').getBoundingClientRect();
  const heading=getComputedStyle(card.querySelector('strong')),content=getComputedStyle(card.querySelector('p')),surface=getComputedStyle(card);
  // Relative to the animated drawer, not the viewport: enter transitions move both together.
  return {belowInfo:b.top>=nav.bottom-1,abovePayment:b.bottom<=intro.top+1,edgeLeft:b.left-drawer.left,edgeRight:drawer.right-b.right,paddingLeft:parseFloat(surface.paddingLeft),headingWeight:parseInt(heading.fontWeight,10),contentSize:parseFloat(content.fontSize)};
 });
 expect(addressLayout.belowInfo&&addressLayout.abovePayment,'Address must sit between the information stepper and payment title').toBe(true);
 expect(addressLayout.edgeLeft).toBeGreaterThanOrEqual(12);
 expect(addressLayout.edgeRight).toBeGreaterThanOrEqual(12);
 expect(addressLayout.paddingLeft).toBeGreaterThanOrEqual(13);
 expect(addressLayout.headingWeight).toBeGreaterThanOrEqual(700);
 expect(addressLayout.contentSize).toBeGreaterThanOrEqual(11);
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
   await assertCheckoutScrollAndHeader(page,width<=390);
   if(width<=390){
    // The checkout header, action buttons and slider's unfilled track must
    // use the same CURRENT computed optical face as the approved Cart bars,
    // not merely share CSS names. The green slider progress stays unchanged.
    const syncedGlass=await page.evaluate(()=>{
     const original=document.querySelector('#cartDrawer .cart-header');
     const source=getComputedStyle(original);
     return ['#checkoutDrawer .checkout-header','#sdCheckoutPrev','#checkoutSubmit','#sdCheckoutConfirmWrap'].map(selector=>{
      const node=document.querySelector(selector),style=getComputedStyle(node);
      return {selector,
       face:style.backgroundImage===source.backgroundImage,
       backdrop:style.backdropFilter===source.backdropFilter,
       shadow:style.boxShadow===source.boxShadow,
       reflectiveRim:getComputedStyle(node,'::after').backgroundImage===getComputedStyle(original,'::after').backgroundImage,
       radius:parseFloat(style.borderTopLeftRadius),
       hasBrightness:style.backdropFilter.includes('brightness(')};
     });
    });
    for(const bar of syncedGlass){
     expect(bar.face,'Checkout must transmit the same backdrop as Cart: '+bar.selector).toBe(true);
     expect(bar.backdrop,'Checkout blur/saturation must match Cart: '+bar.selector).toBe(true);
     expect(bar.shadow,'Checkout raised glass depth must match Cart: '+bar.selector).toBe(true);
     expect(bar.reflectiveRim,'Checkout reflective rim must match Cart: '+bar.selector).toBe(true);
     expect(bar.radius,'Checkout bars keep rounded glass edges: '+bar.selector).toBeGreaterThanOrEqual(22);
     expect(bar.hasBrightness,'No brightness-tinted checkout glass: '+bar.selector).toBe(false);
    }
    if(width===390){
     await page.locator('#checkoutDrawer .checkout-header').screenshot({path:join(output,`390x844-${theme}-checkout-header-glass.png`),animations:'disabled'});
     await page.locator('#checkoutDrawer .sd-checkout-actions').screenshot({path:join(output,`390x844-${theme}-checkout-actions-glass.png`),animations:'disabled'});
    }
    // Real mid-scroll proof for BOTH themes and narrow Android layouts:
    // the checkout content must move without shifting or cutting its
    // Cart-matched glass header and footer. These are actual scroll offsets,
    // not synthetic scroll events or CSS-string-only visual claims.
    const checkoutScroll=page.locator('#checkoutDrawer');
    const scrollEnd=await checkoutScroll.evaluate(el=>Math.max(0,el.scrollHeight-el.clientHeight));
    expect(scrollEnd,'Checkout must offer real mobile scrolling').toBeGreaterThan(12);
    const baseline=await page.locator('#checkoutDrawer').evaluate(el=>({
     header:el.querySelector('.checkout-header').getBoundingClientRect().top,
     footer:el.querySelector('.sd-checkout-footer').getBoundingClientRect().top
    }));
    const seenOffsets=[];
    for(const [position,fraction] of [['top',0],['middle',.5],['bottom',1]]){
     const actual=await checkoutScroll.evaluate((el,ratio)=>{
      el.scrollTop=Math.round((el.scrollHeight-el.clientHeight)*ratio);
      return el.scrollTop;
     },fraction);
     seenOffsets.push(actual);
     await page.waitForTimeout(60);
     const locations=await page.locator('#checkoutDrawer').evaluate(el=>({
      header:el.querySelector('.checkout-header').getBoundingClientRect().top,
      footer:el.querySelector('.sd-checkout-footer').getBoundingClientRect().top
     }));
     expect(Math.abs(locations.header-baseline.header),'Checkout glass header must remain fixed when scrolling').toBeLessThan(2);
     expect(Math.abs(locations.footer-baseline.footer),'Checkout glass actions must remain fixed when scrolling').toBeLessThan(2);
     await page.screenshot({path:join(output,`${width}x${height}-${theme}-checkout-cart-glass-scroll-${position}.png`),fullPage:false,animations:'disabled'});
    }
    expect(seenOffsets[0]).toBe(0);
    expect(seenOffsets[1]).toBeGreaterThan(seenOffsets[0]);
    expect(seenOffsets[2]).toBeGreaterThan(seenOffsets[1]);
    await checkoutScroll.evaluate(el=>{el.scrollTop=0});

   }
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
 await page.setViewportSize({width:390,height:844});
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
 await expect(page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]')).toHaveAttribute('aria-checked','true');
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#paymentInstructions')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-payment-transfer-stage')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeHidden();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Chờ thanh toán');
 await assertCheckoutScrollAndHeader(page,true);
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeHidden();
 await expect(review).toBeHidden();
 // The previous screenshot exposed sharp "Chờ thanh toán" lettering through
 // Checkout's white glass. With Cart-matched optics, the covered pixels must
 // actually blur; a CSS-string parity assertion alone cannot prove that.
 await expect(page.locator('#checkoutDrawer .sd-checkout-optical-lens')).toHaveCount(2);
 await page.locator('#checkoutDrawer').evaluate(el=>{el.scrollTop=Math.round((el.scrollHeight-el.clientHeight)/2);el.dispatchEvent(new Event('scroll'))});
 await expect.poll(()=>page.locator('#checkoutDrawer .sd-checkout-optical-mirror').count(),{timeout:5000})
  .toBeGreaterThan(0);
 await expect.poll(()=>page.locator('#checkoutForm').evaluate(form=>
  [...form.children].filter(el=>getComputedStyle(el).maskImage.includes('linear-gradient')).length
 ),{timeout:5000}).toBeGreaterThan(0);
 const realOcclusion=await page.locator('#checkoutDrawer').evaluate(drawer=>({
   mirrorCount:drawer.querySelectorAll('.sd-checkout-optical-mirror').length,
   maskedBlockCount:[...drawer.querySelector('#checkoutForm').children].filter(el=>getComputedStyle(el).maskImage.includes('linear-gradient')).length,
   mirrorFilters:[...drawer.querySelectorAll('.sd-checkout-optical-mirror')].map(el=>getComputedStyle(el).filter)
 }));
 expect(realOcclusion.mirrorCount,'Checkout must blur real text moving behind its bars').toBeGreaterThan(0);
 expect(realOcclusion.maskedBlockCount,'Sharp payment lettering must not remain legible under frosted bars').toBeGreaterThan(0);
 for(const filter of realOcclusion.mirrorFilters)expect(filter).toContain('blur(14px)');
 console.log('CHECKOUT_REAL_GLASS_OCCLUSION',JSON.stringify(realOcclusion));
 await page.screenshot({path:join(output,'390x844-checkout-qr-mid-scroll-clear.png'),fullPage:false,animations:'disabled'});
 await page.locator('#checkoutDrawer').evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'))});
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
  await expect(page.locator('#sdCheckoutConfirmRange')).toBeEnabled();
  await expect(page.locator('#sdCheckoutConfirmLabel')).toHaveText('Xác nhận đã thanh toán');
  await expect(page.locator('#sdCheckoutConfirmNote')).toContainText('Shop sẽ đối chiếu giao dịch');
 };
 await assertVerifiedQr();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:join(output,'390x844-buy-now-deposit-qr-step.png'),fullPage:false,animations:'disabled'});
 expect(createdOrders).toHaveLength(0);
 const writesBeforeDepositSwipe=writes.length;
 await swipeToConfirmPayment(page);
 await expect.poll(()=>writes.length).toBe(writesBeforeDepositSwipe+1);
 await expect.poll(()=>createdOrders.length).toBe(1);
 expect(writes.at(-1)).toBe('POST /api/orders');
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toContainText('MÃ ĐƠN HÀNG');
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Mã đơn hàng');
 await assertCheckoutScrollAndHeader(page,false);
 await expect(page.locator('#sdCheckoutStepSubtitle')).toHaveText('Lưu mã đơn bên dưới để theo dõi tiến độ. Shop sẽ cập nhật khi đã nhận thanh toán.');
 await page.screenshot({path:join(output,'390x844-buy-now-deposit-order-code.png'),fullPage:false,animations:'disabled'});
 await page.evaluate(()=>{window.__sdQrBeforeNextOrder=document.querySelector('#sdCheckoutQrWrap')});
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
 await expect(review).toBeVisible();
 expect(await page.evaluate(()=>document.querySelector('#sdCheckoutQrWrap')===window.__sdQrBeforeNextOrder),'The same QR control must survive both real Preview checkouts').toBe(true);
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
 await assertCheckoutScrollAndHeader(page,true);
 await expect(page.locator('#paymentInstructions')).toContainText('Thanh toán hết · giảm 5%');
 await expect(page.locator('#paymentInstructions')).toContainText(Math.round(actualCartTotal*.05).toLocaleString('vi-VN'));
 await expect(page.locator('#paymentInstructions')).not.toContainText('Đã thanh toán');
 await assertVerifiedQr();
 await page.screenshot({path:join(output,'390x844-cart-full-qr-step.png'),fullPage:false,animations:'disabled'});
 const createdBeforeFullSwipe=createdOrders.length;
 const writesBeforeFullSwipe=writes.length;
 await swipeToConfirmPayment(page);
 await expect.poll(()=>writes.length).toBe(writesBeforeFullSwipe+1);
 await expect.poll(()=>createdOrders.length).toBe(createdBeforeFullSwipe+1);
 expect(writes.at(-1)).toBe('POST /api/orders');
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeVisible();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Mã đơn hàng');
 await assertCheckoutScrollAndHeader(page,false);
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


test('eight-item mobile cart scrolls product text and photos behind three sticky glass bars',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'light'});
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 expect(response?.status()).toBe(200);
 const welcome=page.locator('#welcomeSplash');
 if(await welcome.count())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 const cards=page.locator('#catalogGrid .product-card').filter({hasText:'Giá:'});
 await expect(cards.nth(3)).toBeVisible({timeout:20000});
 // Capture the real logo film over three different catalog-image positions.
 // These are pixel references, not a percentage calculated from CSS strings.
 const headerPositions=await page.evaluate(()=>{
  const cards=Array.from(document.querySelectorAll('#catalogGrid .product-card')).slice(0,4);
  return cards.map(card=>Math.round(Math.max(0,card.getBoundingClientRect().top+scrollY-75)));
 });
 for(const [i,y] of [headerPositions[0],headerPositions[1],headerPositions[3]].entries()){
  await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);
  await page.waitForTimeout(80);
  await page.screenshot({path:join(output,'390x844-logo-header-product-scroll-'+['top','middle','bottom'][i]+'.png'),fullPage:false,animations:'disabled'});
 }
 const addButtons=cards.locator('[data-add]');
 const identifiers=await addButtons.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-add')));
 const seen=new Set();
 for(let i=0;i<Math.min(identifiers.length,16);i++){
  const id=identifiers[i];if(!id||seen.has(id))continue;seen.add(id);
  await addButtons.nth(i).click();
  if(await page.locator('#productOverlay.open').count()){
   const variant=page.locator('#detailVariants .sd-product-option-chip:not(:disabled)').first();
   if(await variant.count())await variant.click();
   await page.locator('#detailAdd').click();
   await page.locator('#detailClose').click();
  }
  const lines=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('sd-cart')||'{}')).length);
  if(lines>=8)break;
 }
 await page.locator('#mobileCartNav').click();
 const drawer=page.locator('#cartDrawer'),rows=page.locator('#cartList .cart-row');
 await expect(drawer).toHaveClass(/open/);
 // Catalog pagination/options may expose fewer than four distinct ready-to-add items.
 // Any missing rows are DOM-only fixtures for visual scroll QA (never a real order).
 const available=await rows.count();
 expect(available).toBeGreaterThanOrEqual(2);
 if(available<8)await rows.last().evaluate((row,count)=>{
  const list=row.parentElement;
  for(let i=count;i<8;i++){
   const fixture=row.cloneNode(true);fixture.dataset.qaVisualTile='true';
   fixture.querySelector('.cart-row-copy strong').textContent='GIÀY DA CÁ SẤU SIÊU CẤP VIP MẪU '+(i+1)+' - THIẾT KẾ ĐẶC BIỆT';
   list.appendChild(fixture);
  }
 },available);
 await expect(rows).toHaveCount(8);
 // Check the real browser-computed material, including rim, rather than only
 // searching for matching CSS token strings. Geometry and content may differ.
 const opticalScores=await drawer.evaluate(el=>{
  const original=document.querySelector('.nav-wrap .nav');
  const cssKeys=['backgroundImage','backgroundColor','boxShadow','borderTopWidth','borderTopStyle','borderTopColor'];
  const rimKeys=['backgroundImage','opacity','webkitMaskImage','borderRadius'];
  const score=(node,keys,pseudo)=>{
   const a=getComputedStyle(original,pseudo),b=getComputedStyle(node,pseudo);
   const matches=keys.filter(k=>a[k]===b[k]).length;
   return {matches,total:keys.length,ratio:matches/keys.length};
  };
  return ['.cart-header','.cart-subtotal-bar','#cartCheckout'].map(selector=>{
   const target=el.querySelector(selector),main=score(target,cssKeys,null),rim=score(target,rimKeys,'::after');
   return {selector,main,rim,ratio:(main.matches+rim.matches)/(main.total+rim.total),dynamicFilter:getComputedStyle(target).backdropFilter};
  });
 });
 for(const result of opticalScores){
  expect(result.main.matches,'Some computed properties remain shared with the logo Header for '+result.selector).toBeGreaterThanOrEqual(3);
   expect(result.rim.matches,'Header and Cart rim computed CSS should match for '+result.selector).toBe(result.rim.total);
  expect(result.dynamicFilter,'Cart uses the tuned nested glass filter on '+result.selector).toContain('blur(56.784px)');
   expect(result.dynamicFilter,'Do not darken the moving photographic backdrop on '+result.selector).not.toContain('brightness(');
 }
 console.log('CART_LOGO_GLASS_COMPUTED_STYLE_ONLY_NOT_VISUAL_PARITY',JSON.stringify(opticalScores));
  const layers=await drawer.evaluate(el=>{
   const read=element=>{const s=getComputedStyle(element);return {background:s.backgroundImage,backgroundColor:s.backgroundColor,backdropFilter:s.backdropFilter,webkitBackdropFilter:s.webkitBackdropFilter,overflow:s.overflow,position:s.position,transform:s.transform,isolation:s.isolation,opacity:s.opacity,zIndex:s.zIndex}};
   return {logoHeader:read(document.querySelector('.nav-wrap .nav')),drawer:read(el),cartList:read(el.querySelector('#cartList')),cartHeader:read(el.querySelector('.cart-header')),subtotal:read(el.querySelector('.cart-subtotal-bar')),payment:read(el.querySelector('#cartCheckout'))};
  });
  console.log('CART_GLASS_STACKING_AND_COMPOSITING_DIAGNOSTICS',JSON.stringify(layers));
 // Eight-item carts can contain long luxury product names. Reserve their
 // full card height in the visual fixture to reproduce the 390x844 overflow.
 await rows.evaluateAll(nodes=>nodes.forEach(row=>{row.style.minHeight='174px'}));
 await expect(page.locator('#cartDrawer .cart-subtotal-bar #cartSubtotal')).toBeVisible();
 await expect(page.locator('#cartZalo')).toHaveCount(0);
 await expect.poll(()=>drawer.evaluate(el=>Math.abs(el.getBoundingClientRect().left-7))).toBeLessThanOrEqual(2);
 await page.waitForTimeout(550);
 const metrics=await drawer.evaluate(el=>{
  const list=el.querySelector('#cartList'),header=el.querySelector('.cart-header'),footer=el.querySelector('.cart-bottom'),last=list.querySelector('.cart-row:last-child');
  const view=x=>x.getBoundingClientRect();
  const before={drawerScroll:getComputedStyle(el).overflowY,listScroll:getComputedStyle(list).overflowY,listScrollX:getComputedStyle(list).overflowX,drawerOverflow:el.scrollHeight-el.clientHeight,listOverflow:list.scrollHeight-list.clientHeight,headerTop:view(header).top,footerBottom:view(footer).bottom};
  el.scrollTop=el.scrollHeight;
  const after={headerTop:view(header).top,footerBottom:view(footer).bottom,lastBottom:view(last).bottom,footerTop:view(footer).top,scroll:el.scrollTop};
  el.scrollTop=0;
  return {before,after};
 });
 expect(metrics.before.drawerScroll,'Cart shell must own scrolling').toBe('auto');
 expect(metrics.before.listScroll,'Cart list must not clip product tiles').toBe('visible');
 expect(metrics.before.listScrollX,'Cart list must not clip horizontally either').toBe('visible');
 expect(metrics.before.listOverflow).toBeLessThanOrEqual(2);
 expect(metrics.before.drawerOverflow).toBeGreaterThan(0);
 expect(metrics.after.scroll).toBeGreaterThan(0);
 expect(Math.abs(metrics.after.headerTop-metrics.before.headerTop),'Header stays fixed').toBeLessThanOrEqual(2);
 expect(Math.abs(metrics.after.footerBottom-metrics.before.footerBottom),'Payment bar stays fixed').toBeLessThanOrEqual(2);
 expect(metrics.after.lastBottom,'Last product is fully reachable above the payment bar').toBeLessThanOrEqual(metrics.after.footerTop+2);
 // scrollHeight/2 is NOT the midpoint of the usable scroll range: it usually
 // clamps to the end and made prior middle/end screenshots indistinguishable.
 const maxScroll=await drawer.evaluate(el=>Math.max(0,el.scrollHeight-el.clientHeight));
 expect(maxScroll,'Eight-item visual QA must have an actual scroll range').toBeGreaterThan(24);
 await drawer.evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:join(output,'390x844-cart-eight-products-top.png'),fullPage:false,animations:'disabled'});
 await drawer.evaluate(el=>el.scrollTop=Math.floor((el.scrollHeight-el.clientHeight)/2));
 const midpoint=await drawer.evaluate(el=>el.scrollTop);
 expect(midpoint).toBeGreaterThan(0);
 expect(midpoint).toBeLessThan(maxScroll);
 await page.screenshot({path:join(output,'390x844-cart-eight-products-middle.png'),fullPage:false,animations:'disabled'});
 await drawer.evaluate(el=>el.scrollTop=el.scrollHeight-el.clientHeight);
 const endpoint=await drawer.evaluate(el=>el.scrollTop);
 expect(endpoint).toBeGreaterThan(midpoint);
 await page.screenshot({path:join(output,'390x844-cart-eight-products-scrolled.png'),fullPage:false,animations:'disabled'});


 // Eight scroll points expose real images, product names, prices and quantity
 // controls behind the glass. These are visual-only DOM fixtures, not orders.
 for(const [index,fraction] of [0,.15,.3,.45,.6,.75,.9,1].entries()){
  await drawer.evaluate((el,f)=>{el.scrollTop=Math.round((el.scrollHeight-el.clientHeight)*f);},fraction);
  await page.waitForTimeout(100);
  await page.screenshot({path:join(output,'390x844-cart-eight-items-position-'+String(index).padStart(2,'0')+'.png'),fullPage:false,animations:'disabled'});
  if([2,4,6].includes(index)){
   await page.locator('#cartDrawer .cart-subtotal-bar').screenshot({path:join(output,'390x844-eight-items-subtotal-'+index+'.png'),animations:'disabled'});
   await page.locator('#cartDrawer #cartCheckout').screenshot({path:join(output,'390x844-eight-items-pay-'+index+'.png'),animations:'disabled'});
  }
 }


 const layering=await page.evaluate(()=>{
  const shell=document.querySelector('#cartDrawer');
  const bars=['.cart-header','.cart-subtotal-bar','#cartCheckout'].map(sel=>shell.querySelector(sel));
  const rows=[...shell.querySelectorAll('.cart-row')];
  const describe=el=>{const s=getComputedStyle(el);return {selector:el.id||String(el.className||'').slice(0,64),position:s.position,zIndex:s.zIndex,transform:s.transform,isolation:s.isolation,opacity:s.opacity,filter:s.filter,backdrop:s.backdropFilter};};
  const rect=el=>el.getBoundingClientRect();
  const details=bars.map(bar=>{
   const b=rect(bar);
   const tests=rows.map(row=>{
    const r=rect(row);const left=Math.max(b.left,r.left),right=Math.min(b.right,r.right),top=Math.max(b.top,r.top),bottom=Math.min(b.bottom,r.bottom);
    if(right-left<20||bottom-top<15)return null;
    const x=Math.round((left+right)/2),y=Math.round((top+bottom)/2);
    const stack=document.elementsFromPoint(x,y).slice(0,9).map(el=>({element:el.id||String(el.className||'').slice(0,40),tag:el.tagName,ancestors:[...function*(e){for(let n=e;n&&n!==document.body;n=n.parentElement)yield n.id||String(n.className||'').slice(0,35)}(el)].slice(0,4)}));
    return {x,y,row:describe(row),stack};
   }).filter(Boolean);
   return {bar:describe(bar),parent:describe(bar.parentElement),intersectionSamples:tests};
  });
  return {details,list:describe(shell.querySelector('#cartList')),footer:describe(shell.querySelector('.cart-bottom')),drawer:describe(shell)};
 });
 console.log('CART_FOREGROUND_LAYER_DIAGNOSTIC',JSON.stringify(layering));

 console.log('CART_SCROLL_SCREENSHOT_POSITIONS',JSON.stringify({top:0,middle:midpoint,bottom:endpoint,domFixtureRows:await page.locator('[data-qa-visual-tile]').count(),note:'Images require Owner visual review; computed CSS is not a 95% score'}));


 // Verify the shipped lens, rather than a manually injected QA workaround.
 await drawer.evaluate(el=>{el.scrollTop=Math.round((el.scrollHeight-el.clientHeight)*.6)});
 await page.waitForTimeout(160);
 await expect(page.locator('#cartDrawer .sd-cart-optical-lens')).toHaveCount(3);
 const focus=await drawer.evaluate(el=>({
  blurredMirrors:el.querySelectorAll('.sd-cart-optical-mirror').length,
  softMaskedRows:[...el.querySelectorAll('#cartList .cart-row')].filter(row=>getComputedStyle(row).maskImage.includes('linear-gradient')).length,
  harshClippedRows:[...el.querySelectorAll('#cartList .cart-row')].filter(row=>getComputedStyle(row).clipPath!=='none').length,
  mirrorFilters:[...el.querySelectorAll('.sd-cart-optical-mirror')].map(row=>getComputedStyle(row).filter)
 }));
 expect(focus.blurredMirrors,'Product content crossing the glass must have an optical mirror').toBeGreaterThan(0);
 expect(focus.softMaskedRows,'Sharp source pixels behind glass must fade rather than hard clip').toBeGreaterThan(0);
 expect(focus.harshClippedRows,'Product cards must never have a rectangular hard clipping seam').toBe(0);
 for(const filter of focus.mirrorFilters)expect(filter).toContain('blur(14px)');
 console.log('CART_EIGHT_PRODUCT_REAL_GLASS_BLUR',JSON.stringify(focus));
 await page.screenshot({path:join(output,'390x844-eight-items-real-blur-60-percent.png'),fullPage:false,animations:'disabled'});
 await page.setViewportSize({width:360,height:800});
 await drawer.evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:join(output,'360x800-cart-eight-products-top.png'),fullPage:false,animations:'disabled'});
 await drawer.evaluate(el=>el.scrollTop=el.scrollHeight-el.clientHeight);
 await page.screenshot({path:join(output,'360x800-cart-eight-products-bottom.png'),fullPage:false,animations:'disabled'});

 // Reproduce Owner's six-item case: the two checkout bars must nearly meet
 // the mobile dock so sharp catalog text cannot remain exposed below Cart.
 await page.setViewportSize({width:390,height:844});
 await page.locator('#cartList .cart-row[data-qa-visual-tile]').evaluateAll(nodes=>nodes.slice(-2).forEach(node=>node.remove()));
 await expect(page.locator('#cartList .cart-row')).toHaveCount(6);
 await drawer.evaluate(el=>{el.scrollTop=el.scrollHeight});
 await page.waitForTimeout(160);
 const footerGeometry=await page.evaluate(()=>{
  const drawer=document.querySelector('#cartDrawer').getBoundingClientRect();
  const nav=document.querySelector('#mobileBottomNav').getBoundingClientRect();
  const checkout=document.querySelector('#cartCheckout').getBoundingClientRect();
  return {drawerBottom:drawer.bottom,navTop:nav.top,checkoutBottom:checkout.bottom,gap:nav.top-drawer.bottom};
 });
 expect(footerGeometry.gap,'No sharp catalog strip should remain visible below the Cart').toBeGreaterThanOrEqual(0);
 expect(footerGeometry.gap,'The Cart frosted edge must reach the dock without covering it').toBeLessThanOrEqual(7);
 console.log('CART_SIX_PRODUCT_BOTTOM_GLASS_FIXED',JSON.stringify(footerGeometry));
 await page.screenshot({path:join(output,'390x844-cart-six-products-bottom-frosted-to-dock.png'),fullPage:false,animations:'disabled'});
 // Desktop still needs all eight products for the inner-list scroll check.
 await page.locator('#cartList .cart-row').last().evaluate(row=>{
  for(let i=0;i<2;i++){
   const clone=row.cloneNode(true);clone.dataset.qaVisualTile='true';
   clone.querySelector('strong').textContent='Giày da cá sấu cao cấp kiểm tra thêm '+(i+7);
   row.parentElement.append(clone);
  }
 });
 await expect(page.locator('#cartList .cart-row')).toHaveCount(8);
 // Desktop scrolls the inner Cart list, unlike mobile's outer drawer scroll.
 // Verify the shipped optical lens survives switching to that scroll root.
 await page.setViewportSize({width:1280,height:800});
 const desktopList=page.locator('#cartList');
 await expect(desktopList).toHaveCSS('overflow-y','auto');
 const desktopScroll=await desktopList.evaluate(el=>{
  const maxScroll=Math.max(0,el.scrollHeight-el.clientHeight);
  el.scrollTop=maxScroll*.5;
  return {maxScroll,scrollTop:el.scrollTop};
 });
 expect(desktopScroll.maxScroll,'Eight-item desktop Cart must have enough rows to scroll').toBeGreaterThan(24);
 expect(desktopScroll.scrollTop).toBeGreaterThan(0);
 await page.waitForTimeout(160);
 await expect(page.locator('#cartDrawer .sd-cart-optical-lens')).toHaveCount(3);
 await page.screenshot({path:join(output,'1280x800-cart-eight-items-desktop-list-scrolled.png'),fullPage:false,animations:'disabled'});
});
