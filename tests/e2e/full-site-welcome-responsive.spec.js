import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const base=process.env.FULL_SITE_PREVIEW_URL;
if(base!=='https://integration-fullsite-2026102.sindarealest-admin-preview.pages.dev')
  throw Error('Welcome QA refuses an unapproved Production/nonisolated URL');
const dir='artifacts/full-site-preview-evidence/welcome';
mkdirSync(dir,{recursive:true});
const access=process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET
  ? {'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,
     'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET} : {};
const matrix=[
  {name:'pc-1366-short',width:1366,height:608,theme:'light'},
  {name:'pc-1440',width:1440,height:900,theme:'dark'},
  {name:'pc-1024-short',width:1024,height:640,theme:'light'},
  {name:'mobile-390',width:390,height:844,theme:'light'},
  {name:'mobile-360',width:360,height:720,theme:'dark'},
  {name:'mobile-320',width:320,height:640,theme:'light'}
];
for(const v of matrix){
  test('full-viewport lightweight welcome: '+v.name+' / '+v.theme,async ({browser})=>{
    const ctx=await browser.newContext({viewport:{width:v.width,height:v.height},
      colorScheme:v.theme,extraHTTPHeaders:access});
    const page=await ctx.newPage();
    await page.addInitScript(()=>{
      // Hold the FIRST automatic splash timer only for screenshot and measurements.
      // No site file is changed and a later real click must still dismiss it.
      const original=window.setTimeout.bind(window);
      window.setTimeout=(fn,delay,...args)=>
        (typeof fn==='function' && fn.name==='dismiss' && delay>=200 && delay<=2500)
          ? original(()=>{},60000) : original(fn,delay,...args);
    });
    await page.route('**/api/settings', route=>route.fulfill({
      status:200, contentType:'application/json',body:'{"welcomeEnabled":true}'
    }));
    const response=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:45000});
    expect(response?.status()).toBe(200);
    await expect(page.locator('#welcomeSplash')).toBeVisible({timeout:10000});
    const metrics=await page.evaluate(()=>{
      const overlay=document.getElementById('welcomeSplash');
      const panel=overlay.querySelector('.welcome-content');
      const rect=overlay.getBoundingClientRect(), content=panel.getBoundingClientRect();
      const root=document.documentElement;
      const logo=overlay.querySelector('.welcome-logo');
      return {
        viewport:{width:innerWidth,height:innerHeight},
        overlay:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height},
        content:{left:content.left,right:content.right,top:content.top,bottom:content.bottom,
          scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight},
        rootOverflow:getComputedStyle(root).overflowY,
        bodyOverflow:getComputedStyle(document.body).overflowY,
        textureFilter:getComputedStyle(overlay.querySelector('.welcome-texture--light')).filter,
        logoFilter:getComputedStyle(logo).filter
      };
    });
    expect(Math.abs(metrics.overlay.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(metrics.overlay.top)).toBeLessThanOrEqual(2);
    expect(Math.abs(metrics.overlay.width-v.width)).toBeLessThanOrEqual(3);
    expect(Math.abs(metrics.overlay.height-v.height)).toBeLessThanOrEqual(3);
    expect(metrics.overlay.right).toBeGreaterThanOrEqual(v.width-3);
    expect(metrics.content.left).toBeGreaterThanOrEqual(0);
    expect(metrics.content.right).toBeLessThanOrEqual(v.width+1);
    expect(metrics.rootOverflow,'No second desktop/document scrollbar under intro').toBe('hidden');
    expect(metrics.bodyOverflow).toBe('hidden');
    expect(metrics.textureFilter,'No full-screen pixel filter during opening').toBe('none');
    if(v.width>=761){
      expect(metrics.content.scrollHeight-metrics.content.clientHeight,
        'PC welcome must fit vertically without any internal scroll').toBeLessThanOrEqual(3);
    }
    console.info('[WELCOME_VIEWPORT_CONTRACT] '+JSON.stringify({device:v.name,viewport:metrics.viewport,
      overlay:metrics.overlay,content:metrics.content,
      rootOverflow:metrics.rootOverflow,bodyOverflow:metrics.bodyOverflow}));
    await page.screenshot({path:dir+'/'+v.name+'-'+v.theme+'.png',animations:'disabled'});
    await page.locator('#skipIntro').evaluate(el=>el.click());
    await expect(page.locator('body')).not.toHaveClass(/welcome-active/,{timeout:1600});
    await expect(page.locator('#welcomeSplash')).toHaveCount(0,{timeout:1600});
    await ctx.close();
  });
}
