import {test, expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('Admin authenticated product PUT persists only the run-owned isolated QA row',async({browser})=>{
  test.setTimeout(90000);
  const id=process.env.QA_TEST_PRODUCT_ID||'', title=process.env.QA_EXPECTED_UPDATED_TITLE||'';
  expect(id).toMatch(/^qa_[0-9]{8,16}_product$/);
  expect(title).toMatch(/^QA VERIFIED SAVED [0-9]{8,16}$/);
  if(!process.env.ADMIN_TEST_PASSWORD)throw Error('Missing authorized ADMIN_TEST_PASSWORD');
  const base='https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev';
  const ctx=await browser.newContext({serviceWorkers:'block'});
  const page=await ctx.newPage();
  const changes=[];
  try {
    if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET)
      await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
    page.on('request',r=>{
      try {
        const u=new URL(r.url()),method=r.method().toUpperCase();
        if(u.origin===base&&!['GET','HEAD','OPTIONS'].includes(method))changes.push({method,path:u.pathname});
      }catch{}
    });
    await page.goto(base+'/admin/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#loginView')).toBeVisible();
    await page.locator('#password').fill(process.env.ADMIN_TEST_PASSWORD);
    await page.locator('#loginForm button[type="submit"]').click();
    await expect(page.locator('#appView')).toBeVisible({timeout:20000});
    const before=await page.evaluate(async id=>{
      const r=await fetch('/api/admin/products',{credentials:'include',cache:'no-store'});
      const data=await r.json();return {status:r.status,record:data.products?.find(v=>v.id===id)||null};
    },id);
    expect(before.status).toBe(200);
    expect(before.record).toMatchObject({id,published:false,skuVerified:false});
    expect(before.record.title).toContain('QA TEST');
    const body={title,sku:before.record.sku,skuVerified:false,category:'wallets',categoryLabel:'Ví da',
      description:'QA ONLY: verified persistence, auto-deleted',price:123456,stock:2,
      published:false,images:[],fulfillmentType:'in_stock'};
    const put=await page.evaluate(async({id,body})=>{
      const r=await fetch('/api/admin/products/'+encodeURIComponent(id),{method:'PUT',credentials:'include',
        headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)});
      const j=await r.json().catch(()=>({}));
      return {status:r.status,ok:j.ok===true,productId:j.product?.id||null};
    },{id,body});
    expect(put).toEqual({status:200,ok:true,productId:id});
    const after=await page.evaluate(async id=>{
      const r=await fetch('/api/admin/products',{credentials:'include',cache:'no-store'});
      const j=await r.json();return {status:r.status,record:j.products?.find(v=>v.id===id)||null};
    },id);
    expect(after.status).toBe(200);
    expect(after.record).toMatchObject({id,title,price:123456,stock:2,published:false});
    const unexpected=changes.filter(x=>!(
      (x.method==='POST'&&x.path==='/api/admin/login') ||
      (x.method==='PUT'&&x.path==='/api/admin/products/'+id)
    ));
    expect(unexpected,'Only login and QA-owned product update may write').toEqual([]);
    expect(changes.filter(x=>x.method==='PUT')).toEqual([{method:'PUT',path:'/api/admin/products/'+id}]);
    console.info('[QA_API_PERSISTENCE] PASS: authenticated PUT run-owned product, authenticated GET confirmed title/price/stock. Cleanup must still verify no test rows.');
  }finally{await ctx.close()}
});
