const enc = new TextEncoder();
function b64urlBytes(value) { const s=String(value).replace(/-/g,"+").replace(/_/g,"/"); const b=atob(s+"=".repeat((4-s.length%4)%4)); return Uint8Array.from(b,c=>c.charCodeAt(0)); }
function b64url(value) { let s=""; for(const b of value)s+=String.fromCharCode(b); return btoa(s).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_"); }
async function hkdf(ikm,salt,info,length) { const key=await crypto.subtle.importKey("raw",ikm,"HKDF",false,["deriveBits"]); return new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt,info:typeof info==="string"?enc.encode(info):info},key,length*8)); }
async function vapidToken(endpoint,env) {
  const url=new URL(endpoint), publicKey=b64urlBytes(env.VAPID_PUBLIC_KEY), d=b64urlBytes(env.VAPID_PRIVATE_KEY);
  if(publicKey.length!==65||d.length!==32)throw Error("VAPID key length");
  const jwk={kty:"EC",crv:"P-256",x:b64url(publicKey.slice(1,33)),y:b64url(publicKey.slice(33)),d:b64url(d),ext:true};
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
  const head=b64url(enc.encode(JSON.stringify({typ:"JWT",alg:"ES256"})));
  const payload=b64url(enc.encode(JSON.stringify({aud:url.origin,exp:Math.floor(Date.now()/1000)+12*60*60,sub:env.VAPID_SUBJECT||"mailto:dacasau.sindarealest@gmail.com"})));
  const unsigned=head+"."+payload;
  const signature=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,enc.encode(unsigned)));
  return unsigned+"."+b64url(signature);
}
async function encryptPayload(subscription,payload) {
  const uaPublic=b64urlBytes(subscription.keys.p256dh), authSecret=b64urlBytes(subscription.keys.auth);
  if(uaPublic.length!==65||authSecret.length<16)throw Error("Invalid subscription keys");
  const uaKey=await crypto.subtle.importKey("raw",uaPublic,{name:"ECDH",namedCurve:"P-256"},false,[]);
  const serverPair=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]);
  const serverPublic=new Uint8Array(await crypto.subtle.exportKey("raw",serverPair.publicKey));
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:uaKey},serverPair.privateKey,256));
  const prefix=enc.encode("WebPush: info\0"), info=new Uint8Array(prefix.length+uaPublic.length+serverPublic.length);
  info.set(prefix,0); info.set(uaPublic,prefix.length); info.set(serverPublic,prefix.length+uaPublic.length);
  const ikm=await hkdf(shared,authSecret,info,32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await hkdf(ikm,salt,"Content-Encoding: aes128gcm\0",16);
  const nonce=await hkdf(ikm,salt,"Content-Encoding: nonce\0",12);
  const aes=await crypto.subtle.importKey("raw",cek,{name:"AES-GCM"},false,["encrypt"]);
  const encoded=enc.encode(JSON.stringify(payload)), plain=new Uint8Array(encoded.length+1); plain.set(encoded); plain[plain.length-1]=2;
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce,tagLength:128},aes,plain));
  const out=new Uint8Array(16+4+1+serverPublic.length+cipher.length);
  out.set(salt,0); out.set([0,0,16,0],16); out[20]=serverPublic.length; out.set(serverPublic,21); out.set(cipher,21+serverPublic.length);
  return out;
}
async function sendOne(endpoint,keys,payload,env) {
  const body=await encryptPayload({keys},payload), token=await vapidToken(endpoint,env);
  return fetch(endpoint,{method:"POST",signal:AbortSignal.timeout(3000),headers:{"Authorization":"vapid t="+token+", k="+env.VAPID_PUBLIC_KEY,"Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream","TTL":"60","Urgency":"high"},body});
}
export async function sendAdminPush(env,payload) {
  if(!env?.DB||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return;
  let result;try{result=await env.DB.prepare("SELECT endpoint,keys_json FROM admin_push_subscriptions").all()}catch{return}
  await Promise.allSettled((result.results||[]).map(async row=>{
    try {
      const response=await sendOne(row.endpoint,JSON.parse(row.keys_json||"{}"),payload,env);
      if(response.status===404||response.status===410)await env.DB.prepare("DELETE FROM admin_push_subscriptions WHERE endpoint=?").bind(row.endpoint).run();
    } catch {}
  }));
}
