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
  const snapshot=()=>{const d=rect(drawer),f=rect(footer),formRect=rect(form),style=getComputedStyle(footer);return {drawerTop:d.top,drawerBottom:d.bottom,drawerHeight:drawer.clientHeight,scrollTop:drawer.scrollTop,scrollHeight:drawer.scrollHeight,footerTop:f.top,footerBottom:f.bottom,footerHeight:f.height,footerPosition:style.position,footerTopCss:style.top,footerHeightVar:getComputedStyle(drawer).getPropertyValue('--sd-checkout-footer-height').trim(),footerMarginTop:style.marginTop,footerMarginBottom:style.marginBottom,footerPaddingBottom:style.paddingBottom,footerBottomCss:style.bottom,formTop:formRect.top,formBottom:formRect.bottom,formHeight:formRect.height,gap:getComputedStyle(drawer).rowGap}};
  const beforePositions=snapshot();
  scrollOwner.scrollTop=scrollOwner.scrollHeight;
  const scroll=scrollOwner.scrollTop;
  const result={
   titleCentered:Math.abs((titleBox.left+titleBox.right)/2-(frame.left+frame.right)/2),
   titleWeight:parseInt(getComputedStyle(title).fontWeight,10),titleFont:getComputedStyle(title).fontFamily,
   oneScrollBody:nav.parentElement===form&&intro.parentElement===form&&address.parentElement===form&&document.querySelector('#paymentInstructions').parentElement===form&&header.parentElement===drawer&&footer.parentElement===drawer,
   headerShift:Math.abs(rect(header).top-headY),footerShift:Math.abs(rect(footer).top-footerY),diagnostics:{before:beforePositions,after:snapshot()},
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
 if(state.footerShift>1.5)console.log('CHECKOUT_STICKY_FOOTER_DIAGNOSTIC',JSON.stringify(state.diagnostics));
 expect(state.footerShift).toBeLessThanOrEqual(1.5);
 if(state.mobile){
  expect(state.diagnostics.before.footerPosition,'Mobile Checkout uses real CSS sticky positioning').toBe('sticky');
  expect(state.diagnostics.before.footerTopCss,'Order-code footer has a top pin to prevent the 14px shift').not.toBe('auto');
  expect(parseFloat(state.diagnostics.before.footerHeightVar),'The footer pin measures the rendered controls').toBeGreaterThan(45);
  expect(parseFloat(state.diagnostics.before.footerTopCss),'Browser-computed sticky top is an active pixel threshold').toBeGreaterThan(0);
 }
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
 test.setTimeout(120000);
 const headers={};
 if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET){
  headers['CF-Access-Client-Id']=process.env.CF_ACCESS_CLIENT_ID;
  headers['CF-Access-Client-Secret']=process.env.CF_ACCESS_CLIENT_SECRET;
  const previewOrigin=new URL(url).origin;
  await page.route('**/*',async route=>{
   if(new URL(route.request().url()).origin===previewOrigin)
    await route.continue({headers:{...route.request().headers(),...headers}});
   else await route.fallback(); // preserve context-level province/ward request fixture
  });
 }
 const errors=[],writes=[],createdOrders=[];let paymentRefreshReads=0;
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{const path=new URL(request.url()).pathname;if(path==='/api/order-payment'&&request.method()==='GET')paymentRefreshReads++;if(path==='/api/orders'&&request.method()==='POST')createdOrders.push(request.postDataJSON());if(request.url().includes('/api/')&&!['GET','HEAD'].includes(request.method())&&path!=='/api/checkout-quote')writes.push(request.method()+' '+path)});
 await page.addInitScript(()=>localStorage.setItem('sd-shipping-address',JSON.stringify({fullName:'Khách kiểm tra Preview',phone:'0900000000',email:'',province:'Thành phố Hồ Chí Minh',provinceCode:'79',ward:'Phường Bà Rịa',wardCode:'26560',streetAddress:'Địa chỉ thử nghiệm Preview'})));
 // Keep address selection deterministic in the isolated Preview browser run; the payment/order API remains real.
 let divisionRequests=0;
 // Intercept /p/ list and /p/<id>?depth=2 as the working order test does.
 await page.context().route(/^https:\/\/provinces\.open-api\.vn\/api\/v2\/p(?:\/.*)?(?:\?.*)?$/,async route=>{
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
   expect(mat.filterMatches,'Cart uses exactly the native logo Header backdrop filter: '+mat.selector).toBe(true);
  expect(mat.alpha,'Cart glass must be genuinely transparent so the scroll backdrop changes its appearance: '+mat.selector).toBe(0);
  expect(mat.rim).toContain('gradient');
 }
 // Real logo Header's translucent multigradient is the reference face.
 const cartGlassFaces=await page.locator('#cartDrawer').evaluate(drawer=>({
  logo:getComputedStyle(document.querySelector('.nav-wrap .nav')).backgroundImage,
  bars:['.cart-header','.cart-subtotal-bar','#cartCheckout'].map(sel=>
   getComputedStyle(drawer.querySelector(sel)).backgroundImage)
 }));
 for(const face of cartGlassFaces.bars){
  expect(face,'Each Cart bar reuses the original Header glass face').toBe(cartGlassFaces.logo);
  expect(face).toContain('radial-gradient(');
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
  expect(lens.backdrop).toContain('blur(17px)');
  if(lens.webkit)expect(lens.webkit).toContain('blur(17px)'); // Chromium may omit the vendor alias.
  expect(lens.background).toContain('radial-gradient(');
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
 const review=page.locator('#sdCheckoutReviewAddressRow');
 await expect(review).toBeVisible();
 await expect(review.locator('strong')).toHaveText('Địa chỉ nhận hàng');
 await expect(page.locator('#sdCheckoutReviewAddress')).toContainText('Khách kiểm tra Preview');
 await expect(page.locator('#sdCheckoutReviewAddress')).toContainText('Địa chỉ thử nghiệm Preview');
 // Saved address hydration is async in the approved Checkout.
 // Assert the finished codes rather than the initial payment-step paint.
 await expect.poll(()=>page.locator('#checkoutDrawer').evaluate(drawer=>{
  const province=drawer.querySelector('#checkoutProvince')?.selectedOptions[0]?.dataset.code;
  const ward=drawer.querySelector('#checkoutWard')?.selectedOptions[0]?.dataset.code;
  return /^\d+$/.test(province||'')&&/^\d+$/.test(ward||'');
 }),{timeout:15000}).toBe(true);
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

 for(const [width,height] of [[360,800],[390,844],[430,932],[768,1024],[1440,900]]){
  await page.setViewportSize({width,height});
  for(const theme of ['light','dark']){
   await page.emulateMedia({colorScheme:theme});
   if(theme==='dark')await expect(page.locator('html')).toHaveClass(/dark/);
   else await expect(page.locator('html')).not.toHaveClass(/dark/);
   await page.locator('#sdCheckoutOptions [data-sd-payment-option="deposit"]').click();
   await assertCheckoutScrollAndHeader(page,width<=430);
   if(width<=430){
    // Reproduce the Owner's exact failing state: the PAYMENT submit alone
    // is disabled and says "Đang chuẩn bị thanh toán…", with order details
    // scrolling beneath it. The Back button is a control/reference only.
    const disabledPaymentGlass=await page.locator('#checkoutDrawer').evaluate(async drawer=>{
     const submit=drawer.querySelector('#checkoutSubmit'),back=drawer.querySelector('#sdCheckoutPrev');
     const previous={disabled:submit.disabled,label:submit.textContent,scroll:drawer.scrollTop};
     submit.disabled=true;
     submit.textContent='Đang chuẩn bị thanh toán…';
     drawer.scrollTop=Math.round(Math.max(0,drawer.scrollHeight-drawer.clientHeight)*.7);
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     const glass=getComputedStyle(submit),backGlass=getComputedStyle(back);
     return {previous,opacity:glass.opacity,blur:glass.backdropFilter,
      background:glass.backgroundImage,shadow:glass.boxShadow,
      backOpacity:backGlass.opacity,backBlur:backGlass.backdropFilter,
      backBackground:backGlass.backgroundImage,backShadow:backGlass.boxShadow};
    });
    expect(disabledPaymentGlass.opacity,'Disabled payment submit must retain a full glass surface').toBe('1');
    expect(disabledPaymentGlass.backOpacity,'Back button must remain unchanged').toBe('1');
    expect(disabledPaymentGlass.blur).toBe(disabledPaymentGlass.backBlur);
    expect(disabledPaymentGlass.background).toBe(disabledPaymentGlass.backBackground);
    expect(disabledPaymentGlass.shadow).toBe(disabledPaymentGlass.backShadow);
    if(width===390){
     await page.locator('#checkoutDrawer .sd-checkout-actions').screenshot({
      path:join(output,`390x844-${theme}-payment-disabled-glass.png`),animations:'disabled'
     });
    }
    await page.locator('#checkoutDrawer').evaluate((drawer,previous)=>{
     const submit=drawer.querySelector('#checkoutSubmit');
     submit.disabled=previous.disabled;submit.textContent=previous.label;
     drawer.scrollTop=previous.scroll;
    },disabledPaymentGlass.previous);
    // The checkout header, action buttons and slider's unfilled track must
    // use the same CURRENT computed optical face as the approved Cart bars,
    // not merely share CSS names. The green slider progress stays unchanged.
    // Theme changes animate shadows; wait until computed face material settles.
    // Checkout header stays Cart-identical. Bottom actions share the same film
    // but have their own non-dark optical contact shadow.
    await expect.poll(()=>page.evaluate(()=>{
     const original=getComputedStyle(document.querySelector('#cartDrawer .cart-header')).boxShadow;
     const header=getComputedStyle(document.querySelector('#checkoutDrawer .checkout-header')).boxShadow;
     const action=getComputedStyle(document.querySelector('#sdCheckoutPrev')).boxShadow;
     return header===original
      &&['#checkoutSubmit','#sdCheckoutConfirmWrap','#sdCheckoutDone']
       .every(sel=>getComputedStyle(document.querySelector(sel)).boxShadow===action)
      &&action!==original;
    }),{timeout:5000}).toBe(true);
    // The native logo Header is the reference for floating controls.
    // The Owner-approved drawer tint and native 24px frost are now rendered on
    // a behind-content plane, NOT as an ancestor backdrop root. This lets both
    // headers blur real text/QR while their full drawer stays visually frosted.
    const logoParity=await page.evaluate(()=>{
     const logo=getComputedStyle(document.querySelector('.nav-wrap .nav'));
     const cart=getComputedStyle(document.querySelector('#cartDrawer'));
     const checkout=getComputedStyle(document.querySelector('#checkoutDrawer'));
     const selectors=['#cartDrawer .cart-header','#cartDrawer .cart-subtotal-bar',
      '#cartCheckout','#checkoutDrawer .checkout-header','#sdCheckoutPrev',
      '#checkoutSubmit','#sdCheckoutConfirmWrap'];
     const tint=[getComputedStyle(document.querySelector('#cartDrawer'),'::before'),
      getComputedStyle(document.querySelector('#checkoutDrawer'),'::before')];
     return {rootFilters:[cart.backdropFilter,checkout.backdropFilter],
      rootWebkit:[cart.webkitBackdropFilter,checkout.webkitBackdropFilter],
      rootBackgrounds:[cart.backgroundColor,checkout.backgroundColor],
      tintFilters:tint.map(x=>x.backdropFilter),
      tintWebkit:tint.map(x=>x.webkitBackdropFilter),
      tintBackgrounds:tint.map(x=>x.backgroundColor),
      tintPosition:tint.map(x=>x.position),
      tintPointerEvents:tint.map(x=>x.pointerEvents),
      tintGeometry:[document.querySelector('#cartDrawer'),document.querySelector('#checkoutDrawer')].map((host,i)=>{
       const box=getComputedStyle(host),pane=tint[i];
       return {id:host.id,clientWidth:host.clientWidth,clientHeight:host.clientHeight,
        paneWidth:parseFloat(pane.width),paneHeight:parseFloat(pane.height),
        insetLeft:parseFloat(pane.marginLeft),insetTop:parseFloat(pane.marginTop),stickyTop:parseFloat(pane.top),
        paddingLeft:parseFloat(box.paddingLeft),paddingTop:parseFloat(box.paddingTop)};
      }),
      match:selectors.map(selector=>{
       const glass=getComputedStyle(document.querySelector(selector));
       return {selector,face:glass.backgroundImage===logo.backgroundImage,
        filter:glass.backdropFilter===logo.backdropFilter,
        opacity:glass.opacity};
      })};
    });
    expect(logoParity.rootFilters).toEqual(['none','none']);
    // Chromium may omit the legacy vendor property entirely. Only the
    // standard backdrop-filter is mandatory; check vendor alias if exposed.
    for(const value of logoParity.rootWebkit)if(value!==undefined){
     expect(value).toBe('none');
    }
    for(const value of logoParity.tintFilters){
     expect(value,'The approved drawer background remains natively frosted').toContain('blur(24px)');
    }
    for(const value of logoParity.tintWebkit)if(value!==undefined){
     expect(value).toContain('blur(24px)');
    }
    expect(logoParity.tintPosition).toEqual(['sticky','sticky']);
    expect(logoParity.tintPointerEvents).toEqual(['none','none']);
    for(const pane of logoParity.tintGeometry){
     expect(Math.abs(pane.clientWidth-pane.paneWidth),'Frost must reach BOTH inner edges: '+pane.id).toBeLessThanOrEqual(1);
     expect(Math.abs(pane.clientHeight-pane.paneHeight),'Frost must fill entire frame height: '+pane.id).toBeLessThanOrEqual(1);
     expect(Math.abs(pane.insetLeft+pane.paddingLeft),'Frost left edge must align with frame, no inset rectangle: '+pane.id).toBeLessThanOrEqual(1);
     expect(Math.abs(pane.insetTop+pane.paddingTop),'Frost initial position aligns with frame: '+pane.id).toBeLessThanOrEqual(1);
     expect(Math.abs(pane.stickyTop+pane.paddingTop),'Sticky top must sit ABOVE the padding, never leave a dark strip: '+pane.id).toBeLessThanOrEqual(1);
    }
    console.log('NATIVE_GLASS_PADDING_BOX_GEOMETRY',JSON.stringify(logoParity.tintGeometry));
    for(const value of logoParity.tintBackgrounds){
     const alpha=Number(value.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1]??1);
     expect(alpha,'The original drawer tint must survive on the behind-content sheet').toBeGreaterThanOrEqual(.65);
    }
    for(const item of logoParity.match){
     expect(item.face,'Real backdrop face equals approved logo Header: '+item.selector).toBe(true);
     expect(item.filter,'Native backdrop blur equals logo Header: '+item.selector).toBe(true);
     expect(item.opacity,'Real glass remains fully composited: '+item.selector).toBe('1');
    }
    const syncedGlass=await page.evaluate(()=>{
     const original=document.querySelector('#cartDrawer .cart-header');
     const source=getComputedStyle(original);
     return ['#checkoutDrawer .checkout-header','#sdCheckoutPrev','#checkoutSubmit','#sdCheckoutConfirmWrap'].map(selector=>{
      const node=document.querySelector(selector),style=getComputedStyle(node);
      return {selector,
       face:style.backgroundImage===source.backgroundImage,
       backdrop:style.backdropFilter===source.backdropFilter,
       shadow:style.boxShadow===(selector==='#checkoutDrawer .checkout-header'
        ?source.boxShadow:getComputedStyle(document.querySelector('#sdCheckoutPrev')).boxShadow),
       reflectiveRim:getComputedStyle(node,'::after').backgroundImage===getComputedStyle(original,'::after').backgroundImage,
       radius:parseFloat(style.borderTopLeftRadius),
       hasBrightness:style.backdropFilter.includes('brightness(')};
     });
    });
    for(const bar of syncedGlass){
     expect(bar.face,'Checkout must transmit the same backdrop as Cart: '+bar.selector).toBe(true);
     expect(bar.backdrop,'Checkout blur/saturation must match Cart: '+bar.selector).toBe(true);
     expect(bar.shadow,'Each checkout surface must use the correct control-level glass shadow: '+bar.selector).toBe(true);
     expect(bar.reflectiveRim,'Checkout reflective rim must match Cart: '+bar.selector).toBe(true);
     expect(bar.radius,'Checkout bars keep rounded glass edges: '+bar.selector).toBeGreaterThanOrEqual(22);
     expect(bar.hasBrightness,'No brightness-tinted checkout glass: '+bar.selector).toBe(false);
    }
    if(width===390||width===430){
     await page.locator('#checkoutDrawer .checkout-header').screenshot({path:join(output,`${width}x${height}-${theme}-checkout-header-glass.png`),animations:'disabled'});
     await page.locator('#checkoutDrawer .sd-checkout-actions').screenshot({path:join(output,`${width}x${height}-${theme}-checkout-actions-glass.png`),animations:'disabled'});
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
 // Mobile drawer, not the inner form, is the active scroll root. This
 // assertion must happen BEFORE assertCheckoutScrollAndHeader resets scroll.
 await expect.poll(()=>page.locator('#checkoutDrawer').evaluate(async drawer=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return Math.round(drawer.scrollTop);
 })).toBe(0);
 await expect(page.locator('#checkoutForm')).toHaveJSProperty('scrollTop',0);
 await expect(page.locator('#paymentInstructions .sd-checkout-qr-head strong')).toBeInViewport();
 await page.screenshot({path:join(output,'390x844-buy-now-qr-opened-at-top.png'),fullPage:false,animations:'disabled'});
 await assertCheckoutScrollAndHeader(page,true);
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeHidden();
 await expect(review).toBeHidden();
 // Optical masking previously hid QR pixels in black bands during rapid scroll.
 // Native backdrop-filter must never create DOM mirrors or mask the source.
 await page.locator('#checkoutDrawer').evaluate(el=>{el.scrollTop=Math.round((el.scrollHeight-el.clientHeight)/2)});
 const nativeGlass=await page.locator('#checkoutDrawer').evaluate(async drawer=>{
  const samples=[];
  for(let i=0;i<16;i++){
   drawer.scrollTop=Math.round((drawer.scrollHeight-drawer.clientHeight)*(i%2===0?.85:.12));
   await new Promise(resolve=>requestAnimationFrame(resolve));
   const body=[...drawer.querySelector('#checkoutForm').children];
   samples.push({
    mirrors:drawer.querySelectorAll('[class*="optical-mirror"],[class*="optical-lens"]').length,
    masked:body.filter(el=>getComputedStyle(el).maskImage!=='none').length,
    qrMask:getComputedStyle(drawer.querySelector('#sdCheckoutQrWrap')).maskImage,
    headerBlur:getComputedStyle(drawer.querySelector('.checkout-header')).backdropFilter,
    buttonBlur:getComputedStyle(drawer.querySelector('#sdCheckoutConfirmWrap')).backdropFilter
   });
  }
  return samples;
 });
 expect(nativeGlass.every(frame=>frame.mirrors===0&&frame.masked===0&&frame.qrMask==='none'),
  'Fast checkout scroll must never mask the form or QR').toBe(true);
 expect(nativeGlass.every(frame=>frame.headerBlur.includes('blur(')&&frame.buttonBlur.includes('blur(')),
  'Glass remains native across every fast-scroll frame').toBe(true);
 console.log('CHECKOUT_NATIVE_GLASS_FAST_SCROLL',JSON.stringify(nativeGlass));
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
  await expect(page.locator('#sdCheckoutConfirmNote')).toBeHidden();
  await expect(page.locator('#sdCheckoutConfirmNote')).toBeEmpty();
 };
 await assertVerifiedQr();
 const qrHead=page.locator('#sdCheckoutQrWrap .sd-checkout-qr-head');
 await expect(qrHead).toContainText('BƯỚC 1 / 2 · THANH TOÁN');
 await expect(qrHead).toContainText('Chuyển khoản ngân hàng');
 await expect(qrHead).toContainText('Chuyển khoản theo thông tin bên dưới');
 await expect(page.locator('#paymentInstructions .sd-payment-transfer-stage > .sd-payment-stage-label')).toHaveCount(0);
 await expect(page.locator('#paymentInstructions .sd-payment-transfer-stage > .sd-payment-truth-note')).toHaveCount(0);
 const qrSurfaces=await page.locator('#checkoutDrawer').evaluate(drawer=>{
  const panel=getComputedStyle(drawer.querySelector('#paymentInstructions'));
  const footer=getComputedStyle(drawer.querySelector('.sd-checkout-footer'));
  const panes=[...drawer.querySelectorAll('[class*="optical-lens"]')];
  const actions=getComputedStyle(drawer.querySelector('.sd-checkout-actions'));
  const button=getComputedStyle(drawer.querySelector('#sdCheckoutPrev'));
  return {panelBackground:panel.backgroundColor,footerBackground:footer.backgroundColor,
   panelImage:panel.backgroundImage,footerImage:footer.backgroundImage,
   panelBorder:panel.borderTopWidth,footerBlur:footer.backdropFilter,
   footerShadow:footer.boxShadow,footerIsolation:footer.isolation,
   footerOutline:footer.outlineStyle,actionsBackground:actions.backgroundColor,
   actionsShadow:actions.boxShadow,buttonShadow:button.boxShadow,
   footerOpticalPanes:panes.length};
 });
 expect(qrSurfaces.panelBackground).toBe('rgba(0, 0, 0, 0)');
 expect(qrSurfaces.footerBackground).toBe('rgba(0, 0, 0, 0)');
 expect(qrSurfaces.panelImage).toBe('none');
 expect(qrSurfaces.footerImage).toBe('none');
 expect(qrSurfaces.panelBorder).toBe('0px');
 expect(qrSurfaces.footerBlur).toBe('none');
 expect(qrSurfaces.footerShadow).toBe('none');
 expect(qrSurfaces.footerIsolation).toBe('auto');
 expect(qrSurfaces.footerOutline).toBe('none');
 expect(qrSurfaces.actionsBackground).toBe('rgba(0, 0, 0, 0)');
 expect(qrSurfaces.actionsShadow).toBe('none');
 expect(qrSurfaces.buttonShadow).toContain('rgba(103, 169, 205, 0.1)');
 expect(qrSurfaces.footerOpticalPanes).toBe(0);
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
 await expect(page.locator('#sdCheckoutPaymentStep .sd-checkout-caution')).toHaveCount(0);
 for(const selector of ['#sdCheckoutSelectedAmount','#sdCheckoutRemaining','#sdCheckoutDiscount']){
  await expect(page.locator(selector),'Before choosing payment, '+selector+' must be blank').toBeEmpty();
 }
 const expectedCartFullAmount=actualCartTotal-Math.round(actualCartTotal*.05);
 // Verify actual cart navigation through BOTH buttons, preserving selected items.
 await page.locator('#checkoutBack').click();
 await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
 await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);
 await expect(page.locator('#cartCheckout')).toContainText('1 sản phẩm');
 await page.locator('#cartCheckout').click();
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible({timeout:15000});
 await expect(cartOptions).toHaveCount(2,{timeout:15000});
 await page.locator('#sdCheckoutPrev').click();
 await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
 await expect(page.locator('#checkoutDrawer')).not.toHaveClass(/open/);
 await expect(page.locator('#cartCheckout')).toContainText('1 sản phẩm');
 await page.locator('#cartCheckout').click();
 await expect(page.locator('#sdCheckoutPaymentStep')).toBeVisible({timeout:15000});
 await expect(cartOptions).toHaveCount(2,{timeout:15000});
 await expect(page.locator('#sdCheckoutOptions [aria-checked="true"]')).toHaveCount(0);
 const beforeChoiceScroll=await page.locator('#checkoutDrawer').evaluate(d=>{d.scrollTop=d.scrollHeight;return d.scrollTop});
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#checkoutSubmit')).toHaveText('Hãy chọn cách thanh toán');
 await expect(page.locator('#checkoutMessage')).toBeEmpty();
 await expect(page.locator('#sdCheckoutOptions')).toHaveClass(/sd-checkout-needs-choice/);
 const blinkAnimations=await cartOptions.evaluateAll(els=>els.map(el=>getComputedStyle(el).animationName));
 expect(blinkAnimations).toEqual(['sd-checkout-choice-alert','sd-checkout-choice-alert']);
 await page.waitForTimeout(850);
 await page.screenshot({path:join(output,'390x844-payment-choice-red-blink.png'),fullPage:false,animations:'allow'});
 const choiceScroll=await page.locator('#checkoutDrawer').evaluate(d=>({
  scrollTop:d.scrollTop,top:d.querySelector('#sdCheckoutOptions').getBoundingClientRect().top,
  bottom:d.querySelector('#sdCheckoutOptions').getBoundingClientRect().bottom,
  frameTop:d.getBoundingClientRect().top,frameBottom:d.getBoundingClientRect().bottom
 }));
 // When removing the redundant box makes both choices already visible,
 // the correct behavior is to stay in place rather than manufacture a scroll.
 expect(choiceScroll.scrollTop,'Invalid submission does not scroll away from the choices').toBeLessThanOrEqual(beforeChoiceScroll);
 expect(choiceScroll.top,'Choices are visible in Checkout').toBeGreaterThan(choiceScroll.frameTop+12);
 expect(choiceScroll.bottom).toBeLessThan(choiceScroll.frameBottom-12);
 await expect(page.locator('#sdCheckoutOptions')).not.toHaveClass(/sd-checkout-needs-choice/,{timeout:3500});
 await expect(page.locator('#checkoutSubmit')).toHaveText('Hãy chọn cách thanh toán');
 await page.locator('#sdCheckoutOptions [data-sd-payment-option="full"]').click();
 await expect(page.locator('#checkoutSubmit')).toHaveText('Tiến hành thanh toán →');
 await expect(page.locator('#sdCheckoutOptions')).not.toHaveAttribute('aria-invalid');
 await expect(page.locator('#checkoutMessage')).toBeEmpty();
 await expect(page.locator('#sdCheckoutSelectedAmount')).toContainText(expectedCartFullAmount.toLocaleString('vi-VN'));
 await expect(page.locator('#sdCheckoutDiscount')).toContainText(Math.round(actualCartTotal*.05).toLocaleString('vi-VN'));
 await expect(page.locator('#sdCheckoutRemaining')).toContainText('0');
 await page.locator('#checkoutSubmit').click();
 await expect(page.locator('#paymentInstructions')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-payment-transfer-stage')).toBeVisible();
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeHidden();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Chờ thanh toán');
 await expect.poll(()=>page.locator('#checkoutDrawer').evaluate(async drawer=>{
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  return Math.round(drawer.scrollTop);
 })).toBe(0);
 await expect(page.locator('#checkoutForm')).toHaveJSProperty('scrollTop',0);
 await expect(page.locator('#paymentInstructions .sd-checkout-qr-head strong')).toBeInViewport();
 await page.screenshot({path:join(output,'390x844-cart-full-qr-opened-at-top.png'),fullPage:false,animations:'disabled'});
 const qrTitleOffset=await page.locator('#checkoutDrawer .checkout-heading h2').evaluate(title=>{
  const el=document.querySelector('#checkoutDrawer'),drawer=el.getBoundingClientRect(),rect=title.getBoundingClientRect(),
   heading=title.closest('.checkout-heading'),head=heading.getBoundingClientRect();
  const style=getComputedStyle(title);
  const offset=Math.abs((rect.left+rect.right)/2-(drawer.left+drawer.right)/2);
  const details={offset,classes:el.className,drawerX:drawer.x,drawerWidth:drawer.width,
   headingX:head.x,headingWidth:head.width,titleX:rect.x,titleWidth:rect.width,
   styleLeft:style.left,cssInset:el.style.getPropertyValue('--sd-native-glass-pad-left'),
   mediaMatch:matchMedia('(max-width:760px)').matches,viewport:innerWidth};
  return details;
 });
 console.log('PAYMENT_QR_CENTER_DIAGNOSTIC',JSON.stringify(qrTitleOffset));
 console.log('PAYMENT_QR_MOBILE_TITLE_CENTER_OFFSET_PX',qrTitleOffset.offset);
 expect(qrTitleOffset.offset).toBeLessThanOrEqual(2);
 // Preserve the pre-existing strict header-centering assertion, but defer its
 // failure so we can still measure the new fast-slider requirement in the same
 // bounded Preview test. Never silently turn the header assertion green.
 let qrHeaderAssertionError=null;
 try{await assertCheckoutScrollAndHeader(page,true)}
 catch(error){
  qrHeaderAssertionError=error;
  console.log('QR_HEADER_CENTERING_UNRESOLVED',error.message);
  await page.screenshot({path:join(output,'390x844-qr-header-centering-diagnostic.png'),fullPage:false,animations:'disabled'});
 }
 await expect(page.locator('#paymentInstructions')).toContainText('Thanh toán hết · giảm 5%');
 await expect(page.locator('#paymentInstructions')).toContainText(Math.round(actualCartTotal*.05).toLocaleString('vi-VN'));
 await expect(page.locator('#paymentInstructions')).not.toContainText('Đã thanh toán');
 await assertVerifiedQr();
 await page.screenshot({path:join(output,'390x844-cart-full-qr-step.png'),fullPage:false,animations:'disabled'});
 const createdBeforeFullSwipe=createdOrders.length;
 const writesBeforeFullSwipe=writes.length;
 // Single-frame quick pull must keep fill and arrow aligned without transition lag.
 const quickSlider=page.locator('#sdCheckoutConfirmRange');
 await expect(quickSlider).toBeVisible();
 const quickBox=await quickSlider.boundingBox();
 if(!quickBox)throw Error('Visible slider has no box');
 const quickY=quickBox.y+quickBox.height/2;
 await page.mouse.move(quickBox.x+1,quickY);
 await page.mouse.down();
 await page.mouse.move(quickBox.x+quickBox.width*.72,quickY,{steps:1});
 const quickPaint=await quickSlider.evaluate(el=>{
  const pct=Number(el.value),wrap=document.querySelector('#sdCheckoutConfirmWrap');
  const expected=pct===0?0:pct===100?el.clientWidth:28+(el.clientWidth-56)*pct/100;
  return {pct,expected,actual:parseFloat(wrap.style.getPropertyValue('--sd-confirm-fill')),
   painted:parseFloat(getComputedStyle(wrap,'::before').width),
   duration:getComputedStyle(wrap,'::before').transitionDuration};
 });
 expect(quickPaint.pct).toBeGreaterThan(20);
 expect(quickPaint.pct).toBeLessThan(100);
 expect(Math.abs(quickPaint.actual-quickPaint.expected)).toBeLessThan(1);
 expect(Math.abs(quickPaint.painted-quickPaint.expected)).toBeLessThan(2);
 expect(quickPaint.duration).toBe('0s');
 console.log('FAST_SWIPE_NO_LAG_MEASURED',JSON.stringify(quickPaint));
 await page.screenshot({path:join(output,'390x844-fast-swipe-green-fill.png'),fullPage:false,animations:'disabled'});
 await page.mouse.up();
 await expect(quickSlider).toHaveValue('0');
 expect(createdOrders.length).toBe(createdBeforeFullSwipe);
 await swipeToConfirmPayment(page);
 await expect.poll(()=>writes.length).toBe(writesBeforeFullSwipe+1);
 await expect.poll(()=>createdOrders.length).toBe(createdBeforeFullSwipe+1);
 expect(writes.at(-1)).toBe('POST /api/orders');
 await expect(page.locator('#paymentInstructions .sd-order-reference')).toBeVisible();
 await expect(page.locator('#sdCheckoutStepTitle')).toHaveText('Mã đơn hàng');
 let orderHeaderAssertionError=null;
 try{await assertCheckoutScrollAndHeader(page,false)}
 catch(error){
  orderHeaderAssertionError=error;
  console.log('ORDER_HEADER_CENTERING_UNRESOLVED',error.message);
 }
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
 if(qrHeaderAssertionError)throw qrHeaderAssertionError;
 if(orderHeaderAssertionError)throw orderHeaderAssertionError;
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
  expect(result.dynamicFilter,'Cart shares the approved Header blur on '+result.selector).toContain('blur(17px)');
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
  const before={drawerScroll:getComputedStyle(el).overflowY,listScroll:getComputedStyle(list).overflowY,listScrollX:getComputedStyle(list).overflowX,drawerOverflow:el.scrollHeight-el.clientHeight,listOverflow:list.scrollHeight-list.clientHeight,headerTop:view(header).top,footerBottom:view(footer).bottom,footerPosition:getComputedStyle(footer).position};
  el.scrollTop=el.scrollHeight;
  const after={headerTop:view(header).top,footerBottom:view(footer).bottom,lastBottom:view(last).bottom,footerTop:view(footer).top,scroll:el.scrollTop};
  el.scrollTop=0;
  return {before,after};
 });
 console.log('CART_EIGHT_ITEM_STICKY_GEOMETRY',JSON.stringify(metrics));
 expect(metrics.before.footerPosition,'Native Cart action bar remains sticky, never relative').toBe('sticky');
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


 // The actual Cart rows must remain intact when scrolling behind floating bars.
 await drawer.evaluate(el=>{el.scrollTop=Math.round((el.scrollHeight-el.clientHeight)*.6)});
 await page.waitForTimeout(100);
 const focus=await drawer.evaluate(el=>({
   overlays:el.querySelectorAll('[class*="optical-mirror"],[class*="optical-lens"]').length,
   maskedRows:[...el.querySelectorAll('#cartList .cart-row')].filter(row=>getComputedStyle(row).maskImage!=='none').length,
   harshClippedRows:[...el.querySelectorAll('#cartList .cart-row')].filter(row=>getComputedStyle(row).clipPath!=='none').length,
   headerBlur:getComputedStyle(el.querySelector('.cart-header')).backdropFilter,
   subtotalBlur:getComputedStyle(el.querySelector('.cart-subtotal-bar')).backdropFilter,
   checkoutBlur:getComputedStyle(el.querySelector('#cartCheckout')).backdropFilter
 }));
 expect(focus.overlays,'Cart needs no duplicate blurred content').toBe(0);
 expect(focus.maskedRows,'No sharp source pixels may be erased by dynamic masks').toBe(0);
 expect(focus.harshClippedRows,'Product cards must never clip').toBe(0);
 expect([focus.headerBlur,focus.subtotalBlur,focus.checkoutBlur].every(x=>x.includes('blur(')),
 'All three Cart bars keep native frosted glass').toBe(true);
 console.log('CART_EIGHT_PRODUCTS_NATIVE_GLASS',JSON.stringify(focus));
 const cartRapidFrames=await drawer.evaluate(async el=>{
  const rows=[...el.querySelectorAll('#cartList .cart-row')],frames=[];
  for(let i=0;i<18;i++){
   el.scrollTop=Math.round((el.scrollHeight-el.clientHeight)*(i%2===0?.92:.08));
   await new Promise(resolve=>requestAnimationFrame(resolve));
   frames.push({
    masked:rows.filter(row=>getComputedStyle(row).maskImage!=='none').length,
    clones:el.querySelectorAll('[class*="optical-mirror"],[class*="optical-lens"]').length,
    clipped:rows.filter(row=>getComputedStyle(row).clipPath!=='none').length
   });
  }
  return frames;
 });
 expect(cartRapidFrames.every(x=>x.masked===0&&x.clones===0&&x.clipped===0),
  'No cart source content may disappear on any rapid scroll frame').toBe(true);
 console.log('CART_NATIVE_GLASS_FAST_SCROLL',JSON.stringify(cartRapidFrames));
 const cartPlane=await drawer.evaluate(el=>({
  hostBackdrop:getComputedStyle(el).backdropFilter,
  planeBackdrop:getComputedStyle(el,'::before').backdropFilter,
  planeTint:getComputedStyle(el,'::before').backgroundColor,
  planePointerEvents:getComputedStyle(el,'::before').pointerEvents,
  headerBackdrop:getComputedStyle(el.querySelector('.cart-header')).backdropFilter
 }));
 expect(cartPlane.hostBackdrop).toBe('none');
 expect(cartPlane.planeBackdrop).toContain('blur(24px)');
 expect(cartPlane.planePointerEvents).toBe('none');
 expect(cartPlane.headerBackdrop).toContain('blur(17px)');
 const cartPlaneHeight=await drawer.evaluate(el=>({
  client:el.clientHeight,
  height:parseFloat(getComputedStyle(el).getPropertyValue('--sd-native-glass-height')),
  gap:parseFloat(getComputedStyle(el).getPropertyValue('--sd-native-glass-gap')),
  actualGap:parseFloat(getComputedStyle(el).rowGap)
 }));
 expect(cartPlaneHeight.height,'The blur sheet remains exactly scrollport-high').toBe(cartPlaneHeight.client);
 expect(cartPlaneHeight.gap,'The blur sheet leaves no flex spacing').toBe(cartPlaneHeight.actualGap);
 console.log('CART_NATIVE_BACKGROUND_PLANE',JSON.stringify(cartPlane));

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
 await expect(page.locator('#cartDrawer [class*="optical-lens"]')).toHaveCount(0);
 await page.screenshot({path:join(output,'1280x800-cart-eight-items-desktop-list-scrolled.png'),fullPage:false,animations:'disabled'});
});


