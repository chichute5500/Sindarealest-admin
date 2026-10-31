import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
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
  {width:430,height:932,theme:'light'}, {width:430,height:932,theme:'dark'},
  {width:432,height:744,theme:'light'}, {width:432,height:744,theme:'dark'},
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
      evidenceScope:'LIVE_AUTHENTICATED_READ_ONLY_SCREENS',screens:[],nonAuthMutationRequests:[],pageErrors:[],consoleErrors:[],expectedInitialSessionResponses:[],observedAtUtc:new Date().toISOString()};
    const context=await browser.newContext({viewport:{width,height},colorScheme:theme,hasTouch:width<=820,isMobile:width<=820,serviceWorkers:'block',reducedMotion:'reduce'});
    const page=await context.newPage();
    try {
      if(process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET)
        await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
      page.on('pageerror',error=>report.pageErrors.push(error.message));
      page.on('console',message=>{
        if(message.type()!=='error')return;
        const entry={message:message.text(),url:message.location().url||'',phase:report.authenticatedAt?'authenticated':'login'};
        let path='';try{path=new URL(entry.url).pathname}catch{}
        // The first anonymous session check is expected to be denied. Keep it
        // as evidence; any 401 after login remains an error.
        if(entry.phase==='login' && path==='/api/admin/session' && /status of 401/.test(entry.message))report.expectedInitialSessionResponses.push(entry);
        else report.consoleErrors.push(entry);
      });
      page.on('request',request=>{
        try {
          const url=new URL(request.url());
          if(url.origin===origin && url.pathname.startsWith('/api/') &&
              !['GET','HEAD','OPTIONS'].includes(request.method()) &&
              !(['/api/admin/login','/api/admin/logout'].includes(url.pathname) && request.method()==='POST')) {
            report.nonAuthMutationRequests.push({method:request.method(),path:url.pathname});
          }
        } catch {}
      });
      // Reject stale alias HTML before authenticating or collecting evidence.
      const expectedHtml=readFileSync('public/admin/index.html','utf8');
      await expect.poll(async()=>{const r=await context.request.get(origin+adminPath,{headers:{'Cache-Control':'no-cache'}});return createHash('sha256').update(await r.text()).digest('hex')},{timeout:300000,intervals:[5000,10000,15000],message:'Preview must serve the exact tested Admin HTML'}).toBe(createHash('sha256').update(expectedHtml).digest('hex'));
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
          const componentSelectors=['.topbar','.layout','.pagehead','.pagehead .btn.primary','.statgrid','.stat','.stat-icon','.dashboard-quick-panel','.dashboard-shortcut','.shortcut-icon','.dashboard-revenue','.dashboard-revenue-empty','.dashboard-revenue-visual','.mobiletabs','.mobiletabs .nav'];
          const components=Object.fromEntries(componentSelectors.map(selector=>[selector,[...document.querySelectorAll(selector)].map(el=>({box:el.getBoundingClientRect().toJSON(),css:Object.fromEntries(['background','border','borderRadius','boxShadow','fontSize','fontFamily','lineHeight','padding','whiteSpace','backdropFilter'].map(k=>[k,getComputedStyle(el)[k]]))}))]));
          const masks=[...document.querySelectorAll('.stat .value,.notif-count,.nav-notif-count')].filter(el=>el.getClientRects().length).map(el=>{
            const range=document.createRange();range.selectNodeContents(el);
            const r=el.matches('.stat .value')?range.getBoundingClientRect():el.getBoundingClientRect();
            return {x:r.x-2,y:r.y-2,right:r.right+2,bottom:r.bottom+2,width:r.width+4,height:r.height+4};
          });
          return {components,masks,documentWidth:de.scrollWidth,viewportWidth:innerWidth,horizontalOverflow:de.scrollWidth>innerWidth+2,
            modalNavGapPx,
            unlabeledInteractive:interactive.filter(el=>{
              if(el.hasAttribute('aria-label')||el.hasAttribute('aria-labelledby'))return false;
              if(el.labels?.length||el.getAttribute('title')||el.textContent?.trim())return false;
              return el.getClientRects().length>0;
            }).length,heading:target?.querySelector('h1,h2')?.textContent?.trim().slice(0,90)||null};
        },container);
        if(width<=820 && container==='#appView'){
          for(const nav of m.components['.mobiletabs .nav'])expect(nav.css.whiteSpace,'Dock labels must remain on one line').toBe('nowrap');
        }
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
      report.authenticatedAt=new Date().toISOString();
      // Hide the transient login toast before recording reference-comparison screenshots.
      await expect(page.locator('#toast')).not.toHaveClass(/show/,{timeout:7000});
      if(width===432 && theme==='light'){
        await page.locator('#adminMenuToggle').tap();
        await expect(page.locator('#mobileMorePanel')).toBeVisible();
        await shot('13_mobile_menu');
        await page.locator('#adminMenuToggle').tap();
        await expect(page.locator('#mobileMorePanel')).toBeHidden();
        await page.locator('#notificationToggle').tap();
        await expect(page.locator('#notificationPanel')).toBeVisible();
        await shot('14_notifications');
        await page.locator('#notificationToggle').tap();
        await expect(page.locator('#notificationPanel')).toBeHidden();
        await page.locator('#main .pagehead [data-action="add"]').tap();
        await expect(page.locator('#backdrop')).toBeVisible();
        await shot('15_add_product','#backdrop');
        await page.locator('#editorClose').tap();
        await expect(page.locator('#backdrop')).toBeHidden();
        // Record a real browser touch hold/release on the CTA, without completing a click.
        const cdp=await context.newCDPSession(page);
        const box=await page.locator('#main .pagehead [data-action="add"]').boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
        report.touchPressed=await page.locator('#main .pagehead [data-action="add"]').evaluate(e=>({press:e.dataset.sdGlassPress||null,transform:getComputedStyle(e).transform,shadow:getComputedStyle(e).boxShadow}));
        expect(report.touchPressed.press).toBe('true');
        expect(report.touchPressed.transform).not.toBe('none');
        await page.screenshot({path:join(folder,'16_cta_pressed.png'),fullPage:false,animations:'disabled'});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
        await expect(page.locator('#main .pagehead [data-action="add"]')).not.toHaveAttribute('data-sd-glass-press','true');
        await page.keyboard.press('Tab');
        report.keyboardFocus=await page.evaluate(()=>({tag:document.activeElement.tagName,visible:document.activeElement.matches(':focus-visible'),outline:getComputedStyle(document.activeElement).outlineStyle}));
        expect(report.keyboardFocus.visible).toBe(true);
        expect(report.keyboardFocus.outline).not.toBe('none');
        await page.locator('#main .eyebrow').tap();
      }
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
      if(width===432 && theme==='light'){
        const logoutResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/logout' && r.request().method()==='POST');
        await page.locator('#logout').tap();
        expect((await logoutResponse).ok(),'Logout must succeed at the server').toBe(true);
        await expect(page.locator('#loginView')).toBeVisible();
        const sessionResponse=await context.request.get(origin+'/api/admin/session');
        const session=await sessionResponse.json();
        expect([401,403],'Logged-out session must be denied').toContain(sessionResponse.status());
        expect(session.authenticated,'Logout must revoke this test session').not.toBe(true);
        report.logoutVerified=true;
      }
      expect(report.pageErrors,'No uncaught application errors').toEqual([]);
      expect(report.consoleErrors,'No application console errors').toEqual([]);
      expect(report.nonAuthMutationRequests,'Read-only QA must not make business writes').toEqual([]);
      const captures=report.screens.filter(s=>s.status==='CAPTURED_NOT_ACCEPTED');
      const byHash=new Map();
      for(const capture of captures){
        const previous=byHash.get(capture.sha256);
        expect(previous,'Duplicate screenshot: '+capture.screen+' repeats '+previous+
          '; a mislabeled route must not count as a captured distinct screen').toBeUndefined();
        byHash.set(capture.sha256,capture.screen);
      }
      if(process.env.QA_EXPECT_ORDER_ID)expect(captures.filter(s=>/^(0[1-9]|1[0-2])_/.test(s.screen)).length,'All 12 real Admin screens must be captured whenever isolated QA order fixtures are present').toBe(12);
      else expect(captures.length,'At least 10 real screens should be available without synthetic data').toBeGreaterThanOrEqual(10);
    } finally {
      writeFileSync(join(folder,'manifest.json'),JSON.stringify(report,null,2)+'\n');
      await context.close();
    }
  });
}
