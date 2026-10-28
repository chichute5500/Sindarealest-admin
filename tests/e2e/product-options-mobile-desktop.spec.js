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
  // Reuse the same transparent Liquid Glass material as the storefront icons.
  const selectedGlass=await page.locator('[data-option-value="42"]').evaluate(node=>{
   const css=getComputedStyle(node);
   return {backgroundImage:css.backgroundImage,backdrop:css.backdropFilter,
    webkitBackdrop:css.webkitBackdropFilter,shadow:css.boxShadow,borderColor:css.borderTopColor};
  });
  expect(selectedGlass.backgroundImage).toContain('linear-gradient');
  expect(selectedGlass.backdrop+' '+selectedGlass.webkitBackdrop).toContain('blur(18px)');
  expect(selectedGlass.shadow).not.toBe('none');
  expect(selectedGlass.borderColor).not.toBe('transparent');
  const idleGlass=await page.locator('[data-option-value="41"]').evaluate(node=>{
   const css=getComputedStyle(node);
   return {background:css.backgroundColor,shadow:css.boxShadow,
    backdrop:css.backdropFilter,webkitBackdrop:css.webkitBackdropFilter};
  });
  expect(idleGlass.background).toMatch(/rgba\\(/);
  expect(idleGlass.backdrop+' '+idleGlass.webkitBackdrop).toContain('blur(18px)');
  expect(idleGlass.shadow).not.toBe('none');
  const chipMetrics=await page.locator('#detailVariants .sd-product-option-chip').evaluateAll(nodes=>nodes.map(x=>({
   w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height,
   text:x.textContent,viewWidth:window.innerWidth,
   outerRight:x.getBoundingClientRect().right
  })));
  expect(chipMetrics).toHaveLength(7);
  for(const metric of chipMetrics){
   expect(metric.w).toBeLessThanOrEqual(60);
   expect(metric.h).toBeGreaterThanOrEqual(36);
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