test('mobile account: partially verified transfer shows exact top-up QR, and refresh never marks an unverified receipt',async({page})=>{
 test.setTimeout(45000);
 await page.setViewportSize({width:390,height:844});
 const number='SD-QA-LOCAL-TOPUP-01';
 const original=2100000,received=1500000;
 await page.addInitScript((orderNumber)=>{
  localStorage.setItem('sd-local-order-history',JSON.stringify([{
   orderNumber,accessToken:'a'.repeat(64),createdAt:new Date().toISOString(),
   status:'confirmed',deliveryStatus:'not_shipped',priceConfirmationRequired:false,total:6800000,
   items:[],paymentSummary:{total:6800000,paymentOption:'deposit',requiredAmount:2100000,
    netReceivedAmount:1500000,shortfall:600000,codRemaining:4700000,eligibleToShip:false}
  }]));
 },number);
 let shortfall=600000,reads=0,unexpectedWrites=0;
 await page.route('**/api/order-payment?*',async route=>{
  const u=new URL(route.request().url());if(u.searchParams.get('orderNumber')!==number){await route.fallback();return}
  reads++;
  const summary={total:6800000,paymentOption:'deposit',requiredAmount:original,
   netReceivedAmount:received+(shortfall===0?600000:0),shortfall,codRemaining:4700000,
   eligibleToShip:shortfall===0,paidInFull:false};
  await route.fulfill({status:200,contentType:'application/json',headers:{'Cache-Control':'no-store'},
   body:JSON.stringify({ok:true,orderNumber:number,orderStatus:'confirmed',deliveryStatus:'not_shipped',
    priceConfirmationRequired:false,paymentTermsConfirmed:true,paymentReady:shortfall>0,
    paymentSummary:summary,total:6800000,amount:shortfall,
    qrImageUrl:'/payment-qr/qr-ui-topup-fixture.png',bankName:'QA BANK',
    accountName:'QA ACCOUNT',accountNumber:'0000000000',transferReference:'SD-QA-SAME-ORDER',
    message:shortfall>0?'Shop đã nhận một phần tiền.':'Shop đã xác nhận đủ tiền cọc.'})});
 });
 await page.route('**/payment-qr/qr-ui-topup-fixture.png',async route=>{
  await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="white"/><rect x="20" y="20" width="120" height="120" stroke="#111827" stroke-width="12" fill="none"/></svg>'});
 });
 page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/orders')unexpectedWrites++});
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});expect(response?.status()).toBe(200);
 const welcome=page.locator('#welcomeSplash');if(await welcome.count()&&await welcome.isVisible())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 const card=page.locator('#accountOrdersList [data-order-number="'+number+'"]');
 await expect(card).toBeVisible();
 await expect(card.locator('[data-account-payment-topup]')).toContainText('600.000');
 await card.locator('[data-account-payment-topup]').click();
 await page.waitForTimeout(300);
 console.log('QA_TOPUP_AFTER_CLICK',JSON.stringify({
  reads,cardText:(await card.innerText()).slice(-850),
  panelCount:await card.locator('.local-order-topup').count(),
  buttons:await card.locator('[data-account-payment-topup]').allTextContents(),
  statusMessage:await card.locator('.local-order-sync-message').allTextContents()
 }));
 const panel=card.locator('.local-order-topup');
 await expect(panel).toBeVisible();
 await expect(panel).toContainText('600.000');
 await expect(panel).toContainText('SD-QA-SAME-ORDER');
 await expect(panel).not.toContainText('2.100.000');
 await expect(panel.locator('img')).toHaveJSProperty('naturalWidth',160);
 await page.screenshot({path:join(output,'390x844-account-topup-600k-ui-fixture.png'),fullPage:false,animations:'disabled'});
 shortfall=0;
 await panel.locator('[data-account-payment-topup]').click();
 await expect(card.locator('.local-order-topup')).toHaveCount(0);
 await expect(card.locator('[data-account-payment-topup]')).toHaveCount(0);
 await expect(card).toContainText('Shop đã xác nhận đủ khoản cần chuyển');
 expect(reads).toBe(2);
 expect(unexpectedWrites).toBe(0);
});


