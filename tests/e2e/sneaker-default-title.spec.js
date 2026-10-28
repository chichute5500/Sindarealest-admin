import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

// All Admin calls intercepted: no Production or Preview D1/R2 mutations.
const base=process.env.SD_SNEAKER_DEFAULT_BASE_URL||'http://127.0.0.1:4173';
const dir='artifacts/sneaker-default-title';
mkdirSync(dir,{recursive:true});
test.use({serviceWorkers:'block'});
const configs=[
 {label:'mobile-light',w:390,h:844,theme:'light'},
 {label:'mobile-dark',w:390,h:844,theme:'dark'},
 {label:'desktop-light',w:1366,h:900,theme:'light'},
 {label:'desktop-dark',w:1366,h:900,theme:'dark'}
];
for(const cfg of configs){
 test('New sneaker defaults to the next SKU number: '+cfg.label,async({page})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.theme,reducedMotion:'reduce'});
  const errors=[],submitted=[];
  page.on('pageerror',e=>errors.push(e.message));
  const items=[{
    id:'qa-sneaker-024',sku:'SD-SN024',skuVerified:true,title:'Giày Thể Thao VIP Da Cá Sấu Mẫu #024',
    category:'sneakers',categoryLabel:'Giày thể thao',description:'',images:[],
    published:true,price:5800000,stock:0,fulfillmentType:'made_to_order'
  }];
  await page.route('**/api/admin/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/admin/products'&&route.request().method()==='POST'){
    const payload=route.request().postDataJSON();
    submitted.push(payload);
    items.push({...payload,id:'qa-sneaker-025',sku:'SD-SN025',skuVerified:true});
    return route.fulfill({status:201,contentType:'application/json',
      body:JSON.stringify({ok:true,message:'Đã thêm sản phẩm.',product:items[items.length-1]})});
   }
   const data=path==='/api/admin/products'?{products:items}:
     path==='/api/admin/orders'?{orders:[]}:
     path==='/api/admin/customers'?{customers:[]}:
     path==='/api/admin/warranties'?{warranties:[],claims:[]}:
     path==='/api/admin/audit-logs'?{logs:[]}:
     path==='/api/admin/settings'?{showPrices:true}:
     path==='/api/admin/payment-qr'?{active:false,pending:false}:{ok:true};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(base+'/admin/?view=products',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await page.locator('[data-action="add"]').first().click();
  await expect(page.locator('#backdrop')).not.toHaveClass(/hidden/);
  await page.locator('#pCategory').fill('Giày thể thao');
  await expect(page.locator('#pTitle')).toHaveValue('Giày Thể Thao VIP Da Cá Sấu Mẫu #025');
  await page.screenshot({path:dir+'/'+cfg.label+'.png',animations:'disabled'});
  // Custom typing must disable automatic rename even when category changes.
  await page.locator('#pTitle').fill('Giày Thể Thao Phối Màu Theo Yêu Cầu');
  await page.locator('#pCategory').fill('Giày lười');
  await page.locator('#pCategory').fill('Giày thể thao');
  await expect(page.locator('#pTitle')).toHaveValue('Giày Thể Thao Phối Màu Theo Yêu Cầu');
  // Clear to request the default again.
  await page.locator('#pTitle').fill('');
  await page.locator('#pCategory').fill('Giày lười');
  await page.locator('#pCategory').fill('Giày thể thao');
  await expect(page.locator('#pTitle')).toHaveValue('Giày Thể Thao VIP Da Cá Sấu Mẫu #025');
  await page.locator('#saveProduct').click();
  await expect.poll(()=>submitted.length).toBe(1);
  expect(submitted[0].autoSneakerTitle).toBe(true);
  expect(submitted[0].title).toBe('Giày Thể Thao VIP Da Cá Sấu Mẫu #025');
  expect(submitted[0].category).toBe('Giày thể thao');
  expect(errors).toEqual([]);
 });
}
