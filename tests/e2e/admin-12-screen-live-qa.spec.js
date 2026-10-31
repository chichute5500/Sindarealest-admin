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
      evidenceScope:'LIVE_AUTHENTICATED_READ_ONLY_SCREENS',screens:[],nonAuthMutationRequests:[],pageErrors:[],consoleErrors:[],expectedInitialSessionResponses:[],observedAtUtc:new Date().toISOString()};
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,colorScheme:theme,hasTouch:width<=820,isMobile:width<=820,serviceWorkers:'block',reducedMotion:'reduce'});
    const page=await context.newPage();
    try {
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
          const cssProperties=['background','backgroundColor','backgroundImage','border','borderColor','borderWidth','borderRadius','boxShadow','fontSize','fontFamily','lineHeight','padding','whiteSpace','backdropFilter','opacity','filter','outlineStyle','outlineWidth','transform'];
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
            const result=[0,0,0];let i=0;
            const identEnd=start=>{let j=start;while(j<selector.length){if(selector[j]==='\\'){j+=2;continue;}if(/[\w-]/.test(selector[j])||selector.charCodeAt(j)>=128){j++;continue;}break;}return j;};
            const closeParen=start=>{let depth=1,quote='',escaped=false;for(let j=start+1;j<selector.length;j++){const char=selector[j];if(escaped){escaped=false;continue;}if(char==='\\'){escaped=true;continue;}if(quote){if(char===quote)quote='';continue;}if(char==='"'||char==="'"){quote=char;continue;}if(char==='(')depth++;else if(char===')'&&!--depth)return j;}return selector.length-1;};
            const maxSpecificity=text=>splitSelectors(text).map(part=>specificity(part)).sort((a,b)=>b[0]-a[0]||b[1]-a[1]||b[2]-a[2])[0]||[0,0,0];
            while(i<selector.length){
              const char=selector[i];
              if(char==='#'){result[0]++;i=identEnd(i+1);continue;}
              if(char==='.' ){result[1]++;i=identEnd(i+1);continue;}
              if(char==='['){result[1]++;let depth=1,j=i+1,quote='',escaped=false;for(;j<selector.length&&depth;j++){const c=selector[j];if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(quote){if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='[')depth++;else if(c===']')depth--;}i=j;continue;}
              if(char===':'){
                const pseudoElement=selector[i+1]===':';i+=pseudoElement?2:1;const start=i;i=identEnd(i);const name=selector.slice(start,i).toLowerCase();
                const legacyElement=!pseudoElement&&['before','after','first-line','first-letter'].includes(name);
                if(pseudoElement||legacyElement)result[2]++;else result[1]++;
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
                // A type selector is only counted at the start of a compound or after a namespace separator.
                let previous=start-1;while(previous>=0&&/\s/.test(selector[previous]))previous--;
                if(previous<0||/[>+~,(|]/.test(selector[previous])){if(name!=='*')result[2]++;}
                continue;
              }
              i++;
            }
            return result;
          };
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
            const matched=[],chain=[];for(let node=element,depth=0;node&&depth<8;node=node.parentElement,depth++)chain.push({node,depth});
            // Include directly matched declarations and inherited design-token declarations from ancestors.
            for(const {node,depth} of chain){
              for(const rule of materialRules){
                if((rule.pseudo||'')!==pseudo)continue;
                let applies=false;try{applies=node.matches(rule.baseSelector)}catch{}
                if(!applies)continue;
                const declarations=Object.fromEntries(Object.entries(rule.declarations).filter(([property])=>depth===0||property.startsWith('--')));
                if(Object.keys(declarations).length)matched.push({...rule,a