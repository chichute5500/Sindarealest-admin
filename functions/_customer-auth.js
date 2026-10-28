// Isolated customer authentication. Never accept or set sd_admin_session.
const enc = new TextEncoder();
export const ZALO_APP_ID = "3933116436838564742";
export const ORIGIN = "https://sindarealest2.pages.dev";
export const PREVIEW_ORIGIN = "https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev";
export const CUSTOMER_COOKIE = "sd_customer_login";
const FLOW_COOKIE = "sd_customer_oauth";
const sessionSeconds = 7 * 86400;
const flowSeconds = 600;
// Only the storefront and the exact Cloudflare Pages branch PREVIEW alias can participate in auth.
// Do not derive redirect URLs from untrusted request Host/X-Forwarded-Host headers.
export function customerOrigin(request) {
  try {
    const origin=new URL(request.url).origin;
    return origin===ORIGIN || origin===PREVIEW_ORIGIN ? origin : null;
  }catch{return null;}
}
export const callback = (provider,origin=ORIGIN) => origin + "/api/customer/auth/" + provider + "/callback";
export const emailTestAllowed = request => customerOrigin(request)===PREVIEW_ORIGIN;
export const configured = (env, provider) => Boolean(env?.DB && (provider === "zalo" ?
  typeof env.ZALO_APP_SECRET === "string" && env.ZALO_APP_SECRET.length >= 8 :
  provider === "google" ?
    typeof env.GOOGLE_CLIENT_ID === "string" && env.GOOGLE_CLIENT_ID.includes(".apps.googleusercontent.com") &&
    typeof env.GOOGLE_CLIENT_SECRET === "string" && env.GOOGLE_CLIENT_SECRET.length >= 8 : true));
export const now = () => Math.floor(Date.now()/1000);
export function randomToken(length=32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
export function randomPkceVerifier() {
  // Zalo OAuth V4 documents a 43-character verifier containing uppercase,
  // lowercase and digits. Use 256 bits of browser/worker CSPRNG entropy.
  for (;;) {
    const bytes=new Uint8Array(32);
    crypto.getRandomValues(bytes);
    let raw="";
    for(const byte of bytes)raw+=String.fromCharCode(byte);
    const value=btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    if(value.length===43 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value)) return value;
  }
}
export async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))),
    b=>b.toString(16).padStart(2,"0")).join("");
}
export function cookies(request,name) {
  const cookie=request.headers.get("Cookie")||"";
  for (const item of cookie.split(";")) {
    const eq=item.indexOf("=");
    if(eq>0&&item.slice(0,eq).trim()===name)return item.slice(eq+1).trim();
  }
  return "";
}
export const cookie=(name,value,age,path="/api/customer")=>
  name+"="+value+"; Path="+path+"; Max-Age="+age+"; Secure; HttpOnly; SameSite=Lax";
export const sessionCookie = token => cookie(CUSTOMER_COOKIE,token,sessionSeconds);
export const clearSession = () => cookie(CUSTOMER_COOKIE,"",0);
export const flowCookie = value => cookie(FLOW_COOKIE,value,flowSeconds,"/api/customer/auth");
export const clearFlow = () => cookie(FLOW_COOKIE,"",0,"/api/customer/auth");
export const headers = (extra={}) => ({
  "Cache-Control":"no-store, private", "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"no-referrer", "X-Robots-Tag":"noindex, nofollow",...extra
});
export function json(data,status=200,extra={},setCookies=[]) {
  const h=new Headers(headers({"Content-Type":"application/json; charset=utf-8",...extra}));
  for(const c of setCookies)h.append("Set-Cookie",c);
  return new Response(JSON.stringify(data),{status,headers:h});
}
export const error=(message,status=400)=>json({ok:false,error:message},status);
export function redirect(url,setCookies=[]) {
  const h=new Headers(headers({Location:url}));
  for(const c of setCookies)h.append("Set-Cookie",c);
  return new Response(null,{status:302,headers:h});
}
export const sameOrigin = request => {
  const origin=customerOrigin(request);
  return Boolean(origin && request.headers.get("Origin") === origin);
};
export async function pkce(verifier) {
  const hash=new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(verifier)));
  let str="";for(const b of hash)str+=String.fromCharCode(b);
  return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export async function startFlow(env,provider) {
  const state=randomToken(24),verifier=randomPkceVerifier(),browser=randomToken(24);
  await env.DB.prepare("INSERT INTO customer_auth_flows(state_hash,provider,verifier,browser_hash,expires_at) VALUES(?,?,?,?,?)")
    .bind(await digest(state),provider,verifier,await digest(browser),now()+flowSeconds).run();
  return {state,verifier,browser};
}
export async function consumeFlow(env,provider,state,request) {
  const browser=cookies(request,FLOW_COOKIE);
  if (!/^[a-f0-9]{48}$/.test(state)|| !/^[a-f0-9]{48}$/.test(browser)) return null;
  // Atomic consume: replay of a state cannot reuse a verifier.
  const row=await env.DB.prepare("DELETE FROM customer_auth_flows WHERE state_hash=? AND provider=? AND browser_hash=? AND expires_at>? RETURNING verifier")
    .bind(await digest(state),provider,await digest(browser),now()).first();
  return row?.verifier || null;
}
export async function beginSession(env,provider,subject,name,email=null) {
  if (!["zalo","google"].includes(provider) || !subject || subject.length>255) throw Error("bad identity");
  const id=crypto.randomUUID(),display=String(name||"Khách hàng").slice(0,100);
  const safeEmail=email?String(email).slice(0,254):null;
  await env.DB.prepare("INSERT OR IGNORE INTO customer_auth_accounts(id,provider,provider_subject,display_name,email) VALUES(?,?,?,?,?)")
    .bind(id,provider,subject,display,safeEmail).run();
  const account=await env.DB.prepare("SELECT id FROM customer_auth_accounts WHERE provider=? AND provider_subject=?")
    .bind(provider,subject).first();
  if(!account?.id)throw Error("account missing");
  return issueSession(env,account.id);
}
export async function issueSession(env,accountId) {
  const token=randomToken(32);
  await env.DB.prepare("INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)")
    .bind(await digest(token),accountId,now()+sessionSeconds).run();
  return token;
}
export async function getAccount(env,request) {
  const token=cookies(request,CUSTOMER_COOKIE);
  if(!/^[a-f0-9]{64}$/.test(token)||!env?.DB)return null;
  return env.DB.prepare("SELECT a.id,a.provider,a.display_name,a.email FROM customer_auth_sessions s JOIN customer_auth_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?")
    .bind(await digest(token),now()).first();
}
export async function endSession(env,request) {
  const token=cookies(request,CUSTOMER_COOKIE);
  if(/^[a-f0-9]{64}$/.test(token)&&env?.DB)
    await env.DB.prepare("DELETE FROM customer_auth_sessions WHERE token_hash=?").bind(await digest(token)).run();
}
export async function passwordHash(password,salt,iterations=210000) {
  const imported=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",
    salt:enc.encode(salt),iterations},imported,256);
  return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function zaloAppSecretProof(accessToken,appSecret) {
  if(typeof accessToken!=="string" || !accessToken || typeof appSecret!=="string" || !appSecret)
    throw new Error("Zalo token proof requires secret");
  const key=await crypto.subtle.importKey("raw",enc.encode(appSecret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",key,enc.encode(accessToken));
  return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,"0")).join("");
}
export function equalHash(a,b) {
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
