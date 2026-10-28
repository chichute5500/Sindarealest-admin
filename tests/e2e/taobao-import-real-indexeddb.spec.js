import { test, expect } from '@playwright/test';

// Uses real Chromium IndexedDB/localStorage against a read-only localhost
// static server. All Admin API calls are intercepted; no remote Cloudflare writes.
test('Taobao importer persists photos across reload and commits one hidden draft', async ({ page }) => {
  const calls = [], drafts = new Map();
  let seq = 0;
  await page.route('**/api/admin/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (path === '/api/admin/session') {
      return route.fulfill({ status: 200, json: { ok:true, authenticated:true } });
    }
    if (path === '/api/admin/upload' && req.method() === 'POST') {
      calls.push('upload');
      seq++;
      const id = String(seq).padStart(12,'0');
      return route.fulfill({status:201,json:{ok:true,url:'/media/12345678-1234-4234-8234-'+id+'.webp'}});
    }
    if (path === '/api/admin/import-draft' && req.method() === 'POST') {
      const body = req.postDataJSON(), saved = drafts.get(body.importId);
      calls.push('import');
      if (saved) return route.fulfill({status:200,json:{ok:true,product:saved,replayed:true}});
      const product = {id:body.importId,title:body.title,sku:'SD-GL001',published:false};
      drafts.set(body.importId,product);
      return route.fulfill({status:201,json:{ok:true,product,replayed:false}});
    }
    if (path === '/api/admin/import-draft' && req.method() === 'GET') {
      const item = drafts.get(url.searchParams.get('id'));
      return route.fulfill({status:200,json:{ok:true,exists:!!item,product:item||null}});
    }
    return route.fulfill({status:404,json:{ok:false,error:'Unmocked API call'}});
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d=>d.accept());

  await page.goto('http://127.0.0.1:4173/admin/taobao-import.html');
  await expect(page.locator('#picker')).toBeVisible();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGOclmLDQEvARFPTRy0YtWDUglELRi0YtWDUglELRi0YtWDUAioCAD2+AXadpnZ5AAAAAElFTkSuQmCC','base64');
  const png2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGOUWxXFQEvARFPTRy0YtWDUglELRi0YtWDUglELRi0YtWDUAioCAErBAWLbgoKrAAAAAElFTkSuQmCC','base64');
  await page.locator('#picker').setInputFiles([
    {name:'sample-one.png',mimeType:'image/png',buffer:png},
    {name:'sample-two.png',mimeType:'image/png',buffer:png2},
  ]);
  await expect(page.locator('.photo')).toHaveCount(2);
  await page.locator('#picker').setInputFiles({name:'same-content-different-name.png',mimeType:'image/png',buffer:png});
  await expect(page.locator('.photo')).toHaveCount(2);
  await expect(page.locator('#status')).toContainText('ảnh trùng nội dung');
  await page.locator('#title').fill('Giày lười QA lưu trữ thật');
  await page.locator('#category').selectOption('loafers');
  await page.locator('#price').fill('1900000');
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.locator('.photo')).toHaveCount(2);
  await expect(page.locator('#title')).toHaveValue('Giày lười QA lưu trữ thật');
  await expect(page.locator('#price')).toHaveValue('1900000');
  await page.locator('#submit').click();
  await expect(page.locator('#status')).toContainText('Đã tạo bản nháp ẨN');
  expect(calls.filter(v=>v==='upload')).toHaveLength(2);
  expect(calls.filter(v=>v==='import')).toHaveLength(1);
  expect(drafts.size).toBe(1);
  expect([...drafts.values()][0].published).toBe(false);

  await page.reload();
  await expect(page.locator('#newDraft')).toBeVisible();
  await expect(page.locator('#submit')).toBeDisabled();
  await expect(page.locator('.photo')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('Taobao importer matches dark mobile without overflow', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport:{width:320,height:800}, colorScheme:'dark'
  });
  const page = await ctx.newPage();
  await page.route('**/api/admin/session', route=>route.fulfill({status:200,json:{ok:true,authenticated:true}}));
  await page.goto('http://127.0.0.1:4173/admin/taobao-import.html');
  await expect(page.locator('#picker')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBeTruthy();
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme)).toBe('dark');
  await ctx.close();
});


