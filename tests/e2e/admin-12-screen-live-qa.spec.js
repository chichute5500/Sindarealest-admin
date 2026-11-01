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
    const dpr=width===432?2:1;
    const folder=join(process.cwd(),'artifacts','admin-12-screen-live',runSha.slice(0,12),width+'x'+height+'_'+theme);
    mkdirSync(folder,{recursive:true});
    const report={sourceSha:runSha,deployedShaExpected:declaredDeployedSha||null,deploymentVerification:'NOT_PERFORMED_BY_SCREENSHOT_TEST',screenshotMode:'VIEWPORT_PIXEL_MATCHED',viewport:{width,height},deviceScaleFactor:dpr,theme,
      evidenceScope:'LIVE_AUTHENTICATED_READ_ONLY_SCREENS',screens:[],nonAuthMutationRequests:[],pageErrors:[],consoleErrors:[],expectedInitialSessionResponses:[],navigationLatencyChecks:[],apiRouteTimings:[],interactionOrigins:[],observedAtUtc:new Date().toISOString()};
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,colorScheme:theme,hasTouch:width<=820,isMobile:width<=820,serviceWorkers:'block',reducedMotion:width===432&&theme==='light'?'no-preference':'reduce'});
    const page=await context.newPage();
    async function expectOriginMotion(locator,label='Reveal'){
      const reducedMotion=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
      if(reducedMotion){
        const state=await locator.evaluate(el=>({transition:el.dataset.adminTransition||null,animations:el.getAnimations().filter(animation=>animation.playState==='running').length}));
        expect(state,label+' must honor reduced-motion preference').toEqual({transition:null,animations:0});
      }else await expect(locator,label+' must expand from its interaction origin').toHaveAttribute('data-admin-transition','origin',{timeout:250});
    }
    async function readDockGeometry(){
      return page.locator('.mobiletabs').evaluate(el=>{
        const r=el.getBoundingClientRect(),s=getComputedStyle(el),root=document.documentElement;
        return{x:r.x,y:r.y,width:r.width,height:r.height,position:s.position,left:s.left,right:s.right,bottom:s.bottom,cssWidth:s.width,
          innerWidth,clientWidth:root.clientWidth,visualViewportWidth:visualViewport?.width??innerWidth,
          innerHeight,visualViewportHeight:visualViewport?.height??innerHeight};
      });
    }
    async function readOriginGeometry(locator){
      return locator.evaluate(el=>{
        const [x,y]=getComputedStyle(el).transformOrigin.split(' ').map(parseFloat);
        // The active WAAPI scale shifts getBoundingClientRect(). Read the
        // authored origin first, then cancel only in the test so the box is
        // measured in its untransformed layout coordinates.
        el.getAnimations({subtree:false}).forEach(animation=>animation.cancel());
        const rect=el.getBoundingClientRect();
        return{x,y,left:rect.left,top:rect.top};
      });
    }
    const delayedRouteCounts={orders:0,customers:0};
    const delayedRouteHandlers={};
    try {
      if(width===432&&theme==='light'){
        // Test-only latency injection against the real, authenticated Preview GETs.
        // It proves route shells paint without waiting for live business data.
        for(const name of ['orders','customers']){
          delayedRouteHandlers[name]=async route=>{delayedRouteCounts[name]++;await new Promise(resolve=>setTimeout(resolve,2200));await route.continue()};
          await page.route('**/api/admin/'+name+'*',delayedRouteHandlers[name]);
        }
      }
      if(process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET)
        await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
      page.on('pageerror',error=>report.pageErrors.push(error.message));
      page.on('console',message=>{
        if(message.type()!=='error')return;
        const entry={message:message.text(),url:message.location().url||'',phase:report.logoutVerificationAt?'logout-verification':report.authenticatedAt?'authenticated':'login'};
        let path='';try{path=new URL(entry.url).pathname}catch{}
        // The first anonymous session check is expected to be denied. Keep it
        // as evidence; any 401 during the authenticated UI remains an error.
        if(['login','logout-verification'].includes(entry.phase) && path==='/api/admin/session' && /status of 401/.test(entry.message))report.expectedInitialSessionResponses.push(entry);
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
      page.on('requestfinished',request=>{
        try {
          const url=new URL(request.url());
          if(url.origin!==origin||!['/api/admin/orders','/api/admin/customers'].includes(url.pathname)||request.method()!=='GET')return;
          const timing=request.timing();
          const durationMs=Number.isFinite(timing.responseEnd)&&timing.responseEnd>=0?timing.responseEnd:null;
          const timeToFirstByteMs=Number.isFinite(timing.responseStart)&&timing.responseStart>=0?timing.responseStart:null;
          report.apiRouteTimings.push({path:url.pathname,durationMs,timeToFirstByteMs,testInjectedDelay:width===432&&theme==='light'});
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
        await page.evaluate(async()=>{
          await document.fonts.ready;
          const images=[...document.images].filter(img=>{
            const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0;
          });
          await Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,4000))]);
        });
        const m=await page.evaluate(({captureContainer,includeMatchedRules})=>{
          const de=document.documentElement;
          const target=document.querySelector(captureContainer==='#backdrop' ? '#backdrop' : captureContainer==='#loginView' ? '#loginView' : '#main');
          const interactive=target?[...target.querySelectorAll('button,input,select,textarea,a[href]')]:[];
          const modalNavGapPx=captureContainer==='#backdrop' && innerWidth<=680
            ? Math.abs(document.querySelector('#backdrop').getBoundingClientRect().bottom-
                document.querySelector('.mobiletabs').getBoundingClientRect().top)
            : null;
          const componentSelectors=['.topbar','.layout','.pagehead','.pagehead .btn.primary','.statgrid','.stat','.stat-icon','.dashboard-quick-panel','.dashboard-shortcut','.shortcut-icon','.dashboard-revenue','.dashboard-revenue-empty','.dashboard-revenue-visual','.mobiletabs','.mobiletabs .nav',
            '#main .panel','#main .setting','#main .control','#main .btn:not(.primary)','#main .switch .slider','#main .product-publish-filter-row','#main .product-results-summary','#main .product-visibility-row','#main .product-visibility-track','#main .product-fulfillment-toggle','#main .product-fulfillment-chip','#main .product-quick-trigger',
            '#main .customer-toolbar','#main .customer-list','#main .customer-card','#main .customer-table tbody tr','#main .customer-mobile-avatar','#main .customer-avatar','#main .customer-mobile-details','#main .customer-mobile-summary','#main .customer-mobile-last-order','#main .customer-mobile-meta',
            '#main .order-toolbar','#main .sd-order-card','#main .order-management-details','#main .order-table .order-management-summary','#main .sd-order-payment-money','#main .sd-order-next-note',
            '#main .warranty-issue-disclosure','#main .activity-view-tabs','#main .activity-log-card','#main .dashboard-activity-table tbody tr',
            '.order-detail-page-actions','.order-detail-page','.mobile-more-panel','.mobile-more-item','.notification-panel','.editor','.editorhead','.editorfooter','.product-quick-editor','.admin-glass-dialog',
            '#backdrop .control','#backdrop .btn:not(.primary)','#backdrop .editor-tab','#backdrop .editor-tab-panel','#backdrop .product-category-grid','#backdrop #productPanelDetails .product-fulfillment-toggle','#backdrop .product-visibility-row'];
          const cssProperties=['background','backgroundColor','backgroundImage','border','borderColor','borderWidth','borderStyle','borderRadius','boxShadow','fontSize','fontFamily','lineHeight','padding','whiteSpace','backdropFilter','opacity','filter','outline','outlineColor','outlineStyle','outlineWidth','outlineOffset','transform','transition'];
          const glassProperties=new Set(['background','background-color','background-image','border','border-color','border-width','border-style','border-radius','box-shadow','backdrop-filter','-webkit-backdrop-filter','filter','opacity','outline','outline-color','outline-style','outline-width','transform','transition']);
          const trackedCustomProperties=/^--(?:sd-admin-|glass-|reference-|accent$|ink$|line$|paper$|muted$)/;
          const splitSelectors=selectorText=>{
            const selectors=[];let start=0,depth=0,quote='',escaped=false;
            for(let i=0;i<selectorText.length;i++){
              const char=selectorText[i];
              if(escaped){escaped=false;continue;}
              if(char==='\\'){escaped=true;continue;}
              if(quote){if(char===quote)quote='';continue;}
              if(char==='"'||char==="'"){quote=char;continue;}
              if(char==='('||char==='[')depth++;
              else if(char===')'||char===']')depth=Math.max(0,depth-1);
              else if(char===','&&depth===0){selectors.push(selectorText.slice(start,i).trim());start=i+1;}
            }
            selectors.push(selectorText.slice(start).trim());return selectors.filter(Boolean);
          };
          const specificity=selector=>{
            const result=[0,0,0];let i=0,compoundStart=true;
            const identEnd=start=>{let j=start;while(j<selector.length){if(selector[j]==='\\'){j+=2;continue;}if(/[\w-]/.test(selector[j])||selector.charCodeAt(j)>=128){j++;continue;}break;}return j;};
            const closeParen=start=>{let depth=1,quote='',escaped=false;for(let j=start+1;j<selector.length;j++){const char=selector[j];if(escaped){escaped=false;continue;}if(char==='\\'){escaped=true;continue;}if(quote){if(char===quote)quote='';continue;}if(char==='"'||char==="'"){quote=char;continue;}if(char==='(')depth++;else if(char===')'&&!--depth)return j;}return selector.length-1;};
            const maxSpecificity=text=>splitSelectors(text).map(part=>specificity(part)).sort((a,b)=>b[0]-a[0]||b[1]-a[1]||b[2]-a[2])[0]||[0,0,0];
            while(i<selector.length){
              const char=selector[i];
              if(/\s/.test(char)){compoundStart=true;i++;continue;}
              if(/[>+~,]/.test(char)){compoundStart=true;i++;continue;}
              if(char==='#'){compoundStart=false;result[0]++;i=identEnd(i+1);continue;}
              if(char==='.' ){compoundStart=false;result[1]++;i=identEnd(i+1);continue;}
              if(char==='['){compoundStart=false;result[1]++;let depth=1,j=i+1,quote='',escaped=false;for(;j<selector.length&&depth;j++){const c=selector[j];if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(quote){if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='[')depth++;else if(c===']')depth--;}i=j;continue;}
              if(char===':'){
                const pseudoElement=selector[i+1]===':';i+=pseudoElement?2:1;const start=i;i=identEnd(i);const name=selector.slice(start,i).toLowerCase();
                const legacyElement=!pseudoElement&&['before','after','first-line','first-letter'].includes(name);
                if(pseudoElement||legacyElement)result[2]++;else result[1]++;
                compoundStart=false;
                if(selector[i]==='('){const end=closeParen(i),argument=selector.slice(i+1,end);
                  if(name==='is'||name==='not'||name==='has'||name==='matches'||name==='any'){const max=maxSpecificity(argument);for(let k=0;k<3;k++)result[k]+=max[k];result[1]--;}
                  else if(name==='where')result[1]--;
                  else if(name==='nth-child'||name==='nth-last-child'){const of=argument.match(/\bof\b([\s\S]*)/i);if(of){const max=maxSpecificity(of[1]);for(let k=0;k<3;k++)result[k]+=max[k];}}
                  else if(name==='slotted'){const max=maxSpecificity(argument);for(let k=0;k<3;k++)result[k]+=max[k];}
                  i=end+1;
                }
                continue;
              }
              if(char==='\\'){i+=2;continue;}
              if(/[\w-]/.test(char)||char.charCodeAt(0)>=128){
                const start=i;i=identEnd(i);const name=selector.slice(start,i);
                if(compoundStart&&name!=='*')result[2]++;
                compoundStart=false;
                continue;
              }
              if(char==='*'){compoundStart=false;i++;continue;}
              i++;
            }
            return result;
          };
          const specificityChecks=[['body span',[0,0,2]],['#main .panel::after',[1,1,1]],[':where(.glass)',[0,0,0]],['.btn:is(.primary,#strong)',[1,1,0]]];
          for(const [selector,expected] of specificityChecks)if(JSON.stringify(specificity(selector))!==JSON.stringify(expected))throw new Error('Material QA specificity parser failed for '+selector);
          const materialRules=[];
          if(includeMatchedRules){
            let ruleOrder=0;
            const visit=(rules,conditions=[],sheetIndex=0,sheetHref='',path=[])=>{
              let childIndex=0;
              for(const rule of rules||[]){
                const currentOrder=ruleOrder++,currentPath=[...path,childIndex++];
                if(rule.type===CSSRule.MEDIA_RULE){const condition='@media '+rule.conditionText;if(matchMedia(rule.conditionText).matches)visit(rule.cssRules,[...conditions,condition],sheetIndex,sheetHref,currentPath);continue;}
                if(rule.type===CSSRule.SUPPORTS_RULE){const condition='@supports '+rule.conditionText;if(CSS.supports(rule.conditionText))visit(rule.cssRules,[...conditions,condition],sheetIndex,sheetHref,currentPath);continue;}
                if(rule.cssRules){visit(rule.cssRules,conditions,sheetIndex,sheetHref,currentPath);continue;}
                if(!rule.selectorText||!rule.style)continue;
                const declarations={};
                for(let i=0;i<rule.style.length;i++){
                  const property=rule.style[i];
                  if(glassProperties.has(property)||trackedCustomProperties.test(property))
                    declarations[property]={value:rule.style.getPropertyValue(property).trim(),important:rule.style.getPropertyPriority(property)==='important'};
                }
                if(!Object.keys(declarations).length)continue;
                for(const selector of splitSelectors(rule.selectorText)){
                  const pseudoMatch=selector.match(/(::?before|::?after)$/i),pseudo=pseudoMatch?(pseudoMatch[1].toLowerCase().includes('before')?'before':'after'):null;
                  materialRules.push({selector,baseSelector:pseudoMatch?selector.slice(0,-pseudoMatch[1].length):selector,
                    selectorSpecificity:specificity(selector),pseudo,sheetIndex,sheetHref,ruleOrder:currentOrder,rulePath:currentPath,conditions,declarations});
                }
              }
            };
            for(let sheetIndex=0;sheetIndex<document.styleSheets.length;sheetIndex++){
              const sheet=document.styleSheets[sheetIndex];try{visit(sheet.cssRules,[],sheetIndex,sheet.href||'<inline stylesheet>')}catch{}
            }
          }
          function matchedMaterialRules(element,pseudo=''){
            if(!includeMatchedRules)return undefined;
            const matched=[],chain=[];for(let node=element,depth=0;node&&depth<16;node=node.parentElement,depth++)chain.push({node,depth});
            // Include directly matched declarations and inherited design-token declarations from ancestors.
            for(const {node,depth} of chain){
              for(const rule of materialRules){
                if(depth===0){if(pseudo?(rule.pseudo&&rule.pseudo!==pseudo):rule.pseudo)continue;}
                else if(rule.pseudo)continue;
                let applies=false;try{applies=node.matches(rule.baseSelector)}catch{}
                if(!applies)continue;
                const declarations=Object.fromEntries(Object.entries(rule.declarations).filter(([property])=>{
                  if(depth>0)return property.startsWith('--');
                  if(pseudo)return property.startsWith('--')||rule.pseudo===pseudo;
                  return true;
                }));
                if(Object.keys(declarations).length)matched.push({...rule,ancestorDepth:depth||undefined,declarations});
              }
              if(node.style?.length){
                const declarations={};
                for(let i=0;i<node.style.length;i++){const property=node.style[i];if(glassProperties.has(property)||trackedCustomProperties.test(property))declarations[property]={value:node.style.getPropertyValue(property).trim(),important:node.style.getPropertyPriority(property)==='important'};}
                const inherited=depth>0||pseudo?Object.fromEntries(Object.entries(declarations).filter(([property])=>property.startsWith('--'))):declarations;
                if(Object.keys(inherited).length)matched.push({selector:'<inline style>',selectorSpecificity:null,pseudo:pseudo||null,origin:'inline',ancestorDepth:depth||undefined,declarations:inherited});
              }
            }
            return matched;
          }
          const components=Object.fromEntries(componentSelectors.map(selector=>[selector,[...document.querySelectorAll(selector)].slice(0,6).map(el=>{
            const computed=getComputedStyle(el),css=Object.fromEntries(cssProperties.map(k=>[k,computed[k]]));
            for(const token of ['--sd-admin-surface-face','--sd-admin-face','--sd-admin-inset-face','--sd-admin-sheet-face','--sd-admin-icon-face','--sd-admin-tile-face','--sd-admin-shadow','--sd-admin-inset-shadow','--sd-admin-rim','--sd-admin-inset-rim','--sd-admin-tile-rim','--glass-blur','--ink','--paper','--muted','--line','--accent','--reference-blue'])
              css[token]=computed.getPropertyValue(token).trim();
            const pseudoStyle=pseudo=>{const style=getComputedStyle(el,'::'+pseudo);return {content:style.content,position:style.position,inset:[style.top,style.right,style.bottom,style.left],size:[style.width,style.height],background:style.background,border:style.border,borderRadius:style.borderRadius,boxShadow:style.boxShadow,opacity:style.opacity,filter:style.filter,transform:style.transform,zIndex:style.zIndex,pointerEvents:style.pointerEvents,mixBlendMode:style.mixBlendMode};};
            const before=pseudoStyle('before'),after=pseudoStyle('after');
            return {box:el.getBoundingClientRect().toJSON(),css,pseudo:{before,after},...(includeMatchedRules?{matchedRules:matchedMaterialRules(el),matchedPseudoRules:{before:matchedMaterialRules(el,'before'),after:matchedMaterialRules(el,'after')}}:{})};
          })]));
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
        },{captureContainer:container,includeMatchedRules:width===432&&height===744});
        if(width<=820 && container==='#appView'){
          for(const nav of m.components['.mobiletabs .nav'])expect(nav.css.whiteSpace,'Dock labels must remain on one line').toBe('nowrap');
        }
        expect(m.horizontalOverflow,'No screenshot may pass with document horizontal overflow: '+name+' at '+width+'px').toBe(false);
        expect(m.unlabeledInteractive,'Visible controls must have accessible names: '+name+' at '+width+'px '+theme).toBe(0);
        if(m.modalNavGapPx!==null)expect(m.modalNavGapPx,
          'Deployed mobile editor/gallery must meet navigation without exposing product rows: '+name+' '+theme)
          .toBeLessThanOrEqual(2);
        const nameFile=name+'.png';
        // Capture the nominated CSS viewport with its declared physical pixel ratio.
        // TARGET uses432CSSpx atDPR2; comparison normalizes both sides to CSS pixels.
        const screenshot=await page.screenshot({path:join(folder,nameFile),fullPage:false,animations:'disabled'});
        const measuredWidth=screenshot.readUInt32BE(16),measuredHeight=screenshot.readUInt32BE(20);
        expect(measuredWidth,'Screenshot pixels must match CSS viewport times declared DPR: '+name).toBe(width*dpr);
        expect(measuredHeight,'Screenshot pixels must match CSS viewport times declared DPR: '+name).toBe(height*dpr);
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
      if(width===432&&theme==='light'){
        await expect(page.locator('#main .admin-loading-grid[data-admin-loading-view="dashboard"]')).toBeVisible({timeout:500});
        const expected={products:'Sản phẩm',orders:'Đơn hàng',customers:'Danh sách khách hàng',dashboard:'Tổng quan'};
        const sequence=[
          ['products','slide-forward'],['orders','slide-forward'],['customers','slide-forward'],
          ['orders','slide-back'],['products','slide-back'],['dashboard','slide-back']
        ];
        for(const [target,direction] of sequence){
          const dock=await readDockGeometry();
          const started=await page.evaluate(()=>performance.now());
          await page.locator('.mobiletabs [data-view="'+target+'"]').tap();
          await expect(page.locator('#main .pagehead h2').first()).toHaveText(expected[target],{timeout:500});
          await expect(page.locator('#main')).toHaveAttribute('data-admin-transition',direction,{timeout:250});
          const elapsedMs=await page.evaluate(start=>performance.now()-start,started);
          const timing=await page.locator('#main').evaluate(el=>{const animation=el.getAnimations({subtree:false}).at(-1);return{duration:animation?.effect?.getTiming()?.duration||0,transition:el.dataset.adminTransition||'',from:animation?.effect?.getKeyframes()?.[0]?.transform||''}});
          const dockAfter=await readDockGeometry();
          report.navigationLatencyChecks.push({target,direction,initialTransform:timing.from,elapsedMs,transitionMs:timing.duration,dockStationary:true,
            dockViewport:{before:{innerWidth:dock.innerWidth,clientWidth:dock.clientWidth,visualViewportWidth:dock.visualViewportWidth,x:dock.x,width:dock.width},
              after:{innerWidth:dockAfter.innerWidth,clientWidth:dockAfter.clientWidth,visualViewportWidth:dockAfter.visualViewportWidth,x:dockAfter.x,width:dockAfter.width}},
            skeletonVisible:target==='orders'||target==='customers'});
          expect(elapsedMs,'Tab '+target+' shell must paint under 500ms while its data request is deliberately delayed').toBeLessThan(500);
          expect(timing.duration,'Tab transition duration must be 250–300ms').toBeGreaterThanOrEqual(250);
          expect(timing.duration,'Tab transition duration must be 250–300ms').toBeLessThanOrEqual(300);
          expect(timing.transition).toBe(direction);
          expect(timing.from,'Tab '+target+' must enter from the '+direction+' side').toContain(direction==='slide-forward'?'22px':'-22px');
          expect(dockAfter.position,'The bottom dock must remain fixed while changing routes').toBe('fixed');
          expect(dockAfter.bottom,'The dock must stay anchored to the same safe-area bottom').toBe(dock.bottom);
          expect(Math.abs(dockAfter.height-dock.height),'The fixed dock must keep its height').toBeLessThanOrEqual(.5);
          for(const snapshot of [dock,dockAfter]){
            const expectedWidth=Math.min(snapshot.innerWidth-28,520),expectedX=(snapshot.innerWidth-expectedWidth)/2;
            expect(Math.abs(snapshot.width-expectedWidth),'The fixed dock width must match its current CSS viewport').toBeLessThanOrEqual(.5);
            expect(Math.abs(snapshot.x-expectedX),'The fixed dock must stay centered in its current CSS viewport').toBeLessThanOrEqual(.5);
          }
          if(dockAfter.clientWidth===dock.clientWidth){
            expect(Math.abs(dockAfter.x-dock.x),'The fixed dock must keep its horizontal position when the CSS viewport is unchanged').toBeLessThanOrEqual(.5);
            expect(Math.abs(dockAfter.width-dock.width),'The fixed dock must keep its width when the CSS viewport is unchanged').toBeLessThanOrEqual(.5);
          }
          const dockBottomOffset=parseFloat(dockAfter.bottom);
          expect(Math.abs(dockAfter.y+dockAfter.height+dockBottomOffset-dockAfter.innerHeight),
            'The dock must stay fixed to the viewport bottom even if the browser visual viewport changes').toBeLessThanOrEqual(1);
          if(target==='orders'||target==='customers')await expect(page.locator('#main .admin-loading-grid[data-admin-loading-view="'+target+'"]')).toBeVisible();
        }
        expect(delayedRouteCounts.orders,'Rapid navigation must share one pending Orders GET').toBe(1);
        expect(delayedRouteCounts.customers,'Rapid navigation must share one pending Customers GET').toBe(1);
        await expect.poll(async()=>await page.locator('#main .admin-loading-grid').count(),{timeout:5000,intervals:[100,200,300,500]}).toBe(0);
        for(const name of ['orders','customers'])await page.unroute('**/api/admin/'+name+'*',delayedRouteHandlers[name]);
        await page.locator('.mobiletabs [data-view="orders"]').tap();
        await expect(page.locator('#orderResultSummary')).toHaveText(/^Hiển thị \d+ \/ \d+ đơn hàng$/,{timeout:500});
        await page.locator('.mobiletabs [data-view="customers"]').tap();
        await expect(page.locator('#customerSearchStatus')).toHaveText(/^(Hiển thị \d+ \/ \d+ hồ sơ đã tải \(tối đa 2\.000\)\.|Không thể tải danh sách khách hàng từ máy chủ\.)$/,{timeout:500});
      }
      // Hide the transient login toast before recording reference-comparison screenshots.
      await expect(page.locator('#toast')).not.toHaveClass(/show/,{timeout:7000});
      if(width===432 && theme==='light'){
        await page.locator('#adminMenuToggle').tap();
        await expect(page.locator('#mobileMorePanel')).toBeVisible();
        await expectOriginMotion(page.locator('#mobileMorePanel'),'Mobile More menu');
        await shot('13_mobile_menu');
        await page.locator('#adminMenuToggle').tap();
        await expect(page.locator('#mobileMorePanel')).toBeHidden();
        await page.locator('#notificationToggle').tap();
        await expect(page.locator('#notificationPanel')).toBeVisible();
        await expectOriginMotion(page.locator('#notificationPanel'),'Notification panel');
        await shot('14_notifications');
        await page.locator('#notificationToggle').tap();
        await expect(page.locator('#notificationPanel')).toBeHidden();
        await page.locator('.mobiletabs [data-view="dashboard"]').tap();
        await expect(page.locator('#main .pagehead h2').first()).toHaveText('Tổng quan',{timeout:500});
        await page.locator('#main .pagehead [data-action="add"]').tap();
        await expect(page.locator('#backdrop')).toBeVisible();
        await expectOriginMotion(page.locator('#backdrop .editor'),'Product editor');
        await shot('15_add_product','#backdrop');
        await page.locator('#productCategoryToggle').tap();
        await expect(page.locator('#productCategoryGrid')).toBeVisible();
        await expectOriginMotion(page.locator('#productCategoryGrid'),'Product category filter');
        await page.locator('#productCategoryToggle').tap();
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
        // The route shell is synchronous; wait for its real data before taking a screen capture.
        await expect(page.locator('#main .pagehead h2').first(),
          'Capture must show the intended module, not the previous page').toHaveText(expectedHeadings[view],{timeout:20000});
        if(view==='orders')await expect(page.locator('#orderResultSummary')).toHaveText(/^Hiển thị \d+ \/ \d+ đơn hàng$/,{timeout:20000});
        if(view==='customers')await expect(page.locator('#customerSearchStatus')).toHaveText(/^(Hiển thị \d+ \/ \d+ hồ sơ đã tải \(tối đa 2\.000\)\.|Không thể tải danh sách khách hàng từ máy chủ\.)$/,{timeout:20000});
        await shot(screen);
      }
      if(width===432 && theme==='light'){
        await page.evaluate(()=>{const nav=[...document.querySelectorAll('[data-view]')].find(el=>el.dataset.view==='customers');if(!nav)throw Error('Customer view navigation missing');nav.click()});
        await expect(page.locator('#main .customer-pagehead h2').first()).toHaveText('Danh sách khách hàng',{timeout:20000});
        const contactSummary=page.locator('#main .customer-mobile-details > summary:visible').first();
        if(await contactSummary.count()){
          await contactSummary.click();
          await expect(page.locator('#main .customer-mobile-details[open]')).toBeVisible();
          await expectOriginMotion(page.locator('#main .customer-mobile-extra'),'Customer contact disclosure');
          await shot('17_customer_contact_expanded');
        } else report.screens.push({screen:'17_customer_contact_expanded',status:'UNAVAILABLE_NOT_ACCEPTED',reason:'No live customer detail to expand'});
      }
      await page.evaluate(()=>{const nav=[...document.querySelectorAll('[data-view]')].find(el=>el.dataset.view==='products');if(!nav)throw new Error('Products navigation missing');nav.click()});
      await expect(page.locator('#main .pagehead h2').first()).toHaveText('Sản phẩm',{timeout:20000});
      const row=page.locator('.tablewrap table tbody tr[data-product-row]:visible').first();
      if(await row.count()){
        await row.locator('.prodname').click();
        await expect(page.locator('#backdrop')).toBeVisible();
        await shot('04_product_editor','#backdrop');
        await page.locator('#productTabGallery').click();
        await expect(page.locator('#productPanelGallery')).toBeVisible();
        await shot('05_product_gallery','#backdrop');
        const galleryImage=page.locator('#imageGrid [data-image-index]:visible').first();
        if(await galleryImage.count()){
          await galleryImage.scrollIntoViewIfNeeded();
          await galleryImage.hover();
          await page.mouse.down();
          await expect(page.locator('.gallery-held-preview')).toBeVisible({timeout:1200});
          await expectOriginMotion(page.locator('.gallery-held-preview'),'Held gallery preview');
          await page.mouse.up();
          await expect(page.locator('.gallery-held-preview')).toHaveCount(0);
        }
        await page.locator('#editorClose').click();
      } else for(const name of ['04_product_editor','05_product_gallery'])
        report.screens.push({screen:name,status:'UNAVAILABLE_NOT_ACCEPTED',reason:'No editable product UI row'});
      await page.evaluate(()=>{const nav=[...document.querySelectorAll('[data-view]')].find(el=>el.dataset.view==='orders');if(!nav)throw Error('Order view navigation missing');nav.click()});
      await expect(page.locator('#main .pagehead h2').first()).toHaveText('Đơn hàng',{timeout:20000});
      await expect(page.locator('#orderResultSummary')).toHaveText(/^Hiển thị \d+ \/ \d+ đơn hàng$/,{timeout:20000});
      const statusFilter=page.locator('#orderStatusFilter');
      if(await statusFilter.count()&&await statusFilter.locator('option').count()>1){
        const filterBox=await statusFilter.boundingBox();
        await page.evaluate(()=>{
          window.__adminQaLastPointer=null;
          document.addEventListener('pointerdown',event=>{window.__adminQaLastPointer={x:event.clientX,y:event.clientY}}, {capture:true,once:true});
        });
        await statusFilter.click();
        const filterTap=await page.evaluate(()=>window.__adminQaLastPointer);
        await statusFilter.selectOption({index:1});
        await expectOriginMotion(page.locator('#main'),'Order filter result');
        if(!(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches))){
          const filterOrigin=await readOriginGeometry(page.locator('#main'));
          const tapX=filterTap?.x??filterBox.x+filterBox.width/2,tapY=filterTap?.y??filterBox.y+filterBox.height/2;
          const deltaX=filterOrigin.x-(tapX-filterOrigin.left),deltaY=filterOrigin.y-(tapY-filterOrigin.top);
          report.interactionOrigins.push({action:'order-filter',tapX,tapY,originX:filterOrigin.x,originY:filterOrigin.y,deltaX,deltaY});
          expect(Math.abs(deltaX),
            'Order filter result must expand from the tapped filter control').toBeLessThanOrEqual(3);
          expect(Math.abs(deltaY),
            'Order filter result must expand from the tapped filter control').toBeLessThanOrEqual(3);
        }
        await page.locator('#orderStatusFilter').selectOption({index:0});
      }
      const requiredQaOrder=(process.env.QA_EXPECT_ORDER_ID||'').trim();
      if(requiredQaOrder&&!/^qa_[0-9]{8,16}_order$/.test(requiredQaOrder))throw Error('Invalid QA-owned order identity');
      const detail=requiredQaOrder
        ? page.locator('.sd-order-card[data-order-open="'+requiredQaOrder+'"]:visible').first()
        : page.locator('.sd-order-card[data-order-open]:visible').first();
      if(requiredQaOrder) await expect(detail,'Must find the run-owned isolated QA order before marking 12-screen acceptance PASS').toBeVisible({timeout:15000});
      if(await detail.count()){
        await detail.scrollIntoViewIfNeeded();
        const detailBox=await detail.boundingBox();
        const tapPoint={x:detailBox.x+detailBox.width/2,y:detailBox.y+detailBox.height/2};
        await page.mouse.click(tapPoint.x,tapPoint.y);
        await expect(page.locator('.order-detail-page')).toBeVisible();
        await expectOriginMotion(page.locator('#main'),'Order detail');
        if(!(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches))){
          const detailOrigin=await readOriginGeometry(page.locator('#main'));
          const deltaX=detailOrigin.x-(tapPoint.x-detailOrigin.left),deltaY=detailOrigin.y-(tapPoint.y-detailOrigin.top);
          report.interactionOrigins.push({action:'order-detail',tapX:tapPoint.x,tapY:tapPoint.y,originX:detailOrigin.x,originY:detailOrigin.y,deltaX,deltaY});
          expect(Math.abs(deltaX),
            'Order detail must expand from the tapped order card').toBeLessThanOrEqual(3);
          expect(Math.abs(deltaY),
            'Order detail must expand from the tapped order card').toBeLessThanOrEqual(3);
        }
        await shot('07_order_detail');
        const advancedOpen=page.locator('#main [data-action="open-order-advanced"]');
        if(await advancedOpen.count()){
          await advancedOpen.click();
          await expect(page.locator('#sdOrderAdvanced')).toHaveAttribute('open','');
          await expectOriginMotion(page.locator('#sdOrderAdvanced > :not(summary)'),'Advanced order details');
        }
      } else {
        report.screens.push({screen:'07_order_detail',status:'NO_REAL_ORDER_NOT_ACCEPTED',reason:'No live business record; no order fabricated'});
      }
      if(width===432 && theme==='light'){
        const logoutResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/logout' && r.request().method()==='POST');
        await page.locator('#logout').tap();
        const logoutResult=await logoutResponse;
        expect(logoutResult.ok(),'Logout must succeed at the server').toBe(true);
        await logoutResult.finished();
        await expect(page.locator('#loginView')).toBeVisible();
        // Verify the browser cookie and a fresh browser boot request rather
        // than relying on a separate test-transport request.
        await expect.poll(async()=> (await context.cookies(origin+'/api/admin/session')).some(c=>c.name==='sd_admin_session'),{timeout:5000,message:'Logout must clear the browser session cookie'}).toBe(false);
        report.logoutVerificationAt=new Date().toISOString();
        const bootSession=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/session' && r.request().method()==='GET');
        await page.reload({waitUntil:'domcontentloaded'});
        const sessionResponse=await bootSession;
        expect([401,403],'Fresh browser boot must be denied after logout').toContain(sessionResponse.status());
        await expect(page.locator('#loginView')).toBeVisible();
        report.logoutBrowserSessionStatus=sessionResponse.status();
        report.logoutCookieCleared=true;
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
