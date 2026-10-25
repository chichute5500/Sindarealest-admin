import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const root = process.env.FULL_SITE_PREVIEW_URL;
const expected = 'https://integration-fullsite-2026102.sindarealest-admin-preview.pages.dev';
if (root !== expected) throw Error('Unexpected remote target — isolated Preview only');
const evidence = 'artifacts/full-site-preview-evidence';
mkdirSync(evidence, { recursive: true });
const headers = (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) ? {
  'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
  'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
} : {};
test.use({ extraHTTPHeaders: headers, screenshot: 'only-on-failure' });
async function openStore(page) {
  const response = await page.goto(root + '/', { waitUntil:'domcontentloaded', timeout:45000 });
  expect(response?.status(), 'Storefront document must load in isolated Preview').toBe(200);
  // The welcome flow may dismiss automatically before a human could press Skip.
  // Trigger its own handler only if the overlay is still active, rather than
  // racing a disappearing button during its timed exit animation.
  if (await page.locator('body').evaluate(el=>el.classList.contains('welcome-active'))) {
    await page.locator('#skipIntro').evaluate(button => button.click());
  }
  await expect(page.locator('body')).not.toHaveClass(/welcome-active/, {timeout:15000});
  await expect(page.locator('#heroProductImage')).toBeVisible({timeout:20000});
  await expect.poll(()=>page.locator('#heroProductImage').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(page.locator('#mobileAccountNav, #themeToggle').filter({visible:true}).first()).toBeVisible();
  const pedestal=await page.locator('.hero-pedestal-art').evaluate(x=>getComputedStyle(x).backgroundImage);
  expect(pedestal).not.toBe('none');
  expect(pedestal).toContain('ai-marble-pedestal');
}
for (const dimensions of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]) {
  for (const theme of ['dark','light']) {
    test('real Preview visual: ' + dimensions.name + ' / ' + theme, async ({browser}) => {
      const ctx=await browser.newContext({viewport:{width:dimensions.width,height:dimensions.height},extraHTTPHeaders:headers,reducedMotion:'reduce'});
      const page=await ctx.newPage();
      await page.addInitScript((t)=>localStorage.setItem('sd-theme-mode',t),theme);
      await openStore(page);
      await expect.poll(()=>page.locator('html').evaluate(el=>el.classList.contains('dark'))).toBe(theme==='dark');
      const hero=page.locator('.hero-visual');
      await expect(hero).toBeVisible();
      const rect=await hero.boundingBox();
      expect(rect?.width).toBeGreaterThan(100);
      await page.screenshot({path:evidence+'/'+dimensions.name+'-'+theme+'-home.png',fullPage:false,animations:'disabled'});
      if(dimensions.name==='mobile') {
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
        expect(overflow,'Mobile viewport must not overflow horizontally').toBeLessThanOrEqual(2);
      }
      if(dimensions.name==='mobile') {
        // Mobile theme control is in the account drawer by design.
        await page.locator('#mobileAccountNav').click();
        await expect(page.locator('#accountThemeAction')).toBeVisible();
        await page.locator('#accountThemeAction').click();
      } else {
        await page.locator('#themeToggle').click();
      }
      await expect.poll(()=>page.locator('html').evaluate(el=>el.classList.contains('dark'))).toBe(theme!=='dark');
      await ctx.close();
    });
  }
}
test('read-only Preview D1 public product API can be reached',async({request})=>{
  const response=await request.get(root+'/api/products',{headers});
  expect(response.status(),'Isolated Preview public API response; 503 indicates D1 schema/binding mismatch').toBe(200);
  const value=await response.json();
  expect(Array.isArray(value),'Public product catalog must be an array').toBe(true);
  for(const p of value.slice(0,20)){
    if(p.skuVerified!==true) expect(p.sku,'Unverified SKU must be masked').toBe(null);
    expect(p.stock,'Public inventory should remain private').toBe(null);
  }
});
test('read-only buyer journey: live catalog, product SEO, detail gallery and local cart (no order submission)', async ({browser})=>{
  const ctx=await browser.newContext({viewport:{width:1440,height:900},extraHTTPHeaders:headers,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  await openStore(page);
  const productsResponse=await ctx.request.get(root+'/api/products',{headers});
  expect(productsResponse.status()).toBe(200);
  const products=await productsResponse.json();
  expect(Array.isArray(products)).toBe(true);
  expect(products.length,'At least one published product is needed for real buyer journey acceptance').toBeGreaterThan(0);
  await expect(page.locator('#catalogGrid [data-open-product]').first()).toBeVisible({timeout:20000});
  await page.locator('#catalogGrid [data-open-product]').first().click();
  await expect(page.locator('#productOverlay')).toHaveClass(/open/,{timeout:12000});
  await expect(page.locator('#detailMainImage')).toBeVisible();
  const url=new URL(page.url());
  expect(url.pathname).toMatch(/^\/sanpham\/[a-z0-9-]+\/[a-z0-9._-]+$/i);
  const response=await ctx.request.get(page.url(),{headers});
  expect(response.status()).toBe(200);
  const document=await response.text();
  expect(document).toContain('rel="canonical"');
  expect(document).toContain(url.pathname);
  await page.screenshot({path:evidence+'/buyer-detail-desktop.png',animations:'disabled'});
  await page.locator('#detailZoom').click();
  await expect(page.locator('#sdFullscreenViewer')).toHaveClass(/open/,{timeout:12000});
  await page.screenshot({path:evidence+'/buyer-fullscreen-gallery.png',animations:'disabled'});
  await page.locator('#sdFullscreenClose').click();
  await expect(page.locator('#sdFullscreenViewer')).not.toHaveClass(/open/);
  await page.locator('#detailAdd').click();
  await expect.poll(async ()=>Number.parseInt((await page.locator('#cartCount').textContent()) || '0',10)).toBeGreaterThan(0);
  await page.locator('#detailClose').click();
  await page.locator('#cartOpen').click();
  await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
  await expect(page.locator('#cartList')).toContainText(products[0].title ? products[0].title.slice(0,8) : '',{timeout:12000});
  await page.screenshot({path:evidence+'/buyer-local-cart.png',animations:'disabled'});
  // Stop before checkout submission. No remote order, payment or inventory mutations.

  await ctx.close();
});
test('isolated Admin login visible, accessible and no Production routing',async({browser})=>{
  const ctx=await browser.newContext({viewport:{width:1366,height:768},extraHTTPHeaders:headers});
  const page=await ctx.newPage();
  const response=await page.goto(root+'/admin/',{waitUntil:'domcontentloaded',timeout:45000});
  expect(response?.status(),'Admin login HTTP status').toBe(200);
  await expect(page.locator('#loginView')).toBeVisible({timeout:15000});
  await expect(page.locator('#password')).toBeVisible();
  await page.screenshot({path:evidence+'/admin-login.png',animations:'disabled'});
  await ctx.close();
});
