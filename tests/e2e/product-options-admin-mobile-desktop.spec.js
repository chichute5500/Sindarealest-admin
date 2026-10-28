import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

const base=process.env.SD_OPTIONS_BASE_URL||'http://127.0.0.1:4173';
const dir='artifacts/product-options';
mkdirSync(dir,{recursive:true});
test.use({serviceWorkers:'block'});
const names=[
 'Giày lười kiểm thử · Size 42',
 'Giày lười kiểm thử · Size 43',
 'Thắt lưng kiểm thử · Bản dây 4.0 cm',
 'Ốp điện thoại kiểm thử · Dòng điện thoại: iPhone 16 Pro Max'
];
const order={
 id:'qa-order-product-option',order_number:'QA-VARIANTS-001',customerId:'qa-customer',
 status:'pending_confirmation',payment_status:'unpaid',price_confirmation_required:1,
 full_name:'Khách QA không có thật',phone:'0000000000',address:'Địa chỉ QA',customer_note:'',
 items:names.map((title,i)=>({
  id:'qa-order-line-'+i,productId:i<2?'qa-shoe':i===2?'qa-belt':'qa-phone',
  title,sku:'QA-SKU-'+i,quantity:1,unitPrice:100000,lineTotal:100000,
  fulfillmentType:'made_to_order'
 }))
};
const products=[
 {id:'qa-shoe',category:'loafers',categoryLabel:'Giày lười',title:'Giày lười kiểm thử',sku:'QA-SHOE',images:[],price:100000,stock:8,published:true,fulfillmentType:'made_to_order'},
 {id:'qa-belt',category:'belts',categoryLabel:'Thắt lưng',title:'Thắt lưng kiểm thử',sku:'QA-BELT',images:[],price:100000,stock:8,published:true,fulfillmentType:'made_to_order'},
 {id:'qa-phone',category:'phone-cases',categoryLabel:'Ốp điện thoại',title:'Ốp điện thoại kiểm thử',sku:'QA-PHONE',images:[],price:100000,stock:8,published:true,fulfillmentType:'made_to_order'}
];
for(const cfg of [
 {label:'mobile-light',w:390,h:844,scheme:'light'},
 {label:'mobile-dark',w:390,h:844,scheme:'dark'},
 {label:'desktop-light',w:1366,h:900,scheme:'light'},
 {label:'desktop-dark',w:1366,h:900,scheme:'dark'}
]){
 test('Admin order selections and product guidance '+cfg.label,async({page})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/admin/**',route=>{
   const path=new URL(route.request().url()).pathname;
   const body=path==='/api/admin/products'?{products}:
     path==='/api/admin/orders'?{orders:[order]}:
     path==='/api/admin/customers'?{customers:[]}:
     path==='/api/admin/warranties'?{warranties:[],claims:[]}:
     path==='/api/admin/audit-logs'?{logs:[]}:
     path==='/api/admin/settings'?{showPrices:true}:
     path==='/api/admin/payment-qr'?{active:false,pending:false}:{ok:true};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/admin/?view=orders',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await expect(page.locator('[data-order-open="qa-order-product-option"]')).toHaveCount(1);
  await page.locator('[data-order-open="qa-order-product-option"]').click();
  await expect(page.locator('.sd-order-item')).toHaveCount(4);
  const display=await page.locator('.sd-order-items').textContent();
  for(const name of names)expect(display).toContain(name);
  await page.screenshot({path:dir+'/admin-order-'+cfg.label+'.png',animations:'disabled'});
  await page.goto(base+'/admin/?view=products',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await page.locator('[data-action="add"]').first().click();
  await expect(page.locator('#backdrop')).not.toHaveClass(/hidden/);
  await page.locator('#pCategory').fill('Giày lười');
  await expect(page.locator('#pOptionHint')).toContainText('38–44');
  await page.screenshot({path:dir+'/admin-size-'+cfg.label+'.png',animations:'disabled'});
  await page.locator('#pCategory').fill('Giày boot');
  await expect(page.locator('#pOptionHint')).toContainText('38–44');
  await page.locator('#pCategory').fill('Thắt lưng');
  await expect(page.locator('#pOptionHint')).toContainText('3,5 cm hoặc 4,0 cm');
  await page.locator('#pCategory').fill('Ốp điện thoại');
  await expect(page.locator('#pOptionHint')).toContainText('dòng điện thoại');
  await page.screenshot({path:dir+'/admin-phone-'+cfg.label+'.png',animations:'disabled'});
  const width=await page.evaluate(()=>document.body.scrollWidth);
  expect(width).toBeLessThanOrEqual(cfg.w+1);
  expect(errors).toEqual([]);
 });
}
