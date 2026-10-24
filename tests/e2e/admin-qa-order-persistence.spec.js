import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('isolated run-owned Admin order repricing and payment terms persist, forbidden changes do not', async ({browser}) => {
  test.setTimeout(110000);
  const orderId=process.env.QA_TEST_ORDER_ID || '';
  const itemId=process.env.QA_TEST_ORDER_ITEM_ID || '';
  const runId=(orderId.match(/^qa_([0-9]{8,16})_order$/)||[])[1] || '';
  expect(runId).toMatch(/^[0-9]{8,16}$/);
  expect(itemId).toBe('qa_'+runId+'_item');
  if(!process.env.ADMIN_TEST_PASSWORD)throw Error('Owner-approved QA admin credential absent');
  const base='https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev';
  const context=await browser.newContext({serviceWorkers:'block'});
  const page=await context.newPage();
  const changes=[];
  try {
    if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET)
      await page.setExtraHTTPHeaders({'CF-Access-Client-Id':process.env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret':process.env.CF_ACCESS_CLIENT_SECRET});
    page.on('request',request=>{
      try {
        const url=new URL(request.url()),method=request.method().toUpperCase();
        if(url.origin===base&&!['GET','HEAD','OPTIONS'].includes(method))
          changes.push({method,path:url.pathname});
      }catch{}
    });
    await page.goto(base+'/admin/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#loginView')).toBeVisible();
    await page.locator('#password').fill(process.env.ADMIN_TEST_PASSWORD);
    await page.locator('#loginForm button[type=submit]').click();
    await expect(page.locator('#appView')).toBeVisible({timeout:25000});
    const readOrder=async()=>page.evaluate(async id=>{
      const response=await fetch('/api/admin/orders',{credentials:'include',cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      const row=body.orders?.find(order=>order.id===id)||null;
      return {status:response.status,record:row&&{
        id:row.id,status:row.status,paymentStatus:row.payment_status,
        subtotal:Number(row.subtotal),total:Number(row.total),
        items:(row.items||[]).map(item=>({id:item.id,unitPrice:Number(item.unitPrice),lineTotal:Number(item.lineTotal)}))
      }};
    },orderId);
    const initial=await readOrder();
    expect(initial.status).toBe(200);
    expect(initial.record).toMatchObject({id:orderId,status:'completed',paymentStatus:'unpaid',total:120000});
    expect(initial.record.items).toContainEqual({id:itemId,unitPrice:120000,lineTotal:120000});
    const mutate=async body=>page.evaluate(async data=>{
      const response=await fetch('/api/admin/orders',{method:'PATCH',credentials:'include',
        headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(data)});
      const json=await response.json().catch(()=>({}));
      return {status:response.status,ok:json.ok===true};
    },body);
    const confirmed=await mutate({id:orderId,status:'completed',prices:[{itemId,unitPrice:135000}],
      termsConfirmed:true,paymentTermsNote:'QA ONLY - PRICE TERMS '+runId});
    expect(confirmed).toEqual({status:200,ok:true});
    const saved=await readOrder();
    expect(saved.status).toBe(200);
    expect(saved.record).toMatchObject({id:orderId,status:'completed',paymentStatus:'unpaid',
      subtotal:135000,total:135000});
    expect(saved.record.items).toContainEqual({id:itemId,unitPrice:135000,lineTotal:135000});
    const forgedPayment=await mutate({id:orderId,status:'completed',paymentStatus:'paid'});
    expect(forgedPayment.status).toBe(409);
    expect(forgedPayment.ok).toBe(false);
    const unrelatedLine=await mutate({id:orderId,status:'completed',
      prices:[{itemId:'qa_'+runId+'_not_an_order_item',unitPrice:1}]});
    expect(unrelatedLine.status).toBe(400);
    expect(unrelatedLine.ok).toBe(false);
    expect((await readOrder()).record).toEqual(saved.record);
    expect(changes).toEqual([
      {method:'POST',path:'/api/admin/login'},
      {method:'PATCH',path:'/api/admin/orders'},
      {method:'PATCH',path:'/api/admin/orders'},
      {method:'PATCH',path:'/api/admin/orders'}
    ]);
    console.info('[QA_ORDER_PERSISTENCE] PASS: QA-only Admin PATCH saved price and terms; authenticated GET matched; forged paid status and foreign item rejected. Independent D1/audit and zero-row cleanup still required.');
  } finally { await context.close(); }
});
