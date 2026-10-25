/** Read-only axe-core WCAG 2.1 AA sampling of actual isolated Admin Preview.
 * No accessibility test can establish universal screen reader parity.
 */
import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const base='https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev';
const pass=String(process.env.ADMIN_TEST_PASSWORD||'');
const cfHeaders=process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET
 ? {'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,
    'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET}:{};
const views=[
 {id:'dashboard',heading:'Tổng quan'},
 {id:'products',heading:'Sản phẩm'},
 {id:'orders',heading:'Đơn hàng'},
 {id:'customers',heading:'Danh sách khách hàng'},
 {id:'warranties',heading:'Bảo hành / Yêu cầu hỗ trợ'},
 {id:'settings',heading:'Cài đặt website'},
 {id:'backup',heading:'Sao lưu / Khôi phục'},
 {id:'audit',heading:'Nhật ký hoạt động'},
];
for(const profile of [{width:390,height:844,theme:'light'},
                      {width:1440,height:900,theme:'dark'}]){
 test('Isolated Admin read-only axe WCAG 2.1 AA '+profile.width+' '+profile.theme,async({browser})=>{
  test.setTimeout(300000);
  if(!pass)throw Error('ADMIN_QA_PASSWORD_UNAVAILABLE');
  const ctx=await browser.newContext({viewport:{width:profile.width,height:profile.height},
    colorScheme:profile.theme,extraHTTPHeaders:cfHeaders,serviceWorkers:'block'});
  const page=await ctx.newPage();
  let mutated=[];
  page.on('request',r=>{
    try {const u=new URL(r.url());
      if(u.origin===base&&u.pathname.startsWith('/api/')&&
        !['GET','HEAD','OPTIONS'].includes(r.method())&&u.pathname!=='/api/admin/login')
        mutated.push(r.method()+' '+u.pathname);
    }catch{}
  });
  const results=[];
  try{
   await page.goto(base+'/admin/',{waitUntil:'domcontentloaded'});
   await expect(page.locator('#loginView')).toBeVisible({timeout:20000});
   const scan=async name=>{
     const r=await new AxeBuilder({page})
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
     const violations=r.violations.map(v=>({id:v.id,impact:v.impact,nodeCount:v.nodes.length}));
     results.push({view:name,violations,violationCount:violations.length,
       seriousCount:violations.filter(v=>v.impact==='critical'||v.impact==='serious').length});
   };
   await scan('login');
   await page.locator('#password').fill(pass);
   await page.locator('#loginForm button[type="submit"]').click();
   await expect(page.locator('#appView')).toBeVisible({timeout:20000});
   for(const {id,heading} of views){
     const nav=page.locator('button[data-view="'+id+'"]:visible').first();
     await nav.click();
     await expect(page.locator('#main .pagehead h2').first()).toHaveText(heading,{timeout:20000});
     await scan(id);
   }
   expect(mutated,'AXE audit is read-only after authentication').toEqual([]);
   const serious=results.flatMap(x=>x.violations.filter(v=>['critical','serious'].includes(v.impact))
     .map(v=>({view:x.view,...v})));
   console.info('[ADMIN_AXE_A11Y] '+JSON.stringify({viewport:profile.width,theme:profile.theme,
      tested:results.length,seriousCount:serious.length,violations:serious,readOnly:true}));
   expect(serious,'WCAG serious/critical failures require remediation').toEqual([]);
  } finally {
    const dir=join(process.cwd(),'artifacts/admin-wcag-axe');
    mkdirSync(dir,{recursive:true});
    writeFileSync(join(dir,profile.width+'-'+profile.theme+'.json'),
      JSON.stringify({sourceSha:process.env.GITHUB_SHA,viewport:profile,results,
        auditedScope:'AXE_WCAG_2_1_AA_AUTOMATED_SAMPLE_NOT_FULL_MANUAL_ACCESSIBILITY_AUDIT',
        readOnlyRequests:mutated.length===0},null,2)+'\n');
    await ctx.close();
  }
 });
}
