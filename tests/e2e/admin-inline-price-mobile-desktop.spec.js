import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

// Browser fixture; every API call stays intercepted. No real D1/R2 or money.
const base=process.env.SD_INLINE_PRICE_BASE_URL||'http://127.0.0.1:4173';
const out='artifacts/admin-inline-price';
mkdirSync(out,{recursive:true});
test.use({serviceWorkers:'block'});
for(const cfg of [
 {label:'mobile-light',width:390,height:844,theme:'light'},
 {label:'mobile-dark',width:390,height:844,theme:'dark'},
 {label:'desktop-light',width:1366,height:900,theme:'light'},
 {label:'desktop-dark',width:1366,height:900,theme:'dark'}
]){
 test('Inline card price can save 5,800,000 VND on '+cfg.label,async({page})=>{
  await page.setViewportSize({width:cfg.width,height:cfg.height});
  await page.emulateMedia({colorScheme:cfg.theme,reducedMotion:'reduce'});
  const errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  const product={
   id:'qa-price-024',slug:'qa-price-024',sku:'SD-SN024',skuVerified:true,
   title:'Giày Thể Thao VIP Da Cá Sấu Mẫu #024',
   category:'sneakers',categoryLabel:'Giày thể thao',
   description:'Không ghi dữ liệu khách hàng',price:5000000,stock:null,
   published:true,images:[],fulfillmentType:'made_to_order'
  };
  await page.route('**/api/admin/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/admin/products/qa-price-024'&&route.request().method()==='PATCH'){
    const payload=route.request().postDataJSON();
    writes.push(payload);
    if(payload.field!=='price'||payload.expectedValue!==product.price)
     return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'Dữ liệu thay đổi'})});
    product.price=payload.value;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,message:'Đã lưu giá.',product})});
   }
   const data=path==='/api/admin/products'?{products:[product]}:
    path==='/api/admin/orders'?{orders:[]}:
    path==='/api/admin/customers'?{customers:[]}:
    path==='/api/admin/warranties'?{warranties:[],claims:[]}:
    path==='/api/admin/audit-logs'?{logs:[]}:
    path==='/api/admin/settings'?{showPrices:true}:
    path==='/api/admin/payment-qr'?{active:false,pending:false}:{ok:true};
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  const response=await page.goto(base+'/admin/?view=products',{waitUntil:'domcontentloaded'});
  expect(response?.status()).toBe(200);
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  const price=page.locator('[data-inline-edit="price"]:visible').first();
  await expect(price).toContainText('5.000.000');
  await price.click();
  const input=page.locator('form.product-quick-editor input[name="quickValue"]:visible').first();
  await expect(input).toHaveValue('5000000');
  await input.fill('5800000');
  await page.locator('form.product-quick-editor .product-quick-save:visible').first().click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toEqual({field:'price',value:5800000,expectedValue:5000000});
  await expect(page.locator('[data-inline-edit="price"]:visible').first()).toContainText('5.800.000');
  await page.screenshot({path:out+'/price-saved-'+cfg.label+'.png',animations:'disabled'});

  // Empty input must clear the price, not misinterpret it as zero.
  await page.locator('[data-inline-edit="price"]:visible').first().click();
  await page.locator('form.product-quick-editor input[name="quickValue"]:visible').first().fill('');
  await page.locator('form.product-quick-editor .product-quick-save:visible').first().click();
  await expect.poll(()=>writes.length).toBe(2);
  expect(writes[1]).toEqual({field:'price',value:null,expectedValue:5800000});
  await expect(page.locator('[data-inline-edit="price"]:visible').first()).toContainText('Chưa nhập');
  expect(errors).toEqual([]);
 });
}
