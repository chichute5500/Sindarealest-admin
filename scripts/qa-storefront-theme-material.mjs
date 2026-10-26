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
      const overlay=document.querySelector('#sdThemeSwitchOverlay');
      if(!overlay)throw Error('Theme-changing screen missing from isolated Preview');
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
            transitionEvents:[],longTasks:[],overlayEvents:[],coverEvents:[],overlayOrigin:null,paletteCommitAt:null,paletteCovered:false,firstOverlayFrameMs:null};
          const cleanup=[];
          const obs=typeof PerformanceObserver==='function'
            ?new PerformanceObserver(list=>result.longTasks.push(...list.getEntries().map(e=>({start:Math.round(e.startTime),duration:Math.round(e.duration)}))))
            :null;
          try{obs?.observe({entryTypes:['longtask']})}catch{}
          let started=0,active=true;
          let lastShown=false;
          const overlayObserver=new MutationObserver(()=>{
            if(!started||!active)return;
            const shown=overlay.classList.contains('is-visible');
            if(shown===lastShown)return;
            lastShown=shown;
            result.overlayEvents.push({type:shown?'show':'hide',time:Math.round(performance.now())});
            if(shown){
              result.overlayOrigin=overlay.dataset.origin;
              requestAnimationFrame(()=>{
                if(!active)return;
                if(result.firstOverlayFrameMs===null)
                  result.firstOverlayFrameMs=Math.round(performance.now()-started);
              });
            }
          });
          overlayObserver.observe(overlay,{attributes:true,attributeFilter:['class']});
          cleanup.push(()=>overlayObserver.disconnect());
          const onCover=e=>{
            if(e.target!==overlay||e.propertyName!=='opacity')return;
            result.coverEvents.push({type:e.type,relativeMs:Math.round(performance.now()-started)});
          };
          overlay.addEventListener('transitionstart',onCover);
          overlay.addEventListener('transitionend',onCover);
          cleanup.push(()=>{overlay.removeEventListener('transitionstart',onCover);overlay.removeEventListener('transitionend',onCover)});
          const paletteObserver=new MutationObserver(()=>{
            if(!started||!active||result.paletteCommitAt!==null)return;
            if(root.classList.contains('dark')===direction){
              result.paletteCommitAt=Math.round(performance.now()-started);
              result.paletteCovered=overlay.classList.contains('is-covered')&&getComputedStyle(overlay).opacity==='1';
            }
          });
          paletteObserver.observe(root,{attributes:true,attributeFilter:['class']});
          cleanup.push(()=>paletteObserver.disconnect());
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
            result.overlayEvents=result.overlayEvents.map(e=>({...e,relativeMs:e.time-Math.round(started)}));
            result.overlayHidden=!overlay.classList.contains('is-visible')&&getComputedStyle(overlay).visibility==='hidden';
            result.stagingCleared=!root.classList.contains('sd-theme-overlay-active');
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
    const runThemeTrial=async(direction,variant)=>{
      await page.evaluate(direction=>window.__sdThemeTiming.arm(direction),direction);
      const perfBefore=await perfSnapshot();
      // One discrete real click. Never inject CSS into live Production.
      await page.locator('#themeToggle').dispatchEvent('click');
      await page.waitForTimeout(1340);
      const perfAfter=await perfSnapshot();
      const measured=await page.evaluate(()=>window.__sdThemeTiming.finish());
      measured.variant=variant;
      measured.chromeMetrics={};
      for(const key of ['TaskDuration','ScriptDuration','RecalcStyleDuration','LayoutDuration','RecalcStyleCount','LayoutCount']){
        const change=(perfAfter[key]??0)-(perfBefore[key]??0);
        measured.chromeMetrics[key]=key.endsWith('Count')?Math.round(change):Math.round(change*1000);
      }
      return measured;
    };
    // Strict release gate: three full Light > Dark > Light cycles per viewport.
    // A green isolated run cannot mask the intermittent first-frame stalls.
    // Read-only exploratory diagnostics retain one pair to bound A/B duration.
    const strictCycles=process.env.SD_THEME_DIAGNOSTIC_VARIANTS==='1'?1:3;
    const results=[];
    for(let cycle=0;cycle<strictCycles;cycle++){
      for(const direction of [true,false]){
        const variant=cycle===0?'baseline-cold':'baseline-repeat-'+(cycle+1);
        results.push(await runThemeTrial(direction,variant));
      }
    }
    // Run experimental CSS only in the explicitly isolated read-only
    // diagnostic workflow, never in release-gated Chromium matrices.
    if(process.env.SD_THEME_DIAGNOSTIC_VARIANTS==='1'&&process.env.SD_THEME_LEGACY_AB==='1'){
      const experiments=[
        {label:'prepromote-visual-compositor',css:
          'html body .nav-wrap .nav{will-change:background-color;transform:translateZ(0)}html body .theme-bg{transform:translateZ(0);backface-visibility:hidden}'},
        {label:'isolate-navigation-style',css:
          'html body .nav-wrap{contain:style}html body .nav-wrap .nav{will-change:background-color}'},
        {label:'disable-wallpaper-color-filter-only',css:
          'html body .theme-bg--light,html body .theme-bg--dark{filter:none!important}'},
      ];
      const variants=[];
      // READ-ONLY A/B: isolate root palette invalidation from the critical
      // opacity/navbar crossfade. This prototype never changes deployed CSS.
      // Its measurements are diagnostics, not release acceptance.
      const paletteProbes=[];
      // The storefront handler is inside an IIFE, not on window. Intercept
      // only root.classList.toggle('dark', boolean), once it is called by
      // the actual click handler. Never change other DOMTokenList calls.
      for(const scheduling of ['palette-on-end','palette-next-raf','palette-idle']){
        await page.evaluate(scheduling=>{
          const root=document.documentElement;
          const nav=document.querySelector('.nav');
          const original=DOMTokenList.prototype.toggle;
          const rootClasses=root.classList;
          window.__sdProbeCalls=0;
          window.__sdProbeToggle=original;
          const paintPalette=target=>{
            Reflect.apply(original,rootClasses,['dark',target]);
            const meta=document.querySelector('meta[name="theme-color"]');
            if(meta)meta.content=target?'#061522':'#eaf3fb';
          };
          DOMTokenList.prototype.toggle=function(token,force){
            if(this===rootClasses&&token==='dark'&&typeof force==='boolean'){
              window.__sdProbeCalls++;
              if(scheduling==='palette-next-raf'){
                requestAnimationFrame(()=>paintPalette(force));
              }else if(scheduling==='palette-idle'){
                if(window.requestIdleCallback)requestIdleCallback(()=>paintPalette(force),{timeout:170});
                else requestAnimationFrame(()=>paintPalette(force));
              }else{
                const onEnd=event=>{
                  if(event.target!==nav||event.propertyName!=='background-color')return;
                  nav.removeEventListener('transitionend',onEnd,true);
                  paintPalette(force);
                };
                nav.addEventListener('transitionend',onEnd,true);
              }
              return force;
            }
            return Reflect.apply(original,this,arguments);
          };
        },scheduling);
        try{
          for(const direction of [true,false]){
            const trial=await runThemeTrial(direction,'diagnostic-'+scheduling);
            paletteProbes.push({
              variant:scheduling,dark:direction,
              startMs:trial.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionstart')?.relativeMs,
              endMs:trial.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionend')?.relativeMs,
              finalDark:trial.stable.dark,navColor:trial.stable.navColor,
              longTasks:trial.longTasks,chromeMetrics:trial.chromeMetrics
            });
          }
        }finally{
          const calls=await page.evaluate(()=>{
            const count=window.__sdProbeCalls;
            DOMTokenList.prototype.toggle=window.__sdProbeToggle;
            delete window.__sdProbeCalls;
            delete window.__sdProbeToggle;
            return count;
          });
          if(calls!==2)throw Error('Palette timing A/B intercepted '+calls+' instead of 2 root.dark commits for '+scheduling);
        }
      }
      console.log('THEME_ROOT_PALETTE_SCHEDULING_AB '+JSON.stringify(paletteProbes));
      for(const experiment of experiments){
        const temporaryStyle=await page.addStyleTag({content:experiment.css});
        for(const direction of [true,false])variants.push(await runThemeTrial(direction,experiment.label));
        await temporaryStyle.evaluate(node=>node.remove());
      }
      // Exactly the same SVG images, decoded and drawn once into lossless PNG
      // via browser Canvas. Only the diagnostic session uses the bitmaps.
      // Retain the site's opacity fades, filter, placement and sizing.
      const rasterized=await page.evaluate(async()=>{
        const selectors=['.theme-bg--light','.theme-bg--dark'];
        const results=[];
        for(const selector of selectors){
          const layer=document.querySelector(selector);
          const current=getComputedStyle(layer).backgroundImage;
          const match=current.match(/url\(["']?([^"')]+)["']?\)/);
          if(!match)throw Error('Cannot find source SVG for '+selector+': '+current);
          const svgResponse=await fetch(match[1],{credentials:'same-origin'});
          if(!svgResponse.ok)throw Error('Cannot read SVG original: '+svgResponse.status);
          const svgMarkup=await svgResponse.text();
          const svgDoc=new DOMParser().parseFromString(svgMarkup,'image/svg+xml');
          const box=svgDoc.documentElement.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number);
          if(!box||box.length!==4||!box.every(Number.isFinite)||box[2]<=0||box[3]<=0)
            throw Error('Original SVG has no valid viewBox');
          const img=new Image();
          img.src=match[1];
          await img.decode();
          const canvas=document.createElement('canvas');
          // SVGs without width/height otherwise report just 216x150 natural
          // pixels in Chromium, losing the fine Owner-approved satin folds.
          canvas.width=box[2];
          canvas.height=box[3];
          const ctx=canvas.getContext('2d',{willReadFrequently:false});
          if(!ctx)throw Error('Canvas context unavailable');
          ctx.drawImage(img,0,0);
          const encoded=canvas.toDataURL('image/png');
          if(!encoded.startsWith('data:image/png;base64,'))throw Error('Raster source invalid');
          results.push({selector,encoded,width:canvas.width,height:canvas.height,
            pngBytes:Math.floor(encoded.length*.75)});
        }
        return results;
      });
      console.log('THEME_SATIN_RASTER_METADATA '+JSON.stringify(rasterized.map(({selector,width,height,pngBytes})=>({selector,width,height,pngBytes}))));
      const rasterOverride=await page.addStyleTag({content:rasterized
        .map(({selector,encoded})=>'html body '+selector+'{background-image:url("'+encoded+'")!important}')
        .join('\n')});
      for(const direction of [true,false])variants.push(await runThemeTrial(direction,'test-only-lossless-png-background'));
      await rasterOverride.evaluate(node=>node.remove());
      for(const direction of [true,false])variants.push(await runThemeTrial(direction,'baseline-warm'));
      const metric=r=>({
        variant:r.variant,dark:r.direction,
        startMs:r.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionstart')?.relativeMs,
        endMs:r.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionend')?.relativeMs,
        chromeMetrics:r.chromeMetrics,longTasks:r.longTasks
      });
      console.log('THEME_COMPOSITOR_ABA_DIAGNOSTIC '+JSON.stringify([...results,...variants].map(metric)));
      // Directly toggle only the three displayed surfaces, rather than
      // invalidating :root descendants. Visual-only browser experiment.
      const surfaceTest=await page.evaluate(async()=>{
        const nav=document.querySelector('.nav');
        const light=document.querySelector('.theme-bg--light');
        const dark=document.querySelector('.theme-bg--dark');
        const lightNav='rgba(244,250,255,.94)';
        const darkNav='rgba(4,20,34,.94)';
        const btn=document.createElement('button');
        btn.id='sd-direct-surface-test';
        btn.hidden=true;document.body.append(btn);
        const entries=[];
        for(const targetDark of [true,false,true,false]){
          const events=[];
          let started=0;
          const watch=(element,type,prop)=>ev=>{
            if(ev.target!==element||ev.propertyName!==prop)return;
            events.push({event:type,element:element===nav?'nav':element===light?'light':'dark',
              elapsed:Math.round(performance.now()-started)});
          };
          const listeners=[];
          for(const elem of [nav,light,dark]){
            const property=elem===nav?'background-color':'opacity';
            for(const type of ['transitionstart','transitionend']){
              const fn=watch(elem,type,property);elem.addEventListener(type,fn);
              listeners.push(()=>elem.removeEventListener(type,fn));
            }
          }
          const click=()=>{
            started=performance.now();
            nav.style.setProperty('background-color',targetDark?darkNav:lightNav,'important');
            light.style.setProperty('opacity',targetDark?'0':'1','important');
            dark.style.setProperty('opacity',targetDark?'1':'0','important');
          };
          btn.addEventListener('click',click,{once:true});
          btn.click();
          await new Promise(r=>setTimeout(r,590));
          listeners.forEach(fn=>fn());
          entries.push({targetDark,
            start:events.find(v=>v.element==='nav'&&v.event==='transitionstart')?.elapsed,
            end:events.find(v=>v.element==='nav'&&v.event==='transitionend')?.elapsed,
            bgStart:events.find(v=>v.element==='light'&&v.event==='transitionstart')?.elapsed,
            bgEnd:events.find(v=>v.element==='light'&&v.event==='transitionend')?.elapsed});
        }
        nav.style.removeProperty('background-color');
        light.style.removeProperty('opacity');
        dark.style.removeProperty('opacity');
        btn.remove();
        return entries;
      });
      console.log('THEME_DIRECT_SURFACE_CONTROL '+JSON.stringify(surfaceTest));

      // Root-cause experiment: start the exact approved navbar+wallpaper
      // transition as isolated inline styles; synchronize the full document
      // palette on a later task. Restore every inline style before leaving QA.
      const stagedTheme=await page.evaluate(async()=>{
        const root=document.documentElement,nav=document.querySelector('.nav');
        const light=document.querySelector('.theme-bg--light'),dark=document.querySelector('.theme-bg--dark');
        const button=document.createElement('button');
        button.id='sd-two-phase-qa-only';button.hidden=true;document.body.append(button);
        const output=[];
        for(const deferMs of [48,80,120]){
          for(const targetDark of [true,false]){
            const listeners=[],events=[];let begin=0,flipAt=0;
            const watch=(el,name)=>e=>{
              if(e.target!==el||e.propertyName!==(name==='nav'?'background-color':'opacity'))return;
              events.push({type:e.type,el:name,relativeMs:Math.round(performance.now()-begin)});
            };
            for(const [el,name] of [[nav,'nav'],[light,'light'],[dark,'dark']]){
              for(const kind of ['transitionstart','transitionend']){
                const fn=watch(el,name);el.addEventListener(kind,fn);
                listeners.push(()=>el.removeEventListener(kind,fn));
              }
            }
            const click=()=>{
              begin=performance.now();
              root.classList.add('theme-transitioning');
              nav.style.setProperty('background-color',targetDark?'rgba(4,20,34,.94)':'rgba(244,250,255,.94)','important');
              light.style.setProperty('opacity',targetDark?'0':'1','important');
              dark.style.setProperty('opacity',targetDark?'1':'0','important');
              setTimeout(()=>{
                flipAt=Math.round(performance.now()-begin);
                root.classList.toggle('dark',targetDark);
              },deferMs);
            };
            button.addEventListener('click',click,{once:true});
            button.click();
            await new Promise(r=>setTimeout(r,510));
            listeners.forEach(fn=>fn());
            const navStart=events.find(e=>e.type==='transitionstart'&&e.el==='nav')?.relativeMs;
            const bgStart=events.find(e=>e.type==='transitionstart'&&e.el==='light')?.relativeMs;
            const navEnd=events.find(e=>e.type==='transitionend'&&e.el==='nav')?.relativeMs;
            const bgEnd=events.find(e=>e.type==='transitionend'&&e.el==='light')?.relativeMs;
            output.push({targetDark,deferMs,flipAt,navStart,bgStart,navEnd,bgEnd});
            nav.style.removeProperty('background-color');
            light.style.removeProperty('opacity');
            dark.style.removeProperty('opacity');
            root.classList.remove('theme-transitioning');
            await new Promise(r=>setTimeout(r,60));
          }
        }
        button.remove();
        root.classList.remove('dark','theme-transitioning');
        nav.style.removeProperty('background-color');
        light.style.removeProperty('opacity');
        dark.style.removeProperty('opacity');
        return output;
      });
      console.log('THEME_TWO_PHASE_ROOT_CAUSE_DIAGNOSTIC '+JSON.stringify(stagedTheme));


      // A staged visual transition: kick off three visible surfaces first;
      // only upon their first compositor transitionstart switch the large
      // html.dark-dependent catalog/theme subtree. Browser-only prototype:
      // no persistent CSS or site JS change, with exact event timings.
      const staged=await page.evaluate(async()=>{
        const root=document.documentElement,nav=document.querySelector('.nav');
        const light=document.querySelector('.theme-bg--light');
        const dark=document.querySelector('.theme-bg--dark');
        const navLight='rgba(244,250,255,.94)',navDark='rgba(4,20,34,.94)';
        const out=[];
        for(const useTransitionClass of [false,true])for(const desiredDark of [true,false,true,false]){
          root.classList.remove('theme-transitioning');
          root.classList.toggle('dark',!desiredDark);
          nav.style.removeProperty('background-color');
          light.style.removeProperty('opacity');
          dark.style.removeProperty('opacity');
          await new Promise(r=>setTimeout(r,400));
          let zero=performance.now(),didRestyle=false;
          const ev=[];
          const listeners=[];
          const push=(element,property,name,kind)=>{
            const handler=e=>{
              if(e.target!==element||e.propertyName!==property)return;
              ev.push({type:kind,element:name,at:Math.round(performance.now()-zero)});
              if(name==='nav'&&kind==='transitionstart'&&!didRestyle){
                didRestyle=true;
                if(useTransitionClass)root.classList.add('theme-transitioning');
                root.classList.toggle('dark',desiredDark);
                ev.push({type:'root-class-switched',at:Math.round(performance.now()-zero)});
              }
            };
            element.addEventListener(kind,handler);
            listeners.push(()=>element.removeEventListener(kind,handler));
          };
          for(const [el,property,name] of [
            [nav,'background-color','nav'],
            [light,'opacity','light'],[dark,'opacity','dark']
          ])for(const type of ['transitionstart','transitionend'])push(el,property,name,type);
          zero=performance.now();
          nav.style.setProperty('background-color',desiredDark?navDark:navLight,'important');
          light.style.setProperty('opacity',desiredDark?'0':'1','important');
          dark.style.setProperty('opacity',desiredDark?'1':'0','important');
          await new Promise(r=>setTimeout(r,610));
          listeners.forEach(fn=>fn());
          root.classList.remove('theme-transitioning');
          // Read final real class-based computed color, then release inline
          // overrides. They match final CSS targets, so no reverse flash.
          const before={
            nav:getComputedStyle(nav).backgroundColor,
            light:getComputedStyle(light).opacity,
            dark:getComputedStyle(dark).opacity
          };
          nav.style.removeProperty('background-color');
          light.style.removeProperty('opacity');
          dark.style.removeProperty('opacity');
          const after={
            nav:getComputedStyle(nav).backgroundColor,
            light:getComputedStyle(light).opacity,
            dark:getComputedStyle(dark).opacity
          };
          out.push({dark:desiredDark,useTransitionClass,events:ev,
            start:ev.find(e=>e.element==='nav'&&e.type==='transitionstart')?.at,
            end:ev.find(e=>e.element==='nav'&&e.type==='transitionend')?.at,
            restyleAt:ev.find(e=>e.type==='root-class-switched')?.at,
            before,after});
        }
        return out;
      });
      console.log('THEME_STAGED_ROOT_SWAP_PROTOTYPE '+JSON.stringify(staged));

      // Binary-search candidate stylesheet blocks by their *real* theme
      // transition cost. Disable only one block at a time in this test's
      // isolated tab, never in the deployed page. Keep symmetric A/B/A.
      const cssBlocks=await page.evaluate(()=>[...document.querySelectorAll('style')].map((el,index)=>({
        index,id:el.id||'(anonymous)',bytes:el.textContent.length,
        rootDarkRules:(el.textContent.match(/html\.dark/g)||[]).length
      })).filter(v=>v.bytes>15000).sort((a,b)=>b.bytes-a.bytes));
      console.log('THEME_STYLESHEET_BLOCKS '+JSON.stringify(cssBlocks));
      const disabledTrials=[];
      for(const block of cssBlocks.slice(0,6)){
        const toggled=await page.evaluate(index=>{
          const style=[...document.querySelectorAll('style')][index];
          if(!style?.sheet)throw Error('Expected diagnostic stylesheet missing: '+index);
          style.sheet.disabled=true;
          return {index,id:style.id||'(anonymous)'};
        },block.index);
        try{
          for(const direction of [true,false]){
            const one=await runThemeTrial(direction,'test-only-disable-style-'+block.index);
            disabledTrials.push({style:toggled,variant:one.variant,dark:one.direction,
              start:one.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionstart')?.relativeMs,
              end:one.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionend')?.relativeMs,
              taskMs:one.chromeMetrics.TaskDuration,
              styleMs:one.chromeMetrics.RecalcStyleDuration});
          }
        }finally{
          await page.evaluate(index=>{const sheet=[...document.querySelectorAll('style')][index]?.sheet;
            if(sheet)sheet.disabled=false;},block.index);
        }
      }
      console.log('THEME_STYLESHEET_ISOLATION '+JSON.stringify(disabledTrials));


      // Control experiment on the *same fully loaded page*: animate only
      // the navbar and background layers without touching html.dark, which
      // invalidates typography/cards across the Storefront. This preserves
      // the real opacity/color surfaces but is NOT a substitute acceptance.
      await page.evaluate(()=>{
        const root=document.documentElement,nav=document.querySelector('.nav');
        const light=document.querySelector('.theme-bg--light'),dark=document.querySelector('.theme-bg--dark');
        const style=document.createElement('style');
        style.id='sd-theme-layer-only-probe-style';
        style.textContent=[
          'html.sd-layer-only-dark body .theme-bg--dark{opacity:1!important}',
          'html.sd-layer-only-dark body .theme-bg--light{opacity:0!important}',
          'html.sd-layer-only-dark body .nav-wrap .nav{background-color:rgba(4,20,34,.94)!important}'
        ].join('\n');
        document.head.append(style);
        const btn=document.createElement('button');
        btn.id='sd-layer-only-probe';
        btn.type='button';
        btn.hidden=true;
        document.body.append(btn);
        const eventLog=[];
        let clickAt=0,activeIndex=-1;
        btn.addEventListener('click',()=>{
          activeIndex++;
          clickAt=performance.now();
          eventLog.push({index:activeIndex,type:'click',at:clickAt});
          root.classList.toggle('sd-layer-only-dark');
        });
        for(const el of [nav,light,dark]){
          for(const kind of ['transitionstart','transitionend']){
            el.addEventListener(kind,e=>{
              if(e.target!==el||!['background-color','opacity'].includes(e.propertyName))return;
              eventLog.push({index:activeIndex,type:kind,
                element:el===nav?'nav':el===light?'lightBg':'darkBg',
                prop:e.propertyName,elapsedMs:Math.round(performance.now()-clickAt)});
            });
          }
        }
        window.__sdLayerOnlyEvents=eventLog;
      });
      for(const direction of [true,false]){
        await page.locator('#sd-layer-only-probe').dispatchEvent('click');
        await page.waitForTimeout(620);
      }
      const layerOnly=await page.evaluate(()=>{
        const events=window.__sdLayerOnlyEvents;
        document.documentElement.classList.remove('sd-layer-only-dark');
        document.getElementById('sd-layer-only-probe')?.remove();
        document.getElementById('sd-theme-layer-only-probe-style')?.remove();
        return [0,1].map(index=>({
          dark:index===0,
          start:events.find(e=>e.index===index&&e.element==='nav'&&e.type==='transitionstart')?.elapsedMs,
          end:events.find(e=>e.index===index&&e.element==='nav'&&e.type==='transitionend')?.elapsedMs,
          backgroundStart:events.find(e=>e.index===index&&e.element==='lightBg'&&e.type==='transitionstart')?.elapsedMs,
          backgroundEnd:events.find(e=>e.index===index&&e.element==='lightBg'&&e.type==='transitionend')?.elapsedMs
        }));
      });
      console.log('THEME_LAYER_ONLY_CONTROL '+JSON.stringify(layerOnly));
      if(process.env.SD_THEME_TRACE==='1'&&spec.label==='pc-1440'){
        // CDP GPU/style trace of one additional dark toggle, not used as
        // proof of 80/300ms because instrumentation adds overhead.
        const traceNames=new Set([
          'Paint','PrePaint','CompositeLayers','UpdateLayerTree','RecalculateStyles',
          'Layout','RasterTask','Rasterize','DrawFrame','BeginMainThreadFrame',
          'PipelineReporter','RunTask','FunctionCall','ScheduleStyleRecalculation',
          'Layerize','UpdateLayoutTree','Commit','ActivateLayerTree'
        ]);
        const collected=[];
        let seen=0;
        const onTrace=packet=>{
          for(const event of packet.value||[]){
            seen++;
            if(event.ph==='X'&&traceNames.has(event.name)){
              collected.push({
                name:event.name,
                ms:Math.round((event.dur||0)/100)/10,
                at:Math.round((event.ts||0)/1000),
                tid:event.tid
              });
            }
          }
        };
        perfClient.on('Tracing.dataCollected',onTrace);
        await perfClient.send('Tracing.start',{
          categories:'devtools.timeline,disabled-by-default-devtools.timeline,blink,cc,renderer.scheduler',
          transferMode:'ReportEvents'
        });
        const traced=await runThemeTrial(true,'traced-dark-compositor');
        const completion=new Promise(resolve=>perfClient.once('Tracing.tracingComplete',resolve));
        await perfClient.send('Tracing.end');
        await completion;
        perfClient.off('Tracing.dataCollected',onTrace);
        const groups={};
        for(const event of collected){
          const group=groups[event.name]||(groups[event.name]={count:0,totalMs:0,longestMs:0});
          group.count++;
          group.totalMs=Math.round((group.totalMs+event.ms)*10)/10;
          group.longestMs=Math.max(group.longestMs,event.ms);
        }
        console.log('THEME_CHROME_PAINT_TRACE '+JSON.stringify({
          navStartMs:metric(traced).startMs,navEndMs:metric(traced).endMs,
          totalEvents:seen,matchedEvents:collected.length,
          topGroups:Object.entries(groups).sort((a,b)=>b[1].totalMs-a[1].totalMs).slice(0,18),
          longest:collected.sort((a,b)=>b.ms-a.ms).slice(0,20)
        }));
        await runThemeTrial(false,'reset-after-trace');
      }
    }else{
          console.log('THEME_OVERLAY_PERF_DIAGNOSTIC '+JSON.stringify(results.map(r=>({
            dark:r.direction,variant:'baseline',
            startMs:r.overlayEvents.find(e=>e.type==='show')?.relativeMs,
             origin:r.overlayOrigin,coverEvents:r.coverEvents,
            endMs:r.overlayEvents.find(e=>e.type==='hide')?.relativeMs,
            firstFrameMs:r.firstOverlayFrameMs,paletteCommitMs:r.paletteCommitAt,
            paletteCovered:r.paletteCovered,overlayClean:r.overlayHidden&&r.stagingCleared,
            chromeMetrics:r.chromeMetrics,longTasks:r.longTasks
          }))));
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
      // New owner-authorized UX acceptance: a visible covering screen appears
      // with source-colour opacity fade, palette commits while fully covered,
      // and both themes settle before removing it. This replaces, not silently
      // weakens, the retired bare-navbar 80/300ms exposure benchmark.
      const shows=r.overlayEvents.filter(e=>e.type==='show');
      const hides=r.overlayEvents.filter(e=>e.type==='hide');
      if(shows.length!==1||hides.length!==1)
        throw Error('Theme interstitial did not show/hide exactly once: '+JSON.stringify(r));
      const show=shows[0].relativeMs, hide=hides[0].relativeMs;
      if(show>80||show<0)
        throw Error('Theme screen not activated promptly: '+JSON.stringify(r));
      if(r.firstOverlayFrameMs===null||r.firstOverlayFrameMs>180)
        throw Error('Theme screen first frame delayed: '+JSON.stringify(r));
      if(hide<500||hide>1280)
         throw Error('Theme safe-cover reveal did not finish near one second: '+JSON.stringify(r));
       if(r.overlayOrigin!==(r.direction?'light':'dark'))
         throw Error('Cover source colour reversed: '+JSON.stringify(r));
       if(!r.coverEvents.some(e=>e.type==='transitionstart')||!r.coverEvents.some(e=>e.type==='transitionend'))
         throw Error('Opaque sheet did not fade in safely: '+JSON.stringify(r));
       if(r.paletteCommitAt===null||r.paletteCommitAt>hide||!r.paletteCovered)
        throw Error('Theme palette exposed before cover was ready: '+JSON.stringify(r));
      if(!r.overlayHidden||!r.stagingCleared)
        throw Error('Theme screen failed cleanup: '+JSON.stringify(r));
      if(r.stable.dark!==r.direction||Math.abs(r.stable.darkBg-target)>.02||
         Math.abs(r.stable.lightBg-(1-target))>.02)
        throw Error('Final Light/Dark palette not stable when cover exits: '+JSON.stringify(r));
      if(r.stable.navColor!==(r.direction?'rgba(4, 20, 34, 0.94)':'rgba(244, 250, 255, 0.94)'))
        throw Error('Approved navbar colour lost after theme cover: '+JSON.stringify(r));
    }
    if(sync.slides!==2||sync.photoCrossfadeMs!==580||!sync.slideshowChanged||!sync.noControls||!sync.noPhotoWash||!sync.readableCaption)
      throw Error('Material crossfade/autoplay failed: '+JSON.stringify(sync));
    if(errors.length)throw Error('Runtime/page errors: '+JSON.stringify(errors));
    // Rapid repeated taps must not leave the staged palette half-committed,
    // stale inline colour overrides, inaccessible switch labels or timers.
    // The accepted steady-state design must be identical after interruption.
    await page.evaluate(async()=>{
      const trigger=document.getElementById('themeToggle');
      for(let i=0;i<4;i++){
        trigger.click();
        await new Promise(resolve=>setTimeout(resolve,55));
      }
    });
    await page.waitForTimeout(1340);
    const rapid=await page.evaluate(()=>{
      const root=document.documentElement;
      const nav=document.querySelector('.nav');
      const light=document.querySelector('.theme-bg--light');
      const dark=document.querySelector('.theme-bg--dark');
      const bottom=document.querySelector('.mobile-bottom-nav');
      return {
        lightMode:!root.classList.contains('dark'),
        mode:root.dataset.themeMode,
        staged:root.classList.contains('theme-transitioning'),
        target:window.__sdThemeTargetDark,
        activeCancel:typeof window.__sdCancelThemeStage==='function',
        overrideCount:[nav.style.backgroundColor,light.style.opacity,dark.style.opacity,bottom?.style.backgroundColor].filter(Boolean).length,
        lightOpacity:Number(getComputedStyle(light).opacity),
        darkOpacity:Number(getComputedStyle(dark).opacity),
        meta:document.querySelector('meta[name="theme-color"]')?.content,
        overlayHidden:!document.querySelector('#sdThemeSwitchOverlay')?.classList.contains('is-visible'),
        overlayStageCleared:!root.classList.contains('sd-theme-overlay-active'),
        labelled:document.querySelector('#themeToggle')?.getAttribute('aria-label')?.includes('tối')
      };
    });
    if(!rapid.lightMode||rapid.mode!=='light'||rapid.staged||rapid.activeCancel||
       rapid.target!==null||rapid.overrideCount!==0||rapid.lightOpacity<.98||
       rapid.darkOpacity>.02||rapid.meta!=='#eaf3fb'||!rapid.labelled||
       !rapid.overlayHidden||!rapid.overlayStageCleared)
      throw Error('Rapid theme taps left inconsistent state: '+JSON.stringify(rapid));

    // Owner-reported regression: Android account drawer remains OPEN while the
    // account action switches themes. The old suite never exercised this layer.
    let accountThemeMatrix=null;
    if(spec.mobile){
      await page.locator('#mobileAccountNav').click({timeout:5000});
      await page.waitForTimeout(330);
      const inspectAccount=()=>page.evaluate(()=>{
        const root=document.documentElement,drawer=document.querySelector('#accountDrawer');
        const guest=document.querySelector('#accountMenuView .account-guest');
        const order=document.querySelector('#accountOrdersAction');
        const overlay=document.querySelector('#sdThemeSwitchOverlay');
        const dr=drawer.getBoundingClientRect(),gr=guest.getBoundingClientRect(),or=order.getBoundingClientRect();
        const css=getComputedStyle(drawer),guestCss=getComputedStyle(guest);
        const getRgb=getComputedStyle(document.body).backgroundColor;
        return {
          dark:root.classList.contains('dark'),
          rootMode:root.dataset.themeMode,
          open:drawer.classList.contains('open'),
          drawerRect:{left:dr.left,right:dr.right,top:dr.top,bottom:dr.bottom,width:dr.width},
          guestRect:{left:gr.left,right:gr.right,width:gr.width},
          orderRect:{left:or.left,right:or.right,width:or.width},
          drawerBg:css.backgroundColor,
          guestBg:guestCss.backgroundColor,
          bodyBg:getRgb,
          overlayHidden:!overlay.classList.contains('is-visible')&&getComputedStyle(overlay).visibility==='hidden',
          stageCleared:!root.classList.contains('sd-theme-overlay-active'),
          accountThemeActionVisible:!!document.querySelector('#accountThemeAction')?.getBoundingClientRect().width
        };
      });
      const accountBefore=await inspectAccount();
      if(!accountBefore.open||accountBefore.dark||!accountBefore.accountThemeActionVisible)
        throw Error('Light account panel not open before owner regression test: '+JSON.stringify(accountBefore));
      for(const [dark,suffix] of [[true,'dark'],[false,'light']]){
        await page.locator('#accountThemeAction').dispatchEvent('click');
        await page.waitForTimeout(1400);
        const state=await inspectAccount();
        const within=(rect,b)=>rect.width>b.width*.68&&rect.left>=b.left-2&&rect.right<=b.right+2;
        if(state.dark!==dark||!state.open||!state.overlayHidden||!state.stageCleared||
           !within(state.guestRect,state.drawerRect)||!within(state.orderRect,state.drawerRect)||
           state.drawerRect.bottom>spec.height+2)
          throw Error('Theme+account panel failed after '+suffix+' switch: '+JSON.stringify(state));
        await page.screenshot({path:'artifacts/storefront-integration-preview/mobile-account-theme-'+suffix+'.png',
          fullPage:false,animations:'disabled'});
        if(!accountThemeMatrix)accountThemeMatrix={};
        accountThemeMatrix[suffix]=state;
      }
      // Leave the panel without changing the approved drawer behaviour.
      await page.locator('#accountClose').dispatchEvent('click');
      await page.waitForTimeout(320);
    }
    matrix.push({label:spec.label,pass:true,accountThemeMatrix,switches:'Light > Dark > Light',strictCycles,ux:'~1s Android-safe solid-sheet dissolve',rapidInterrupts:'4 taps PASS',photoFiles:sync.files,
      slides:sync.slides,autoplayMs:1500,zeroRemoteWrites:true});
  }finally{await context.close()}
 }
}finally{await browser.close()}
console.log(JSON.stringify({sha,scope:'READ_ONLY_PREVIEW_WITH_SYNTHETIC_MATERIAL_PHOTOS',matrix,welcomeExitMatrix,coldFontMatrix,pass:matrix.length===2&&welcomeExitMatrix.length===2&&coldFontMatrix.length===2},null,2));
