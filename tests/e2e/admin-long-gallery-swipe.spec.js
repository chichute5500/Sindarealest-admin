import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

test.use({serviceWorkers:'block'});
const url=process.env.LOCAL_ADMIN_URL||'http://127.0.0.1:4173/admin/';
mkdirSync('artifacts/admin-owner-photo-gesture',{recursive:true});

test('28 photos: mobile swipe browses to last image without reordering or saving',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 const photos=Array.from({length:28},(_,i)=>'/media/gallery-'+String(i+1).padStart(2,'0')+'.webp');
 let saves=0;
 const p={id:'qa-long-gallery',title:'Giày có nhiều ảnh',sku:'SD-SN888',
  skuVerified:true,category:'sneakers',categoryLabel:'Giày Thể Thao',
  description:'Ảnh kiểm tra',price:4200000,stock:0,published:true,
  fulfillmentType:'made_to_order',images:[...photos]};
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e).slice(0,160)));
 await page.route('**/media/gallery-*.webp',r=>{
  const n=Number(r.request().url().match(/gallery-(\d+)/)?.[1]||1);
  return r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#d4e4f4"/><text x="48" y="125" fill="#172e4d" font-size="60">'+n+'</text></svg>'});
 });
 await page.route('**/api/admin/**',async route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();
  let response={ok:true};
  if(path==='/api/admin/products')response={products:[p]};
  else if(path.startsWith('/api/admin/products/')&&['PUT','PATCH','DELETE'].includes(method)){
   saves++;response={ok:true,product:p};
  }
  else if(path==='/api/admin/settings')response={showPrices:true};
  else if(path==='/api/admin/orders')response={orders:[]};
  else if(path==='/api/admin/customers')response={customers:[]};
  else if(path==='/api/admin/warranties')response={claims:[],warranties:[]};
  else if(path==='/api/admin/audit-logs')response={logs:[]};
  else if(path==='/api/admin/payment-qr')response={};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
 });
 const response=await page.goto(url+'?view=products',{waitUntil:'domcontentloaded'});
 expect(response?.status()).toBe(200);
 await page.locator('[data-inline-photo]').first().click();
 await expect(page.locator('#productPanelGallery')).toBeVisible();
 await expect(page.locator('#imageGrid .imageitem')).toHaveCount(28);
 const rail=page.locator('#imageGrid .image-rail');
 await expect(rail).toBeVisible();
 await rail.scrollIntoViewIfNeeded();
 await expect.poll(()=>rail.evaluate(x=>x.scrollWidth-x.clientWidth)).toBeGreaterThan(800);
 const touch=await page.context().newCDPSession(page);
 await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const info=await rail.boundingBox();
 expect(info).toBeTruthy();
 const y=info.y+Math.min(info.height/2,25);
 const swipe=async()=>{
  const bounds=await rail.boundingBox();
  const from=bounds.x+Math.min(bounds.width-22,265);
  const to=bounds.x+18;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});
  for(let step=1;step<=10;step++){
   await touch.send('Input.dispatchTouchEvent',{
    type:'touchMove',touchPoints:[{x:from+(to-from)*step/10,y}]
   });
  }
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(120);
 };
 const first=await rail.evaluate(x=>x.scrollLeft);
 await swipe();
 const now=await rail.evaluate(x=>x.scrollLeft);
 expect(now,'One normal swipe should move the thumbnail rail forward').toBeGreaterThan(first+80);
 expect(await page.locator('.gallery-drag-ghost').count()).toBe(0);
 expect(await page.locator('.gallery-held-preview').count()).toBe(0);
 expect(saves,'Normal swiping must never submit changes').toBe(0);
 for(let i=0;i<10;i++)await swipe();
 const lastState=await rail.evaluate(x=>{
  const last=x.querySelector('.imageitem:last-child'),a=x.getBoundingClientRect(),b=last?.getBoundingClientRect();
  return {atEnd:x.scrollLeft>=x.scrollWidth-x.clientWidth-65,lastVisible:!!b&&b.left<a.right-2&&b.right>a.left};
 });
 expect(lastState.atEnd,'Swipe sequence should reach end of long gallery').toBe(true);
 expect(lastState.lastVisible,'28th image should be discoverable').toBe(true);
 expect(await page.locator('#imageGrid .imageitem img').evaluateAll(imgs=>imgs.map(i=>new URL(i.src).pathname))).toEqual(photos);
 expect(p.images).toEqual(photos);
 expect(saves).toBe(0);
 await page.screenshot({path:join('artifacts/admin-owner-photo-gesture','28-photos-mobile-end.png'),animations:'disabled'});
 await touch.detach();
 expect(errors).toEqual([]);
 console.log('PASS: 28-photo mobile rail reaches the last photo by normal swipes; no reorder, trash, upload, or save.');
});
