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
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/itkAAAAASUVORK5CYII=','base64');
  await page.locator('#picker').setInputFiles([
    {name:'sample-one.png',mimeType:'image/png',buffer:png},
    {name:'sample-two.png',mimeType:'image/png',buffer:png},
  ]);
  await expect(page.locator('.photo')).toHaveCount(2);
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
