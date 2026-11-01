import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test.use({serviceWorkers:'block'});

const adminUrl=new URL(process.env.ADMIN_TEST_URL||'https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/');
const password=process.env.ADMIN_TEST_PASSWORD;
const fixture=process.env.ADMIN_DOCK_FIXTURE==='1';

test('mobile Admin dock stays fixed through forward and reverse tab slides',async({browser})=>{
  test.setTimeout(90000);
  if(!fixture&&!password)throw new Error('ADMIN_TEST_PASSWORD missing; do not bypass Access');
  const context=await browser.newContext({viewport:{width:432,height:744},deviceScaleFactor:2,
    colorScheme:'light',hasTouch:true,isMobile:true,reducedMotion:'no-preference',serviceWorkers:'block'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET)
    await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
  try{
    if(fixture){
      const html=await readFile(new URL('../../public/admin/index.html',import.meta.url),'utf8');
      const responses={products:{products:[]},orders:{orders:[]},customers:{customers:[]},
        warranties:{claims:[],warranties:[]},'audit-logs':{logs:[]},settings:{showPrices:false},
        'payment-qr':{active:false}};
      await page.route('https://admin-dock-fixture.invalid/**',route=>{
        const path=new URL(route.request().url()).pathname;
        if(path==='/admin/')return route.fulfill({status:200,contentType:'text/html',body:html});
        if(path==='/api/admin/session')return route.fulfill({json:{}});
        if(path.startsWith('/api/admin/'))return route.fulfill({json:responses[path.split('/').at(-1)]||{}});
        return route.fulfill({status:404,body:''});
      });
    }
    await page.goto(fixture?'https://admin-dock-fixture.invalid/admin/':adminUrl.href,{waitUntil:'domcontentloaded'});
    if(!fixture&&await page.locator('#loginView').isVisible()){
      await page.locator('#password').fill(password);
      await page.locator('#loginForm button[type="submit"]').click();
    }
    try{await expect(page.locator('#appView')).toBeVisible({timeout:12000})}
    catch{
      const loginVisible=await page.locator('#loginView').isVisible();
      const loginError=loginVisible?await page.locator('#loginError').innerText():'';
      throw new Error('ADMIN_AUTH_NOT_ESTABLISHED: '+(loginError||
        (loginVisible?'Login form remained visible after submission':'Admin app did not become visible')));
    }
    await expect(page.locator('.mobiletabs')).toBeVisible();
    await expect(page.locator('body > .mobiletabs')).toBeVisible();

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
      // Start on pointerdown: sampling after tap() misses the brief drop/rebound.
      await page.evaluate(()=>{
        window.__dockTrace={points:[],done:false,transition:null};
        document.addEventListener('pointerdown',event=>{
          if(!event.target.closest('.mobiletabs [data-view]'))return;
          const trace=window.__dockTrace,nav=document.querySelector('.mobiletabs'),main=document.querySelector('#main');
          const start=performance.now();
          const sample=()=>{
            const rect=nav.getBoundingClientRect(),animation=main.getAnimations({subtree:false}).at(-1);
            trace.points.push({at:performance.now()-start,y:rect.y,bottom:innerHeight-rect.bottom,
              viewportHeight:visualViewport?.height??innerHeight,scrollY,transform:getComputedStyle(nav).transform});
            if(!trace.transition&&animation&&main.dataset.adminTransition){
              trace.transition={type:main.dataset.adminTransition,duration:animation.effect.getTiming().duration,
                from:animation.effect.getKeyframes()[0]?.transform||''};
            }
            if(performance.now()-start<360)requestAnimationFrame(sample);else trace.done=true;
          };
          sample();
        },{capture:true,once:true});
      });
      await dock.locator('[data-view="'+target+'"]').tap();
      await expect(main.locator('.pagehead h2').first()).toHaveText(expectedTitle[target],{timeout:500});
      await page.waitForFunction(()=>window.__dockTrace?.done,undefined,{timeout:1000});
      const {points:samples,transition:animation}=await page.evaluate(()=>window.__dockTrace);
      expect(animation,'Capture the page animation during the dock tap').toBeTruthy();
      expect(animation.type,'The page must move in the correct direction').toBe(direction);
      expect(animation.duration,'Tab slide duration must be 250–300ms').toBeGreaterThanOrEqual(250);
      expect(animation.duration,'Tab slide duration must be 250–300ms').toBeLessThanOrEqual(300);
      expect(animation.from,'Forward tabs enter from the right; reverse tabs enter from the left')
        .toContain(direction==='slide-forward'?'22px':'-22px');

      expect(samples.length,'Sample from pointerdown through the full animation').toBeGreaterThan(10);
      expect(Math.max(...samples.map(p=>Math.abs(p.y-before.y))),
        'The fixed dock must not move down or rebound during tab navigation').toBeLessThanOrEqual(.5);
      expect(Math.max(...samples.map(p=>Math.abs(p.bottom-before.bottom))),
        'The fixed dock must remain anchored to the viewport bottom').toBeLessThanOrEqual(.5);
      expect(Math.abs((await geometry()).height-before.height),'Dock height stays constant').toBeLessThanOrEqual(.5);
    }
    expect(pageErrors,'No browser runtime errors during tab navigation').toEqual([]);
  }finally{await context.close()}
});
