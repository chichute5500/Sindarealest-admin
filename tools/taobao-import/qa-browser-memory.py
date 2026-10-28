#!/usr/bin/env python3
"""Offline Chromium importer regressions with in-memory IndexedDB simulation."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from playwright.sync_api import sync_playwright
import json

ROOT=Path(__file__).parent
HTML=(ROOT.parents[1]/'public/admin/taobao-import.html').read_text()
PRELUDE=r'''<script>
Object.defineProperty(window,'localStorage',{configurable:true,value:{
 data:new Map(),getItem(k){return this.data.get(k)||null},setItem(k,v){this.data.set(k,String(v))},removeItem(k){this.data.delete(k)}
}});
const __photosStore=new Map();
const __fakeDB={objectStoreNames:{contains:()=>false},createObjectStore:()=>{},transaction:()=>{
 const tx={oncomplete:null,onerror:null,onabort:null};
 tx.objectStore=()=>({
  put:v=>{queueMicrotask(()=>{__photosStore.set(v.key,v);tx.oncomplete?.()})},
  delete:k=>{queueMicrotask(()=>{__photosStore.delete(k);tx.oncomplete?.()})},
  clear:()=>{queueMicrotask(()=>{__photosStore.clear();tx.oncomplete?.()})},
  getAll:()=>{const r={};queueMicrotask(()=>{r.result=[...__photosStore.values()];r.onsuccess?.()});return r}
 });return tx;
}};
Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){const r={result:__fakeDB};queueMicrotask(()=>{r.onupgradeneeded?.();r.onsuccess?.()});return r}}});
</script>'''
INIT=r'''<script>
window.__calls=[];window.__saved=new Map();window.__auth=true;window.__loseOnce=false;window.__failUploadOnce=false;window.__errorPostOnce=false;window.__forcePublished=false;
window.fetch=async function(url,opts={}){
 const method=opts.method||'GET',data={ok:true};let status=200;
 if(url==='/api/admin/session'){
  if(!window.__auth){status=401;data.ok=false;data.error='Phiên đăng nhập hết hạn';}else data.authenticated=true;
 }else if(url==='/api/admin/login'){
  const body=JSON.parse(opts.body);window.__calls.push({url,method});if(body.password!=='secret'){data.ok=false;data.error='Wrong password';status=401;}else window.__auth=true;
 }else if(url==='/api/admin/upload'){
  const webp=opts.body.get('file'),orig=opts.body.get('original');
  window.__calls.push({url,method,webp:webp.type,size:webp.size,original:orig.type,originalSize:orig.size});
  if(window.__failUploadOnce){window.__failUploadOnce=false;data.ok=false;data.error='Image unavailable';status=503;}
  else data.url='/media/12345678-1234-4234-8234-'+String(window.__calls.filter(x=>x.url==='/api/admin/upload').length).padStart(12,'0')+'.webp';
 }else if(url.startsWith('/api/admin/import-draft?id=')){
  const id=new URL(url, 'https://sindarealest2.pages.dev').searchParams.get('id'),prior=window.__saved.get(id);
  window.__calls.push({url:'/api/admin/import-draft?query',method,id});data.exists=Boolean(prior);data.product=prior?.product||null;
 }else if(url==='/api/admin/import-draft'&&method==='POST'){
  const body=JSON.parse(opts.body);window.__calls.push({url,method,body});
  if(window.__errorPostOnce){window.__errorPostOnce=false;status=503;data.ok=false;data.error='Server unavailable';}
  else {
   let prev=window.__saved.get(body.importId);
   if(prev&&JSON.stringify(prev.body)!==JSON.stringify(body)){status=409;data.ok=false;data.error='Conflicting import';}
   else {const product=prev?.product||{id:body.importId,title:body.title,sku:'SD-GL001',published:window.__forcePublished};window.__saved.set(body.importId,{body,product});data.product=product;
     if(window.__loseOnce){window.__loseOnce=false;throw Error('Connection lost after commit');}
   }
  }
 }else{status=404;data.ok=false;data.error='Unknown route '+url;}
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
};window.confirm=()=>true;
</script>'''

def png(color):
 b=BytesIO();Image.new('RGB',(80,60),color).save(b,format='PNG');return b.getvalue()
def open_page(browser,auth=True,w=390,dark=False):
 ctx=browser.new_context(viewport={'width':w,'height':820},color_scheme='dark' if dark else 'light')
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 h=HTML.replace('</head>',PRELUDE+INIT.replace('window.__auth=true;',f'window.__auth={str(auth).lower()};',1)+'</head>',1)
 page.set_content(h,wait_until='load');page.wait_for_function('document.querySelector("#work").hidden===false || document.querySelector("#loginPanel").hidden===false')
 return ctx,page,errors

def images(page,names=['first.png']):
 page.locator('#picker').set_input_files([{'name':name,'mimeType':'image/png','buffer':png(['red','blue','green'][i%3])}for i,name in enumerate(names)])
 page.wait_for_function('(len)=>document.querySelectorAll(".photo").length===len',arg=len(names),timeout=6000)
def fields(page):page.locator('#title').fill('Giày lười');page.locator('#category').select_option('loafers');page.locator('#price').fill('15500000')
def wait_status(page,text):page.wait_for_function('(t)=>document.querySelector("#status").textContent.includes(t)',arg=text,timeout=10000)

def main():
 passed=[];failed=[]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  def test(name,fn):
   try:fn();passed.append(name);print('PASS',name,flush=True)
   except Exception as e:failed.append((name,str(e)));print('FAIL',name,repr(e),flush=True)
  def t1():
   ctx,page,errors=open_page(b);assert page.locator('#work').is_visible();assert page.locator('#category option').count()==16;assert not errors,errors;ctx.close()
  test('boot, session, 15 approved categories',t1)
  def t2():
   ctx,page,errors=open_page(b);images(page,['a.png','b.png']);fields(page);page.locator('#submit').click();wait_status(page,'Đã tạo bản nháp ẨN');calls=page.evaluate('window.__calls');
   assert len([x for x in calls if x['url']=='/api/admin/upload'])==2,calls
   post=[x for x in calls if x['url']=='/api/admin/import-draft' and x['method']=='POST'];assert len(post)==1 and post[0]['body']['published'] is False and len(post[0]['body']['images'])==2
   assert page.locator('#submit').is_disabled();assert not errors,errors;ctx.close()
  test('2 images -> WebP+upload -> 1 hidden draft',t2)
  def t3():
   ctx,page,errors=open_page(b);images(page,['a.png','b.png']);fields(page)
   page.evaluate('for(const x of items)URL.revokeObjectURL(x.preview);items.length=0; restore()')
   page.wait_for_function('document.querySelectorAll(".photo").length===2')
   assert page.locator('#title').input_value()=='Giày lười';assert page.locator('#category').input_value()=='loafers'
   page.locator('#submit').click();wait_status(page,'Đã tạo bản nháp ẨN');assert not errors,errors;ctx.close()
  test('IndexedDB + local state restores files and form',t3)
  def t4():
   ctx,page,errors=open_page(b);images(page);fields(page);page.evaluate('window.__loseOnce=true');page.locator('#submit').click();wait_status(page,'Đã tạo bản nháp ẨN');calls=page.evaluate('window.__calls')
   assert len([x for x in calls if x['url']=='/api/admin/import-draft' and x['method']=='POST'])==1
   assert len([x for x in calls if x['url']=='/api/admin/import-draft?query'])>=1
   assert page.evaluate('window.__saved.size')==1;assert not errors,errors;ctx.close()
  test('commit response loss resolved without 2nd POST',t4)
  def t5():
   ctx,page,errors=open_page(b);images(page);fields(page);page.evaluate('window.__errorPostOnce=true');page.locator('#submit').click();wait_status(page,'Chưa hoàn tất')
   assert page.locator('#title').is_disabled()
   page.locator('#submit').click();wait_status(page,'Đã tạo bản nháp ẨN')
   assert len([x for x in page.evaluate('window.__calls') if x['url']=='/api/admin/import-draft' and x['method']=='POST'])==2
   assert page.evaluate('window.__saved.size')==1;assert not errors,errors;ctx.close()
  test('retry after failure before commit uses same import ID',t5)
  def t6():
   ctx,page,errors=open_page(b);images(page);fields(page);page.evaluate('window.__failUploadOnce=true');page.locator('#submit').click();wait_status(page,'Chưa hoàn tất');page.locator('#submit').click();wait_status(page,'Đã tạo bản nháp ẨN')
   assert len([x for x in page.evaluate('window.__calls') if x['url']=='/api/admin/upload'])==2;assert not errors,errors;ctx.close()
  test('retry upload on server error',t6)
  def t7():
   ctx,page,errors=open_page(b);images(page,['first.png','second.png']);page.locator('.photo').nth(1).get_by_role('button',name='up second.png').click()
   assert page.locator('.photo .bar span').first.inner_text().startswith('★ second.png')
   page.evaluate('for(const x of items)URL.revokeObjectURL(x.preview);items.length=0; restore()')
   page.wait_for_function('document.querySelectorAll(".photo").length===2')
   assert page.locator('.photo .bar span').first.inner_text().startswith('★ second.png')
   page.locator('.photo').nth(1).get_by_role('button',name='remove first.png').click();page.wait_for_function('document.querySelectorAll(".photo").length===1')
   assert not errors,errors;ctx.close()
  test('persisted photo order and remove',t7)
  def t8():
   ctx,page,errors=open_page(b);page.locator('#picker').set_input_files({'name':'bad.gif','mimeType':'image/gif','buffer':b'GIF89a'})
   assert page.locator('.photo').count()==0
   assert page.evaluate('allowedSource("https://www.taobao.com/foo")') and not page.evaluate('allowedSource("https://taobao.com.fake.io")')
   assert not errors,errors;ctx.close()
  test('unsafe image type and fake domain rejected',t8)
  def t9():
   ctx,page,errors=open_page(b,auth=False);assert page.locator('#loginPanel').is_visible();page.locator('#adminPassword').fill('secret');page.locator('#loginForm button').click();page.wait_for_function('document.querySelector("#work").hidden===false');assert page.locator('#adminPassword').input_value()=='';assert not errors,errors;ctx.close()
  test('secure Admin login field clears',t9)
  def t10():
   for w in [320,360,390,430]:
    ctx,page,errors=open_page(b,w=w,dark=True);assert page.evaluate('getComputedStyle(document.documentElement).colorScheme')=='dark';assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1');assert not errors,errors;ctx.close()
  test('dark mobile widths 320–430',t10)
  def t11():
   ctx,page,errors=open_page(b);images(page);fields(page);page.evaluate('window.__forcePublished=true');page.locator('#submit').click();wait_status(page,'Chưa hoàn tất');page.locator('#submit').click();wait_status(page,'Chưa hoàn tất');assert page.evaluate('window.__saved.size')==1
   assert len([x for x in page.evaluate('window.__calls') if x['url']=='/api/admin/import-draft' and x['method']=='POST'])==1;assert not errors,errors;ctx.close()
  test('public response blocked without duplicate creation',t11)
  b.close()
 report={'passed':passed,'failed':failed,'total':len(passed)+len(failed)}
 (ROOT/'QA-browser-results-v2.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
 print('RESULT',len(passed),'passed /',len(failed),'failed')
 return 0 if not failed else 1
if __name__=='__main__':raise SystemExit(main())
