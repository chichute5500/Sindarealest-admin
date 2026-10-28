/** Isolated Chrome read-only security QA for the destructive Restore dialog.
 * No real Cloudflare, payment, orders or D1 writes. The POST is intercepted.
 */
import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
const base=process.env.SD_OPTIONS_BASE_URL||'http://127.0.0.1:4173';
for(const mobile of [true,false]){
 test('Admin restore reauthentication is ephemeral and is sent only after owner approval: '+(mobile?'mobile':'desktop'),async({page})=>{
  await page.setViewportSize(mobile?{width:390,height:844}:{width:1366,height:900});
  const captured=[];
  const fake={
   '/api/admin/session':{authenticated:true},
   '/api/admin/products':{products:[]},
   '/api/admin/settings':{showPrices:true},
   '/api/admin/payment-qr':{active:false,pending:false},
   '/api/admin/orders':{orders:[]},
   '/api/admin/customers':{customers:[]},
   '/api/admin/warranties':{warranties:[],claims:[]},
   '/api/admin/audit-logs':{logs:[]}
  };
  await page.route('**/api/admin/**',async route=>{
   const request=route.request(),p=new URL(request.url()).pathname;
   if(request.method()==='POST'&&p==='/api/admin/restore'){
    captured.push({headers:request.headers(),body:request.postData()});
    return route.fulfill({status:403,contentType:'application/json',
      body:JSON.stringify({error:'Cần xác thực lại mật khẩu quản trị.'})});
   }
   if(request.method()!=='GET')throw Error('Unexpected fixture write: '+request.method()+' '+p);
   return route.fulfill({status:200,contentType:'application/json',
     body:JSON.stringify(fake[p]||{ok:true})});
  });
  await page.goto(base+'/admin/?view=backup',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#appView')).not.toHaveClass(/hidden/);
  await expect(page.locator('#restoreFile')).toHaveCount(1);
  page.on('dialog',d=>d.accept());
  const backup={format:'sindarealest-backup-v1',products:[],
   settings:{showPrices:true}};
  const upload=()=>page.locator('#restoreFile').setInputFiles({
   name:'qa-only-backup.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(backup),'utf8')});
  await upload();
  const prompt=page.locator('dialog[aria-label="Xác thực lại trước khi khôi phục"]');
  await expect(prompt).toBeVisible();
  await expect(prompt.locator('input')).toHaveAttribute('type','password');
  await prompt.getByRole('button',{name:'Hủy'}).click();
  await expect(prompt).toHaveCount(0);
  expect(captured).toHaveLength(0);
  await upload();
  await expect(prompt).toBeVisible();
  await prompt.locator('input').fill('qa-example-one-time-password');
  await prompt.getByRole('button',{name:'Xác nhận khôi phục'}).click();
  await expect.poll(()=>captured.length,{timeout:8000}).toBe(1);
  expect(captured[0].headers['x-sd-restore-password']).toBe('qa-example-one-time-password');
  expect(captured[0].body).toBe(JSON.stringify(backup));
  expect(captured[0].body).not.toContain('qa-example-one-time-password');
  expect(await page.evaluate(()=>Object.entries(localStorage).some(([k,v])=>String(k+v).includes('qa-example-one-time-password')))).toBe(false);
  await expect(prompt).toHaveCount(0);
 });
}
