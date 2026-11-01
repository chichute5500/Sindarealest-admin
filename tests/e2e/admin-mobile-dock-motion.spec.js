import {test,expect} from '@playwright/test';

test.use({serviceWorkers:'block'});

const adminUrl=new URL(process.env.ADMIN_TEST_URL||'https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/');
const password=process.env.ADMIN_TEST_PASSWORD;

test('mobile Admin dock stays fixed through forward and reverse tab slides',async({browser})=>{
  test.setTimeout(90000);
  if(!password)throw new Error('ADMIN_TEST_PASSWORD missing; do not bypass Access');
  const context=await browser.newContext({viewport:{width:432,height:744},deviceScaleFactor:2,
    colorScheme:'light',hasTouch:true,isMobile:true,reducedMotion:'no-preference',serviceWorkers:'block'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET)
    await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
  try{
    await page.goto(adminUrl.href,{waitUntil:'domcontentloaded'});
    if(await page.locator('#loginView').isVisible()){
      await page.locator('#password').fill(password);
      await page.locator('#loginForm button[type="submit"]').click();
    }
    await expect(page.locator('#appView')).toBeVisible({timeout:30000});
    await expect(page.locator('.mobiletabs')).toBeVisible();

    const dock=page.locator('.mobiletabs');
    const main=page.locator('#main');
    const geometry=()=>dock.evaluate(el=>{
      const r=el.getBoundingClientRect();
      return{y:r.y,bottom:innerHeight-r.bottom,height:r.height};
    });
    const expectedTitle={dashboard:'Tổng quan',products:'Sản phẩm',orders:'Đơn hàng',customers:'Danh sách khách hàng'};
    const sequence=[
      ['products','slide-forward'],['orders','slide-forward'],['customers','slide-forward'],
      ['orders','slide-back'],['products','slide-back'],['dashboard','slide-back']
    ];
    for(const [target,direction] of sequence){
      const before=await geometry();
      await dock.locator('[data-view="'+target+'"]').tap();
      await expect(main.locator('.pagehead h2').first()).toHaveText(expectedTitle[target],{timeout:500});
      const animation=await main.evaluate(el=>{
        const active=el.getAnimations({subtree:false}).at(-1);
        return{type:el.dataset.adminTransition||'',duration:active?.effect?.getTiming()?.duration||0,
          from:active?.effect?.getKeyframes()?.[0]?.transform||''};
      });
      expect(animation.type,'The page must move in the correct direction').toBe(direction);
      expect(animation.duration,'Tab slide duration must be 250–300ms').toBeGreaterThanOrEqual(250);
      expect(animation.duration,'Tab slide duration must be 250–300ms').toBeLessThanOrEqual(300);
      expect(animation.from,'Forward tabs enter from the right; reverse tabs enter from the left')
        .toContain(direction==='slide-forward'?'22px':'-22px');

      const samples=await dock.evaluate(async el=>{
        const points=[];const start=performance.now();
        while(performance.now()-start<320){
          await new Promise(requestAnimationFrame);
          const r=el.getBoundingClientRect();points.push({y:r.y,bottom:innerHeight-r.bottom});
        }
        return points;
      });
      expect(samples.length,'Sample the dock across the entire animation window').toBeGreaterThan(5);
      expect(Math.max(...samples.map(p=>Math.abs(p.y-before.y))),
        'The fixed dock must not move down or rebound during tab navigation').toBeLessThanOrEqual(.5);
      expect(Math.max(...samples.map(p=>Math.abs(p.bottom-before.bottom))),
        'The fixed dock must remain anchored to the viewport bottom').toBeLessThanOrEqual(.5);
      expect(Math.abs((await geometry()).height-before.height),'Dock height stays constant').toBeLessThanOrEqual(.5);
    }
    expect(pageErrors,'No browser runtime errors during tab navigation').toEqual([]);
  }finally{await context.close()}
});
