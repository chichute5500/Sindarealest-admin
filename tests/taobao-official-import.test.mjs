import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSession} from '../functions/_lib.js';
import {md5,topParams,topSignature,itemIdFromLink,extractTaobaoLink,resolveItemId,allowedImageUrl,readTopImages,imageTicket,verifyImageTicket}
  from '../functions/_taobao-official.js';
import {onRequestPost as getPhotos} from '../functions/api/admin/taobao-photos.js';
import {onRequestGet as getImage} from '../functions/api/admin/taobao-photo.js';
const h=(input)=>createHash('md5').update(input).digest('hex').toUpperCase();
for(const test of ['', 'abc', 'SinDarealest', 'Sản phẩm da cá sấu', '🚀', '123'.repeat(50)])assert.equal(md5(test),h(test));
assert.equal(itemIdFromLink('https://item.taobao.com/item.htm?id=123456789&from=share'),'123456789');
const realShare='【淘宝】大促价保 https://e.tb.cn/h.j5Ma8gaXVlwPWsu?tk=DIRtTyxDQpc CZ193 「黑色全真鳄鱼皮鞋2025新款休闲板鞋男系带低帮鞋舒适时尚真皮男鞋」 点击链接直接打开 或者 淘宝搜索直接打开';
const realShort='https://e.tb.cn/h.j5Ma8gaXVlwPWsu?tk=DIRtTyxDQpc';
assert.equal(extractTaobaoLink(realShare),realShort,'Owner provided real Taobao share format');
assert.equal(itemIdFromLink(realShare),null,'Short-link does not contain an item id without resolving');
let shortRequests=0;
const resolveStub=async(url,options)=>{
  shortRequests++;
  assert.equal(options.redirect,'manual');
  assert.equal(url,realShort);
  return new Response(null,{status:302,headers:{Location:'https://item.taobao.com/item.htm?id=123456789'}});
};
assert.deepEqual(await resolveItemId(realShare,resolveStub),
 {itemId:'123456789',canonicalUrl:'https://item.taobao.com/item.htm?id=123456789'});
assert.equal(shortRequests,1);
const unsafe=await resolveItemId(realShort,async()=>new Response(null,{status:302,
 headers:{Location:'http://127.0.0.1/admin'}}));
assert.equal(unsafe.error,'TAOBAO_UNSAFE_REDIRECT');
const unresolved=await resolveItemId(realShort,async()=>new Response('JavaScript required',{status:200}));
assert.equal(unresolved.error,'TAOBAO_SHORT_LINK_UNRESOLVED');

assert.equal(itemIdFromLink('https://detail.tmall.com/item.htm?num_iid=123456789'),'123456789');
for(const evil of ['http://item.taobao.com/item.htm?id=123456789',
 'https://taobao.com.evil.invalid/item.htm?id=123456789',
 'https://admin:secret@item.taobao.com/item.htm?id=123456789',
 'https://m.tb.cn/h.NOVALIDID','http://127.0.0.1/?id=123456789'])
  assert.equal(itemIdFromLink(evil),null,evil);