test('mobile account payment refresh: five server statuses, local/Cloud, reload and 60-second lock',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await page.clock.install({time:new Date('2026-11-03T05:40:00+07:00')});
 const numbers=['SD-QA-REFRESH-00','SD-QA-REFRESH-01','SD-QA-REFRESH-02','SD-QA-REFRESH-03','SD-QA-REFRESH-04'];
 const statuses=['Chưa xác nhận tiền','Chưa đủ tiền cọc','Đã nhận cọc + dư','Đã nhận đủ','Chưa cập nhật'];
 const amounts=[0,1000000,1600000,1400000,null],requiredAmount=1400000;
 await page.addInitScript((numbers)=>{
  localStorage.setItem('sd-local-order-history',JSON.stringify(numbers.map(orderNumber=>({
   orderNumber,accessToken:'a'.repeat(64),createdAt:new Date().toISOString(),
   status:'pending_confirmation',deliveryStatus:'not_shipped',total:4500000,
   priceConfirmationRequired:false,items:[],paymentSummary:null
  }))));
  // New Playwright context starts without a cooldown; do not erase it on reload.
 },numbers);
 const localCalls=new Map(),cloudNumber='SD-QA-CLOUD-REFRESH-06';
 await page.route('**/api/order-payment?*',async route=>{
  const orderNumber=new URL(route.request().url()).searchParams.get('orderNumber');
  const index=numbers.indexOf(orderNumber);
  if(index<0){await route.fallback();return}
  localCalls.set(orderNumber,(localCalls.get(orderNumber)||0)+1);
  if(index===4){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false})});return}
  const net=amounts[index],summary={
   paymentOption:'deposit',total:4500000,requiredAmount,
   netReceivedAmount:net,shortfall:Math.max(0,requiredAmount-net),
   overpaidAmount:Math.max(0,net-requiredAmount),
   codRemaining:Math.max(0,3100000-Math.max(0,net-requiredAmount)),
   eligibleToShip:net>=requiredAmount
  };
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   ok:true,orderNumber,orderStatus:'pending_confirmation',deliveryStatus:'not_shipped',
   total:4500000,priceConfirmationRequired:false,paymentSummary:summary
  })});
 });
 let cloudCalls=0;
 await page.route('**/api/customer/order-payment?*',async route=>{
  const orderNumber=new URL(route.request().url()).searchParams.get('orderNumber');
  if(orderNumber!==cloudNumber){await route.fallback();return}
  cloudCalls++;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   ok:true,orderNumber,orderStatus:'confirmed',deliveryStatus:'not_shipped',
   total:4500000,priceConfirmationRequired:false,
   paymentSummary:{paymentOption:'full',total:4500000,requiredAmount:4275000,
    netReceivedAmount:4275000,shortfall:0,overpaidAmount:0,codRemaining:0,eligibleToShip:true}
  })});
 });
 const response=await page.goto(url,{waitUntil:'domcontentloaded'});
 expect(response?.status()).toBe(200);
 const welcome=page.locator('#welcomeSplash');
 if(await welcome.count()&&await welcome.isVisible())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 for(let i=0;i<numbers.length;i++){
  const card=page.locator('#accountOrdersList [data-order-number="'+numbers[i]+'"]'),button=card.locator('[data-order-payment-check]');
  await expect(button).toHaveText('Cập nhật thanh toán');
  await button.click();
  await expect(button).toHaveText(statuses[i]);
  await expect(button).toBeDisabled();
  await expect(card.locator('.local-order-sync-message')).toHaveCount(0);
  await button.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  expect(localCalls.get(numbers[i])).toBe(1);
 }
 await page.screenshot({path:join(output,'390x844-payment-refresh-local-five-statuses.png'),fullPage:false,animations:'disabled'});
 await page.reload({waitUntil:'domcontentloaded'});
 const welcomeAgain=page.locator('#welcomeSplash');
 if(await welcomeAgain.count()&&await welcomeAgain.isVisible())await page.locator('#skipIntro').click();
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
 await page.locator('#mobileAccountNav').click();
 await page.locator('#accountOrdersAction').click();
 for(let i=0;i<numbers.length;i++){
  const button=page.locator('#accountOrdersList [data-order-number="'+numbers[i]+'"] [data-order-payment-check]');
  await expect(button).toHaveText(statuses[i]);
  await expect(button).toBeDisabled();
  expect(localCalls.get(numbers[i])).toBe(1);
 }
 await page.screenshot({path:join(output,'390x844-payment-refresh-after-reload.png'),fullPage:false,animations:'disabled'});
 await page.clock.fastForward(60100);
 for(const number of numbers){
  const button=page.locator('#accountOrdersList [data-order-number="'+number+'"] [data-order-payment-check]');
  await expect(button).toHaveText('Cập nhật thanh toán');
  await expect(button).toBeEnabled();
 }
 await page.screenshot({path:join(output,'390x844-payment-refresh-after-60s.png'),fullPage:false,animations:'disabled'});
 await page.route('**/api/customer/profile',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({ok:true,favorites:[],address:null})
 }));
 await page.route('**/api/customer/orders',route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({ok:true,orders:[{orderNumber:cloudNumber,createdAt:new Date().toISOString(),
   status:'pending_confirmation',deliveryStatus:'not_shipped',total:4500000,
   priceConfirmationRequired:false,items:[],paymentSummary:null}]})
 }));
 await page.evaluate(()=>window.sdAccountBridge.onAuth(true));
 const cloudCard=page.locator('#accountOrdersList [data-order-number="'+cloudNumber+'"]');
 const cloudButton=cloudCard.locator('[data-account-orders-refresh]');
 await expect(cloudButton).toHaveText('Cập nhật thanh toán');
 await cloudButton.click();
 await expect(cloudButton).toHaveText('Đã nhận đủ');
 await expect(cloudButton).toBeDisabled();
 expect(cloudCalls).toBe(1);
 await expect(cloudCard.locator('.local-order-payment')).toContainText('4.275.000');
 await expect(cloudCard.locator('.local-order-sync-message')).toHaveCount(0);
 await page.screenshot({path:join(output,'390x844-payment-refresh-cloud.png'),fullPage:false,animations:'disabled'});
});


