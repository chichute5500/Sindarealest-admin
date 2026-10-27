import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

test.use({serviceWorkers:'block'});
const url=process.env.LOCAL_ADMIN_URL||'http://127.0.0.1:4173/admin/';
const out='artifacts/admin-owner-photo-gesture';
mkdirSync(out,{recursive:true});

for(const mode of [
 {name:'desktop',width:1440,height:900},
 {name:'mobile',width:390,height:844}
]){
 test('Owner product card and Gallery pointer gestures '+mode.name,async ({page})=>{
  await page.setViewportSize({width:mode.width,height:mode.height});
  const photos=['/media/qa-photo1.webp','/media/qa-photo2.webp','/media/qa-photo3.webp'];
  const p={id:'qa-product-1',title:'Clutch thử nghiệm',sku:'SD-CL001',skuVerified:true,category:'clutch',categoryLabel:'Clutch',description:'Mẫu',price:3000000,stock:null,published:true,fulfillmentType:'made_to_order',images:[...photos]};
  let putCount=0;
  const pages=[];
  page.on('pageerror',err=>pages.push(err.message));
  await page.route('**/media/qa-photo*.webp',async route=>{
   const i=Number(route.request().url().match(/qa-photo(\d)/)?.[1]||1);
   const color=['#bba186','#7596b7','#b77c8c'][i-1];
   await route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="320" height="320" fill="'+color+'"/><text x="100" y="175" font-size="70" fill="white">'+i+'</text></svg>'});
  });
  await page.route('**/api/admin/**',async route=>{
   const path=new URL(route.request().url()).pathname,method=route.request().method();
   let response={ok:true};
   if(path==='/api/admin/session')response={ok:true};
   else if(path==='/api/admin/products'){
    response={products:[p]};
   }else if(path.startsWith('/api/admin/products/')&&method==='PUT'){
    const body=route.request().postDataJSON();
    p.images=[...body.images];
    p.price=body.price;p.fulfillmentType=body.fulfillmentType;
    putCount++;
    response={ok:true,product:p,message:'Đã lưu'};
   }else if(path==='/api/admin/settings')response={showPrices:true};
   else if(path==='/api/admin/orders')response={orders:[]};
   else if(path==='/api/admin/customers')response={customers:[]};
   else if(path==='/api/admin/warranties')response={warranties:[],claims:[]};
   else if(path==='/api/admin/audit-logs')response={logs:[]};
   else if(path==='/api/admin/payment-qr')response={};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
  });
  const r=await page.goto(url+'?view=products',{waitUntil:'domcontentloaded'});
  expect(r?.status()).toBe(200);
  const row=page.locator('#main .product-table tbody tr[data-product-row]').first();
  await expect(row).toBeVisible({timeout:16000});
  await row.locator('.prodname').click();
  await expect(page.locator('#backdrop')).toBeVisible();
  await expect(page.locator('#productPanelDetails')).toBeVisible();
  await page.locator('#editorCancel').click();
  await expect(page.locator('#backdrop')).toBeHidden();
  await row.locator('[data-inline-photo]').click();
  await expect(page.locator('#productPanelGallery')).toBeVisible();
  await expect(page.locator('#productPanelDetails')).toBeHidden();
  await expect(page.locator('#imageGrid .imageitem')).toHaveCount(3);
  await expect(page.locator('#galleryTrash')).toBeVisible();
  await expect(page.locator('#imageGrid [data-gallery]')).toHaveCount(0);
  await expect(page.locator('#imageGrid [data-image-drag-handle]')).toHaveCount(0);
  await page.screenshot({path:join(out,'before-'+mode.name+'.png'),animations:'disabled'});
  // Stationary long press enlarges; release returns to normal, no save.
  const image2=page.locator('#imageGrid [data-image-index="1"]');
  await image2.scrollIntoViewIfNeeded();
  const bounds=await image2.boundingBox();
  expect(bounds).toBeTruthy();
  const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await expect(page.locator('.gallery-held-preview')).toBeVisible({timeout:1900});
  await page.screenshot({path:join(out,'hold-zoom-'+mode.name+'.png'),animations:'disabled'});
  await page.mouse.up();
  await expect(page.locator('.gallery-held-preview')).toHaveCount(0);
  expect(putCount).toBe(0);
  // Drag the third photo in front of second; insertion shifts second to right.
  const image3=page.locator('#imageGrid [data-image-index="2"]');
  await image3.scrollIntoViewIfNeeded();
  let a=await image3.boundingBox(),b=await page.locator('#imageGrid [data-image-index="1"]').boundingBox();
  expect(a&&b).toBeTruthy();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});
  await page.mouse.up();
  let sequence=await page.locator('#imageGrid .imageitem img').evaluateAll(imgs=>imgs.map(i=>new URL(i.src).pathname));
  expect(sequence).toEqual([photos[0],photos[2],photos[1]]);
  // Dropping onto the one bottom bin removes only from unsaved gallery.
  const moved2=page.locator('#imageGrid [data-image-index="1"]');
  const trash=page.locator('#galleryTrash');
  await moved2.scrollIntoViewIfNeeded();
  await trash.scrollIntoViewIfNeeded();
  a=await moved2.boundingBox();b=await trash.boundingBox();
  expect(a&&b).toBeTruthy();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:25});
  await page.mouse.up();
  sequence=await page.locator('#imageGrid .imageitem img').evaluateAll(imgs=>imgs.map(i=>new URL(i.src).pathname));
  expect(sequence).toEqual([photos[0],photos[1]]);
  expect(p.images).toEqual(photos);
  expect(putCount).toBe(0);
  await page.screenshot({path:join(out,'after-trash-'+mode.name+'.png'),animations:'disabled'});
  expect(pages).toEqual([]);
  // The existing Save control commits the changed gallery and nothing sooner.
  await page.locator('#saveProduct').click();
  await expect(page.locator('#backdrop')).toBeHidden({timeout:18000});
  expect(putCount).toBe(1);
  expect(p.images).toEqual([photos[0],photos[1]]);
  console.log('PASS '+mode.name+' blank card, cover gallery, hold preview, insert & trash draft, save persisted.');
 });
}
