/**
 * Zalo Social profile lookup.
 * Normally read directly from Zalo. -501 may be caused by non-Vietnam egress
 * (observed by third-party integrations; not guaranteed by Zalo's public docs).
 * Optional relay MUST be self-hosted and trusted in Vietnam, with HTTPS +
 * HMAC auth; the relay is never used for other errors or missing credentials.
 * Never log or put access_token, appsecret_proof or relay secret into URLs.
 */
import { zaloAppSecretProof } from "./_customer-auth.js";

const encoder=new TextEncoder();
const GRAPH_URL="https://graph.zalo.me/v2.0/me?fields=id%2Cname";
const readJSON=async response=>{
  if(!response.ok)return {error:"upstream_http"};
  // The reply is small; fail closed on unexpected content size.
  if(Number(response.headers.get("content-length")||0)>32768)return {error:"upstream_size"};
  const data=await response.json();
  if(!data || typeof data!=="object" || Array.isArray(data))return {error:"upstream_invalid"};
  return data;
};
const hmac=async(secret,message)=>{
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",key,encoder.encode(message));
  return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,"0")).join("");
};
export function configuredZaloRelay(env){
  const value=env?.ZALO_VN_RELAY_URL;
  const secret=env?.ZALO_VN_RELAY_SECRET;
  if(typeof value!=="string" || typeof secret!=="string" || secret.length<32)return null;
  try{
    const url=new URL(value);
    if(url.protocol!=="https:" || url.username || url.password || url.search || url.hash ||
      url.pathname!=="/v1/zalo/me" || url.hostname==="graph.zalo.me" ||
      /(?:^|\.)(?:pages\.dev|workers\.dev|localhost|example\.com)$/i.test(url.hostname))return null;
    return url.toString();
  }catch{return null;}
}
export async function getZaloProfile(env,accessToken,fetcher=fetch){
  if(typeof accessToken!=="string" || !accessToken || accessToken.length>4096)
    return {error:"token_invalid"};
  const proof=await zaloAppSecretProof(accessToken,env.ZALO_APP_SECRET);
  const direct=await fetcher(GRAPH_URL,{
    headers:{"access_token":accessToken,"appsecret_proof":proof},
    redirect:"manual",signal:AbortSignal.timeout(10000)
  });
  const first=await readJSON(direct);
  if(String(first.error)!=="-501")return first;
  const relayUrl=configuredZaloRelay(env);
  if(!relayUrl)return first; // never silently trust an arbitrary public proxy
  const body=JSON.stringify({access_token:accessToken,appsecret_proof:proof});
  const timestamp=String(Math.floor(Date.now()/1000));
  const nonce=crypto.randomUUID();
  const signature=await hmac(env.ZALO_VN_RELAY_SECRET,timestamp+"."+nonce+"."+body);
  try{
    const result=await fetcher(relayUrl,{
      method:"POST",redirect:"manual",signal:AbortSignal.timeout(10000),
      headers:{"Content-Type":"application/json",
        "X-SD-Time":timestamp,"X-SD-Nonce":nonce,"X-SD-Signature":signature},
      body
    });
    return readJSON(result);
  }catch{return {error:"relay_unavailable"};}
}