test('theme, layers and frame pacing audit: mobile/desktop Storefront and Admin in light/dark',async({page})=>{
 test.setTimeout(150000);
 const errors=[],unexpectedWrites=[],report=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{
  const p=new URL(request.url()).pathname;
  if(p.startsWith('/api/admin/')&&!['GET','HEAD'].includes(request.method()))unexpectedWrites.push(p);
 });
 const sampleFrames=()=>page.evaluate(async()=>{
  const delays=await new Promise(resolve=>{
   let last=0,seen=0;const samples=[];
   const frame=now=>{
    if(last){samples.push(now-last);seen++}
    last=now;
    if(seen<65){
     if(seen%2===0)window.scrollTo({top:Math.max(0,document.documentElement.scrollHeight-innerHeight)*(seen/65),behavior:'instant'});
     requestAnimationFrame(frame);
    }else resolve(samples);
   };
   requestAnimationFrame(frame);
  });
  const sorted=delays.slice().sort((a,b)=>a-b);
  return {averageFps:Math.round(1000/(delays.reduce((a,b)=>a+b,0)/delays.length)),
   p95FrameMs:Number(sorted[Math.floor((sorted.length-1)*.95)].toFixed(1)),
   framesOver50ms:delays.filter(n=>n>50).length,sampledFrames:delays.length,
   documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
 });
 const sampleNormalFrames=()=>page.evaluate(async()=>{
  window.scrollTo({top:0,behavior:'instant'});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const samples=await new Promise(resolve=>{
   const records=[];let last=0,seen=0;
   const tick=now=>{
    if(last){records.push(now-last);seen++}
    last=now;
    if(seen<65){
     const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
     if(seen%2===0)window.scrollTo({top:Math.min(max,seen*12),behavior:'instant'});
     requestAnimationFrame(tick);
    }else resolve(records);
   };
   requestAnimationFrame(tick);
  });
  const sorted=samples.slice().sort((a,b)=>a-b);
  return {averageFps:Math.round(1000/(samples.reduce((a,b)=>a+b,0)/samples.length)),
   p95FrameMs:Number(sorted[Math.floor((sorted.length-1)*.95)].toFixed(1)),
   framesOver50ms:samples.filter(n=>n>50).length,sampledFrames:samples.length,
   documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
 });
 const rectInfo=()=>page.evaluate(()=>{
  const visible=sel=>{
   const node=document.querySelector(sel);
   if(!node)return null;
   const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
   return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height,
    visible:rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none',
    background:style.backgroundColor,blur:style.backdropFilter,
    overflow:style.overflow,position:style.position,z:style.zIndex};
  };
  return {body:visible('body'),header:visible('.nav-wrap .nav'),dock:visible('#mobileNav,#mobileBottomNav'),
   cart:visible('#cartDrawer'),cartHeader:visible('#cartDrawer .cart-header'),
   checkoutHeader:visible('#checkoutDrawer .checkout-header')};
 });
 // Headless runner/compositor reference under the same 65-rAF
 // sampler to avoid falsely blaming CI slowdown on the website.
 for(const {width,height} of [{width:390,height:844},{width:1280,height:800}]){
  await page.setViewportSize({width,height});
  await page.goto('about:blank');
  const baseline=await sampleFrames();
  const normalPerf=await sampleNormalFrames();
  report.push({surface:'blank-baseline',width,mode:'neutral',perf:baseline,normalPerf});
  console.log('SD_FRAME_RUNNER_BASELINE',JSON.stringify({width,...baseline}));
 }
 for(const {width,height} of [{width:390,height:844},{width:430,height:932},{width:1280,height:800}]){
  for(const mode of ['light','dark']){
   await page.setViewportSize({width,height});await page.emulateMedia({colorScheme:mode});
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   expect(response?.status()).toBe(200);
   const boot=await page.evaluate(()=>({
    dark:document.documentElement.classList.contains('dark'),
    htmlBg:getComputedStyle(document.documentElement).backgroundColor,
    bodyBg:getComputedStyle(document.body).backgroundColor,
    meta:[...document.querySelectorAll('meta[name="theme-color"]')].map(x=>x.content)
   }));
   expect(boot.dark,'Storefront early theme should match OS before content starts').toBe(mode==='dark');
   expect(new Set(boot.meta).size,'Browser theme-color tags cannot disagree').toBe(1);
   const welcome=page.locator('#welcomeSplash');
   if(await welcome.count()&&await welcome.isVisible())await page.locator('#skipIntro').click();
   await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
   await expect(page.locator('.nav-wrap .nav')).toBeVisible();
   const layout=await rectInfo();
   expect(layout.header.visible).toBe(true);
   expect(layout.header.left,'Header stays in viewport').toBeGreaterThanOrEqual(-1);
   expect(layout.header.right,'Header does not overflow').toBeLessThanOrEqual(width+1);
   const perf=await sampleFrames();
   const normalPerf=await sampleNormalFrames();
   expect(normalPerf.sampledFrames).toBe(65);
   expect(perf.documentWidth,'No horizontal document overflow in '+mode+' '+width).toBeLessThanOrEqual(width+2);
   report.push({surface:'storefront',width,mode,boot,perf,normalPerf,header:layout.header});
   await page.screenshot({path:join(output,'theme-audit-store-'+width+'-'+mode+'.png'),fullPage:false,animations:'disabled'});
   if(width===390){
    await page.locator('#mobileCartNav').click();
    await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
    // The approved slide-in is allowed to extend beyond the viewport DURING
    // motion. Check final resting geometry, not a moving frame at 300ms.
    await expect.poll(()=>page.locator('#cartDrawer').evaluate(el=>{
     const r=el.getBoundingClientRect();
     return Math.max(Math.abs(r.left-7),Math.abs(innerWidth-r.right-7));
    }),{timeout:7000}).toBeLessThanOrEqual(2);
    const state=await rectInfo();
    const edge=await page.evaluate(()=>{
     const cart=document.querySelector('#cartDrawer'),head=cart?.querySelector('.cart-header');
     const a=cart?.getBoundingClientRect(),b=head?.getBoundingClientRect();
     return {left:a?.left,right:a?.right,top:a?.top,bottom:a?.bottom,headTop:b?.top,headBottom:b?.bottom,
      glass:getComputedStyle(head).backdropFilter,rootGlass:getComputedStyle(cart).backdropFilter};
    });
    expect(edge.left).toBeGreaterThanOrEqual(0);
    expect(edge.right).toBeLessThanOrEqual(width);
    expect(edge.headTop).toBeGreaterThanOrEqual(edge.top-1);
    expect(edge.headBottom).toBeLessThanOrEqual(edge.bottom+1);
    expect(edge.glass,'Keep one glass sheet, no duplicate root blur').toContain('blur(');
    expect(edge.rootGlass).toBe('none');
    await page.screenshot({path:join(output,'theme-audit-cart-390-'+mode+'.png'),fullPage:false,animations:'disabled'});
    await page.locator('#cartClose').click();
    await expect(page.locator('#cartDrawer')).not.toHaveClass(/open/);
   }
  }
 }
 // Browser-only fixtures. No Admin session login, D1 requests or mutation.
 const order={id:'qa-audit-order',order_number:'SD-QA-GLASS-01',status:'completed',delivery_status:'delivered',
  payment_status:'pending',customer_payment_option:'deposit',full_name:'KHÁCH KIỂM THỬ',phone:'0900000000',
  address:'Địa chỉ thử nghiệm',total:3500000,subtotal:3500000,
  price_confirmation_required:0,payment_terms_confirmed_at:'2026-11-03 00:00:00',
  customer_payment_amount:1100000,customer_payment_remaining_amount:2400000,
  received_amount:1100000,refunded_amount:0,cod_received_amount:0,
  payment_summary:{requiredAmount:1100000,netReceivedAmount:1100000,codExpected:2400000,codRemaining:2400000,
   shortfall:0,overpaidAmount:0,eligibleToShip:true},items:[{id:'qa-item',title:'Sản phẩm QA',sku:'QA-SKU',quantity:1,unitPrice:3500000,lineTotal:3500000}],
  timeline_confirmed_at:'2026-11-03 00:00:00',timeline_processing_at:'2026-11-03 00:00:01',
  timeline_shipped_at:'2026-11-03 00:00:02',timeline_completed_at:'2026-11-03 00:00:03'};
 await page.route('**/api/admin/**',async route=>{
  if(route.request().method()!=='GET'){unexpectedWrites.push(new URL(route.request().url()).pathname);await route.fulfill({status:403,contentType:'application/json',body:'{"error":"QA read only"}'});return;}
  const p=new URL(route.request().url()).pathname;
  const values={'/api/admin/session':{ok:true},'/api/admin/orders':{orders:[order]},
   '/api/admin/products':{products:[]},'/api/admin/customers':{customers:[]},
   '/api/admin/audit-logs':{logs:[]},'/api/admin/warranties':{warranties:[],claims:[]},
   '/api/admin/settings':{},'/api/admin/payment-qr':{active:false,pending:false}};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(values[p]||{})});
 });
 for(const {width,height} of [{width:390,height:844},{width:430,height:932},{width:1280,height:800}]){
  for(const mode of ['light','dark']){
   await page.setViewportSize({width,height});await page.emulateMedia({colorScheme:mode});
   const response=await page.goto(new URL('/admin/?view=order-detail&orderId=qa-audit-order',url).href,{waitUntil:'domcontentloaded'});
   expect(response?.status()).toBe(200);
   await expect(page.locator('#loginView')).toHaveClass(/hidden/);
   await expect(page.locator('.sd-order-step-list .sd-order-step')).toHaveCount(5);
   const snap=await page.evaluate(()=>{
    const root=document.documentElement,step=document.querySelector('#main .sd-order-step-list');
    const box=step.getBoundingClientRect(),bg=getComputedStyle(document.body).backgroundColor;
    const nav=document.querySelector('.mobiletabs'),dock=nav?.getBoundingClientRect();
    const c=getComputedStyle(step);
    return {mode:root.dataset.adminTheme,background:bg,stepX:box.left,stepRight:box.right,
     stepWidth:box.width,stepBg:c.backgroundColor,docWidth:root.scrollWidth,
     navPos:getComputedStyle(nav).position,dockTop:dock.top,dockBottom:dock.bottom,
     dockWidth:dock.width};
   });
   expect(snap.mode,'Admin theme applied before body paints').toBe(mode);
   expect(snap.stepX).toBeGreaterThanOrEqual(-1);
   expect(snap.stepRight).toBeLessThanOrEqual(width+1);
   expect(snap.docWidth,'Admin doc must not horizontally overflow').toBeLessThanOrEqual(width+2);
   if(width<=820){expect(snap.navPos).toBe('fixed');expect(snap.dockBottom).toBeLessThanOrEqual(height+2);}
   const perf=await sampleFrames();
   const normalPerf=await sampleNormalFrames();
   expect(normalPerf.sampledFrames).toBe(65);
   report.push({surface:'admin',width,mode,perf,normalPerf,snap});
   await page.screenshot({path:join(output,'theme-audit-admin-'+width+'-'+mode+'.png'),fullPage:false,animations:'disabled'});
  }
 }
 // A/B diagnostics are browser-only style overrides. They never touch the
 // deployed CSS, Admin data or approved Liquid Glass design.
 const perfOverrides=[
  ['normal',''],
  ['no-backdrop','*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'],
  ['no-shadow','*,*::before,*::after{box-shadow:none!important;text-shadow:none!important}'],
  ['no-filter','*,*::before,*::after{filter:none!important}'],
  ['no-gradient','*,*::before,*::after{background-image:none!important}'],
  ['no-glass-effects','*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;filter:none!important}']
 ];
 for(const surface of ['storefront','admin']){
  await page.setViewportSize({width:1280,height:800});await page.emulateMedia({colorScheme:'light'});
  await page.goto(surface==='storefront'?url:new URL('/admin/?view=order-detail&orderId=qa-audit-order',url).href,{waitUntil:'domcontentloaded'});
  if(surface==='storefront'){
   const welcome=page.locator('#welcomeSplash');
   if(await welcome.count()&&await welcome.isVisible())await page.locator('#skipIntro').click();
   await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
  }else await expect(page.locator('.sd-order-step-list .sd-order-step')).toHaveCount(5);
  const samples=[];
  for(const [name,css] of perfOverrides){
   const style=css?await page.addStyleTag({content:css}):null;
   const sampled=await sampleNormalFrames();samples.push({name,...sampled});
   if(style)await style.evaluate(el=>el.remove());
  }
  console.log('SD_RENDER_COST_AB',JSON.stringify({surface,width:1280,samples}));
 }
 expect(unexpectedWrites,'Diagnostics must not write real Admin/Production data').toEqual([]);
 expect(errors,'Theme audit must not throw JS errors').toEqual([]);
 console.log('SD_THEME_LAYER_FRAME_AUDIT',JSON.stringify(report));
});


