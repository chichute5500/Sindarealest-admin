import { test, expect } from '@playwright/test';

test.use({serviceWorkers:'block'});

test('isolated Preview QA warranty-claim update persists and backup GET is complete',async ({browser})=>{
  test.setTimeout(100000);
  const claimId=process.env.QA_TEST_CLAIM_ID||'';
  const productId=process.env.QA_TEST_PRODUCT_ID||'';
  expect(claimId).toMatch(/^qa_[0-9]{8,16}_claim$/);
  expect(productId).toMatch(/^qa_[0-9]{8,16}_product$/);
  if(!process.env.ADMIN_TEST_PASSWORD)throw Error('Missing authorized QA admin password');
  const base='https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev';
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  const writes=[];
  try {
    if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET)
      await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
    page.on('request',req=>{
      try {
        const u=new URL(req.url()),m=req.method().toUpperCase();
        if(u.origin===base&&!['GET','HEAD','OPTIONS'].includes(m))writes.push({method:m,path:u.pathname});
      } catch {}
    });
    await page.goto(base+'/admin/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#loginView')).toBeVisible();
    await page.locator('#password').fill(process.env.ADMIN_TEST_PASSWORD);
    await page.locator('#loginForm button[type="submit"]').click();
    await expect(page.locator('#appView')).toBeVisible({timeout:20000});
    const initial=await page.evaluate(async id=>{
      const r=await fetch('/api/admin/warranties',{credentials:'include',cache:'no-store'});
      const j=await r.json();return {status:r.status,claim:j.claims?.find(x=>x.id===id)||null};
    },claimId);
    expect(initial.status).toBe(200);
    expect(initial.claim).toMatchObject({id:claimId,status:'reviewing'});
    const marker='QA ONLY - AUTO DELETE '+claimId;
    const updated=await page.evaluate(async ({id,marker})=>{
      const r=await fetch('/api/admin/warranties',{method:'PATCH',credentials:'include',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:'approved',adminNote:marker})});
      const j=await r.json().catch(()=>({}));
      return {status:r.status,ok:j.ok===true};
    },{id:claimId,marker});
    expect(updated).toEqual({status:200,ok:true});
    const after=await page.evaluate(async id=>{
      const r=await fetch('/api/admin/warranties',{credentials:'include',cache:'no-store'});
      const j=await r.json();return {status:r.status,claim:j.claims?.find(x=>x.id===id)||null};
    },claimId);
    expect(after.status).toBe(200);
    expect(after.claim).toMatchObject({id:claimId,status:'approved',adminNote:marker});
    // Only check structure and the two run-owned IDs. Never log/export contents from other records.
    const backup=await page.evaluate(async ({productId,claimId})=>{
      const r=await fetch('/api/admin/backup',{credentials:'include',cache:'no-store'});
      const j=await r.json().catch(()=>({}));
      return {
        status:r.status,format:j.format,
        hasProducts:Array.isArray(j.products),
        hasClaims:Array.isArray(j.operations?.warrantyClaims),
        containsQaProduct:j.products?.some(x=>x.id===productId)===true,
        containsQaClaim:j.operations?.warrantyClaims?.some(x=>x.id===claimId&&x.status==='approved')===true,
        hasPaymentLedgers:Array.isArray(j.operations?.orderPaymentRequests)&&Array.isArray(j.operations?.orderPaymentTransactions)
      };
    },{productId,claimId});
    expect(backup).toMatchObject({status:200,format:'sindarealest-backup-v2',hasProducts:true,hasClaims:true,
      containsQaProduct:true,containsQaClaim:true,hasPaymentLedgers:true});
    expect(writes).toEqual([{method:'POST',path:'/api/admin/login'},{method:'PATCH',path:'/api/admin/warranties'}]);
    console.info('[QA_WARRANTY_BACKUP] PASS: run-owned claim PATCH/GET and read-only backup snapshot schema with payment-ledger arrays; sensitive backup contents not logged');
  } finally {await context.close()}
});
