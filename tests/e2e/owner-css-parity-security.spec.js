import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test.use({serviceWorkers:'block'});
const base=process.env.SD_AUDIT_BASE_URL||'http://127.0.0.1:4173';
const dir='artifacts/owner-css-parity-security';
mkdirSync(dir,{recursive:true});
const tests=[
 {label:'mobile-light',width:390,height:844,os:'light'},
 {label:'mobile-dark',width:390,height:844,os:'dark'},
 {label:'desktop-light',width:1366,height:900,os:'light'},
 {label:'desktop-dark',width:1366,height:900,os:'dark'}
];
for(const cfg of tests){
 test('CSS identity and OS color scheme: '+cfg.label,async({page,context})=>{
  await page.setViewportSize({width:cfg.width,height:cfg.height});
  await page.emulateMedia({colorScheme:cfg.os,reducedMotion:'reduce'});
  // Legacy stale localStorage must never force a surface to conflict with OS.
  await context.addInitScript(()=>{
   try{localStorage.setItem('sd-theme-mode',matchMedia('(prefers-color-scheme: dark)').matches?'light':'dark')}catch{}
  });
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**/api/products',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
  await page.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":false}'}));
  const storefront=await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  expect(storefront?.status()).toBe(200);
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,{timeout:12000});
  const web=await page.evaluate(()=>{
   const root=document.documentElement,style=getComputedStyle(root);
   return {dark:root.classList.contains('dark'),mode:root.dataset.themeMode,
    scheme:style.colorScheme,background:style.getPropertyValue('--page').trim(),
    ink:style.getPropertyValue('--ink').trim(),accent:style.getPropertyValue('--gold').trim(),
    logo:!!document.querySelector('.brand-symbol'),page:document.body.scrollWidth};
  });
  expect(web.dark).toBe(cfg.os==='dark');
  expect(web.background).toBe(cfg.os==='dark'?'#061522':'#eaf3fb');
  expect(web.ink).toBe(cfg.os==='dark'?'#edf7ff':'#142a3c');
  expect(web.accent).toBe(cfg.os==='dark'?'#9bcdf3':'#5c91b9');
  expect(web.scheme).toContain(cfg.os);
  expect(web.scheme).toContain('only');
  expect(web.logo).toBe(true);
  expect(web.page).toBeLessThanOrEqual(cfg.width+1);
  await page.screenshot({path:dir+'/store-'+cfg.label+'.png',animations:'disabled'});
  // Verify the previously approved Liquid Glass cart surface, not just Home.
  // Opening/closing must preserve responsive bounds and visible content in
  // both device color schemes without modifying any checkout/payment data.
  const cartOpen=page.locator(cfg.width<=760?'#mobileCartNav':'#cartOpen');
  await cartOpen.click();
  await expect(page.locator('#cartDrawer')).toHaveClass(/open/);
  const cart=await page.locator('#cartDrawer').evaluate(el=>({
    width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth,
    scheme:getComputedStyle(document.documentElement).colorScheme
  }));
  expect(cart.width).toBeLessThanOrEqual(cfg.width+1);
  expect(cart.scrollWidth).toBeLessThanOrEqual(Math.ceil(cart.width)+1);
  expect(cart.scheme).toContain(cfg.os);
  await page.screenshot({path:dir+'/store-cart-'+cfg.label+'.png',animations:'disabled'});
  await page.locator('#cartClose').click();
  await expect(page.locator('#cartDrawer')).not.toHaveClass(/open/);
  // Separate browser tab starts with the same device preference, not a stale
  // legacy sd-theme-mode override left by the public Storefront.
  const admin=await context.newPage();
  await admin.setViewportSize({width:cfg.width,height:cfg.height});
  await admin.emulateMedia({colorScheme:cfg.os,reducedMotion:'reduce'});
  const errors=[];admin.on('pageerror',e=>errors.push(e.message));
  await admin.route('**/api/admin/**',async r=>{
   const path=new URL(r.request().url()).pathname;
   let data={ok:true};
   if(path==='/api/admin/products')data={products:[]};
   if(path==='/api/admin/orders')data={orders:[]};
   if(path==='/api/admin/customers')data={customers:[]};
   if(path==='/api/admin/warranties')data={claims:[],warranties:[]};
   if(path==='/api/admin/audit-logs')data={logs:[]};
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  const a=await admin.goto(base+'/admin/',{waitUntil:'domcontentloaded'});
  expect(a?.status()).toBe(200);
  await expect(admin.locator('#adminThemeToggle')).toBeAttached({timeout:8000});
  const mode=await admin.evaluate(()=>{
   const root=document.documentElement,style=getComputedStyle(root);
   return {theme:root.dataset.adminTheme,scheme:style.colorScheme,background:style.getPropertyValue('--bg').trim(),
    ink:style.getPropertyValue('--ink').trim(),accent:style.getPropertyValue('--gold').trim(),
    logo:!!document.querySelector('.brand-logo[src="/images/brand-emblem.png"]'),
    page:document.body.scrollWidth};
  });
  expect(mode.theme).toBe(cfg.os);
  expect(mode.scheme).toContain(cfg.os);
  expect(mode.scheme).toContain('only');
  expect(mode.background).toBe(cfg.os==='dark'?'#09131d':'#eaf3fb');
  expect(mode.ink).toBe(cfg.os==='dark'?'#eaf3fb':'#142a3c');
  expect(mode.accent).toBe(cfg.os==='dark'?'#8ebce0':'#5c91b9');
  expect(mode.logo).toBe(true);
  expect(mode.page).toBeLessThanOrEqual(cfg.width+1);
  await admin.screenshot({path:dir+'/admin-'+cfg.label+'.png',animations:'disabled'});
  if(cfg.label==='mobile-dark'){
   // A deliberate Admin LIGHT selection on a dark phone must remain entirely
   // light; refreshing the document restores the device's preferred DARK.
   await admin.locator('#adminThemeToggle').click();
   await expect.poll(()=>admin.evaluate(()=>({
     theme:document.documentElement.dataset.adminTheme,
     scheme:getComputedStyle(document.documentElement).colorScheme,
     background:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
   }))).toMatchObject({theme:'light',background:'#eaf3fb'});
   expect((await admin.evaluate(()=>getComputedStyle(document.documentElement).colorScheme))).toContain('only');
   await admin.reload({waitUntil:'domcontentloaded'});
   await expect.poll(()=>admin.evaluate(()=>document.documentElement.dataset.adminTheme)).toBe('dark');
  }
  expect(pageErrors).toEqual([]);
  expect(errors).toEqual([]);
  await admin.close();
 });
}
