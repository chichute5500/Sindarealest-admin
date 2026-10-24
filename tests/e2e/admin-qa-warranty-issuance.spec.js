import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test('run-owned warranty issue, duplicate prevention, invalid-date rejection and GET readback',async({browser})=>{
  test.setTimeout(115000);
  const id=process.env.QA_TEST_ORDER_ID||'';
  const token=(id.match(/^qa_([0-9]{8,16})_order$/)||[])[1]||'';
  expect(token).toMatch(/^[0-9]{8,16}$/);
  const orderNo=process.env.QA_TEST_ORDER_NUMBER;
  const sku=process.env.QA_TEST_WARRANTY_SKU;
  expect(orderNo).toBe('QA-ORDER-'+token);
  expect(sku).toBe('QA-ISSUE-'+token);
  expect(process.env.QA_TEST_ISSUE_ITEM_ID).toBe('qa_'+token+'_issueItem');
  if(!process.env.ADMIN_TEST_PASSWORD)throw Error('Authenticated QA admin password required');
  const base='https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev';
  const ctx=await browser.newContext({serviceWorkers:'block'});
  const page=await ctx.newPage();
  const mutations=[];
  try{
    if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET)
      await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
    page.on('request',r=>{try{const u=new URL(r.url());if(u.origin===base&&!['GET','HEAD','OPTIONS'].includes(r.method()))
      mutations.push({method:r.method(),path:u.pathname});}catch{}});
    await page.goto(base+'/admin/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#loginView')).toBeVisible();
    await page.locator('#password').fill(process.env.ADMIN_TEST_PASSWORD);
    await page.locator('#loginForm button[type=submit]').click();
    await expect(page.locator('#appView')).toBeVisible({timeout:25000});
    const submit=async data=>page.evaluate(async body=>{
      const r=await fetch('/api/admin/warranties',{method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const payload=await r.json().catch(()=>({}));
      return {status:r.status,ok:payload.ok===true,warrantyCode:payload.warrantyCode||null};
    },data);
    const body={orderNumber:orderNo,sku,policyName:'QA ONLY - AUTO CLEANUP',durationMonths:12,startsAt:'2026-10-25'};
    const first=await submit(body);
    expect(first.status).toBe(201);
    expect(first.ok).toBe(true);
    expect(first.warrantyCode).toMatch(/^SDW-[A-Z0-9]{24}$/);
    const read=await page.evaluate(async code=>{
      const r=await fetch('/api/admin/warranties',{credentials:'include',cache:'no-store'});
      const body=await r.json().catch(()=>({}));
      return {status:r.status,found:(body.warranties||[]).some(w=>w.warrantyCode===code&&w.orderNumber&&w.sku)};
    },first.warrantyCode);
    expect(read).toEqual({status:200,found:true});
    const duplicate=await submit(body);
    expect(duplicate.status).toBe(409);
    expect(duplicate.ok).toBe(false);
    const badDate=await submit({...body,startsAt:'2026-02-31'});
    expect(badDate.status).toBe(400);
    expect(badDate.ok).toBe(false);
    expect(mutations).toEqual([
      {method:'POST',path:'/api/admin/login'},
      {method:'POST',path:'/api/admin/warranties'},
      {method:'POST',path:'/api/admin/warranties'},
      {method:'POST',path:'/api/admin/warranties'}
    ]);
    console.info('[QA_WARRANTY_ISSUANCE] PASS: run-owned POST→GET, duplicate 409, invalid date 400; D1/audit and cleanup independently verified by outer lifecycle.');
  }finally{await ctx.close()}
});
