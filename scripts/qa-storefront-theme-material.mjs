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
    // Inspect an actual overlapping-paint frame: only the intro's blank
    // backdrop may fade, never its headline/logo against the incoming HERO.
    await page.waitForFunction(()=>{
      const splash=document.querySelector('#welcomeSplash');
      if(!splash)return false;
      const opacity=Number(getComputedStyle(splash).opacity);
      return opacity>.18&&opacity<.82;
    },null,{timeout:1800});
    const layers=await page.evaluate(()=>{
      const splash=document.querySelector('#welcomeSplash');
      return {splashOpacity:Number(getComputedStyle(splash).opacity),
        textOpacity:Number(getComputedStyle(splash.querySelector('.welcome-content')).opacity)};
    });
    if(layers.textOpacity>.02)
      throw Error('Welcome text ghosted over the storefront: '+JSON.stringify(layers));
    await page.screenshot({path:'artifacts/storefront-integration-preview/'+spec.label+'-welcome-exit.png',fullPage:false,animations:'allow'});
    await page.waitForFunction(()=>!document.querySelector('#welcomeSplash'),null,{timeout:5000});
    const final=await page.evaluate(()=>({
      unlocked:!document.body.classList.contains('welcome-active'),
      pageHeight:document.body.scrollHeight
    }));
    if(!final.unlocked||errors.length)throw Error('Welcome exit final state: '+JSON.stringify({final,errors}));
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
    const sync=await page.evaluate(async()=>{
      const root=document.documentElement;
      const button=document.querySelector('#themeToggle');
      const bgs=[document.querySelector('.theme-bg--light'),document.querySelector('.theme-bg--dark')];
      const layer=[...document.querySelectorAll('#materialGallery .sd-material-slide')];
      const snapshot=()=>({
        dark:root.classList.contains('dark'),
        darkBg:Number(getComputedStyle(bgs[1]).opacity),
        lightBg:Number(getComputedStyle(bgs[0]).opacity),
        navTransition:getComputedStyle(document.querySelector('.nav')).transitionDuration,
        navColor:getComputedStyle(document.querySelector('.nav')).backgroundColor,
        materialTransition:getComputedStyle(document.querySelector('.material-photo')).transitionDuration,
        bgTransition:getComputedStyle(bgs[0]).transitionDuration
      });
      const results=[];
      const nav=document.querySelector('.nav');
      const transitionEvents=[];
      const longTasks=[];
      const observer=typeof PerformanceObserver==='function'
        ?new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:Math.round(e.startTime),duration:Math.round(e.duration)}))))
        :null;
      try{observer?.observe({entryTypes:['longtask']})}catch{}
      for(const elem of [nav,...bgs]){
        for(const type of ['transitionrun','transitionstart','transitionend']){
          elem.addEventListener(type,event=>{
            if(!['background-color','opacity'].includes(event.propertyName))return;
            transitionEvents.push({type,element:elem===nav?'nav':elem===bgs[0]?'lightBg':'darkBg',
              property:event.propertyName,time:Math.round(performance.now()),elapsed:Math.round(event.elapsedTime*1000)});
          });
        }
      }
      for(const direction of [true,false]){
        const eventBase=transitionEvents.length;
        const taskBase=longTasks.length;
        const started=performance.now();
        const frameTimes=[];
        let watching=true;
        const watchFrame=timestamp=>{
          if(!watching)return;
          frameTimes.push(Math.round(timestamp-started));
          requestAnimationFrame(watchFrame);
        };
        requestAnimationFrame(watchFrame);
        button.click();
        const now=snapshot();
        const samples=[];
        while(performance.now()-started<660){
          await new Promise(resolve=>setTimeout(resolve,50));
          samples.push({...snapshot(),elapsedMs:Math.round(performance.now()-started)});
        }
        watching=false;
        await new Promise(resolve=>setTimeout(resolve,240));
        const stable=snapshot();
        results.push({direction,now,samples,stable,
          durationMs:Math.round(performance.now()-started),
          frameTimes,transitionEvents:transitionEvents.slice(eventBase).map(e=>({...e,relativeMs:e.time-Math.round(started)})),
          longTasks:longTasks.slice(taskBase).map(e=>({...e,relativeMs:e.start-Math.round(started)}))});
      }
      observer?.disconnect();
      const first=layer.find(img=>img.classList.contains('is-visible'))?.src;
      await new Promise(resolve=>setTimeout(resolve,1600));
      const second=layer.find(img=>img.classList.contains('is-visible'))?.src;
      await new Promise(resolve=>setTimeout(resolve,1600));
      const third=layer.find(img=>img.classList.contains('is-visible'))?.src;
      const material=document.querySelector('#materialTile');
      const washBefore=getComputedStyle(material,'::before');
      const washAfter=getComputedStyle(material,'::after');
      const caption=getComputedStyle(material.querySelector('.mosaic-content'));
      return {results,slides:layer.length,slideshowChanged:first!==second&&first===third,
        noPhotoWash:parseFloat(washBefore.opacity)===0&&parseFloat(washAfter.opacity)===0&&
          washBefore.backgroundImage==='none'&&washAfter.backgroundImage==='none',
        readableCaption:caption.color==='rgb(255, 255, 255)'&&caption.textShadow!=='none',
        photoCrossfadeMs:Math.round(parseFloat(getComputedStyle(layer[0]).transitionDuration)*1000),
        noControls:!document.querySelector('#materialGallery button,#materialGallery [role=button],#materialGallery .slide-count'),
        files:[first,second,third].map(x=>x?.split('/').pop())};
    });
    for(const r of sync.results){
      const target=r.direction?1:0;
      if(![r.now,...r.samples,r.stable].every(s=>s.dark===r.direction))
        throw Error('Theme state changed twice: '+JSON.stringify(r));
      if(!r.samples.some(s=>s.darkBg>.05&&s.darkBg<.95&&s.lightBg>.05&&s.lightBg<.95))
        throw Error('Theme does not crossfade progressively: '+JSON.stringify(r));
      // Use real elapsed time, not a 50ms setTimeout index: a busy Chromium
      // runner may deliver timers late and mislabel sample 6 as "300ms".
      // This retains the same 300ms completion gate and records frame stalls.
      const early=r.samples.filter(s=>s.elapsedMs<=300);
      const late=r.samples.filter(s=>s.elapsedMs>300);
      const middle=early.filter(s=>s.elapsedMs>=16);
      if(!middle.some(s=>s.navColor!==r.now.navColor&&s.navColor!==r.stable.navColor))
        throw Error('Navigation must crossfade during the same early frames: '+JSON.stringify(r));
      if(late.some(s=>s.navColor!==r.stable.navColor))
        throw Error('Navigation still changing after 300ms: '+JSON.stringify(r));
      const navStart=r.transitionEvents.find(e=>e.element==='nav'&&e.type==='transitionstart'&&e.property==='background-color');
      const backgroundStart=r.transitionEvents.find(e=>e.element==='lightBg'&&e.type==='transitionstart'&&e.property==='opacity');
      const meaningfulFrames=r.frameTimes.filter(t=>t>=0&&t<=300);
      // Compare compositor event start rather than only final color. A
      // simultaneous dark class flip must not stagger navbar vs wallpaper.
      if(navStart&&backgroundStart&&Math.abs(navStart.relativeMs-backgroundStart.relativeMs)>40&&meaningfulFrames.length>=4)
        throw Error('Navigation and background transition start desynchronized (>40ms): '+JSON.stringify(r));
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
