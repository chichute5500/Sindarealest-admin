// Actual local Chromium QA for native layered Hero, NO DEPLOY and no backend writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('public'),out=resolve('artifacts/hero-v10-native-browser-qa');
await mkdir(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const srv=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://127.0.0.1:4175');
  const file=resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
  if(!file.startsWith(root+sep))throw Error('Bad path');
  const raw=await readFile(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(raw);
 }catch{res.writeHead(404,{'content-type':'application/json'});res.end('{}');}
});
await new Promise(done=>srv.listen(4175,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const sizes=[['mobile-320',320,640],['mobile-360',360,800],['mobile-390',390,844],['tablet-768',768,1024],['pc-980',980,700],['pc-1280',1280,800],['pc-1440',1440,900]];
const report=[];
try{
 for(const [name,width,height] of sizes)for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height},colorScheme:theme,deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const resp=await page.goto('http://127.0.0.1:4175/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(resp.status(),200,'Homepage response');
  await page.waitForFunction(()=>{
   const i=document.querySelector('#heroProductImage');
   return i&&!i.hidden&&i.complete&&i.naturalWidth===1200;
  },null,{timeout:12000});
  const skip=page.locator('#skipIntro');if(await skip.count())await skip.evaluate(el=>el.click()).catch(()=>{});
  await page.waitForFunction(()=>!document.body.classList.contains('welcome-active'),null,{timeout:6000});
  await page.waitForTimeout(80);
  const data=await page.evaluate(()=>{
   const h=document.querySelector('#home'),s=h.querySelector('h1'),sp=[...s.querySelectorAll('span')],copy=h.querySelector('.hero-description'),a=h.querySelector('.hero-actions a'),i=h.querySelector('#heroProductImage'),p=h.querySelector('.hero-pedestal-art');
   const r=el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
   const css=el=>getComputedStyle(el);
   return {hero:r(h),title:r(s),titleText:s.innerText,spans:sp.map(x=>({text:x.innerText,rect:r(x),color:css(x).color,display:css(x).display})),desc:r(copy),descText:copy.innerText,
    btn:r(a),btnText:a.innerText,btnColor:css(a).color,btnFont:parseFloat(css(a).fontSize),btnBg:css(a).backgroundImage+' '+css(a).backgroundColor,
    href:a.getAttribute('href'),shoe:r(i),shoeSrc:i.currentSrc,shoeNatural:[i.naturalWidth,i.naturalHeight],
    pedestalBg:css(p).backgroundImage,pedestal:r(p),pedestalOpacity:css(p).opacity,
    background:css(h).backgroundImage,overflowWidth:document.documentElement.scrollWidth-innerWidth};
  });
  await page.locator('#home').screenshot({path:out+'/'+name+'-'+theme+'.png',animations:'disabled'});
  console.log('[HERO_LAYOUT_EVIDENCE] '+name+' / '+theme+' '+JSON.stringify({title:data.title,spans:data.spans,description:data.desc,button:data.btn,shoe:data.shoe,pedestal:data.pedestal}));
  assert.ok(data.title.width>90&&data.title.height>50&&data.spans.length===3,name+' actual visible heading');
  assert.ok(data.spans.every(x=>x.rect.width>35&&x.rect.height>12&&x.display!=='none'),name+' visible headline lines');
  assert.ok(data.spans.every(x=>x.rect.left>=data.hero.left-3&&x.rect.right<=data.hero.right+3),name+' headline must fit');
  assert.ok(data.spans[1].color!==data.spans[0].color,name+' highlighted middle heading color');
  assert.ok(data.desc.width>80&&data.desc.height>10,name+' actual subheading visible');
  assert.ok(data.btnFont>=9&&data.btn.height>=30&&data.btn.width>=75&&data.btnText.includes('Khám phá ngay'),name+' real styled CTA');
  assert.ok(data.btnBg!=='none rgba(0, 0, 0, 0)',name+' styled CTA background');
  assert.equal(data.href,'#products');
  assert.ok(data.btn.left>=data.hero.left-3&&data.btn.right<=data.hero.right+3,name+' CTA inside hero');
  assert.ok(data.shoeSrc.includes('tb_image_share_1792519964514'),name+' distinct transparent product PNG');
  assert.deepEqual(data.shoeNatural,[1200,1600]);
  assert.ok(data.pedestalBg.includes('marble-shelf-v14.svg'),name+' independent marble pedestal');
  assert.ok(!data.background.includes('hero-reference-'),name+' must not use full banner as background');
  assert.ok(data.overflowWidth<12,name+' no page horizontal overflow');
  const png=out+'/'+name+'-'+theme+'.png';
  await page.locator('#home').screenshot({path:png,animations:'disabled'});
  await page.locator('#home .hero-actions .pill-btn').focus();
  assert.ok(await page.evaluate(()=>document.activeElement?.matches('#home .hero-actions .pill-btn')),name+' CTA takes keyboard focus');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>location.hash==='#products',null,{timeout:3000});
  report.push({name,theme,...data,pass:true,screenshot:png});
  console.log('PASS native HERO '+name+' / '+theme+': '+JSON.stringify({headline:data.titleText,red:data.spans[1].color,cta:data.btnText,shoe:data.shoeNatural,stage:data.pedestalBg,hero:data.hero}));
  await context.close();
 }
 await writeFile(out+'/report.json',JSON.stringify({pass:true,report},null,2)+'\n');
}finally{await browser.close();await new Promise(done=>srv.close(done));}
