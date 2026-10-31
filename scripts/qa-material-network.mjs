// GET-only mobile browser network budget check: do not regress to preloading
// all twelve full-resolution handcrafted crocodile leather gallery images.
import assert from "node:assert/strict";
import {chromium} from "playwright";
const origin=(process.env.AUDIT_TARGET_URL||"https://fix-audit-2026-10.sindarealest-admin-preview.pages.dev").replace(/\/$/,"");
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
async function check(path,scroll){
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block",reducedMotion:"reduce"});
 const page=await context.newPage();
 const media=[];
 page.on("request",request=>{
  if(/\/images\/crocodile-leather\/[^/]+\.(?:jpe?g|png|webp|avif)/i.test(new URL(request.url()).pathname))
   media.push(request.url());
 });
 await page.route("**/*",route=>
  ["GET","HEAD"].includes(route.request().method())?route.continue():route.abort("blockedbyclient")
 );
 try{
  const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response.status(),200);
  await page.waitForTimeout(2300);
  assert.equal(media.length,0,path+" downloaded high-resolution material photos before scroll");
  if(scroll){
   await page.locator("#materialTile").scrollIntoViewIfNeeded();
   await page.waitForTimeout(2300);
   assert.ok(media.length>0,"Material gallery should activate in viewport");
   assert.ok(media.length<=3,"Lazy rotation should not preload full material collection: "+media.length);
  }
  console.log("PASS:",path,"eager leather gallery photo requests:",0,"after viewport:",media.length);
 }finally{await context.close()}
}
try{
 await check("/sanpham",false);
 await check("/",true);
 console.log("PASS: material gallery network gating, no POST or customer data modifications.");
}finally{await browser.close()}
