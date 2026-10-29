import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const base=process.env.SD_SOFT_GLASS_BASE_URL||'http://127.0.0.1:4173';
const dir='artifacts/soft-glass-controls';
mkdirSync(dir,{recursive:true});
const matrices=[
 ['mobile-360',360,800],['mobile-390',390,844],
 ['tablet',768,1024],['desktop',1440,900]
];
for(const [label,width,height] of matrices)for(const mode of ['light','dark']){
 test(`Soft Neumorphism ${label} ${mode}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.emulateMedia({colorScheme:mode,reducedMotion:'no-preference'});
  const jsErrors=[];page.on('pageerror',err=>jsErrors.push(err.message));
  const res=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
  expect(res?.status()).toBe(200);
  await page.waitForFunction(()=>window.__sdStorefrontReady===true,null,{timeout:30000});
  await page.evaluate(()=>window.__sdDismissWelcome?.());
  await expect(page.locator('body')).not.toHaveClass(/welcome-active/);
  await page.locator('#products').scrollIntoViewIfNeeded();
  const search=page.locator('#products .search-field');
  const first=page.locator('#categoryFilters .filter-pill').first();
  await expect(first).toBeVisible();
  await expect(search).toBeVisible();
  expect(await page.locator('#categoryFilters .filter-pill[aria-pressed="true"]').count()).toBe(1);
  const readSurface=async selector=>page.locator(selector).first().evaluate(el=>{
   const css=getComputedStyle(el),r=el.getBoundingClientRect();
   return {shadow:css.boxShadow,background:css.backgroundImage,color:css.color,
    rect:{x:r.x,y:r.y,width:r.width,height:r.height},animation:css.animationName};
  });
  const chip=await readSurface('#categoryFilters .filter-pill');
  const field=await readSurface('#products .search-field');
  expect(chip.shadow).toContain('inset');
  expect(field.shadow).toContain('inset');
  expect(chip.background).toContain('radial-gradient');
  expect(chip.animation).toBe('none');
  const pageWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(width+1);
  const chipGeometry=await page.locator('#categoryFilters .filter-pill').evaluateAll(nodes=>nodes.map(el=>{
   const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,visible:!!el.getClientRects().length};
  }));
  expect(chipGeometry.every(c=>c.width>0&&c.width<=width)).toBe(true);
  const icon=page.locator('.nav-actions .icon-btn').first();
  await expect(icon).toBeVisible();
  expect((await icon.evaluate(el=>getComputedStyle(el).boxShadow))).toContain('inset');
  if(width<=760){
   await expect(page.locator('#mobileBottomNav')).toBeVisible();
   const tabs=page.locator('#mobileBottomNav .mobile-tab');
   expect(await tabs.count()).toBe(4);
   expect((await tabs.first().evaluate(el=>getComputedStyle(el).boxShadow))).toContain('inset');
  }
  await search.locator('input').fill('TEST-SEARCH-NEVER-MATCH');
  await expect(search.locator('input')).toHaveValue('TEST-SEARCH-NEVER-MATCH');
  await search.locator('input').fill('');
  if(await page.locator('#categoryFilters .filter-pill').count()>1){
    const second=page.locator('#categoryFilters .filter-pill').nth(1);
    await second.click();
    await expect(second).toHaveAttribute('aria-pressed','true');
    expect((await second.evaluate(el=>getComputedStyle(el).animationName))).toBe('none');
  }
  await page.locator('#products').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${dir}/${label}-${mode}.png`,animations:'disabled'});
  // Physical press contract: make the actual browser hold the button before
  // capture; a CSS declaration alone is not sufficient. Releasing must restore.
  const press=page.locator('#categoryFilters .filter-pill[aria-pressed="true"]').first();
  await press.scrollIntoViewIfNeeded();
  const box=await press.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  const atRest=await press.evaluate(el=>getComputedStyle(el).boxShadow);
  const rectAtRest=await press.evaluate(el=>{const r=el.getBoundingClientRect();return [r.width,r.height]});
  await page.mouse.down();
  await expect.poll(()=>press.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe(atRest);
  const pressed=await press.evaluate(el=>getComputedStyle(el).boxShadow);
  expect(pressed).toContain('inset');
  await page.screenshot({path:`${dir}/${label}-${mode}-pressed.png`,animations:'disabled'});
  await page.mouse.up();
  await expect.poll(()=>press.evaluate(el=>getComputedStyle(el).boxShadow)).toBe(atRest);
  const rectAfter=await press.evaluate(el=>{const r=el.getBoundingClientRect();return [r.width,r.height]});
  expect(rectAfter).toEqual(rectAtRest);
  await page.screenshot({path:`${dir}/${label}-${mode}-released.png`,animations:'disabled'});
  await search.locator('input').focus();
  const focused=await search.evaluate(el=>getComputedStyle(el).boxShadow);
  expect(focused).toContain('inset');
  expect(jsErrors).toEqual([]);
 });
}
