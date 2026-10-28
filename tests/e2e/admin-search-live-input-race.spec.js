import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
const base=process.env.SD_OPTIONS_BASE_URL||'http://127.0.0.1:4173';
const products=[
 {id:'qa-belt',slug:'qa-belt',sku:'QA-BELT',skuVerified:false,title:'Thắt lưng kiểm thử',category:'belts',categoryLabel:'Thắt lưng',fulfillmentType:'made_to_order',published:true,images:[],price:null,stock:null,description:''},
 {id:'qa-shoe',slug:'qa-shoe',sku:'QA-SHOE',skuVerified:false,title:'Giày lười kiểm thử',category:'loafers',categoryLabel:'Giày lười',fulfillmentType:'made_to_order',published:true,images:[],price:null,stock:null,description:''}
];
for(const cfg of [
 {label:'mobile-light',width:390,height:844,scheme:'light'},
 {label:'mobile-dark',width:390,height:844,scheme:'dark'},
 {label:'desktop-light',width:1366,height:900,scheme:'light'},
 {label:'desktop-dark',width:1366,height:900,scheme:'dark'}
]){
 test('Admin product search preserves focus and input during slow typing '+cfg.label,async({page})=>{
  await page.setViewportSize({width:cfg.width,height:cfg.height});
  await page.emulateMedia({colorScheme:cfg.scheme,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/admin/**',route=>{
   const p=new URL(route.request().url()).pathname;
   const body=p==='/api/admin/products'?{products}:
     p==='/api/admin/orders'?{orders:[]}:
     p==='/api/admin/customers'?{customers:[]}:
     p==='/api/admin/warranties'?{warranties:[],claims:[]}:
     p==='/api/admin/audit-logs'?{logs:[]}:
     p==='/api/admin/settings'?{showPrices:true}:
     p==='/api/admin/payment-qr'?{active:false,pending:false}:{ok:true,authenticated:true};
   if(route.request().method()!=='GET')throw Error('Read-only UI must not write to Admin API');
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(base+'/admin/?view=products',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await expect(page.locator('#main .product-table tbody tr')).toHaveCount(2);
  const search=page.locator('#searchBox');
  await search.focus();
  await page.evaluate(()=>window.__qaSearchNode=document.querySelector('#searchBox'));
  await search.pressSequentially('Thắt lưng',{delay:155});
  await expect(search).toHaveValue('Thắt lưng');
  await expect(search).toBeFocused();
  expect(await page.evaluate(()=>window.__qaSearchNode===document.querySelector('#searchBox'))).toBe(true);
  await expect(page.locator('#main .product-table tbody tr')).toHaveCount(1);
  await expect(page.locator('#main .product-table')).toContainText('Thắt lưng kiểm thử');
  await search.fill('');
  await expect(page.locator('#main .product-table tbody tr')).toHaveCount(2);
  expect(errors).toEqual([]);
 });
}