assert.ok(allowedImageUrl('//img.alicdn.com/imgextra/x.jpg'));
assert.equal(allowedImageUrl('https://img.alicdn.com.evil.invalid/a.jpg'),null);
assert.equal(allowedImageUrl('https://127.0.0.1/a.jpg'),null);
assert.equal(allowedImageUrl('http://img.alicdn.com/a.jpg'),null);
const env={TAOBAO_APP_KEY:'qa-app-key',TAOBAO_APP_SECRET:'qa-secret',SESSION_SECRET:'qa-session-secret-64-bytes-abcdefghijklmnopqrstuvwxyz0123456789',TAOBAO_ITEM_API_METHOD:'taobao.item.detail.get'};
const params=topParams('123456789',env,new Date('2026-10-28T05:00:00Z'));
assert.equal(params.timestamp,'2026-10-28 13:00:00');
assert.equal(params.method,'taobao.item.detail.get');
const {sign,...unsigned}=params;
assert.equal(sign,topSignature(unsigned,env.TAOBAO_APP_SECRET));
assert.equal(sign,h(env.TAOBAO_APP_SECRET+Object.keys(unsigned).sort().map(k=>k+unsigned[k]).join('')+env.TAOBAO_APP_SECRET));
const fixture={item_detail_get_response:{data:JSON.stringify({item:{
  title:'Example item',pic_url:'//img.alicdn.com/imgextra/one.jpg',images:[
  '//img.alicdn.com/imgextra/one.jpg','https://img.alicdn.com/imgextra/two.png',
  'http://img.alicdn.com/non-https.jpg','https://evil.example/exploit.jpg'
]}})}};
assert.equal(readTopImages(fixture).images.length,2);
assert.deepEqual(readTopImages({error_response:{code:27}}),{error:'TAOBAO_API_REJECTED'});
const cookie='sd_admin_session='+await createSession(env.SESSION_SECRET);
const auth={'Cookie':cookie,'Origin':'https://qa.invalid','Sec-Fetch-Site':'same-origin'};
const request=(path,method='GET',body,authorized=true)=>new Request('https://qa.invalid'+path,{
 method,headers:{...(authorized?auth:{'Origin':'https://qa.invalid'}),...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})
});
let remoteCount=0;
const originalFetch=globalThis.fetch;
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGOclmLDQEvARFPTRy0YtWDUglELRi0YtWDUAioCAD2+AXadpnZ5AAAAAElFTkSuQmCC','base64'));
try{
  globalThis.fetch=async (url,opts)=>{
    remoteCount++;
    if(url==='https://eco.taobao.com/router/rest'){
      assert.equal(opts.method,'POST'); assert.equal(opts.redirect,'error');
      const param=new URLSearchParams(opts.body);
      assert.equal(param.get('item_id'),'123456789');
      assert.equal(param.get('method'),'taobao.item.detail.get');
      return new Response(JSON.stringify(fixture),{status:200,headers:{'Content-Type':'application/json'}});
    }
    if(url==='https://img.alicdn.com/imgextra/one.jpg'||url==='https://img.alicdn.com/imgextra/two.png'){
      assert.equal(opts.redirect,'error');
      return new Response(png,{status:200,headers:{'Content-Type':'image/png','Content-Length':String(png.byteLength)}});
    }
    throw Error('UNAPPROVED_HOST '+url);
  };
  const body={link:'https://item.taobao.com/item.htm?id=123456789',permissionConfirmed:true};
  let r=await getPhotos({request:request('/api/admin/taobao-photos','POST',body,false),env});assert.equal(r.status,401);
  r=await getPhotos({request:request('/api/admin/taobao-photos','POST',{...body,permissionConfirmed:false}),env});assert.equal(r.status,400);
  r=await getPhotos({request:request('/api/admin/taobao-photos','POST',body),env:{SESSION_SECRET:env.SESSION_SECRET}});assert.equal(r.status,503);
  r=await getPhotos({request:request('/api/admin/taobao-photos','POST',body),env});assert.equal(r.status,200);
  const data=await r.json();assert.equal(data.images.length,2);assert.equal(data.itemId,'123456789');
  assert.equal(remoteCount,1,'Only one official API request, no HTML scraping');
  const ticket=data.images[0].ticket;
  assert.equal(await verifyImageTicket(ticket,env.SESSION_SECRET,Date.now()+11*60*1000),null);
  assert.equal(await verifyImageTicket(ticket.slice(0,-2)+'ab',env.SESSION_SECRET),null);
  assert.equal(await verifyImageTicket(await imageTicket('http://evil.invalid/payload.jpg',env.SESSION_SECRET),env.SESSION_SECRET),null);
  const query='/api/admin/taobao-photo?ticket='+encodeURIComponent(ticket);
  let photo=await getImage({request:request(query,'GET',undefined,false),env});assert.equal(photo.status,401);
  photo=await getImage({request:request(query),env});assert.equal(photo.status,200);
  assert.equal(photo.headers.get('Content-Type'),'image/png');
  assert.equal(Buffer.from(await photo.arrayBuffer()).equals(Buffer.from(png)),true);
  photo=await getImage({request:request('/api/admin/taobao-photo?ticket=forged'),env});assert.equal(photo.status,403);
  assert.equal(remoteCount,2,'Only authorized fixed API and signed image CDN requests');
  console.log('PASS: official API authentication and no-scrape integration, MD5 signatures, valid link, CDN scope, signed image TTL, image bytes, permission gate, Admin auth.');
} finally {globalThis.fetch=originalFetch;}