// Mobile drawer fixed-geometry and main-navigation closure: rendered measurements, never inferred from CI status alone.
// Products are mocked; no purchase, customer, order or Production D1 write occurs.
for(const cfg of [
 {width:390,height:844,scheme:'light'},
 {width:390,height:844,scheme:'dark'},
 {width:360,height:800,scheme:'light'},
 {width:430,height:932,scheme:'light'}
]){
 test('Mobile Cart/Checkout/Account fixed frame '+cfg.width+' '+cfg.scheme,async({page,context})=>{
  const mock=Array.from({length:5},(_,i)=>({
   id:'sd-fixed-drawer-'+i,slug:'sd-fixed-drawer-'+i,
   sku:'QA-DRAWER-'+i,skuVerified:true,
   title:'Sản phẩm thử giao diện '+(i+1),category:'wallets',categoryLabel:'Ví nam',
   images:['images/brand-emblem.png'],price:4500000,sourcePriceConfirmed:true,
   fulfillmentType:'in_stock',published:true
  }));
  await page.setViewportSize({width:cfg.width,height:cfg.height});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  await context.addInitScript(items=>{
   localStorage.setItem('sd-cart',JSON.stringify(Object.fromEntries(items.map(p=>[p.id,1]))));
  },mock);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mock)}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:false})}));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const welcome=page.locator('#welcomeSplash');
  if(await welcome.count()&&await welcome.isVisible())await page.locator('#skipIntro').click();
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
  const frame=selector=>page.locator(selector).evaluate(el=>{
   const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};
  });
  const equal=(a,b)=>{
   for(const property of ['x','y','w','h'])
    expect(Math.abs(a[property]-b[property]),'Same mobile frame: '+property).toBeLessThanOrEqual(1);
  };
  const closed=async()=>{
   for(const id of ['#cartDrawer','#checkoutDrawer','#accountDrawer'])
    await expect(page.locator(id)).not.toHaveClass(/\bopen\b/);
   await expect(page.locator('#checkoutBackdrop')).not.toHaveClass(/\bopen\b/);
   expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
  };
  await page.locator('#mobileCartNav').click();
  await expect(page.locator('#cartDrawer')).toHaveClass(/\bopen\b/);
  await expect(page.locator('#cartList .cart-row')).toHaveCount(5);
  // The first Cart opener has an actual slide-in animation as well.
  // Establish the reference only after its left inset has settled at 7px.
  await expect.poll(async()=>Math.abs((await frame('#cartDrawer')).x-7),{timeout:4000}).toBeLessThanOrEqual(1);
  const cartFull=await frame('#cartDrawer');
  const settledFrame=async selector=>{
   // An 'open' class is set before the slide-in transition finishes.
   // Measure only the fully settled visible panel, not its offscreen start position.
   await expect.poll(async()=>Math.abs((await frame(selector)).x-cartFull.x),{timeout:4000}).toBeLessThanOrEqual(1);
   equal(cartFull,await frame(selector));
  };
  expect(cartFull.h).toBeGreaterThan(cfg.height*.6);
  await page.screenshot({path:join(output,'drawer-five-'+cfg.width+'-'+cfg.scheme+'.png'),animations:'disabled'});
  for(let i=5;i>1;i--){
   await page.locator('#cartList [data-remove]').last().click();
   await expect(page.locator('#cartList .cart-row')).toHaveCount(i-1);
  }
  await settledFrame('#cartDrawer');
  await page.screenshot({path:join(output,'drawer-one-'+cfg.width+'-'+cfg.scheme+'.png'),animations:'disabled'});
  await page.locator('[data-mobile-tab="home"]').click();
  await closed();
  await expect.poll(()=>page.evaluate(()=>location.hash)).toBe('#home');
  await page.locator('#mobileAccountNav').click();
  await expect(page.locator('#accountDrawer')).toHaveClass(/\bopen\b/);
  await settledFrame('#accountDrawer');
  await page.screenshot({path:join(output,'drawer-account-'+cfg.width+'-'+cfg.scheme+'.png'),animations:'disabled'});
  await page.locator('[data-mobile-tab="products"]').click();
  await closed();
  await expect.poll(()=>page.evaluate(()=>location.pathname)).toBe('/sanpham');
  await page.locator('#mobileCartNav').click();
  await expect(page.locator('#cartList .cart-row')).toHaveCount(1);
  await settledFrame('#cartDrawer');
  await page.locator('#cartCheckout').click();
  await expect(page.locator('#checkoutDrawer')).toHaveClass(/\bopen\b/);
  await settledFrame('#checkoutDrawer');
  await page.screenshot({path:join(output,'drawer-checkout-'+cfg.width+'-'+cfg.scheme+'.png'),animations:'disabled'});
  await page.locator('[data-mobile-tab="home"]').click();
  await closed();
  await expect.poll(()=>page.evaluate(()=>location.pathname+location.hash)).toBe('/#home');
  expect(errors,'No mobile drawer JavaScript errors').toEqual([]);
  console.log('SD_MOBILE_DRAWER_FIXED_VISUAL_QA',JSON.stringify({width:cfg.width,scheme:cfg.scheme,cartFull,finalPath:await page.evaluate(()=>location.pathname+location.hash)}));
 });
}