test('Taobao link input downloads official API images into the draft gallery',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGOclmLDQEvARFPTRy0YtWDUglELRi0YtWDUAioCAD2+AXadpnZ5AAAAAElFTkSuQmCC','base64');
  let queryCount=0,photoCount=0;
  await page.route('**/api/admin/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/admin/session')return route.fulfill({status:200,json:{ok:true,authenticated:true}});
    if(url.pathname==='/api/admin/taobao-photos'){
      queryCount++;
      const body=route.request().postDataJSON();
      if(!body.permissionConfirmed||!body.link.includes('123456789'))return route.fulfill({status:400,json:{ok:false,error:'invalid input'}});
      return route.fulfill({status:200,json:{ok:true,itemId:'123456789',title:'Taobao product',
        images:[{preview:'https://img.alicdn.com/a.png',ticket:'signed-qa-photo-one'}]}});
    }
    if(url.pathname==='/api/admin/taobao-photo'){
      photoCount++;
      return route.fulfill({status:200,body:image,contentType:'image/png'});
    }
    return route.fulfill({status:404,json:{ok:false,error:'Unmocked'}});
  });
  await page.goto('http://127.0.0.1:4173/admin/taobao-import.html');
  await expect(page.locator('#taobaoLink')).toBeVisible();
  await expect(page.locator('#autoPhotos')).toBeVisible();
  await page.locator('#taobaoLink').fill('https://item.taobao.com/item.htm?id=123456789');
  await page.locator('#autoPhotos').click();
  await expect(page.locator('#autoStatus')).toContainText('Cần xác nhận quyền sử dụng');
  expect(queryCount).toBe(0);
  await page.locator('#photoRights').check();
  await page.locator('#autoPhotos').click();
  await expect(page.locator('#autoStatus')).toContainText('Đã tự tải 1 ảnh');
  await expect(page.locator('.photo')).toHaveCount(1);
  await expect(page.locator('#title')).toHaveValue('');
  expect(queryCount).toBe(1);expect(photoCount).toBe(1);
  await page.reload();
  await expect(page.locator('#taobaoLink')).toHaveValue('https://item.taobao.com/item.htm?id=123456789');
  await expect(page.locator('.photo')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('Taobao link UI displays missing official API clearly, never claims photos were downloaded',async({page})=>{
  await page.route('**/api/admin/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/admin/session')return route.fulfill({status:200,json:{ok:true,authenticated:true}});
    if(url.pathname==='/api/admin/taobao-photos')return route.fulfill({status:503,json:{
      ok:false,error:'Chưa kết nối API chính thức của Taobao. Cần AppKey/AppSecret.'
    }});
    return route.fulfill({status:404,json:{ok:false,error:'Unmocked'}});
  });
  await page.goto('http://127.0.0.1:4173/admin/taobao-import.html');
  await page.locator('#taobaoLink').fill('https://item.taobao.com/item.htm?id=123456789');
  await page.locator('#photoRights').check();
  await page.locator('#autoPhotos').click();
  await expect(page.locator('#autoStatus')).toContainText('Chưa kết nối API chính thức');
  await expect(page.locator('.photo')).toHaveCount(0);
});


test('Owner exact Chinese Taobao share content is accepted in the link field', async ({page})=>{
  let received='';
  const realShare='【淘宝】大促价保 https://e.tb.cn/h.j5Ma8gaXVlwPWsu?tk=DIRtTyxDQpc CZ193 「黑色全真鳄鱼皮鞋2025新款休闲板鞋男系带低帮鞋舒适时尚真皮男鞋」 点击链接直接打开 或者 淘宝搜索直接打开';
  await page.route('**/api/admin/**',async route=>{
    const u=new URL(route.request().url());
    if(u.pathname==='/api/admin/session')return route.fulfill({status:200,json:{ok:true,authenticated:true}});
    if(u.pathname==='/api/admin/taobao-photos'){
      received=route.request().postDataJSON().link;
      return route.fulfill({status:422,json:{ok:false,error:'Link rút gọn cần mở bằng Taobao/Chrome để lấy URL sản phẩm.'}});
    }
    return route.fulfill({status:404,json:{ok:false,error:'Unmocked API route'}});
  });
  await page.goto('http://127.0.0.1:4173/admin/taobao-import.html');
  await page.locator('#taobaoLink').fill(realShare);
  await expect(page.locator('#sourceLink')).toBeVisible();
  await expect(page.locator('#sourceLink')).toHaveAttribute('href','https://e.tb.cn/h.j5Ma8gaXVlwPWsu?tk=DIRtTyxDQpc');
  await page.locator('#photoRights').check();
  await page.locator('#autoPhotos').click();
  await expect(page.locator('#autoStatus')).toContainText('Link rút gọn cần mở');
  expect(received).toBe(realShare);
  await expect(page.locator('.photo')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#taobaoLink')).toHaveValue(realShare);
});

test('Taobao API readiness is explicit; do not enable auto-download when credentials are absent',async ({page})=>{
  let downloadRequests=0;
  await page.route('**/api/admin/**',async route=>{
    const u=new URL(route.request().url()),method=route.request().method();
    if(u.pathname==='/api/admin/session')return route.fulfill({status:200,json:{ok:true,authenticated:true}});
    if(u.pathname==='/api/admin/taobao-photos'&&method==='GET')
      return route.fulfill({status:200,json:{ok:true,configured:false,reason:'Missing Taobao AppKey'}});
    if(u.pathname==='/api/admin/taobao-photos'&&method==='POST'){
      downloadRequests++;return route.fulfill({status:503,json:{ok:false,error:'Not configured'}});
    }
    return route.fulfill({status:404,json:{ok:false,error:'Unknown mocked API'}});
  });
  await page.goto('http://127.0.0.1:4173/admin/taobao-import.html');
  await expect(page.locator('#apiReadiness')).toContainText('Chưa thể tự tải ảnh');
  await expect(page.locator('#autoPhotos')).toBeDisabled();
  await page.locator('#taobaoLink').fill('https://item.taobao.com/item.htm?id=997261786690');
  await expect(page.locator('#sourceLink')).toBeVisible();
  expect(downloadRequests).toBe(0);
  await expect(page.locator('#picker')).toBeEnabled();
});
