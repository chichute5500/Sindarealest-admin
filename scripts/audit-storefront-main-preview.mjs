import {promises as fs} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {buildCloudflareAccessHeaders} from './cloudflare-access-service-token.mjs';
import {isApprovedPreviewExternalRead} from './preview-external-read-allowlist.mjs';

const branch='integration/storefront-locked-on-main-2026-10-26';
const alias='https://integration-storefront-locke.sindarealest-admin-preview.pages.dev';
const sha=String(process.env.GITHUB_SHA||'');
const preview=String(process.env.PREVIEW_URL||alias+'/');
if(process.env.GITHUB_REPOSITORY!=='chichute5500/Sindarealest-admin'||process.env.GITHUB_REF!=='refs/heads/'+branch||!/^[0-9a-f]{40}$/i.test(sha)||preview!==alias+'/')throw Error('Wrong branch/SHA/alias: integration browser audit refused');
const destination='artifacts/storefront-integration-preview';
await fs.mkdir(destination,{recursive:true});
const specs=[
 {label:'desktop-1440-light',width:1440,height:900,theme:'light',mobile:false},
 {label:'desktop-1440-dark',width:1440,height:900,theme:'dark',mobile:false},
 {label:'desktop-1280-light',width:1280,height:800,theme:'light',mobile:false},
 {label:'desktop-1280-dark',width:1280,height:800,theme:'dark',mobile:false},
 {label:'mobile-390-light',width:390,height:844,theme:'light',mobile:true},
 {label:'mobile-390-dark',width:390,height:844,theme:'dark',mobile:true},
 {label:'mobile-360-light',width:360,height:800,theme:'light',mobile:true},
 {label:'mobile-360-dark',width:360,height:800,theme:'dark',mobile:true}
];
const synthetic=[{
 id:'00000000-1111-4222-8333-000000000010',slug:'demo-wallet',sku:null,skuVerified:false,
 category:'wallets',categoryLabel:'Ví da cá sấu',title:'Ví da cá sấu — dữ liệu kiểm thử',description:'Ảnh và nội dung kiểm thử chỉ tồn tại trong trình duyệt QA.',images:[],price:null,stock:null,published:true,sourcePriceConfirmed:false,fulfillmentType:'unclassified'
}];
const report={sha,sourceBranch:branch,alias,scope:'READ_ONLY_BROWSER_WITH_SYNTHETIC_PUBLIC_CATALOG',realOrderWrites:0,prodWrites:0,matrix:[],errors:[],livePublicCatalog:null,createdAt:new Date().toISOString()};
const browser=await chromium.launch({headless:true});
const auth=buildCloudflareAccessHeaders();
let liveRows=[];
try{
 const probe=await browser.newContext();
 try{
  const response=await probe.request.get(alias+'/api/products',{headers:auth,timeout:25000});
  const result={httpStatus:response.status(),isArray:false};
  if(response.ok()){try{
    const body=await response.json();result.isArray=Array.isArray(body);
    liveRows=Array.isArray(body)?body:[];
    result.count=liveRows.length;result.categoryCount=new Set(liveRows.map(x=>x.category)).size;
    result.imageReferences=liveRows.reduce((n,x)=>n+(Array.isArray(x.images)?x.images.length:0),0);
   }catch{}}
  report.livePublicCatalog=result;
 }catch(error){report.livePublicCatalog={error:String(error).slice(0,180)}}
 await probe.close();
 // Real catalog read-only contract: the old tests stubbed the API, so the
 // 235-old-vs-218-new isolation error was invisible even when Chromium PASSed.
 // This extra mobile session reads the *actual* isolated Preview D1 and uses
 // its product categories as the single source of truth for the rendered pills.
 const liveProof={pass:false,count:liveRows.length,categories:0,filterChecked:null,firstMedia:null};
 report.realCatalog=liveProof;
 let liveContext;
 try{
  if(liveRows.length!==218||new Set(liveRows.map(x=>x.category)).size!==15)
   throw Error("ISOLATED_PREVIEW_CATALOG_NOT_APPROVED_218_IN_15");
  liveContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,colorScheme:'light',reducedMotion:'reduce'});
  await liveContext.addInitScript(()=>{try{localStorage.setItem('sd-theme-mode','light')}catch{}});
  const page=await liveContext.newPage();
  page.on('pageerror',e=>report.errors.push({label:'live-catalog-mobile',type:'pageerror',message:e.message.slice(0,180)}));
  await page.route('**/*',async route=>{
   const request=route.request();let url;
   try{url=new URL(request.url())}catch{await route.abort();return}
   if(!['GET','HEAD'].includes(request.method())){await route.abort('blockedbyclient');return}
   if(url.origin===alias){await route.continue({headers:{...request.headers(),...auth}});return}
   if(isApprovedPreviewExternalRead(request.url(),request.method())){await route.continue();return}
   await route.abort('blockedbyclient');
  });
  const response=await page.goto(alias+'/',{waitUntil:'domcontentloaded',timeout:45000});
  if(response?.status()!==200)throw Error('Live catalog home HTTP not 200');
  // With the real catalog, Welcome may have already auto-closed before
  // our read-only QA reaches the button (unlike the synthetic delayed case).
  const splash=page.locator('#welcomeSplash');
  if(await splash.isVisible()){
   const skip=page.locator('#skipIntro');
   // Welcome may auto-close between visibility probing and clicking.
   // The subsequent wait still requires it to become fully hidden.
   if(await skip.isVisible())await skip.click({force:true,timeout:1500}).catch(()=>{});
  }
  await page.waitForFunction(()=>{
   const el=document.querySelector('#welcomeSplash');
   return !el||getComputedStyle(el).display==='none'||getComputedStyle(el).visibility==='hidden';
  },null,{timeout:12000});
  await page.waitForFunction(()=>document.querySelectorAll('#categoryFilters [data-category]').length>=15,null,{timeout:15000});
  const pills=await page.locator('#categoryFilters [data-category]').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.category,label:n.textContent?.trim()||''})));
  const expected=new Map();
  for(const x of liveRows){const key=String(x.category||'');expected.set(key,(expected.get(key)||0)+1)}
  const shown=new Set(pills.filter(x=>x.key!=='all').map(x=>x.key));
  if(pills.length!==16||shown.size!==15||[...expected.keys()].some(k=>!shown.has(k)))
   throw Error("LIVE_CATEGORY_FILTER_NOT_SYNCED");
  // Verify real Preview data restores four owner-approved featured tiles.
  const featuredIds=await page.locator('#featuredGrid [data-featured-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.product));
  if(featuredIds.length!==4||new Set(featuredIds).size!==4)
   throw Error("LIVE_FEATURED_MISSING_ONE_OF_FOUR_CARDS");
  // All tab must fill the first pages with sneakers before moving to the
  // next category; the order is randomized once, then stable when paginating.
  const firstPageIds=await page.locator('#catalogGrid [data-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.product));
  const allCategories=new Map(liveRows.map(x=>[String(x.id||x.slug),String(x.category)]));
  const sneakerCount=liveRows.filter(x=>x.category==='sneakers').length;
  if(!sneakerCount)throw Error("LIVE_SNEAKERS_CATEGORY_MISSING");
  if(firstPageIds.slice(0,Math.min(firstPageIds.length,sneakerCount)).some(id=>allCategories.get(String(id))!=='sneakers'))
   throw Error("LIVE_ALL_PRODUCTS_NOT_SNEAKERS_FIRST");
  if(sneakerCount>=firstPageIds.length&&firstPageIds.some(id=>allCategories.get(String(id))!=='sneakers'))
   throw Error("LIVE_ALL_PRODUCTS_INTERLEAVED_CATEGORIES");
  const nextPage=page.locator('#pagination [data-page="next"]');
  if(await nextPage.count()&&!await nextPage.isDisabled()){
   await nextPage.click({timeout:6500});
   await page.locator('#pagination [data-page="prev"]').click({timeout:6500});
   const returned=await page.locator('#catalogGrid [data-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.product));
   if(JSON.stringify(returned)!==JSON.stringify(firstPageIds))
    throw Error("LIVE_RANDOM_CATALOG_SHUFFLES_ON_PAGINATION");
  }
  liveProof.featuredCount=featuredIds.length;
  liveProof.sneakerFirst=true;
  for(const item of pills){
   if(item.key!=='all'&&!item.label.includes(String(expected.get(item.key)||0)))
    throw Error("LIVE_CATEGORY_COUNT_MISMATCH");
  }
  const oldSet=new Set(['sneakers','loafers','dress-shoes','belts','wallets','sandals','watch-straps','phone-cases']);
  const sample=[...expected.keys()].find(key=>!oldSet.has(key))||[...expected.keys()][0];
  await page.locator('#categoryFilters [data-category="'+sample+'"]').click({timeout:6500});
  await page.waitForFunction(()=>document.querySelector('#catalogGrid .product-card'),null,{timeout:10000});
  const ids=await page.locator('#catalogGrid .product-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.product));
  const lookup=new Map(liveRows.map(row=>[String(row.id||row.slug),String(row.category)]));
  if(!ids.length||ids.some(id=>lookup.get(String(id))!==sample))
   throw Error("LIVE_CATEGORY_CLICK_DISPLAYS_WRONG_PRODUCTS");
  liveProof.categories=shown.size;liveProof.filterChecked=sample;
  await page.screenshot({path:path.join(destination,'real-new-catalog-mobile.png'),fullPage:false,animations:'disabled'});
  // Real published R2 image: a synthetic no-image product does not exercise the watermark observer.
  const opener=page.locator('#catalogGrid [data-open-product]').first();
  const liveProductId=await opener.getAttribute('data-open-product');
  const liveProduct=liveRows.find(x=>String(x.id||x.slug)===liveProductId);
  if(!liveProduct)throw Error('LIVE_PRODUCT_NOT_FOUND');
  await opener.click({timeout:8500});
  await page.locator('#productOverlay.open').waitFor({state:'visible',timeout:7000});
  const detail=await page.evaluate(()=>({
   title:document.querySelector('#detailTitle')?.textContent?.trim(),
   url:location.pathname,
   interactive:!document.querySelector('#productOverlay')?.hasAttribute('inert'),
   watermark:!!document.querySelector('.detail-image-stage > .sd-viewer-watermark'),
   hasCategory:!!document.querySelector('#detailCategory'),
   sameRow:!!document.querySelector('#detailSku')?.closest('.detail-meta-row')&&!!document.querySelector('#detailFulfillment')?.closest('.detail-meta-row'),
   skuX:document.querySelector('#detailSku')?.getBoundingClientRect().left,
   statusX:document.querySelector('#detailFulfillment')?.getBoundingClientRect().left,
   status:document.querySelector('#detailFulfillment')?.textContent?.trim(),
   glass:getComputedStyle(document.querySelector('#detailFulfillment .fulfillment-badge')).backdropFilter,
   titleWeight:Number(getComputedStyle(document.querySelector('#detailTitle')).fontWeight),
   price:document.querySelector('#detailPrice')?.textContent?.trim(),
   priceHidden:document.querySelector('#detailPrice')?.hidden,
   priceBorder:getComputedStyle(document.querySelector('#detailPrice')).borderTopWidth,
   priceBg:getComputedStyle(document.querySelector('#detailPrice')).backgroundColor
  }));
  const expectedTitle=String(liveProduct.title||'').replace(/\p{L}[\p{L}\p{M}\p{N}]*/gu,w=>w.charAt(0).toLocaleUpperCase('vi')+w.slice(1));
  if(detail.title!==expectedTitle||!detail.url.startsWith('/sanpham/')||!detail.interactive)
   throw Error('LIVE_PRODUCT_DETAIL_NOT_INTERACTIVE');
  if(detail.hasCategory||!detail.sameRow||detail.skuX>=detail.statusX||detail.titleWeight<700||!detail.glass||detail.glass==='none'||detail.status.includes('Tình trạng:'))
   throw Error('LIVE_DETAIL_METADATA_OR_TITLE_INCORRECT');
  const type=liveProduct.fulfillmentType||liveProduct.fulfillment_type;
  const labels={in_stock:'Có sẵn',made_to_order:'Hàng đặt riêng',unclassified:'Cần xác nhận'};
  if(detail.status!==(labels[type]||labels.unclassified))throw Error('LIVE_DETAIL_STATUS_NOT_FROM_REAL_DATA');
  if(Number.isSafeInteger(liveProduct.price)&&liveProduct.price>=0&&liveProduct.sourcePriceConfirmed===true){
   const expectedPrice='Giá: '+new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(liveProduct.price)+'₫';
   if(detail.priceHidden||detail.price!==expectedPrice||detail.priceBorder!=='0px'||detail.priceBg!=='rgba(0, 0, 0, 0)')
    throw Error('LIVE_DETAIL_PRICE_STILL_BOXED_OR_WRONG');
  }else if(!detail.priceHidden)throw Error('LIVE_UNCONFIRMED_PRICE_VISIBLE');
  const image=Array.isArray(liveProduct.images)?String(liveProduct.images[0]||''):'';
  if(image.startsWith('/media/')&&image.endsWith('.webp')&&!detail.watermark)
   throw Error('LIVE_PRODUCT_DETAIL_WATERMARK_MISSING');
  await page.waitForTimeout(350);
  await page.screenshot({path:path.join(destination,'real-product-detail-mobile-owner-layout.png'),fullPage:false,animations:'disabled'});
  await page.locator('#detailClose').click({timeout:6500});
  await page.waitForFunction(()=>!document.querySelector('#productOverlay')?.classList.contains('open'),null,{timeout:6500});
  liveProof.detail={productId:liveProductId,opens:true,closes:true,watermark:detail.watermark};
  // Buy Now must open the actual checkout form for this selected product,
  // without submitting an order or issuing POST/PUT/DELETE to the Preview.
  await page.locator('#catalogGrid [data-open-product]').first().click({timeout:8500});
  await page.locator('#productOverlay.open').waitFor({state:'visible',timeout:7000});
  const controls=await page.evaluate(()=>{
   const buttons=[document.querySelector('#detailAdd'),document.querySelector('#detailBuyNow')];
   const styles=buttons.map(b=>({background:getComputedStyle(b).backgroundImage,border:getComputedStyle(b).borderRadius,blur:getComputedStyle(b).backdropFilter,icon:!!b.querySelector('svg')}));
   const status=document.querySelector('#detailFulfillment .fulfillment-badge');
   return {styles,buyText:buttons[1].textContent?.trim(),glassStatus:getComputedStyle(status).backgroundImage,
    orderOK:!!document.querySelector('.detail-aftercare #detailDescription')&&
     !!document.querySelectorAll('.detail-aftercare .promise-tag').length&&
     !!document.querySelector('.detail-aftercare #detailZalo')};
  });
  if(!controls.orderOK||controls.buyText!=='Đặt hàng ngay'||controls.styles.some(s=>!s.icon||!s.blur||s.blur==='none'||s.border!=='999px'))
   throw Error('LIVE_BUY_NOW_CONTROLS_OR_AFTERCARE_WRONG');
  if(!controls.styles[0].background.includes('126, 177, 215')||!controls.styles[1].background.includes('242, 152, 70'))
   throw Error('LIVE_BLUE_ORANGE_GLASS_PALETTE_WRONG');
  if(!controls.glassStatus.includes('244, 214, 148'))
   throw Error('LIVE_FULFILLMENT_NOT_CHAMPAGNE');
  await page.locator('#detailBuyNow').click({timeout:6500});
  await page.locator('#checkoutDrawer.open').waitFor({state:'visible',timeout:7000});
  const checkout=await page.evaluate(()=>({
   modalClosed:!document.querySelector('#productOverlay').classList.contains('open'),
   form:!!document.querySelector('#checkoutForm [name="fullName"]'),
   quantity:Number(document.querySelector('#cartCount')?.textContent||0),
   checkoutVisible:!document.querySelector('#checkoutDrawer').hasAttribute('inert')
  }));
  if(!checkout.modalClosed||!checkout.form||!checkout.checkoutVisible||checkout.quantity<1)
   throw Error('LIVE_BUY_NOW_FAILED_TO_OPEN_CHECKOUT');
  liveProof.buyNow={blueOrangeGlass:true,aftercareAtBottom:true,checkoutOpened:true,orderWrites:0};
  const media=liveRows.flatMap(x=>Array.isArray(x.images)?x.images:[]).find(x=>/^\/media\/[a-z0-9-]+\.webp$/i.test(String(x)));
  if(media){
   const img=await liveContext.request.get(alias+media,{headers:auth,timeout:25000});
   liveProof.firstMedia={httpStatus:img.status(),contentType:img.headers()['content-type']||''};
   if(!img.ok()||!liveProof.firstMedia.contentType.includes('image/'))
    throw Error("APPROVED_MEDIA_MISSING_FROM_PREVIEW_R2");
  }else throw Error("NO_APPROVED_MEDIA_REFERENCE_FOUND");
  liveProof.pass=true;
 }catch(error){report.errors.push({label:'live-catalog-mobile',type:'real-data',message:String(error?.message||error).slice(0,340)})}
 finally{if(liveContext)await liveContext.close()}
 for(const spec of specs){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,isMobile:spec.mobile,hasTouch:spec.mobile,colorScheme:spec.theme,reducedMotion:'reduce'});
  await context.addInitScript(theme=>{
   try{localStorage.setItem('sd-theme-mode',theme)}catch{}
   const original=window.setTimeout.bind(window);
   window.setTimeout=(fn,delay,...args)=>
     typeof fn==='function'&&fn.name==='dismiss'&&delay>=200&&delay<=2500
     ?original(()=>{},60000):original(fn,delay,...args);
  },spec.theme);
  const page=await context.newPage();
  const result={label:spec.label,theme:spec.theme,viewport:{width:spec.width,height:spec.height},errors:[]};
  page.on('pageerror',e=>result.errors.push({type:'pageerror',message:e.message.slice(0,270)}));
  await page.route('**/*',async route=>{
   const request=route.request();let url;
   try{url=new URL(request.url())}catch{await route.abort('blockedbyclient');return}
   if(request.method()!=='GET'&&request.method()!=='HEAD'){
    report.errors.push({label:spec.label,type:'unexpected-nonread-request',method:request.method(),path:url.pathname});
    await route.abort('blockedbyclient');return;
   }
   if(url.origin===alias){
    if(url.pathname==='/api/products'){
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(synthetic)});return;
    }
    if(url.pathname==='/api/settings'){
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({welcomeEnabled:true})});return;
    }
    await route.continue({headers:{...request.headers(),...auth}});return;
   }
   if(isApprovedPreviewExternalRead(request.url(),request.method())){await route.continue();return}
   await route.abort('blockedbyclient');
  });
  try{
   const response=await page.goto(alias+'/',{waitUntil:'domcontentloaded',timeout:45000});
   if(response?.status()!==200)throw Error('Preview root HTTP '+response?.status()+' not 200');
   await page.locator('#welcomeSplash').waitFor({state:'visible',timeout:12000});
   await page.evaluate(()=>document.fonts.ready);
   result.welcome=await page.evaluate(()=>{
    const el=document.querySelector('#welcomeSplash'),cs=getComputedStyle(el.querySelector('.welcome-content')),r=el.getBoundingClientRect();
    return {noWhitePanel:cs.backgroundColor==='rgba(0, 0, 0, 0)'&&cs.boxShadow==='none'&&cs.borderTopWidth==='0px',
      noBlur:(cs.backdropFilter||'none')==='none'&&(cs.webkitBackdropFilter||'none')==='none',
      fillsViewport:Math.abs(r.width-innerWidth)<=2&&Math.abs(r.height-innerHeight)<=2,
      vietnameseHeadline:el.querySelector('.welcome-title')?.textContent.includes('Dấu ấn da cá sấu')||false};
   });
   await page.screenshot({path:path.join(destination,spec.label+'-welcome.png'),fullPage:false,animations:'disabled'});
   await page.locator('#skipIntro').click();
   await page.waitForFunction(()=>!document.querySelector('#welcomeSplash')&&!document.body.classList.contains('welcome-active'),null,{timeout:5000});
   await page.locator('#home.sd-code-hero').waitFor({state:'visible',timeout:5000});
   await page.evaluate(()=>document.fonts.ready);
   const measures=await page.evaluate(({width,theme})=>{
    const el=document.querySelector('#home.sd-code-hero'),r=el.getBoundingClientRect();
    const title=el.querySelector('h1'),css=getComputedStyle(el),spans=[...title.querySelectorAll('span')];
    const cards=[...document.querySelectorAll('#catalogGrid .product-card')];
    const checks={
     ownerHero:!!el&&spans.length===3,
     vietnameseTitle:spans.map(x=>x.textContent.trim()).join(' ')==='Phong cách Đẳng cấp từ da cá sấu',
     noRasterHero:el.querySelectorAll('img,picture,video,canvas').length===0&&!css.backgroundImage.includes('url('),
     compactHero:width<=760?r.height>=235&&r.height<=271:r.height>=392&&r.height<=423,
     noPageHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth+2,
     fittingHero:r.left>=0&&r.right<=innerWidth+1,
     correctTheme:document.documentElement.classList.contains('dark')===(theme==='dark'),
     vnFonts:document.fonts.check('16px "SD Serif"')&&document.fonts.check('16px "SD Sans"'),
     checkoutPresent:!!document.querySelector('#checkoutForm'),
     galleryPresent:!!document.querySelector('#sdFullscreenViewer'),
     catalogPresent:!!document.querySelector('#catalogGrid'),
     cartPresent:!!document.querySelector('#cartDrawer'),
     brandNavigationPresent:!!document.querySelector('.brand[href="#home"]')
    };
    return {checks,hero:{x:r.x,y:r.y,width:r.width,height:r.height},catalogCards:cards.length,fonts:getComputedStyle(title).fontFamily};
   },{width:spec.width,theme:spec.theme});
   result.hero=measures.hero;result.checks={...result.welcome,...measures.checks};
   result.catalogCards=measures.catalogCards;result.fonts=measures.fonts;
   result.pass=Object.values(result.checks).every(Boolean)&&result.errors.length===0;
   await page.locator('#home.sd-code-hero').screenshot({path:path.join(destination,spec.label+'-hero.png'),animations:'disabled'});
   await page.screenshot({path:path.join(destination,spec.label+'-viewport.png'),fullPage:false,animations:'disabled'});
   // Real click/tap contract: the storefront's in-memory, clearly synthetic
   // card must open its detail dialog and canonical product route. This only
   // reads the isolated Preview and writes no orders or Production state.
   const openCard=page.locator('#catalogGrid [data-open-product]').first();
   await openCard.waitFor({state:'visible',timeout:8000});
   await openCard.click({timeout:6500});
   await page.locator('#productOverlay.open').waitFor({state:'visible',timeout:4500});
   const detailProof=await page.evaluate(()=>({
     title:document.querySelector('#detailTitle')?.textContent?.trim(),
     path:location.pathname,
     expanded:document.querySelector('#productOverlay')?.getAttribute('aria-hidden')==='false',
     interactive:!document.querySelector('#productOverlay')?.hasAttribute('inert')
   }));
   const expectedSyntheticTitle=synthetic[0].title.replace(/\p{L}[\p{L}\p{M}\p{N}]*/gu,w=>w.charAt(0).toLocaleUpperCase('vi')+w.slice(1));
   result.checks.productDetailOpens=detailProof.title===expectedSyntheticTitle&&
     detailProof.path.startsWith('/sanpham/vida/')&&detailProof.expanded&&detailProof.interactive;
   result.detail=detailProof;
   if(!result.checks.productDetailOpens)throw Error('Synthetic product was not clickable: '+JSON.stringify(detailProof));
   await page.locator('#detailClose').click({timeout:4500});
   await page.waitForFunction(()=>!document.querySelector('#productOverlay')?.classList.contains('open'),null,{timeout:4500});
   result.checks.detailCloses=true;
   result.pass=Object.values(result.checks).every(Boolean)&&result.errors.length===0;
  }catch(err){result.pass=false;result.errors.push({type:'capture',message:String(err).slice(0,340)})}
  report.matrix.push(result);
  await context.close();
 }
}finally{await browser.close()}
report.visualTechnicalPass=report.matrix.length===specs.length&&report.matrix.every(v=>v.pass);
report.apiReadOnlyPass=report.livePublicCatalog?.httpStatus===200&&report.livePublicCatalog?.isArray===true;
report.pass=report.visualTechnicalPass&&report.apiReadOnlyPass&&report.realCatalog.pass&&report.errors.length===0;
await fs.writeFile(path.join(destination,'browser-audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({visualTechnicalPass:report.visualTechnicalPass,apiReadOnlyPass:report.apiReadOnlyPass,pass:report.pass,
 livePublicCatalog:report.livePublicCatalog,realCatalog:report.realCatalog,matrix:report.matrix.map(x=>({label:x.label,pass:x.pass,failed:Object.entries(x.checks||{}).filter(([,ok])=>!ok).map(([k])=>k),error:x.errors})),errors:report.errors},null,2));
if(!report.pass)process.exitCode=1;
