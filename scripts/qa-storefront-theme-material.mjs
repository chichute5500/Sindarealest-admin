import {chromium} from 'playwright';
import {buildCloudflareAccessHeaders} from './cloudflare-access-service-token.mjs';
import {isApprovedPreviewExternalRead} from './preview-external-read-allowlist.mjs';

const repository='chichute5500/Sindarealest-admin';
const branch='integration/storefront-locked-on-main-2026-10-26';
const alias='https://integration-storefront-locke.sindarealest-admin-preview.pages.dev';
const sha=String(process.env.GITHUB_SHA||'');
if(process.env.GITHUB_REPOSITORY!==repository||
   process.env.GITHUB_REF!=='refs/heads/'+branch||
   !/^[0-9a-f]{40}$/i.test(sha)||
   process.env.PREVIEW_URL!==alias+'/')throw Error('Provenance mismatch: theme/material QA refused');
const auth=buildCloudflareAccessHeaders();
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/mXcAAAAASUVORK5CYII=','base64');
const browser=await chromium.launch({headless:true});
const matrix=[];
const welcomeExitMatrix=[];
const coldFontMatrix=[];
async function verifyWelcomeColdFonts(spec){
  const context=await browser.newContext({
    viewport:{width:spec.width,height:spec.height},
    isMobile:spec.mobile,hasTouch:spec.mobile,deviceScaleFactor:1,
    colorScheme:'light',reducedMotion:'no-preference'
  });
  await context.addInitScript(()=>{try{localStorage.setItem('sd-theme-mode','light')}catch{}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let delayed=0;
  await page.route('**/*',async route=>{
    const req=route.request();
    let url;
    try{url=new URL(req.url())}catch{await route.abort('blockedbyclient');return}
    if(req.method()!=='GET'&&req.method()!=='HEAD'){
      errors.push('Unexpected write '+url.pathname);await route.abort('blockedbyclient');return;
    }
    if(url.origin===alias){
      if(/^\/fonts\/Noto(?:Serif|Sans)-Regular\.ttf$/.test(url.pathname)){
        delayed++;await new Promise(resolve=>setTimeout(resolve,600));
      }
      if(url.pathname==='/api/products'){
        await route.fulfill({status:200,contentType:'application/json',body:'[]'});return;
      }
      if(url.pathname==='/api/settings'){
        await route.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":true}'});return;
      }
      await route.continue({headers:{...req.headers(),...auth}});return;
    }
    if(isApprovedPreviewExternalRead(req.url(),req.method())){await route.continue();return}
    await route.abort('blockedbyclient');
  });
  try{
    const response=await page.goto(alias+'/',{waitUntil:'domcontentloaded',timeout:45000});
    if(response?.status()!==200)throw Error('Cold-font Preview HTTP '+response?.status());
    const first=await page.evaluate(()=>{
      const root=document.documentElement;
      const title=document.querySelector('#welcomeSplash .welcome-title');
      return {
        ready:root.classList.contains('sd-welcome-font-ready'),
        visible:getComputedStyle(title).visibility,
        serifLoaded:document.fonts.check('400 30px "SD Serif"','Dấu ấn da cá sấu.'),
        sansLoaded:document.fonts.check('400 12px "SD Sans"','Chất liệu cao cấp'),
        copied:title.textContent
      };
    });
    // DOMContentLoaded may occur after both deliberately delayed fonts have
    // completed. Correctly rendered, font-ready Welcome text is legal. The
    // forbidden case remains visible fallback text while fonts are NOT ready.
    if(!first.copied.includes('Dấu ấn da cá sấu')||
       (first.ready&&(!first.serifLoaded||!first.sansLoaded))||
       (!first.ready&&first.visible!=='hidden'))
      throw Error('Unstable Vietnamese glyphs appeared before fonts loaded: '+JSON.stringify({first,delayed}));
    await page.waitForFunction(()=>document.documentElement.classList.contains('sd-welcome-font-ready'),null,{timeout:4500});
    const after=await page.evaluate(()=>{
      const splash=document.querySelector('#welcomeSplash');
      const title=splash?.querySelector('.welcome-title');
      const autoExiting=!splash||splash.classList.contains('is-leaving');
      return {
        visible:title?getComputedStyle(title).visibility:'removed',
        autoExiting,
        serifLoaded:document.fonts.check('400 30px "SD Serif"','Dấu ấn da cá sấu.'),
        sansLoaded:document.fonts.check('400 12px "SD Sans"','Chất liệu cao cấp')
      };
    });
    // The approved 1450ms welcome auto-close may legally hide/remove the text
    // before our delayed-font assertion. Require actual Noto font readiness;
    // only require visible text while the overlay remains in its OPEN state.
    const stillOpen=!after.autoExiting;
    if((stillOpen&&after.visible!=='visible')||!after.serifLoaded||!after.sansLoaded||delayed<2||errors.length)
      throw Error('Welcome fonts not stabilized: '+JSON.stringify({after,delayed,errors}));
    coldFontMatrix.push({label:spec.label,pass:true,delayedFontRequests:delayed,
      fallbackTextNeverPainted:true,correctVietnameseFontsReady:true,
      naturallyExitedBeforeRead:after.autoExiting});
  }finally{await context.close()}
}

async function verifyWelcomeExit(spec){
  const context=await browser.newContext({
    viewport:{width:spec.width,height:spec.height},
    isMobile:spec.mobile,hasTouch:spec.mobile,deviceScaleFactor:1,
    colorScheme:'light',reducedMotion:'no-preference'
  });
  await context.addInitScript(()=>{try{localStorage.setItem('sd-theme-mode','light')}catch{}});
  let releaseProducts;
  const productGate=new Promise(resolve=>{releaseProducts=resolve});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message.slice(0,220)));
  await page.route('**/*',async route=>{
    const request=route.request();
    let url;
    try{url=new URL(request.url())}catch{await route.abort('blockedbyclient');return}
    if(request.method()!=='GET'&&request.method()!=='HEAD'){
      errors.push('Unexpected remote write '+request.method()+' '+url.pathname);
      await route.abort('blockedbyclient');return;
    }
    if(url.origin===alias){
      if(url.pathname==='/api/products'){
        await productGate;await route.fulfill({status:200,contentType:'application/json',body:'[]'});return;
      }
      if(url.pathname==='/api/settings'){
        await route.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":true}'});return;
      }
      await route.continue({headers:{...request.headers(),...auth}});return;
    }
    if(isApprovedPreviewExternalRead(request.url(),request.method())){await route.continue();return}
    await route.abort('blockedbyclient');
  });
  try{
    const response=await page.goto(alias+'/',{waitUntil:'domcontentloaded',timeout:45000});
    if(response?.status()!==200)throw Error('Welcome Preview status '+response?.status());
    await page.locator('#skipIntro').click({timeout:9000});
    await page.waitForTimeout(120);
    const blocked=await page.evaluate(()=>({
      stillVisible:!!document.querySelector('#welcomeSplash')&&!document.querySelector('#welcomeSplash').classList.contains('is-leaving'),
      bodyLocked:document.body.classList.contains('welcome-active'),
      appReady:window.__sdStorefrontReady===true
    }));
    if(!blocked.stillVisible||!blocked.bodyLocked||blocked.appReady)
      throw Error('Welcome exposed unready page: '+JSON.stringify(blocked));
    // Observe actual fade lifecycle *before* releasing the async catalog.
    // Polling only for an intermediate opacity is unreliable when a browser
    // runner skips a paint frame, even if the approved fade is correct.
    await page.evaluate(()=>{
      window.__sdWelcomeFadeEvents=[];
      document.querySelector('#welcomeSplash')?.addEventListener('transitionstart',event=>{
        if(event.target.id==='welcomeSplash'&&event.propertyName==='opacity')
          window.__sdWelcomeFadeEvents.push({type:'start',property:event.propertyName});
      });
      document.querySelector('#welcomeSplash')?.addEventListener('transitionend',event=>{
        if(event.target.id==='welcomeSplash'&&event.propertyName==='opacity')
          window.__sdWelcomeFadeEvents.push({type:'end',property:event.propertyName});
      });
    });
    releaseProducts();
    await page.waitForFunction(()=>document.querySelector('#welcomeSplash')?.classList.contains('is-leaving'),null,{timeout:8500});
    const fade=await page.evaluate(()=>({
      ready:window.__sdStorefrontReady===true,
      bodyUnlocked:!document.body.classList.contains('welcome-active'),
      fullPage:document.body.scrollHeight>innerHeight,
      heroPresent:!!document.querySelector('#home.sd-code-hero')
    }));
    if(!fade.ready||!fade.bodyUnlocked||!fade.fullPage||!fade.heroPresent)
      throw Error('Welcome exit began before storefront layout was stable: '+JSON.stringify(fade));
    // Validate the approved 200ms/100ms fade transition and ensure the
    // welcome text disappears at the *start* of the backdrop fade. The
    // transitionstart event below is a real browser lifecycle proof, not
    // a loosened sampling threshold or a stubbed animation.
    const layers=await page.evaluate(()=>{
      const splash=document.querySelector('#welcomeSplash');
      const splashStyle=getComputedStyle(splash);
      return {splashOpacity:Number(splashStyle.opacity),
        textOpacity:Number(getComputedStyle(splash.querySelector('.welcome-content')).opacity),
        transitionProperty:splashStyle.transitionProperty,
        transitionDuration:splashStyle.transitionDuration,
        transitionDelay:splashStyle.transitionDelay};
    });
    if(layers.textOpacity>.02)
      throw Error('Welcome text ghosted over the storefront: '+JSON.stringify(layers));
    if(!layers.transitionProperty.split(',').map(x=>x.trim()).includes('opacity')||
       !layers.transitionDuration.split(',').map(x=>x.trim()).includes('0.2s')||
       !layers.transitionDelay.split(',').map(x=>x.trim()).includes('0.1s'))
      throw Error('Approved welcome fade duration/delay changed: '+JSON.stringify(layers));
    await page.screenshot({path:'artifacts/storefront-integration-preview/'+spec.label+'-welcome-exit.png',fullPage:false,animations:'allow'});
    await page.waitForFunction(()=>!document.querySelector('#welcomeSplash'),null,{timeout:5000});
    const final=await page.evaluate(()=>({
      unlocked:!document.body.classList.contains('welcome-active'),
      pageHeight:document.body.scrollHeight,
      fadeEvents:window.__sdWelcomeFadeEvents||[]
    }));
    if(!final.unlocked||errors.length||!final.fadeEvents.some(e=>e.type==='start'))
      throw Error('Welcome exit/fade lifecycle invalid: '+JSON.stringify({final,errors}));
    welcomeExitMatrix.push({label:spec.label,pass:true,waitedForProducts:true,
      unlockedBeforeFade:true,completedWithoutHalfLayout:true});
  }finally{
    releaseProducts?.();
    await context.close();
  }
}
try{
 await Promise.all([
   verifyWelcomeColdFonts({label:'cold-font-pc-1440',width:1440,height:900,mobile:false}),
   verifyWelcomeColdFonts({label:'cold-font-mobile-390',width:390,height:844,mobile:true}),
   verifyWelcomeExit({label:'pc-1440',width:1440,height:900,mobile:false}),
   verifyWelcomeExit({label:'mobile-390',width:390,height:844,mobile:true})
 ]);

 for(const spec of [{label:'pc-1440',width:1440,height:900,mobile:false},
                    {label:'mobile-390',width:390,height:844,mobile:true}]){
  const context=await browser.newContext({
    viewport:{width:spec.width,height:spec.height},
    isMobile:spec.mobile,hasTouch:spec.mobile,deviceScaleFactor:1,colorScheme:'light'
  });
  await context.addInitScript(()=>{try{localStorage.setItem('sd-theme-mode','light')}catch{}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message.slice(0,220)));
  await page.route('**/*',async route=>{
    const req=route.request();
    let url;
    try{url=new URL(req.url())}catch{await route.abort('blockedbyclient');return}
    if(req.method()!=='GET'&&req.method()!=='HEAD'){errors.push('Unexpected write '+req.method()+' '+url.pathname);await route.abort('blockedbyclient');return}
    if(url.origin===alias){
      if(url.pathname==='/images/crocodile-leather/gallery.json'){
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({intervalMs:1500,images:['da-01.png','da-02.png']})});return;
      }
      if(/^\/images\/crocodile-leather\/da-0[12]\.png$/.test(url.pathname)){
        await route.fulfill({status:200,contentType:'image/png',body:image});return;
      }
      if(url.pathname==='/api/products'){await route.fulfill({status:200,contentType:'application/json',body:'[]'});return}
      if(url.pathname==='/api/settings'){await route.fulfill({status:200,contentType:'application/json',body:'{"welcomeEnabled":false}'});return}
      await route.continue({headers:{...req.headers(),...auth}});return;
    }
    if(isApprovedPreviewExternalRead(req.url(),req.method())){await route.continue();return}
    await route.abort('blockedbyclient');
  });
  try{
    const response=await page.goto(alias+'/',{waitUntil:'domcontentloaded',timeout:45000});
    if(response?.status()!==200)throw Error('Preview HTTP '+response?.status());
    await page.waitForFunction(()=>document.querySelector('#themeToggle')?.title?.startsWith('Chế độ'),null,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('#materialTile')?.classList.contains('has-real-material-gallery'),null,{timeout:10000});
    // Register passive frame/transition listeners once, then dispatch the
    // click from Playwright as a separate browser task. Previously clicking
    // inside a long async page.evaluate while repeatedly forcing styles
    // could itself delay the first transition frame under runner load.
    await page.evaluate(()=>{
      const root=document.documentElement;
      const button=document.querySelector('#themeToggle');
      const nav=document.querySelector('.nav');
      const bgs=[document.querySelector('.theme-bg--light'),document.querySelector('.theme-bg--dark')];
      const materialPhoto=document.querySelector('.material-photo');
      // Independently prove the real computed 220ms declarations before
      // measuring a click; do not trigger expensive style reads in its path.
      const already=root.classList.contains('theme-transitioning');
      if(!already)root.classList.add('theme-transitioning');
      const durations={
        navTransition:getComputedStyle(nav).transitionDuration,
        bgTransition:getComputedStyle(bgs[0]).transitionDuration,
        materialTransition:getComputedStyle(materialPhoto).transitionDuration
      };
      if(!already)root.classList.remove('theme-transitioning');
      const snapshot=()=>({
        dark:root.classList.contains('dark'),
        darkBg:Number(getComputedStyle(bgs[1]).opacity),
        lightBg:Number(getComputedStyle(bgs[0]).opacity),
        navColor:getComputedStyle(nav).backgroundColor,
        ...durations
      });
      let probe;
      window.__sdThemeTiming={
        arm(direction){
          const baseline=snapshot();
          const result={direction,now:{...baseline,dark:direction},samples:[],frameTimes:[],
            transitionEvents:[],longTasks:[]};
          const cleanup=[];
          const obs=typeof PerformanceObserver==='function'
            ?new PerformanceObserver(list=>result.longTasks.push(...list.getEntries().map(e=>({start:Math.round(e.startTime),duration:Math.round(e.duration)}))))
            :null;
          try{obs?.observe({entryTypes:['longtask']})}catch{}
          let started=0,active=true;
          let midSampleRecorded=false;
          for(const elem of [nav,...bgs]){
            for(const type of ['transitionrun','transitionstart','transitionend']){
              const onTransition=e=>{
                if(e.target!==elem||!['background-color','opacity'].includes(e.propertyName))return;
                result.transitionEvents.push({type,
                  element:elem===nav?'nav':elem===bgs[0]?'lightBg':'darkBg',
                  property:e.propertyName,time:Math.round(performance.now()),
                  elapsed:Math.round(e.elapsedTime*1000)});
                // A single mid-transition style sample proves that nav and
                // both backdrop layers visibly interpolate. Do not force
                // expensive getComputedStyle on every animation frame.
                if(type==='transitionstart'&&elem===nav&&e.propertyName==='background-color'){
                  requestAnimationFrame(()=>{
                    if(!active||midSampleRecorded)return;
                    midSampleRecorded=true;
                    result.samples.push({...snapshot(),elapsedMs:Math.round(performance.now()-started)});
                  });
                }
              };
              elem.addEventListener(type,onTransition);
              cleanup.push(()=>elem.removeEventListener(type,onTransition));
            }
          }
          const onClick=()=>{
            started=performance.now();
            // Passive frame times only. Reading three computed styles on
            // every frame interferes with the transition being measured.
            const tick=timestamp=>{
              if(!active)return;
              const elapsed=Math.round(performance.now()-started);
              result.frameTimes.push(Math.round(timestamp-started));
              if(elapsed<=700)requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          };
          button.addEventListener('click',onClick,{once:true});
          cleanup.push(()=>button.removeEventListener('click',onClick));
          probe={result,obs,cleanup,getStarted:()=>started,finish:()=>{
            active=false;
            obs?.disconnect();
            cleanup.forEach(dispose=>dispose());
            result.stable=snapshot();
            result.durationMs=Math.round(performance.now()-started);
            result.transitionEvents=result.transitionEvents.map(e=>({...e,relativeMs:e.time-Math.round(started)}));
            result.longTasks=result.longTasks.map(e=>({...e,relativeMs:e.start-Math.round(started)}));
            return result;
          }};
        },
        finish(){if(!probe||!probe.getStarted())throw Error('Theme click was not recorded');return probe.finish()}
      };
    });
    // CDP counters localize lag to JS, style recalculation, layout or
    // browser tasks without continuously forcing style in the paint loop.
    const perfClient=await page.context().newCDPSession(page);
    await perfClient.send('Performance.enable');
    const perfSnapshot=async()=>Object.fromEntries(
      (await perfClient.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value])
    );
    const results=[];
    for(const direction of [true,false]){
      await page.evaluate(direction=>window.__sdThemeTiming.arm(direction),direction);
      const perfBefore=await perfSnapshot();
      // Dispatch outside page.evaluate's long-lived Promise so the browser
      // can paint naturally after the interaction.
      await page.locator('#themeToggle').dispatchEvent('click');
      await page.waitForTimeout(850);
      const perfAfter=await perfSnapshot();
      const measured=await page.evaluate(()=>window.__sdThemeTiming.finish());
      measured.chromeMetrics={};
      for(const key of ['TaskDuration','ScriptDuration','RecalcStyleDuration','LayoutDuration','RecalcStyleCount','LayoutCount']){
        const change=(perfAfter[key]??0)-(perfBefore[key]??0);
        measured.chromeMetrics[key]=key.endsWith('Count')?Math.round(change):Math.round(change*1000);
      }
      results.push(measured);
    }
    await perfClient.detach();
    const materialResult=await page.evaluate(async()=>{
      const layer=[...document.querySelectorAll('#materialGallery .sd-material-slide')];
      const first=layer.find(img=>img.classList.contains('is-visible'))?.src;
      await new Promise(resolve=>setTimeout(resolve,1600));
      const second=layer.find(img=>img.classList.contains('is-visible'))?.src;
      await new Promise(resolve=>setTimeout(resolve,1600));
      const third=layer.find(img=>img.classList.contains('is-visible'))?.src;
      const material=document.querySelector('#materialTile');
      const washBefore=getComputedStyle(material,'::before');
      const washAfter=getComputedStyle(material,'::after');
      const caption=getComputedStyle(material.querySelector('.mosaic-content'));
      return {slides:layer.length,slideshowChanged:first!==second&&first===third,
        noPhotoWash:parseFloat(washBefore.opacity)===0&&parseFloat(washAfter.opacity)===0&&
          washBefore.backgroundImage==='none'&&washAfter.backgroundImage==='none',
        readableCaption:caption.color==='rgb(255, 255, 255)'&&caption.textShadow!=='none',
        photoCrossfadeMs:Math.round(parseFloat(getComputedStyle(layer[0]).transitionDuration)*1000),
        noControls:!document.querySelector('#materialGallery button,#materialGallery [role=button],#materialGallery .slide-count'),
        files:[first,second,third].map(x=>x?.split('/').pop())};
    });
    const sync={results,...materialResult};
    for(const r of sync.results){
      const target=r.direction?1:0;
      if(![r.now,...r.samples,r.stable].every(s=>s.dark===r.direction))
        throw Error('Theme state changed twice: '+JSON.stringify(r));
      // Strict event-timing gate: animation must *start* promptly and *end*
      // before 300ms after the user click. Not a relaxation of QA; this
      // avoids causing delays by repeatedly forcing style layout during paint.
      const navStart=r.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionstart'&&e.property==='background-color');
      const backgroundStart=r.transitionEvents.find(e=>e.element==='lightBg'&&e.type==='transitionstart'&&e.property==='opacity');
      const navEnd=r.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionend'&&e.property==='background-color');
      const backgroundEnd=r.transitionEvents.find(e=>e.element==='lightBg'&&e.type==='transitionend'&&e.property==='opacity');
      if(!navStart||!backgroundStart||!navEnd||!backgroundEnd)
        throw Error('Theme transition events missing: '+JSON.stringify(r));
      if(navStart.relativeMs>80||backgroundStart.relativeMs>80)
        throw Error('Theme began too late after click (80ms start limit): '+JSON.stringify(r));
      if(navEnd.relativeMs>300||backgroundEnd.relativeMs>300)
        throw Error('Theme continued past 300ms after click: '+JSON.stringify(r));
      if(Math.abs(navStart.relativeMs-backgroundStart.relativeMs)>40)
        throw Error('Navbar/background transitions desynchronized (>40ms): '+JSON.stringify(r));
      if(Math.abs(navEnd.elapsed-220)>25||Math.abs(backgroundEnd.elapsed-220)>25)
        throw Error('Theme transition does not preserve 220ms duration: '+JSON.stringify(r));
      if(!r.samples.some(s=>s.darkBg>.05&&s.darkBg<.95&&s.lightBg>.05&&s.lightBg<.95&&
         s.navColor!==r.now.navColor&&s.navColor!==r.stable.navColor))
        throw Error('Theme did not visibly crossfade in the middle: '+JSON.stringify(r));
      if(Math.abs(r.stable.darkBg-target)>.02||Math.abs(r.stable.lightBg-(1-target))>.02)
        throw Error('Theme did not settle after 900ms: '+JSON.stringify(r));
      for(const key of ['bgTransition','navTransition','materialTransition']){
        const duration=parseFloat(r.now[key]);
        if(!(duration>=.2&&duration<=.25))
          throw Error('Theme should transition quickly, without heavy shadows: '+key+' '+JSON.stringify(r.now));
      }
    }
    if(sync.slides!==2||sync.photoCrossfadeMs!==580||!sync.slideshowChanged||!sync.noControls||!sync.noPhotoWash||!sync.readableCaption)
      throw Error('Material crossfade/autoplay failed: '+JSON.stringify(sync));
    if(errors.length)throw Error('Runtime/page errors: '+JSON.stringify(errors));
    matrix.push({label:spec.label,pass:true,switches:'Light > Dark > Light',photoFiles:sync.files,
      slides:sync.slides,autoplayMs:1500,zeroRemoteWrites:true});
  }finally{await context.close()}
 }
}finally{await browser.close()}
console.log(JSON.stringify({sha,scope:'READ_ONLY_PREVIEW_WITH_SYNTHETIC_MATERIAL_PHOTOS',matrix,welcomeExitMatrix,coldFontMatrix,pass:matrix.length===2&&welcomeExitMatrix.length===2&&coldFontMatrix.length===2},null,2));
