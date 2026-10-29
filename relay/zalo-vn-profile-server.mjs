/**
 * Optional OWNER-HOSTED Vietnam profile relay for Zalo Social API.
 * This Node 22 service ONLY answers POST /v1/zalo/me. A reverse proxy MUST
 * terminate HTTPS on a domain you own and forward to 127.0.0.1:8765.
 * Do not run on a publicly exposed HTTP port or an untrusted/shared proxy.
 * No provider tokens/proofs, identity data or headers are logged or persisted.
 *
 * Env: SD_ZALO_RELAY_HMAC_SECRET (>=32 chars), PORT (defaults to 8765).
 * Source Worker: ZALO_VN_RELAY_URL, ZALO_VN_RELAY_SECRET.
 * These two secrets must match and must NEVER be in Git.
 */
import http from "node:http";
import {createHmac,timingSafeEqual} from "node:crypto";

const secret=process.env.SD_ZALO_RELAY_HMAC_SECRET;
if(typeof secret!=="string" || secret.length<32)
  throw Error("SD_ZALO_RELAY_HMAC_SECRET must be a strong secret >=32 characters");
const nonceCache=new Map();
const maxRequestBytes=8192;
const maxAgeSec=60;
const respond=(res,status,data)=>{
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store, private",
    "X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer"
  });
  res.end(JSON.stringify(data));
};
function authenticated(req,body){
  const timestamp=req.headers["x-sd-time"];
  const nonce=req.headers["x-sd-nonce"];
  const signature=req.headers["x-sd-signature"];
  if(typeof timestamp!=="string" || !/^[0-9]{10,11}$/.test(timestamp) ||
     Math.abs(Date.now()/1000-Number(timestamp))>maxAgeSec ||
     typeof nonce!=="string" || !/^[0-9a-f-]{36}$/i.test(nonce) ||
     typeof signature!=="string" || !/^[0-9a-f]{64}$/.test(signature))return false;
  const actual=createHmac("sha256",secret).update(timestamp+"."+nonce+"."+body).digest();
  const supplied=Buffer.from(signature,"hex");
  if(supplied.length!==actual.length || !timingSafeEqual(actual,supplied))return false;
  const now=Date.now();
  for(const [key,expiry] of nonceCache)if(expiry<now)nonceCache.delete(key);
  if(nonceCache.has(nonce))return false;
  if(nonceCache.size>5000)return false; // fail closed during overload
  nonceCache.set(nonce,now+120_000);
  return true;
}
const server=http.createServer(async(req,res)=>{
  if(req.method!=="POST" || req.url!=="/v1/zalo/me" ||
     !String(req.headers["content-type"]||"").startsWith("application/json"))
    return respond(res,404,{error:"not_found"});
  let body="";
  try{
    for await(const chunk of req){
      body+=chunk.toString("utf8");
      if(Buffer.byteLength(body,"utf8")>maxRequestBytes)
        return respond(res,413,{error:"body_too_large"});
    }
    if(!authenticated(req,body))
      return respond(res,403,{error:"unauthorized"});
    let payload;
    try{payload=JSON.parse(body);}catch{return respond(res,400,{error:"bad_json"});}
    if(typeof payload?.access_token!=="string" ||
       !payload.access_token || payload.access_token.length>4096 ||
       typeof payload?.appsecret_proof!=="string" ||
       !/^[a-f0-9]{64}$/.test(payload.appsecret_proof))
      return respond(res,400,{error:"bad_request"});
    const upstream=await fetch("https://graph.zalo.me/v2.0/me?fields=id%2Cname",{
      headers:{"access_token":payload.access_token,"appsecret_proof":payload.appsecret_proof},
      redirect:"manual",signal:AbortSignal.timeout(9000)
    });
    if(!upstream.ok)return respond(res,502,{error:"upstream_http"});
    if(Number(upstream.headers.get("content-length")||0)>32768)
      return respond(res,502,{error:"upstream_size"});
    const result=await upstream.json();
    if(!result || typeof result!=="object" || Array.isArray(result))
      return respond(res,502,{error:"upstream_invalid"});
    const err=Object.hasOwn(result,"error")?result.error:0;
    if(String(err)!=="0")return respond(res,200,{error:err});
    const id=result.id;
    const subject=typeof id==="string"?id:(typeof id==="number"&&Number.isSafeInteger(id)?String(id):"");
    if(!/^[A-Za-z0-9:_-]{1,255}$/.test(subject))
      return respond(res,502,{error:"upstream_invalid"});
    return respond(res,200,{error:0,id:subject,name:String(result.name||"").slice(0,100)});
  }catch{return respond(res,502,{error:"upstream_unavailable"});}
});
const port=Number(process.env.PORT||8765);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error("Invalid port");
server.listen(port,"127.0.0.1",()=>process.stdout.write("Zalo VN relay listening on localhost; HTTPS reverse proxy required\n"));