// Account uses the identical real-pixel frosted plane as Cart.
// Check actual computed materials, separate cards and touch navigation on the deployed Preview.
for(const sample of [
 {width:390,height:844,theme:'light'},
 {width:390,height:844,theme:'dark'},
 {width:360,height:800,theme:'light'},
 {width:430,height:932,theme:'light'}
]){
 test('Account native Cart background '+sample.width+' '+sample.theme,async({page})=>{
  await page.setViewportSize({width:sample.width,height:sample.height});
  await page.emulateMedia({colorScheme:sample.theme,reducedMotion:'reduce'});
  const mock=[{id:'qa-account-glass',slug:'qa-account-glass',sku:'QA-ACCOUNT-GLASS',skuVerified:true,title:'Sản phẩm QA',category:'wallets',categoryLabel:'Ví nam',images:['images/brand-emblem.png'],price:4500000,sourcePriceConfirmed:true,fulfillmentType:'in_stock',published:true}];
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mock)}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:false})}));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const welcome=page.locator('#welcomeSplash');
  if(await welcome.count()&&await welcome.isVisible())await page.locator('#skipIntro').click();
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
  await page.locator('#mobileCartNav').click();
  await expect(page.locator('#cartDrawer')).toHaveClass(/\bopen\b/);
  await page.waitForTimeout(500); // Observe settled Cart slide-in, not the entering transform.
  const cartBox=await page.locator('#cartDrawer').boundingBox();
  await page.locator('#mobileAccountNav').click();
  await expect(page.locator('#accountDrawer')).toHaveClass(/\bopen\b/);
  await expect(page.locator('#cartDrawer')).not.toHaveClass(/\bopen\b/);
  await expect.poll(()=>page.locator('#accountDrawer').evaluate(el=>parseFloat(el.style.getPropertyValue('--sd-native-glass-height'))||0)).toBeGreaterThan(200);
  const result=await page.evaluate(()=>{
   const cart=document.querySelector('#cartDrawer'),account=document.querySelector('#accountDrawer');
   const surface=el=>{
    const outer=getComputedStyle(el),plane=getComputedStyle(el,'::before');
    return {root:outer.backgroundColor,rootBlur:outer.backdropFilter,planeColor:plane.backgroundColor,planeBlur:plane.backdropFilter,planeWidth:parseFloat(plane.width),planeHeight:parseFloat(plane.height),nativeHeight:el.clientHeight,nativeWidth:el.clientWidth,planePointer:plane.pointerEvents};
   };
   const actions=[...document.querySelectorAll('#accountMenuView .account-action')];
   const pair=document.querySelector('#accountMenuView .account-paired-actions');
   const tiles=[...pair.querySelectorAll('.account-action')],rows=[
    document.querySelector('#accountAddressAction'),pair,
    document.querySelector('#accountThemeAction'),document.querySelector('#accountContactAction')
   ];
   const gaps=rows.slice(1).map((row,i)=>row.getBoundingClientRect().top-rows[i].getBoundingClientRect().bottom);
   const pairRects=tiles.map(el=>el.getBoundingClientRect().toJSON());
   return {cart:surface(cart),account:surface(account),gaps,actions:actions.length,noteExists:!!document.querySelector('#accountMenuView .account-note'),accountFrame:account.getBoundingClientRect().toJSON(),pairRects};
  });
  for(const key of ['root','rootBlur','planeColor','planeBlur','planePointer'])
   expect(result.account[key],'Account must share Cart '+key).toBe(result.cart[key]);
  expect(result.account.rootBlur).toBe('none');
  expect(result.account.planeBlur).toContain('blur(24px)');
  expect(Math.abs(result.account.planeWidth-result.account.nativeWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.account.planeHeight-result.account.nativeHeight)).toBeLessThanOrEqual(1);
  expect(result.actions).toBe(5);
  expect(result.noteExists).toBe(false);
  expect(result.pairRects).toHaveLength(2);
  expect(Math.abs(result.pairRects[0].y-result.pairRects[1].y)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.pairRects[0].width-result.pairRects[1].width)).toBeLessThanOrEqual(1);
  expect(result.pairRects[1].x).toBeGreaterThan(result.pairRects[0].x+result.pairRects[0].width);
  for(const gap of result.gaps)expect(gap,'Each Account card has an independent gap').toBeGreaterThanOrEqual(10);
  for(const axis of [['x','x'],['y','y'],['width','width'],['height','height']])
   expect(Math.abs(result.accountFrame[axis[0]]-cartBox[axis[1]])).toBeLessThanOrEqual(1);
  await page.screenshot({path:join(output,'account-native-cart-glass-'+sample.width+'-'+sample.theme+'.png'),animations:'disabled'});
  await page.locator('#accountDrawer').evaluate(el=>{el.scrollTop=el.scrollHeight});
  await page.screenshot({path:join(output,'account-native-cart-glass-scrolled-'+sample.width+'-'+sample.theme+'.png'),animations:'disabled'});
  await page.locator('#accountClose').click();
  await expect(page.locator('#accountDrawer')).not.toHaveClass(/\bopen\b/);
  expect(errors).toEqual([]);
  console.log('ACCOUNT_NATIVE_GLASS_VISUAL_QA',JSON.stringify({width:sample.width,theme:sample.theme,cart:result.cart,account:result.account,gaps:result.gaps}));
 });
}


