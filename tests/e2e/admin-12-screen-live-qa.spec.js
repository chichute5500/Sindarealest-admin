import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test.use({ serviceWorkers: 'block' });
const adminPreviewUrl = new URL(process.env.ADMIN_TEST_URL || 'https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/');
const origin = adminPreviewUrl.origin;
const adminPath = adminPreviewUrl.pathname || '/admin/';
const testPassword = process.env.ADMIN_TEST_PASSWORD;
const runSha = process.env.GITHUB_SHA || 'unknown';
// A screenshot test cannot independently verify Cloudflare's deployed application SHA.
// Never hardcode a historic source SHA into fresh screenshot evidence.
const declaredDeployedSha = (process.env.QA_DEPLOYED_APP_SHA || '').trim();
if (declaredDeployedSha && !/^[0-9a-f]{40}$/i.test(declaredDeployedSha))
  throw new Error('QA_DEPLOYED_APP_SHA must be a complete Git SHA');
const screens = [
  ['02_dashboard','dashboard'], ['03_product_list','products'],
  ['06_orders','orders'], ['08_customers','customers'], ['09_warranty_support','warranties'],
  ['10_website_settings','settings'], ['11_backup_restore','backup'], ['12_activity_log','activity']
];
const matrix = [
  // Include narrow-phone viewport; navigation height differs from 390px.
  {width:320,height:640,theme:'light'}, {width:320,height:640,theme:'dark'},
  {width:360,height:800,theme:'light'}, {width:360,height:800,theme:'dark'},
  {width:375,height:812,theme:'light'}, {width:375,height:812,theme:'dark'},
  {width:390,height:844,theme:'light'}, {width:390,height:844,theme:'dark'},
  {width:412,height:915,theme:'light'}, {width:412,height:915,theme:'dark'},
  {width:1280,height:800,theme:'light'}, {width:1280,height:800,theme:'dark'},
  {width:1440,height:900,theme:'light'}, {width:1440,height:900,theme:'dark'}
];
for (const {width,height,theme} of matrix) {
  test('isolated live Admin: 12 screens, read-only '+width+'x'+height+' '+theme, async ({browser}) => {
    test.setTimeout(240_000);
    if (!testPassword) throw new Error('ADMIN_TEST_PASSWORD missing; do not bypass Access');
    const folder=join(process.cwd(),'artifacts','admin-12-screen-live',runSha.slice(0,12),width+'x'+height+'_'+theme);
    mkdirSync(folder,{recursive:true});
    const report={sourceSha:runSha,deployedShaExpected:declaredDeployedSha||null,deploymentVerification:'NOT_PERFORMED_BY_SCREENSHOT_TEST',screenshotMode:'VIEWPORT_PIXEL_MATCHED',viewport:{width,height},theme,
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
      const response=await page.goto(origin+adminPath,{waitUntil:'domcontentloaded',timeout:30000});
      expect(response?.status()).toBe(200);
      await expect(page.locator('#loginView')).toBeVisible({timeout:12000});
      await expect(page.locator('#password')).toHaveAttribute('type','password');
      async function shot(name, container='#appView') {
        const visible=await page.locator(container).isVisible();
        if(!visible){report.screens.push({screen:name,status:'UNAVAILABLE_NOT_ACCEPTED',reason:'container not visible'});return;}
        await page.waitForTimeout(220);
        const m=await page.evaluate(captureContainer=>{
          const de=document.documentElement;
          const target=document.querySelector(captureContainer==='#backdrop' ? '#backdrop' : captureContainer==='#loginView' ? '#loginView' : '#main');
          const interactive=target?[...target.querySelectorAll('button,input,select,textarea,a[href]')]:[];
          const modalNavGapPx=captureContainer==='#backdrop' && innerWidth<=680
            ? Math.abs(document.querySelector('#backdrop').getBoundingClientRect().bottom-
                document.querySelector('.mobiletabs').getBoundingClientRect().top)
            : null;
          return {documentWidth:de.scrollWidth,viewportWidth:innerWidth,horizontalOverflow:de.scrollWidth>innerWidth+2,
            modalNavGapPx,
            unlabeledInteractive:interactive.filter(el=>{
              if(el.hasAttribute('aria-label')||el.hasAttribute('aria-labelledby'))return false;
              if(el.labels?.length||el.getAttribute('title')||el.textContent?.trim())return false;
              return el.getClientRects().length>0;
            }).length,heading:target?.querySelector('h1,h2')?.textContent?.trim().slice(0,90)||null};
        },container);
        expect(m.horizontalOverflow,'No screenshot may pass with document horizontal overflow: '+name+' at '+width+'px').toBe(false);
        expect(m.unlabeledInteractive,'Visible controls must have accessible names: '+name+' at '+width+'px '+theme).toBe(0);
        if(m.modalNavGapPx!==null)expect(m.modalNavGapPx,
          'Deployed mobile editor/gallery must meet navigation without exposing product rows: '+name+' '+theme)
          .toBeLessThanOrEqual(2);
        const nameFile=name+'.png';
        // Capture exactly the nominated viewport, not the entire scrollable page.
        // Only equal-sized PNGs can be directly aligned with a reference viewport.
        const screenshot=await page.screenshot({path:join(folder,nameFile),fullPage:false,animations:'disabled'});
        const measuredWidth=screenshot.readUInt32BE(16),measuredHeight=screenshot.readUInt32BE(20);
        expect(measuredWidth,'Screenshot pixel width must match intended viewport: '+name).toBe(width);
        expect(measuredHeight,'Screenshot pixel height must match intended viewport: '+name).toBe(height);
        report.screens.push({screen:name,status:'CAPTURED_NOT_ACCEPTED',file:nameFile,
          sha256:createHash('sha256').update(screenshot).digest('hex'),pixelDimensions:{width:measuredWidth,height:measuredHeight},metrics:m});
      }
      if((await page.evaluate(()=>document.documentElement.dataset.adminTheme))!==theme)
        await page.locator('#adminThemeToggle').click();
      await shot('01_login','#loginView');
      await page.locator('#password').fill(testPassword);
      await page.locator('#loginForm button[type=submit]').click();
      await expect(page.locator('#appView')).toBeVisible({timeout:30000});
      // Hide the transient login toast before recording reference-comparison screenshots.
      await expect(page.locator('#toast')).not.toHaveClass(/show/,{timeout:7000});
      const expectedHeadings={
        dashboard:'Tổng quan',products:'Sản phẩm',orders:'Đơn hàng',customers:'Danh sách khách hàng',
        warranties:'Bảo hành / Yêu cầu hỗ trợ',settings:'Cài đặt website',
        backup:'Sao lưu / Khôi phục',activity:'Nhật ký hoạt động'
      };
      for(const [screen,view] of screens){
        await page.evaluate(v=>{const nav=[...document.querySelectorAll('[data-view]')].find(el=>el.dataset.view===v);if(!nav)throw new Error('Missing Admin navigation button '+v);nav.click()},view);
        // Navigation awaits a backend read for operational views. A fixed 500ms delay
        // previously captured Orders again under the Customers filename.
        await expect(page.locator('#main .pagehead h2').first(),
          'Capture must show the intended module, not the previous page').toHaveText(expectedHeadings[view],{timeout:20000});
        await shot(screen);
      }
      await page.evaluate(()=>{const nav=[...document.querySelectorAll('[data-view]')].find(el=>el.dataset.view==='products');if(!nav)throw new Error('Products navigation missing');nav.click()});
      await page.waitForTimeout(400);
      const row=page.locator('.tablewrap table tbody tr[data-product-row]:visible').first();
      if(await row.count()){
        await row.locator('.prodname').click();
        await expect(page.locator('#backdrop')).toBeVisible();
        await shot('04_product_editor','#backdrop');
        await page.locator('#productTabGallery').click();
        await expect(page.locator('#productPanelGallery')).toBeVisible();
        await shot('05_product_gallery','#backdrop');
        await page.locator('#editorClose').click();
      } else for(const name of ['04_product_editor','05_product_gallery'])
        report.screens.push({screen:name,status:'UNAVAILABLE_NOT_ACCEPTED',reason:'No editable product UI row'});
      await page.evaluate(()=>{const nav=[...document.querySelectorAll('[data-view]')].find(el=>el.dataset.view==='orders');if(!nav)throw Error('Order view navigation missing');nav.click()});
      await page.waitForTimeout(500);
      const requiredQaOrder=(process.env.QA_EXPECT_ORDER_ID||'').trim();
      if(requiredQaOrder&&!/^qa_[0-9]{8,16}_order$/.test(requiredQaOrder))throw Error('Invalid QA-owned order identity');
      const detail=requiredQaOrder
        ? page.locator('[data-action="view-order-details"][data-id="'+requiredQaOrder+'"]:visible').first()
        : page.locator('[data-action="view-order-details"]:visible').first();
      if(requiredQaOrder) await expect(detail,'Must find the run-owned isolated QA order before marking 12-screen acceptance PASS').toBeVisible({timeout:15000});
      if(await detail.count()){
        await detail.click();
        await expect(page.locator('.order-detail-page')).toBeVisible();
        await shot('07_order_detail');
      } else {
        report.screens.push({screen:'07_order_detail',status:'NO_REAL_ORDER_NOT_ACCEPTED',reason:'No live business record; no order fabricated'});
      }
      expect(report.nonAuthMutationRequests,'Read-only QA must not make business writes').toEqual([]);
      const captures=report.screens.filter(s=>s.status==='CAPTURED_NOT_ACCEPTED');
      const byHash=new Map();
      for(const capture of captures){
        const previous=byHash.get(capture.sha256);
        expect(previous,'Duplicate screenshot: '+capture.screen+' repeats '+previous+
          '; a mislabeled route must not count as a captured distinct screen').toBeUndefined();
        byHash.set(capture.sha256,capture.screen);
      }
      if(process.env.QA_EXPECT_ORDER_ID)expect(captures.length,'All 12 real Admin screens must be captured whenever isolated QA order fixtures are present').toBe(12);
      else expect(captures.length,'At least 10 real screens should be available without synthetic data').toBeGreaterThanOrEqual(10);
    } finally {
      writeFileSync(join(folder,'manifest.json'),JSON.stringify(report,null,2)+'\n');
      await context.close();
    }
  });
}
