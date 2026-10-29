import {test, expect} from '@playwright/test';
import {readFileSync, mkdirSync, existsSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

test.use({serviceWorkers:'block'});

test('reference-comparable Admin products use labelled synthetic prices and genuine repository photos only',async({page})=>{
  test.setTimeout(95000);
  const root=process.cwd();
  const catalog=JSON.parse(readFileSync(join(root,'data/legacy-products.json'),'utf8'));
  const chosen=[
    {slug:'sneakers-new-sneaker-contrast',price:5500000,stock:12,sku:'QA-SN001'},
    {slug:'wallets-bach-tang-2-mat-may-vien-1250k',price:5800000,stock:8,sku:'QA-W001'},
    {slug:'belts-bach-tang-khoa-thuong-1300k',price:3200000,stock:15,sku:'QA-B001'},
    {slug:'sneakers-26-41-a',price:12500000,stock:5,sku:'QA-SN002'}
  ];
  const fixtureProducts=chosen.map(({slug,price,stock,sku})=>{
    const original=catalog.find(p=>p.slug===slug);
    if(!original||!original.images?.[0]||!existsSync(join(root,'public',original.images[0])))
      throw Error('Reference fixture requires a verified repository catalog image for '+slug);
    return {...original,id:'QA-VISUAL-'+slug,slug:'qa-visual-'+slug,sku,skuVerified:false,
      price,stock,published:true,fulfillmentType:'in_stock',fixtureOnly:true,
      description:'DỮ LIỆU GIẢ CHỈ DÙNG ĐỐI CHIẾU GIAO DIỆN'};
  });
  const expected={session:{authenticated:true,ok:true},
    products:{products:fixtureProducts,fixtureOnly:true},
    settings:{showPrices:true,watermarkEnabled:false,watermarkLogoUrl:'/watermark.webp',
      watermarkPosition:'bottom-right',watermarkSize:16,watermarkOpacity:68,welcomeEnabled:false,
      welcomeTitleLine1:'QA',welcomeTitleLine2:'QA',welcomeText:'Dữ liệu giao diện giả'},
    'payment-qr':{active:false,pending:false,activeImageUrl:'',pendingImageUrl:''},
    orders:{orders:[]},customers:{customers:[]},warranties:{claims:[],warranties:[]},
    'audit-logs':{logs:[]}};
  const attemptedWrites=[];
  const unexpectedRequests=[];
  await page.route('**/api/admin/**',async route=>{
    const request=route.request();const pathname=new URL(request.url()).pathname;
    if(request.method()!=='GET'){
      attemptedWrites.push({method:request.method(),pathname});
      return route.fulfill({status:405,contentType:'application/json',body:JSON.stringify({error:'read-only visual comparison'})});
    }
    const key=pathname.slice('/api/admin/'.length);
    if(!Object.hasOwn(expected,key)){
      unexpectedRequests.push(key);
      return route.fulfill({status:404,contentType:'application/json',body:'{"error":"missing QA fixture"}'});
    }
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(expected[key])});
  });
  await page.addInitScript(()=>{localStorage.setItem('sd-theme-mode','light')});
  const target=(process.env.LOCAL_ADMIN_URL||'http://127.0.0.1:4173/admin/').split('?')[0];
  const response=await page.goto(target+'?view=products',{waitUntil:'domcontentloaded',timeout:15000});
  expect(response?.status()).toBe(200);
  await expect(page.locator('#appView')).toBeVisible();
  await expect(page.locator('#main .pagehead h2')).toHaveText('Sản phẩm');
  await expect(page.locator('#main .product-table tbody tr')).toHaveCount(4);
  await expect(page.locator('#main .product-table img.thumb')).toHaveCount(4);
  await expect(page.locator('#main .product-table')).toContainText('5.500.000');
  const folder=join(root,'artifacts','admin-reference-same-data',String(process.env.GITHUB_SHA||'local').slice(0,12));
  mkdirSync(folder,{recursive:true});
  const captures=[];
  for(const viewport of [{width:390,height:844},{width:412,height:915},{width:1280,height:800}]){
    await page.setViewportSize(viewport);
    for(const theme of ['light','dark']){
      if((await page.locator('html').getAttribute('data-admin-theme'))!==theme)
        await page.locator('#adminThemeToggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-admin-theme',theme);
      await expect(page.locator('#main .product-table img.thumb')).toHaveCount(4);
      await expect.poll(()=>page.locator('#main .product-table img.thumb').evaluateAll(images=>
        images.every(img=>img.complete&&img.naturalWidth>0)),{timeout:15000}).toBe(true);
      const geometry=await page.evaluate(()=>({
        viewportWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
        cards:[...document.querySelectorAll('#main .product-table tbody tr')].map(el=>{
          const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}}),
        thumbs:[...document.querySelectorAll('#main .product-table img.thumb')].map(el=>({
          ready:el.complete&&el.naturalWidth>0,source:new URL(el.src).pathname}))
      }));
      expect(geometry.documentWidth,'No document overflow with populated reference photos').toBeLessThanOrEqual(viewport.width);
      expect(geometry.cards.every(c=>c.left>=0&&c.right<=viewport.width+1)).toBe(true);
      const name='04_real_catalog_photo_synthetic_values_'+viewport.width+'x'+viewport.height+'_'+theme+'.png';
      await page.screenshot({path:join(folder,name),animations:'disabled',fullPage:false});
      captures.push({file:name,theme,viewport,geometry});
    }
  }
  // Show that product-editor and gallery also render populated images without writes.
  await page.setViewportSize({width:390,height:844});
  if((await page.locator('html').getAttribute('data-admin-theme'))!=='light')
    await page.locator('#adminThemeToggle').click();
  await page.locator('#main .product-table tbody tr[data-product-row]').first().click();
  await expect(page.locator('#backdrop .editor')).toBeVisible();
  await expect(page.locator('#pTitle')).toHaveValue(fixtureProducts[0].title);
  await page.screenshot({path:join(folder,'04_product_editor_populated_390x844_light.png'),animations:'disabled'});
  await page.locator('#productTabGallery').click();
  await expect(page.locator('#productPanelGallery')).toBeVisible();
  await expect(page.locator('#imageGrid .imageitem')).toHaveCount(6);
  await expect(page.locator('#imageGrid .image-rail .imageitem')).toHaveCount(5);
  await expect.poll(()=>page.locator('#imageGrid img').evaluateAll(imgs=>
    imgs.length===6&&imgs.every(img=>img.complete&&img.naturalWidth>0)),{timeout:15000}).toBe(true);
  const featured=await page.locator('#imageGrid .image-cover-slot img').evaluate(el=>{
    const b=el.getBoundingClientRect();
    return {width:b.width,height:b.height,fit:getComputedStyle(el).objectFit};
  });
  expect(featured.fit,'Featured preview should fill the approved reference frame').toBe('cover');
  expect(featured.width).toBeGreaterThan(250);
  expect(featured.height).toBeGreaterThan(180);
  await page.screenshot({path:join(folder,'05_gallery_populated_390x844_light.png'),animations:'disabled'});
  await page.setViewportSize({width:1280,height:800});
  await expect(page.locator('#backdrop .editor')).toBeVisible();
  await page.screenshot({path:join(folder,'05_gallery_populated_1280x800_light.png'),animations:'disabled'});
  writeFileSync(join(folder,'manifest.json'),JSON.stringify({
    status:'LOCAL_SYNTHETIC_VISUAL_COMPARISON_NOT_APPROVED_REFERENCE_PARITY',
    sourceSha:process.env.GITHUB_SHA||'local',
    inputs:'Verified public/images/ product photos from repository legacy catalog; synthetic QA-only SKU/price/stock',
    realProductRecordsMutated:false,backendWrites:attemptedWrites,unexpectedRequests,
    screenshots:captures,photoCount:fixtureProducts.length},null,2)+'\n');
  expect(attemptedWrites).toEqual([]);
  expect(unexpectedRequests).toEqual([]);
  console.info('[REFERENCE_SAME_DATA_QA] PASS: four genuine source photos + explicit synthetic SKU/prices, 6 responsive/theme captures, editor/gallery, no API writes. NOT pixel parity acceptance.');
});
