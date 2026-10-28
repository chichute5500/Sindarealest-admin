import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

// All APIs are intercepted. This test never writes Preview or Production D1/R2.
const base=process.env.SD_SNEAKER_DEFAULT_BASE_URL||'http://127.0.0.1:4173';
const dir='artifacts/sneaker-default-title';
mkdirSync(dir,{recursive:true});
test.use({serviceWorkers:'block'});
const categories=[
 ['Giày Thể Thao','Giày Thể Thao','025'],
 ['Giày Lười','Giày Lười','001'],
 ['Giày Tây','Giày Tây','001'],
 ['Thắt Lưng','Thắt Lưng','001'],
 ['Dép','Dép','001'],
 ['Dây Đồng Hồ','Dây Đồng Hồ','001'],
 ['Ốp Điện Thoại','Ốp Điện Thoại','001'],
 ['Ví Nam','Ví Nam','001'],
 ['Ví Cầm Tay','Ví Cầm Tay','001'],
 ['Cặp – Tab – Laptop','Cặp – Tab – Laptop','001'],
 ['Clutch','Clutch','001'],
 ['Mũ','Mũ','001'],
 ['Túi Đeo Chéo','Túi Đeo Chéo','001'],
 ['Túi Golf','Túi Golf','001'],
 ['Túi Nữ','Túi Nữ','001']
];
for(const cfg of [
 {label:'mobile-light',w:390,h:844,theme:'light'},
 {label:'mobile-dark',w:390,h:844,theme:'dark'},
 {label:'desktop-light',w:1366,h:900,theme:'light'},
 {label:'desktop-dark',w:1366,h:900,theme:'dark'}
]){
 test('Grey placeholder for all 15 categories, blank save and custom names: '+cfg.label,async({page})=>{
  await page.setViewportSize({width:cfg.w,height:cfg.h});
  await page.emulateMedia({colorScheme:cfg.theme,reducedMotion:'reduce'});
  const errors=[],submitted=[];
  page.on('pageerror',e=>errors.push(e.message));
  const items=[{
    id:'qa-sneaker-024',sku:'SD-SN024',skuVerified:true,title:'Giày Thể Thao VIP Da Cá Sấu Mẫu #024',
    category:'sneakers',categoryLabel:'Giày Thể Thao',description:'',images:[],
    published:true,price:5800000,stock:0,fulfillmentType:'made_to_order'
  }];
  await page.route('**/api/admin/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/admin/products'&&route.request().method()==='POST'){
    const payload=route.request().postDataJSON();
    submitted.push(payload);
    items.push({...payload,id:'qa-added-'+submitted.length,sku:'SD-SN025',skuVerified:true,title:payload.title||'Giày Thể Thao VIP Da Cá Sấu Mẫu #025'});
    return route.fulfill({status:201,contentType:'application/json',
      body:JSON.stringify({ok:true,message:'Đã thêm sản phẩm.',product:items.at(-1)})});
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
  const title=page.locator('#pTitle'),category=page.locator('#pCategory');
  // Owner screenshot regression: entering "Thêm sản phẩm mới" without selecting
  // a category must still show a legible muted title pattern, never an empty box.
  await expect(category).toHaveValue('');
  await expect(title).toHaveValue('');
  await expect(title).toHaveAttribute('placeholder','Tên Danh Mục VIP Da Cá Sấu Mẫu #…');
  const initialStyle=await title.evaluate(el=>({
   placeholder:el.getAttribute('placeholder'),
   color:getComputedStyle(el,'::placeholder').color,
   opacity:getComputedStyle(el,'::placeholder').opacity
  }));
  expect(initialStyle.opacity).toBe('1');
  expect(initialStyle.color).toBe(cfg.theme==='dark'?'rgb(175, 197, 213)':'rgb(112, 135, 153)');
  await page.screenshot({path:dir+'/initial-hint-'+cfg.label+'.png',animations:'disabled'});
  for(const [chosen,label,ordinal] of categories){
   await category.fill(chosen);
   await expect(title).toHaveValue('');
   await expect(title).toHaveAttribute('placeholder',label+' VIP Da Cá Sấu Mẫu #'+ordinal);
   expect(await title.evaluate(el=>el.required)).toBe(false);
  }
  await category.fill('Giày Thể Thao');
  await expect(title).toHaveAttribute('placeholder','Giày Thể Thao VIP Da Cá Sấu Mẫu #025');
  await page.screenshot({path:dir+'/'+cfg.label+'.png',animations:'disabled'});
  // Custom entry is real text and must survive subsequent category updates.
  await title.fill('Giày Phối Màu Theo Yêu Cầu');
  await category.fill('Mũ');
  await expect(title).toHaveValue('Giày Phối Màu Theo Yêu Cầu');
  await title.fill('');
  await category.fill('Giày Thể Thao');
  await expect(title).toHaveValue('');
  await page.locator('#saveProduct').click();
  await expect.poll(()=>submitted.length).toBe(1);
  expect(submitted[0].title).toBe('');
  expect(submitted[0].category).toBe('Giày Thể Thao');
  expect(submitted[0]).not.toHaveProperty('autoSneakerTitle');
  // Separate new product: a custom title must be sent unchanged.
  await page.locator('[data-action="add"]').first().click();
  await page.locator('#pCategory').fill('Túi Nữ');
  await page.locator('#pTitle').fill('Túi Da Cá Sấu Đặt Riêng');
  await page.locator('#saveProduct').click();
  await expect.poll(()=>submitted.length).toBe(2);
  expect(submitted[1].title).toBe('Túi Da Cá Sấu Đặt Riêng');
  expect(errors).toEqual([]);
 });
}
