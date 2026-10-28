import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test.use({serviceWorkers:'block'});
const base=process.env.SD_OPTIONS_BASE_URL||'http://127.0.0.1:4173';
const views=[
 ['dashboard','Tổng quan'],['products','Sản phẩm'],['orders','Đơn hàng'],
 ['customers','Danh sách khách hàng'],['warranties','Bảo hành'],
 ['settings','Cài đặt website'],['backup','Sao lưu'],['activity','Nhật ký hoạt động']
];
const p={id:'qa-only-one',slug:'qa-only-one',sku:'QA-ONLY',skuVerified:false,title:'Thắt lưng kiểm thử',
 category:'belts',categoryLabel:'Thắt lưng',description:'Chỉ để thử nghiệm',published:true,
 fulfillmentType:'made_to_order',images:[],price:null,stock:null,sortOrder:1};
const fixtures={
 '/api/admin/session':{ok:true,authenticated:true},
 '/api/admin/products':{products:[p]},
 '/api/admin/orders':{orders:[]},
 '/api/admin/customers':{customers:[]},
 '/api/admin/warranties':{warranties:[],claims:[]},
 '/api/admin/audit-logs':{logs:[]},
 '/api/admin/settings':{showPrices:true,welcomeEnabled:false,watermarkEnabled:false},
 '/api/admin/payment-qr':{active:false,pending:false},
 '/api/admin/push-subscriptions':{subscriptions:[]}
};
for(const cfg of [
 {label:'390-light',w:390,h:844,mode:'light'},
 {label:'390-dark',w:390,h:844,mode:'dark'},
 {label:'1366-light',w:1366,h:900,mode:'light'},
 {label:'1366-dark',w:1366,h:900,mode:'dark'}
]){
 test('Current approved Admin pages and editor read-only '+cfg.label,async({page})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.mode,reducedMotion:'reduce'});
  const errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/admin/**',route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.method()!=='GET'){writes.push(req.method()+' '+url.pathname);return route.fulfill({status:405,contentType:'application/json',body:'{"error":"fixture is read-only"}'});}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fixtures[url.pathname]||{ok:true})});
  });
  const dir='artifacts/current-admin-screens/'+cfg.label;
  mkdirSync(dir,{recursive:true});
  await page.goto(base+'/admin/?view=dashboard',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  for(const [view,title] of views){
   await page.evaluate(v=>{
    const nav=[...document.querySelectorAll('[data-view]')].find(el=>el.dataset.view===v);
    if(!nav)throw Error('Navigation missing '+v);
    nav.click();
   },view);
   await expect(page.locator('#main .pagehead h2').first()).toContainText(title,{timeout:12000});
   const metrics=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,mode:document.documentElement.dataset.adminTheme}));
   expect(metrics.doc,'No horizontal overflow: '+view+' '+cfg.label).toBeLessThanOrEqual(cfg.w+2);
   expect(metrics.mode).toBe(cfg.mode);
   await page.screenshot({path:dir+'/'+view+'.png',animations:'disabled'});
  }
  await page.evaluate(()=>document.querySelector('[data-view="products"]')?.click());
  await expect(page.locator('#main .pagehead h2')).toContainText('Sản phẩm');
  await page.locator('[data-action="add"]:visible').first().click();
  await expect(page.locator('#backdrop')).toBeVisible();
  await expect(page.locator('#productEditorTabs')).toBeVisible();
  await page.screenshot({path:dir+'/product-editor.png',animations:'disabled'});
  await page.locator('#productTabGallery').click();
  await expect(page.locator('#productPanelGallery')).toBeVisible();
  await expect(page.locator('#imageGrid')).toBeVisible();
  await page.screenshot({path:dir+'/product-gallery.png',animations:'disabled'});
  await page.locator('#editorClose').click();
  await expect(page.locator('#backdrop')).not.toBeVisible();
  expect(writes,'All Admin screens must remain read-only').toEqual([]);
  expect(errors,'No uncaught JS errors').toEqual([]);
 });
}
