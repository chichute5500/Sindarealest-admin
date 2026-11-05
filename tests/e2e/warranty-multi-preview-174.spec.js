import {test,expect} from "@playwright/test";
// Intentionally writes only 2 synthetic warranties into independently isolated D1.
// The workflow always cleans these exact run-scoped records afterward.
test("PR174 multi-product manual warranty issues two distinct codes",async({page})=>{
  const url=process.env.ADMIN_TEST_URL, password=process.env.ADMIN_TEST_PASSWORD;
  const run=process.env.GITHUB_RUN_ID||"";
  if(!url||!password||!/^\d+$/.test(run))throw Error("Preview URL, authorized Admin password or run ID missing");
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#loginForm")).toBeVisible();
  await page.locator("#password").fill(password);
  await page.locator('#loginForm button[type="submit"]').click();
  await expect(page.locator("#appView")).toBeVisible({timeout:20000});
  await page.goto(new URL("?view=warranties",url).href,{waitUntil:"domcontentloaded"});
  const health=await page.request.get(new URL("/api/admin/warranties",url).href);
  const healthBody=await health.json().catch(()=>({}));
  console.log("PR174 authenticated warranty GET:",health.status(),String(healthBody?.error||"OK").slice(0,160));
  expect(health.status(),"Preview Admin warranty-read API must be healthy").toBe(200);
  const disclosure=page.locator("#manualWarrantyDisclosure");
  await expect(disclosure).toBeVisible({timeout:20000});
  await disclosure.locator("summary").click();
  const form=page.locator("#manualWarrantyForm");
  await expect(form).toBeVisible();
  await form.locator('[name="customerName"]').fill("PR174 QA "+run);
  await form.locator('[name="customerPhone"]').fill("0000000000");
  await form.locator('[name="customerAddress"]').fill("Địa chỉ QA giả lập, không giao hàng");
  let items=form.locator("[data-manual-warranty-item]");
  await expect(items).toHaveCount(1);
  await items.nth(0).locator('[name="productName"]').fill("PR174 QA ví thử");
  await items.nth(0).locator('[name="price"]').fill("1600000");
  await items.nth(0).locator('[name="startsAt"]').fill("2026-11-05");
  await form.locator("#addManualWarrantyItem").click();
  await expect(items).toHaveCount(2);
  await items.nth(1).locator('[name="productName"]').fill("PR174 QA túi thử");
  await items.nth(1).locator('[name="price"]').fill("4500000");
  await items.nth(1).locator('[name="startsAt"]').fill("2026-11-05");
  await expect(items.nth(0).locator('[name="durationMonths"]')).toHaveValue("6");
  await expect(items.nth(1).locator('[name="durationMonths"]')).toHaveValue("12");
  const responsePromise=page.waitForResponse(r=>
    new URL(r.url()).pathname==="/api/admin/warranties"&&r.request().method()==="POST",{timeout:25000});
  await form.locator("#createManualWarrantyBtn").click();
  const response=await responsePromise;
  const resultBody=await response.json().catch(()=>({}));
  expect(response.status(),"Warranty issuance API response: "+String(resultBody.error||resultBody.message||"unknown")).toBe(201);
  const result=resultBody;
  expect(result.warranties).toHaveLength(2);
  expect(result.warranties[0].warrantyCode).toMatch(/^SDW-[A-Z2-9]{4}$/);
  expect(result.warranties[1].warrantyCode).toMatch(/^SDW-[A-Z2-9]{4}$/);
  expect(result.warranties[0].warrantyCode).not.toBe(result.warranties[1].warrantyCode);
  await expect(page.locator("#manualWarrantyMessage")).toContainText(result.warranties[0].warrantyCode);
  await expect(page.locator("#manualWarrantyMessage")).toContainText(result.warranties[1].warrantyCode);
  // Validate persisted Admin records by the same phone, then look up both SDW codes publicly.
  const warrantyEndpoint=new URL("/api/admin/warranties",url).href;
  const adminRecords=await page.request.get(warrantyEndpoint);
  expect(adminRecords.status()).toBe(200);
  const allRecords=(await adminRecords.json()).warranties||[];
  const first=allRecords.find(w=>w.warrantyCode===result.warranties[0].warrantyCode);
  const second=allRecords.find(w=>w.warrantyCode===result.warranties[1].warrantyCode);
  expect(first).toBeTruthy();expect(second).toBeTruthy();
  expect(first.phone).toBe("0000000000");expect(second.phone).toBe("0000000000");
  const publicEndpoint=new URL("/api/warranty-lookup",url).href;
  for(const issued of result.warranties){
    const publicResult=await page.request.post(publicEndpoint,{data:{lookup:issued.warrantyCode}});
    expect(publicResult.status(),"Public SDW code lookup must succeed").toBe(200);
    const publicJson=await publicResult.json();
    expect(publicJson.warranty.manual).toBe(true);
    expect(publicJson.warranty.maskedPhone).toBe("000••••00");
    expect(publicJson.warranty.maskedOrderNumber).toBe("Mua trực tiếp");
    expect(publicJson.warranty.purchasedAt).toBe("","Manual issuance date must not be mislabeled purchase date");
    expect(publicJson.warranty.policy.version).toBe("SD-WARRANTY-2026-11-05-V1");
    expect(publicJson.warranty.policy.materialRemedy).toContain("gấp 10 lần");
    expect(publicJson.warranty.policy.exclusions).toContain("va đập");
    expect(JSON.stringify(publicJson.warranty)).not.toContain("unitPriceVnd");
  }
  // Edit a single product without changing the other product's code.
  const firstRow=page.locator(".issued-warranty-table tbody tr").filter({hasText:result.warranties[0].warrantyCode});
  await firstRow.locator('[data-action="edit-manual-warranty"]').click();
  const editForm=page.locator("#editManualWarrantyForm");
  await expect(editForm).toBeVisible();
  await editForm.locator('[name="productName"]').fill("PR174 QA ví đã sửa");
  await expect(editForm.locator('[name="price"]')).toHaveAttribute("readonly","");
  await expect(editForm.locator('[name="durationMonths"]')).toHaveAttribute("readonly","");
  await expect(editForm.locator('[name="startsAt"]')).toHaveAttribute("readonly","");
  const editResponsePromise=page.waitForResponse(r=>
    new URL(r.url()).pathname==="/api/admin/warranties"&&r.request().method()==="PATCH",{timeout:25000});
  await editForm.locator("#saveManualWarrantyEdit").click();
  const editResponse=await editResponsePromise;
  expect(editResponse.status(),"Editing manual warranty must persist").toBe(200);
  expect((await editResponse.json()).warrantyCode).toBe(first.warrantyCode);
  await expect(page.locator("#editManualWarrantyForm")).toHaveCount(0);
  const afterEdit=(await (await page.request.get(warrantyEndpoint)).json()).warranties;
  const edited=afterEdit.find(w=>w.warrantyCode===first.warrantyCode);
  expect(edited.title).toBe("PR174 QA ví đã sửa");
  expect(edited.durationMonths).toBe(6);
  expect(edited.endsAt).toBe("2027-05-05");
  expect(edited.policy.version).toBe("SD-WARRANTY-2026-11-05-V1");
  expect(afterEdit.find(w=>w.warrantyCode===second.warrantyCode).durationMonths).toBe(12);
  // The Admin edit panel must remain usable at common mobile width.
  await page.setViewportSize({width:390,height:844});
  await page.locator(".issued-warranty-table tbody tr")
    .filter({hasText:first.warrantyCode}).locator('[data-action="edit-manual-warranty"]').click();
  await expect(page.locator("#editManualWarrantyForm")).toBeVisible();
  await page.locator("#closeManualWarrantyEdit").click();
  // Void only the second warranty; keep record and code so a customer sees its status.
  await page.locator(".issued-warranty-table tbody tr")
    .filter({hasText:second.warrantyCode}).locator('[data-action="edit-manual-warranty"]').click();
  await page.locator("#voidMwReason").fill("Phiếu thử nghiệm QA — hủy hiệu lực");
  page.once("dialog",async dialog=>dialog.accept());
  const voidResponsePromise=page.waitForResponse(r=>
    new URL(r.url()).pathname==="/api/admin/warranties"&&r.request().method()==="PATCH",{timeout:25000});
  await page.locator("#voidManualWarrantyBtn").click();
  const voidResponse=await voidResponsePromise;
  expect(voidResponse.status(),"Voiding manual warranty must succeed").toBe(200);
  expect((await voidResponse.json()).warrantyCode).toBe(second.warrantyCode);
  const afterVoid=(await (await page.request.get(warrantyEndpoint)).json()).warranties;
  expect(afterVoid.find(w=>w.warrantyCode===second.warrantyCode).status).toBe("void");
  expect(afterVoid.find(w=>w.warrantyCode===first.warrantyCode).status).not.toBe("void");
  const publicVoid=await page.request.post(publicEndpoint,{data:{lookup:second.warrantyCode}});
  expect(publicVoid.status()).toBe(200);
  expect((await publicVoid.json()).warranty.status).toBe("void");
  const repeated=await page.request.patch(warrantyEndpoint,{data:{
    source:"manual",action:"void",id:second.id,reason:"Hủy thêm lần nữa"
  }});
  expect(repeated.status()).toBe(409,"already void warranty must not be mutated");
  const invalid=await page.request.patch(warrantyEndpoint,{data:{
    source:"manual",action:"update",id:first.id,customerName:"PR174 QA "+run,
    customerPhone:"0000000000",customerAddress:"Địa chỉ QA giả lập, không giao hàng",
    productName:"PR174 QA ví đã sửa",price:"1.5",durationMonths:"7",startsAt:"2026-11-06"
  }});
  expect(invalid.status()).toBe(400,"fractional price must not be accepted");
  const frozen=await page.request.patch(warrantyEndpoint,{data:{source:"manual",action:"update",id:first.id,
    customerName:"PR174 QA "+run,customerPhone:"0000000000",customerAddress:"Địa chỉ QA giả lập, không giao hàng",
    productName:"PR174 QA ví đã sửa",price:"1700000",durationMonths:"6",startsAt:"2026-11-05"}});
  expect(frozen.status()).toBe(409,"issued policy price is immutable");
  console.log("PASS: PR174 Admin create/edit/void, phone-linked records, public SDW lookup, mobile edit, unchanged codes and 4xx protections.");
  console.log("PASS: two independent PR174 warranty codes created via real Preview UI and API; cleanup runs after test.");
});
