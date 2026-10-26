/**
 * Real Chromium on the isolated Preview UI. Intercept only Admin writes;
 * never send test images/products to any Cloudflare D1/R2 instance.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { buildCloudflareAccessHeaders } from "./cloudflare-access-service-token.mjs";

if(process.env.GITHUB_REPOSITORY!=="chichute5500/Sindarealest-admin" ||
   process.env.GITHUB_REF!=="refs/heads/feature/admin-bulk-folder-import-2026-10-26" ||
   !/^[0-9a-f]{40}$/i.test(String(process.env.GITHUB_SHA||"")))throw Error("Unexpected source SHA/ref");
const origin="https://sd-import-review-20261026.sindarealest-admin-preview.pages.dev";
const ACCESS=buildCloudflareAccessHeaders();
const fixtureRoot="artifacts/bulk-import-preview/fixture-"+randomUUID();
const selected=join(fixtureRoot,"KET_QUA_NHOM_MAU");
const folder=join(selected,"Giày thể thao","M0033 - Sneaker Mau Den 2800K","Đen");
const fileBase="Anh-goc";
const webp=await readFile("public/watermark.webp");
if(webp.toString("ascii",0,4)!=="RIFF"||webp.toString("ascii",8,12)!=="WEBP")throw Error("Synthetic input is not valid WebP");
await mkdir(folder,{recursive:true});
await writeFile(join(folder,fileBase+" (1).webp"),webp);
await writeFile(join(folder,fileBase+" (2).webp"),webp);
const csv=[
  "Ảnh gốc,Ảnh kết quả,Danh mục,Mẫu,Màu,Ghi chú",
  "original-1,Giày thể thao\\M0033 - Sneaker Mau Den 2800K\\Đen\\Anh-goc (1).webp,Giày thể thao,Sneaker Mau Den 2800K,Đen,Cần xem lại",
  "original-2,Giày thể thao\\M0033 - Sneaker Mau Den 2800K\\Đen\\Anh-goc (2).webp,Giày thể thao,Sneaker Mau Den 2800K,Đen,Cần xem lại"
].join("\r\n")+"\r\n";
const csvPath=join(fixtureRoot,"DANH_SACH_ANH.csv");await writeFile(csvPath,csv);
await mkdir("artifacts/bulk-import-preview/screenshots",{recursive:true});
let browser, uploads=0, drafts=[],leakedWrites=0;
try{
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1280,height:850},extraHTTPHeaders:ACCESS});
  const page=await ctx.newPage();
  const failures=[];
  page.on("pageerror",e=>failures.push(e.message));
  await page.route("**/api/admin/**", async(route)=>{
    const req=route.request();
    const pathname=new URL(req.url()).pathname;
    const method=req.method();
    if(method==="GET"&&pathname==="/api/admin/products"){
      await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({products:[]})});
    } else if(method==="POST"&&pathname==="/api/admin/upload"){
      uploads++;
      if(!(req.headers()["content-type"]||"").includes("multipart/form-data"))throw Error("Upload request not multipart");
      await route.fulfill({status:201,contentType:"application/json",
        body:JSON.stringify({ok:true,url:"/media/"+randomUUID()+".webp",originalStoredPrivately:true})});
    } else if(method==="POST"&&pathname==="/api/admin/products"){
      const draft=JSON.parse(req.postData()||"{}");drafts.push(draft);
      await route.fulfill({status:201,contentType:"application/json",
        body:JSON.stringify({ok:true,product:{id:randomUUID()}})});
    } else {
      leakedWrites++;
      await route.abort();
    }
  });
  const response=await page.goto(origin+"/admin/import.html",{waitUntil:"networkidle",timeout:40000});
  assert.equal(response?.status(),200,"Preview import UI not served");
  assert.match(await page.title(),/Nhập thư mục ảnh/);
  await page.locator("#csv").setInputFiles(csvPath);
  await page.locator("#folder").setInputFiles(selected);
  await page.locator("#preview").click();
  await page.locator("#review").waitFor({state:"visible",timeout:12000});
  assert.match(await page.locator("#totals").innerText(),/1 mẫu \/ 2 dòng CSV \/ 2 ảnh khớp/);
  assert.equal(await page.locator("#groups .item").count(),1);
  assert.equal(await page.locator("#groups .item input[type=checkbox]").isChecked(),true);
  await page.screenshot({path:"artifacts/bulk-import-preview/screenshots/desktop-review.png",fullPage:true});
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#import").click();
  await page.waitForFunction(()=>document.querySelector("#status")?.textContent?.includes("Đã tạo 1/1 mẫu nháp"),null,{timeout:35000});
  assert.equal(uploads,2);
  assert.equal(drafts.length,1);
  assert.equal(drafts[0].published,false);
  assert.equal(drafts[0].price,null);
  assert.equal(drafts[0].stock,null);
  assert.equal(drafts[0].skuVerified,false);
  assert.equal(drafts[0].category,"Sneaker");
  assert.equal(drafts[0].categoryLabel,"Giày thể thao");
  assert.equal(drafts[0].images.length,2);
  assert.equal(leakedWrites,0);
  assert.deepEqual(failures,[]);
  await page.screenshot({path:"artifacts/bulk-import-preview/screenshots/desktop-draft-confirmed.png",fullPage:true});
  const mobile=await ctx.newPage();
  await mobile.setViewportSize({width:390,height:844});
  await mobile.route("**/api/admin/**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({products:[]})}));
  const mobileResponse=await mobile.goto(origin+"/admin/import.html",{waitUntil:"networkidle",timeout:40000});
  assert.equal(mobileResponse?.status(),200);
  assert.equal(await mobile.locator("#preview").isVisible(),true);
  await mobile.screenshot({path:"artifacts/bulk-import-preview/screenshots/mobile-entry.png",fullPage:true});
  const authCtx=await browser.newContext({viewport:{width:390,height:844},extraHTTPHeaders:ACCESS});
  const authPage=await authCtx.newPage();
  let signedIn=false,loginPosts=0,authReadCount=0;
  const authPageErrors=[];
  authPage.on("pageerror",error=>authPageErrors.push(error.message));
  await authPage.route("**/api/admin/**",async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    if(path==="/api/admin/products"&&req.method()==="GET"){
      authReadCount++;
      return route.fulfill({status:signedIn?200:401,contentType:"application/json",
        body:JSON.stringify(signedIn?{products:[]}:{ok:false,error:"Phiên đăng nhập hết hạn hoặc chưa đăng nhập."})});
    }
    if(path==="/api/admin/login"&&req.method()==="POST"){
      loginPosts++;
      const body=JSON.parse(req.postData()||"{}");
      assert.equal(body.password,"qa-password-123456789012");
      signedIn=true;
      return route.fulfill({status:200,contentType:"application/json",
        headers:{"Set-Cookie":"sd_admin_session=qa_mock; Path=/api/admin; HttpOnly; Secure; SameSite=Strict"},
        body:JSON.stringify({ok:true})});
    }
    throw Error("Unexpected auth test API path: "+path);
  });
  await authPage.goto(origin+"/admin/import.html",{waitUntil:"networkidle",timeout:40000});
  await authPage.locator("#loginPanel").waitFor({state:"visible",timeout:15000});
  assert.equal(await authPage.locator("#preview").isDisabled(),true,"Unauthorized user cannot compare or import");
  await authPage.locator("#csv").setInputFiles(csvPath);
  await authPage.locator("#folder").setInputFiles(selected);
  assert.equal(await authPage.locator("#folder").evaluate(e=>e.files.length),2);
  await authPage.locator("#previewPassword").fill("qa-password-123456789012");
  await authPage.locator("#signIn").click();
  await authPage.locator("#loginPanel").waitFor({state:"hidden",timeout:15000});
  assert.equal(await authPage.locator("#preview").isEnabled(),true);
  assert.equal(await authPage.locator("#folder").evaluate(e=>e.files.length),2,"Selected photos preserved across inline login");
  assert.equal(loginPosts,1);
  await authPage.locator("#preview").click();
  await authPage.locator("#review").waitFor({state:"visible",timeout:12000});
  assert.equal(await authPage.locator("#groups .item").count(),1);
  await authPage.screenshot({path:"artifacts/bulk-import-preview/screenshots/mobile-inline-login.png",fullPage:true});
  signedIn=false;
  await authPage.locator("#preview").click();
  await authPage.locator("#loginPanel").waitFor({state:"visible",timeout:15000});
  assert.equal(await authPage.locator("#preview").isDisabled(),true,"Expired session re-locks import");
  assert.equal(await authPage.locator("#folder").evaluate(e=>e.files.length),2,"Expired session does not clear selected photos");
  assert.ok(authReadCount>=4,"GET product catalog checked login and expiration");
  assert.deepEqual(authPageErrors,[],"No frontend exceptions");
  await authCtx.close();
  await ctx.close();
  console.log(JSON.stringify({status:"PASS",sourceSha:process.env.GITHUB_SHA,previewOrigin:origin,
    browser:"Chromium",desktop:true,mobile:true,inlinePreviewLogin:true,expiredSessionHandled:true,matchedImages:2,draftCreatedOnlyInMock:true,
    imagesUploadedOnlyInMock:uploads,d1Writes:0,r2Writes:0,productionWrites:0,leakedWrites,
    categoryAlias:"sneakers",cleanup:"local QA fixtures only"},null,2));
}finally{
  if(browser)await browser.close();
  await rm(fixtureRoot,{recursive:true,force:true});
}