// Repeated mode changes on the Account screen: full opaque cover EVERY time,
// exactly one commit per user gesture and no burst toggles from rapid taps.
for(const cfg of [{width:390,height:844},{width:360,height:800}]){
 test('Account theme atomic anti-spam '+cfg.width,async({page})=>{
  await page.setViewportSize(cfg);
  await page.emulateMedia({colorScheme:'light'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:false})}));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const welcome=page.locator('#welcomeSplash');
  if(await welcome.count()&&await welcome.isVisible()){
   // This fixture enters on a document with Welcome already fading out.
   // Use the genuine Skip handler, not a coordinate click that main content
   // can intercept during the welcome exit transition.
   await page.locator('#skipIntro').evaluate(el=>el.click());
   await expect(welcome).toHaveCount(0,{timeout:8000});
  }
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:20000});
  await page.locator('#mobileAccountNav').click();
  await expect(page.locator('#accountDrawer')).toHaveClass(/\bopen\b/);
  await page.evaluate(()=>{
   const root=document.documentElement,overlay=document.querySelector('#sdThemeSwitchOverlay');
   const stats=window.__qaTheme={commits:[],covers:0,lastDark:root.classList.contains('dark')};
   const monitor=()=>{
    if(overlay.classList.contains('is-covered'))stats.covers++;
    const dark=root.classList.contains('dark');
    if(dark!==stats.lastDark){
     stats.commits.push({dark,covered:overlay.classList.contains('is-covered'),opacity:getComputedStyle(overlay).opacity});
     stats.lastDark=dark;
    }
   };
   new MutationObserver(monitor).observe(root,{attributes:true,attributeFilter:['class']});
   new MutationObserver(monitor).observe(overlay,{attributes:true,attributeFilter:['class']});
   // Simulate repeated rapid taps through the actual Account action.
   for(let i=0;i<8;i++)document.querySelector('#accountThemeAction').click();
  });
  await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains('dark'))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>!document.querySelector('#sdThemeSwitchOverlay').classList.contains('is-dismissing')&& !document.querySelector('#sdThemeSwitchOverlay').classList.contains('is-visible') && !document.querySelector('#sdThemeSwitchOverlay').classList.contains('is-covered'))).toBe(true);
  const first=await page.evaluate(()=>window.__qaTheme);
  expect(first.commits).toHaveLength(1);
  expect(first.commits[0]).toMatchObject({dark:true,covered:true,opacity:'1'});
  expect(first.covers).toBeGreaterThan(0);
  await page.screenshot({path:join(output,'account-compact-theme-dark-'+cfg.width+'.png'),animations:'disabled'});
  // A repeat gesture during cooldown must not switch back or jump to bare paint.
  await page.locator('#accountThemeAction').evaluate(el=>el.click());
  expect(await page.evaluate(()=>document.documentElement.classList.contains('dark'))).toBe(true);
  await page.waitForTimeout(1050);
  await page.locator('#accountThemeAction').click();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains('dark'))).toBe(false);
  await expect.poll(()=>page.evaluate(()=>!document.querySelector('#sdThemeSwitchOverlay').classList.contains('is-visible')&&!document.querySelector('#sdThemeSwitchOverlay').classList.contains('is-covered')&&!document.querySelector('#sdThemeSwitchOverlay').classList.contains('is-dismissing'))).toBe(true);
  const second=await page.evaluate(()=>window.__qaTheme);
  expect(second.commits).toHaveLength(2);
  expect(second.commits[1]).toMatchObject({dark:false,covered:true,opacity:'1'});
  expect(second.covers).toBeGreaterThan(first.covers);
  await page.screenshot({path:join(output,'account-compact-theme-light-'+cfg.width+'.png'),animations:'disabled'});
  expect(errors).toEqual([]);
  console.log('ACCOUNT_THEME_ATOMIC_QA',JSON.stringify({viewport:cfg.width,commits:second.commits,covers:second.covers}));
 });
}
