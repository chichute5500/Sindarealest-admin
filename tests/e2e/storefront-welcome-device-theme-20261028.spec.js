import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

test.use({serviceWorkers:'block'});
const url=process.env.SD_STOREFRONT_TEST_URL||'http://127.0.0.1:4173/';
const output='artifacts/welcome-device-theme-20261028';
mkdirSync(output,{recursive:true});

async function mockCatalog(page){
 const writes=[],errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:true})}));
 page.on('request',request=>{if(request.url().includes('/api/')&&request.method()!=='GET')writes.push(request.method()+' '+request.url())});
 return {errors,writes};
}
async function ready(page){
 await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:15000});
}
async function closeIntro(page){
 const intro=page.locator('#welcomeSplash');
 await expect(intro).toBeVisible({timeout:6500});
 await page.locator('#skipIntro').click({timeout:5500});
 await expect(intro).toHaveCount(0,{timeout:12000});
}
async function palette(page){
 return page.evaluate(()=>{
  const root=document.documentElement;
  return {
   mode:root.dataset.themeMode,
   dark:root.classList.contains('dark'),
   colorScheme:getComputedStyle(root).colorScheme,
   page:getComputedStyle(root).getPropertyValue('--page').trim(),
   welcome:!!document.querySelector('#welcomeSplash'),
   active:document.body.classList.contains('welcome-active')
  };
 });
}

test('Mobile: Welcome once on first entry, not when switching Catalog→Home, returns on reload',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 const status=await mockCatalog(page);
 expect((await page.goto(url,{waitUntil:'domcontentloaded'}))?.status()).toBe(200);
 await closeIntro(page);await ready(page);
 await page.evaluate(()=>window.__qaOwnerDocumentMarker='original-document');
 await page.locator('#mobileBottomNav a[href="/sanpham"]').click();
 await expect.poll(()=>new URL(page.url()).pathname).toBe('/sanpham');
 await expect(page.locator('#welcomeSplash')).toHaveCount(0);
 await page.locator('#mobileBottomNav a[href="#home"]').click();
 await expect.poll(()=>new URL(page.url()).pathname).toBe('/');
 expect(new URL(page.url()).hash).toBe('#home');
 expect(await page.evaluate(()=>window.__qaOwnerDocumentMarker)).toBe('original-document');
 await expect(page.locator('#welcomeSplash')).toHaveCount(0);
 await page.goBack();
 await expect.poll(()=>new URL(page.url()).pathname).toBe('/sanpham');
 await page.goForward();
 await expect.poll(()=>new URL(page.url()).hash).toBe('#home');
 await expect(page.locator('#welcomeSplash')).toHaveCount(0);
 await page.screenshot({path:join(output,'mobile-home-return-no-welcome.png'),animations:'disabled'});
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#welcomeSplash')).toBeVisible({timeout:3500});
 expect(status.errors).toEqual([]);expect(status.writes).toEqual([]);
});

test('Android dark preference wins at new entry; manual LIGHT stays light on dark OS until reload',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({colorScheme:'dark'});
 await page.addInitScript(()=>{try{localStorage.setItem('sd-theme-mode','light')}catch(e){}});
 const status=await mockCatalog(page);
 expect((await page.goto(url,{waitUntil:'domcontentloaded'}))?.status()).toBe(200);
 let state=await palette(page);
 expect(state.mode).toBe('auto');
 expect(state.dark).toBe(true);
 expect(state.colorScheme).toContain('dark');
 expect(state.page).toBe('#061522');
 await closeIntro(page);await ready(page);
 // A click on the genuine theme toggle is sufficient: it calls the same
 // Owner-approved transition used by the Account's accessible mobile action.
 await page.locator('#themeToggle').evaluate(el=>el.click());
 await expect.poll(async()=>palette(page)).toMatchObject({mode:'light',dark:false,colorScheme:'only light',page:'#eaf3fb'});
 await page.waitForTimeout(1600);
 state=await palette(page);
 expect(state.colorScheme).toBe('only light');
 await page.screenshot({path:join(output,'device-dark-web-manual-light.png'),animations:'disabled'});
 await page.locator('#mobileBottomNav a[href="/sanpham"]').click();
 await page.locator('#mobileBottomNav a[href="#home"]').click();
 expect((await palette(page)).dark).toBe(false);
 await page.reload({waitUntil:'domcontentloaded'});
 state=await palette(page);
 expect(state.mode).toBe('auto');
 expect(state.dark).toBe(true);
 expect(state.page).toBe('#061522');
 expect(status.errors).toEqual([]);expect(status.writes).toEqual([]);
});

test('Light device ignores legacy saved dark, tracks OS until manual selection, persists manual on SPA return',async ({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.emulateMedia({colorScheme:'light'});
 await page.addInitScript(()=>{try{localStorage.setItem('sd-theme-mode','dark')}catch(e){}});
 const status=await mockCatalog(page);
 expect((await page.goto(url,{waitUntil:'domcontentloaded'}))?.status()).toBe(200);
 let state=await palette(page);
 expect(state.mode).toBe('auto');expect(state.dark).toBe(false);
 expect(state.colorScheme).toBe('only light');
 await closeIntro(page);await ready(page);
 await page.emulateMedia({colorScheme:'dark'});
 await expect.poll(async()=>(await palette(page)).dark).toBe(true);
 // Explicit manual LIGHT overrides a later OS change, without a palette clash.
 await page.locator('#themeToggle').click();
 await expect.poll(async()=>palette(page)).toMatchObject({mode:'light',dark:false,colorScheme:'only light'});
 await page.waitForTimeout(1600);
 await page.emulateMedia({colorScheme:'light'});
 await page.emulateMedia({colorScheme:'dark'});
 expect((await palette(page)).dark).toBe(false);
 await page.locator('#desktopLinks a[href="/sanpham"]').click();
 await expect.poll(()=>new URL(page.url()).pathname).toBe('/sanpham');
 await page.locator('#desktopLinks a[href="#home"]').click();
 await expect.poll(()=>new URL(page.url()).hash).toBe('#home');
 expect((await palette(page)).dark).toBe(false);
 expect(await page.locator('#welcomeSplash').count()).toBe(0);
 await page.screenshot({path:join(output,'desktop-manual-light-on-device-dark.png'),animations:'disabled'});
 expect(status.errors).toEqual([]);expect(status.writes).toEqual([]);
});
