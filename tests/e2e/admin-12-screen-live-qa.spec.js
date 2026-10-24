import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test.use({ serviceWorkers: 'block' });
const origin = 'https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev';
const testPassword = process.env.ADMIN_TEST_PASSWORD;
const runSha = process.env.GITHUB_SHA || 'unknown';
const screens = [
  ['02_dashboard','dashboard'], ['03_product_list','products'],
  ['06_orders','orders'], ['08_customers','customers'], ['09_warranty_support','warranties'],
  ['10_website_settings','settings'], ['11_backup_restore','backup'], ['12_activity_log','activity']
];
const matrix = [
  {width:390,height:844,theme:'light'}, {width:390,height:844,theme:'dark'},
  {width:1280,height:800,theme:'light'}, {width:1280,height:800,theme:'dark'}
];
for (const {width,height,theme} of matrix) {
  test('isolated live Admin: 12 screens, read-only '+width+'x'+height+' '+theme, async ({browser}) => {
    test.setTimeout(240_000);
    if (!testPassword) throw new Error('ADMIN_TEST_PASSWORD missing; do not bypass Access');
    const folder=join(process.cwd(),'artifacts','admin-12-screen-live',runSha.slice(0,12),width+'x'+height+'_'+theme);
    mkdirSync(folder,{recursive:true});
    const report={sourceSha:runSha,deployedShaExpected:'564ea556e6dee745eaaa491ee033a2a8cfbb595c',viewport:{width,height},theme,
      evidenceScope:'LIVE_AUTHENTICATED_READ_ONLY_SCREENS',screens:[],nonAuthMutationRequests:[],observedAtUtc:new Date().toISOString()};
    const context=await browser.newContext({viewport:{width,height},colorScheme:theme,serviceWorkers:'block',reducedMotion:'reduce'});
    const page=await context.newPage();
    try {
      if(process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET)
        await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
      page.on('request',request=>{
        try {
          const url=new URL(request.url());
          if(url.origin===origin && url.pathname.startsWith('/api/') &&
              !['GET','HEAD','OPTIONS'].includes(request.method()) &&
              !(url.pathname==='/api/admin/login' && request.method()==='POST')) {
            report.nonAuthMutationRequests.push({method:request.method(),path:url.pathname});
          }
        } catch {}
      });
      const response=await page.goto(origin+'/admin/',{waitUntil:'domcontentloaded',timeout:30000});
      expect(response?.status()).toBe(200);
      await expect(page.locator('#loginView')).toBeVisible({timeout:12000});
      await expect(page.locator('#password')).toHaveAttribute('type','password');
      async function shot(name, container='#appView') {
        const visible=await page.locator(container).isVisible();
        if(!visible){report.screens.push({screen:name,status:'UNAVAILABLE_NOT_ACCEPTED',reason:'container not visible'});return;}
        await page.waitForTimeout(220);
        const m=await page.evaluate(()=>{
          const de=document.documentElement;
          const target=document.querySelector('#main');
          const interactive=target?[...target.querySelectorAll('button,input,select,textarea,a[href]')]:[];
          return {documentWidth:de.scrollWidth,viewportWidth:innerWidth,horizontalOverflow:de.scrollWidth>innerWidth+2,
            unlabeledInteractive:interactive.filter(el=>{
              if(el.hasAttribute('aria-label')||el.hasAttribute('aria-labelledby'))return false;
              if(el.labels?.length||el.getAttribute('title')||el.textContent?.trim())return false;
              return el.getClientRects().length>0;
            }).length,heading:target?.querySelector('h1,h2')?.textContent?.trim().slice(0,90)||null};
        });
        const nameFile=name+'.png';
        await page.screenshot({path:join(folder,nameFile),fullPage:true,animations:'disabled'});
        report.screens.push({screen:name,status:'CAPTURED_NOT_ACCEPTED',file:nameFile,metrics:m});
      }
      if((await page.evaluate(()=>document.documentElement.dataset.adminTheme))!==theme)
        await page.locator('#adminThemeToggle').click();
      await shot('01_login','#loginView');
      await page.locator('#password').fill(testPassword);
      await page.locator('#loginForm button[type=submit]').click();
      await expect(page.locator('#appView')).toBeVisible({timeout:30000});
      for(const [screen,view] of screens){
        await page.evaluate(async v=>{if(typeof window.setView!=='function')throw new Error('setView missing from real ADMIN');await window.setView(v)},view);
        await expect(page.locator('#main')).toBeVisible();
        await shot(screen);
      }
      await page.evaluate(async()=>window.setView('products'));
      const button=page.locator('.tablewrap table tbody tr button[data-action="edit"]:visible').first();
      if(await button.count()){
        await button.click();
        await expect(page.locator('#backdrop')).toBeVisible();
        await shot('04_product_editor','#backdrop');
        await page.locator('#productTabGallery').click();
        await expect(page.locator('#productPanelGallery')).toBeVisible();
        await shot('05_product_gallery','#backdrop');
        await page.locator('#editorClose').click();
      } else for(const name of ['04_product_editor','05_product_gallery'])
        report.screens.push({screen:name,status:'UNAVAILABLE_NOT_ACCEPTED',reason:'No editable product UI row'});
      await page.evaluate(async()=>window.setView('orders'));
      const detail=page.locator('[data-action="view-order-details"]:visible').first();
      if(await detail.count()){
        await detail.click();
        await expect(page.locator('.order-detail-page')).toBeVisible();
        await shot('07_order_detail');
      } else {
        report.screens.push({screen:'07_order_detail',status:'NO_REAL_ORDER_NOT_ACCEPTED',reason:'No live business record; no order fabricated'});
      }
      expect(report.nonAuthMutationRequests,'Read-only QA must not make business writes').toEqual([]);
      const captures=report.screens.filter(s=>s.status==='CAPTURED_NOT_ACCEPTED');
      expect(captures.length,'At least 10 real screens should be available').toBeGreaterThanOrEqual(10);
    } finally {
      writeFileSync(join(folder,'manifest.json'),JSON.stringify(report,null,2)+'\n');
      await context.close();
    }
  });
}
