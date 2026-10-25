/** Non-destructive, live Admin Preview smoke checks for auth, keyboard and timing.
 * These results are not a substitute for an external penetration test, WCAG audit or load test.
 */
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

test.use({ serviceWorkers: 'block' });
const base = process.env.FULL_SITE_PREVIEW_URL;
if(base!=='https://integration-fullsite-2026102.sindarealest-admin-preview.pages.dev')throw Error('Unexpected Preview target; refusing to access non-isolated host');
const secret = process.env.ADMIN_TEST_PASSWORD || '';
const cfHeaders = process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
  ? { 'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET } : {};

for (const {width,height,theme} of [
  {width:390,height:844,theme:'light'},
  {width:1440,height:900,theme:'dark'}
]) {
  test('Admin Preview safe security/accessibility/performance smoke '+width+' '+theme, async({browser})=>{
    test.setTimeout(110000);
    if(!secret) throw Error('Missing ADMIN_TEST_PASSWORD; no authentication bypass allowed');
    const out={sha:process.env.GITHUB_SHA || 'unknown',
      viewport:{width,height},theme,evidenceScope:'ISOLATED_PREVIEW_NONDESTRUCTIVE_SMOKE_NOT_COMPLETE_SECURITY_AUDIT',
      authProbes:[],navigationTiming:null,keyboardNavigation:false,unlabeledInteractive:0,overflow:false,
      noStateChangingRequests:true,checkedAtUtc:new Date().toISOString()};
    const ctx=await browser.newContext({viewport:{width,height},colorScheme:theme,
      serviceWorkers:'block',extraHTTPHeaders:cfHeaders});
    const page=await ctx.newPage();
    let wrote=false;
    page.on('request',r=>{if(new URL(r.url()).origin===base&&r.url().includes('/api/admin/')&&
      !['GET','HEAD','OPTIONS'].includes(r.method())&&!r.url().endsWith('/api/admin/login'))wrote=true;});
    try {
      for(const path of ['/api/admin/products','/api/admin/orders','/api/admin/settings','/api/admin/backup','/api/admin/warranties']) {
        const r=await ctx.request.get(base+path,{failOnStatusCode:false});
        out.authProbes.push({path,status:r.status()});
        expect([401,403],path+' unauthenticated access must be rejected').toContain(r.status());
      }
      const start=Date.now();
      const response=await page.goto(base+'/admin/',{waitUntil:'domcontentloaded',timeout:30000});
      expect(response?.status()).toBe(200);
      out.navigationTiming={wallMs:Date.now()-start,
        domContentLoadedMs:await page.evaluate(()=>{
          const n=performance.getEntriesByType('navigation')[0];return n?Math.round(n.domContentLoadedEventEnd):null;
        })};
      await expect(page.locator('#loginView')).toBeVisible();
      await expect(page.locator('#password')).toHaveAttribute('type','password');
      const loginButton=page.locator('#loginForm button[type="submit"]');
      await page.locator('#password').focus();
      await page.keyboard.press('Tab');
      // A real keyboard user must encounter the show/hide password control
      // between the password field and login. Test it instead of skipping it.
      const passwordToggle=page.locator('#showPassword');
      await expect(passwordToggle).toBeFocused();
      await expect(passwordToggle).toHaveAttribute('aria-label','Hiện mật khẩu');
      await page.keyboard.press('Enter');
      await expect(page.locator('#password')).toHaveAttribute('type','text');
      await expect(passwordToggle).toHaveAttribute('aria-pressed','true');
      await page.keyboard.press('Enter');
      await expect(page.locator('#password')).toHaveAttribute('type','password');
      await expect(passwordToggle).toHaveAttribute('aria-pressed','false');
      await page.keyboard.press('Tab');
      await expect(loginButton).toBeFocused();
      await page.locator('#password').fill(secret);
      await loginButton.click();
      await expect(page.locator('#appView')).toBeVisible({timeout:20000});
      const nav=page.locator('button[data-view="products"]:visible').first();
      await expect(nav).toBeVisible();
      await nav.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main .pagehead h2').first()).toHaveText('Sản phẩm',{timeout:20000});
      out.keyboardNavigation=true;
      const metrics=await page.evaluate(()=>{
        const visible=[...document.querySelectorAll('button,input,select,textarea,a[href]')]
          .filter(e=>e.getClientRects().length>0);
        return {overflow:document.documentElement.scrollWidth>innerWidth+2,
          unlabeledInteractive:visible.filter(e=>
            !e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&
            !e.getAttribute('title')&&!e.labels?.length&&!e.textContent?.trim()).length};
      });
      out.overflow=metrics.overflow;out.unlabeledInteractive=metrics.unlabeledInteractive;
      expect(out.overflow).toBe(false);
      expect(out.unlabeledInteractive).toBe(0);
      expect(wrote,'No unauthorized state-changing API calls in this audit').toBe(false);
      console.info('[FULL_SITE_SAFE_ADMIN_SECURITY_A11Y_PERF_SMOKE] '+JSON.stringify(out));
    } finally {
      const folder=join(process.cwd(),'artifacts','admin-security-a11y-perf');
      mkdirSync(folder,{recursive:true});
      writeFileSync(join(folder,width+'-'+theme+'.json'),JSON.stringify(out,null,2)+'\n');
      await ctx.close();
    }
  });
}
