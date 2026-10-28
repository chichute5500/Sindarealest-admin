/**
 * Taobao TOP official item adapter.
 * This uses only registered Open Platform credentials and granted API scopes.
 * It deliberately does NOT use Taobao cookies, browser DOM, unofficial scrapers
 * or attempt to bypass authentication/captcha.
 */
const HOSTS = ['taobao.com', 'tmall.com', 'tb.cn'];
export const allowedTaobaoHost = host => typeof host === 'string' &&
  HOSTS.some(d => host.toLowerCase() === d || host.toLowerCase().endsWith('.' + d));

export function itemIdFromLink(link) {
  if (typeof link !== 'string' || link.length > 2200) return null;
  try {
    const url = new URL(link.trim());
    if (url.protocol !== 'https:' || !allowedTaobaoHost(url.hostname) || url.username || url.password) return null;
    const id = url.searchParams.get('id') || url.searchParams.get('item_id') || url.searchParams.get('num_iid');
    return id && /^\d{6,20}$/.test(id) ? id : null;
  } catch { return null; }
}
export function allowedImageUrl(input) {
  if (typeof input !== 'string' || input.length > 1500) return null;
  try {
    const url = new URL(input.startsWith('//') ? 'https:' + input : input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!(url.hostname === 'alicdn.com' || url.hostname.endsWith('.alicdn.com') ||
          url.hostname === 'taobaocdn.com' || url.hostname.endsWith('.taobaocdn.com'))) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}
// Pure JS RFC 1321 MD5 for TOP's documented sign_method=md5.
// Not used for password hashing, tokens or other security-sensitive decisions.
export function md5(input) {
  const data = new TextEncoder().encode(input);
  const len = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(len); padded.set(data); padded[data.length] = 128;
  const bits = BigInt(data.length) * 8n;
  for (let j=0; j<8; j++) padded[len-8+j] = Number((bits >> BigInt(j*8)) & 255n);
  const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
    5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
    6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const k = Array.from({length:64},(_,i)=>Math.floor(Math.abs(Math.sin(i+1)) * 4294967296) >>> 0);
  let h0=0x67452301,h1=0xefcdab89,h2=0x98badcfe,h3=0x10325476;
  for(let off=0;off<len;off+=64) {
    const word=Array.from({length:16},(_,j)=>{
      const i=off+4*j;
      return (padded[i] | (padded[i+1]<<8) | (padded[i+2]<<16) | (padded[i+3]<<24)) >>> 0;
    });
    let a=h0,b=h1,c=h2,d=h3;
    for(let i=0;i<64;i++){
      let f,g;
      if(i<16){f=(b&c)|(~b&d);g=i;}
      else if(i<32){f=(d&b)|(~d&c);g=(5*i+1)%16;}
      else if(i<48){f=b^c^d;g=(3*i+5)%16;}
      else{f=c^(b|~d);g=(7*i)%16;}
      const sum=(a+f+k[i]+word[g])>>>0;
      const next=(b+((sum<<s[i])|(sum>>>(32-s[i]))))>>>0;
      a=d;d=c;c=b;b=next;
    }
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;
  }
  return [h0,h1,h2,h3].map(n=>[0,8,16,24].map(v=>((n>>>v)&255).toString(16).padStart(2,'0')).join('')).join('').toUpperCase();
}
export function topSignature(params, secret) {
  const joined = Object.keys(params).sort().map(k=>k+params[k]).join('');
  return md5(secret+joined+secret);
}
export function topParams(itemId, env, date = new Date()) {
  const timestamp = new Date(date.getTime()+8*3600000).toISOString().slice(0,19).replace('T',' ');
  const method = env.TAOBAO_ITEM_API_METHOD === 'taobao.item.get' ? 'taobao.item.get' : 'taobao.item.detail.get';
  const p={method,app_key:env.TAOBAO_APP_KEY,sign_method:'md5',timestamp,format:'json',v:'2.0'};
  if(method === 'taobao.item.get') {
    p.num_iid=itemId;p.fields='num_iid,title,pic_url,item_imgs';
    if(env.TAOBAO_ACCESS_TOKEN)p.session=env.TAOBAO_ACCESS_TOKEN;
  } else {
    p.item_id=itemId;p.fields='item,skuBase';
  }
  return {...p,sign:topSignature(p,env.TAOBAO_APP_SECRET)};
}
function collectImages(data) {
  const result=[];
  const append = url => {
    const checked = allowedImageUrl(url);
    if(checked && !result.includes(checked))result.push(checked);
  };
  // Only traverse documented item image collections, never scan arbitrary HTML or JSON.
  const item = data?.item || data?.data?.item || data?.item_get_response?.item || data?.item_detail_get_response?.data?.item || data;
  if(item && typeof item === 'object'){
    append(item.pic_url);
    for(const field of ['images','item_imgs','itemImages']) {
      const val = item[field]?.item_img || item[field];
      if(Array.isArray(val))val.slice(0,40).forEach(x=>append(typeof x==='string'?x:x?.url || x?.img_url));
    }
    const sku = item.skuBase?.skus || data?.skuBase?.skus;
    if(Array.isArray(sku))sku.slice(0,40).forEach(x=>append(x?.image || x?.pic_url));
  }
  return {title:typeof item?.title==='string'?item.title.slice(0,180):'',images:result.slice(0,30)};
}
export function readTopImages(raw) {
  if(raw?.error_response) return {error:'TAOBAO_API_REJECTED'};
  let body=raw?.item_detail_get_response?.data ?? raw?.item_get_response?.item ?? raw?.data;
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{return {error:'TAOBAO_API_INVALID'}}}
  if(!body||typeof body!=='object')return {error:'TAOBAO_API_EMPTY'};
  const result=collectImages(body);
  return result.images.length ? result : {error:'TAOBAO_IMAGES_UNAVAILABLE'};
}
const urlSafe = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decodeSafe = text => Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4)),c=>c.charCodeAt(0));
const keyData = str => new TextEncoder().encode(str);
async function hmac(payload,secret) {
  const key=await crypto.subtle.importKey('raw',keyData(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  return urlSafe(new Uint8Array(await crypto.subtle.sign('HMAC',key,keyData(payload))));
}
export async function imageTicket(url,secret,now=Date.now()){
  const payload=urlSafe(keyData(JSON.stringify({url,expires:now+10*60*1000})));
  return payload+'.'+await hmac(payload,secret);
}
export async function verifyImageTicket(ticket,secret,now=Date.now()){
  if(typeof ticket!=='string'||ticket.length>3000||!ticket.includes('.'))return null;
  const [part,sign,...extra]=ticket.split('.');
  if(extra.length||!part||!sign)return null;
  const key=await crypto.subtle.importKey('raw',keyData(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  try {
    const correct=await crypto.subtle.verify('HMAC',key,decodeSafe(sign),keyData(part));
    if(!correct)return null;
    const payload=JSON.parse(new TextDecoder().decode(decodeSafe(part)));
    if(typeof payload.expires!=='number'||payload.expires<now||payload.expires>now+600001)return null;
    return allowedImageUrl(payload.url);
  }catch{return null;}
}
