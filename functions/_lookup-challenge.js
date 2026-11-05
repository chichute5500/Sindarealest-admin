// Cloudflare Turnstile must be verified server-side, never using a client-only token.
// Only a PUBLIC site key is sent to browsers; the secret stays in Pages environment.
export function publicLookupChallengeSettings(env){
 const siteKey=typeof env?.TURNSTILE_SITE_KEY==="string"?env.TURNSTILE_SITE_KEY.trim():"";
 const secret=typeof env?.TURNSTILE_SECRET_KEY==="string"?env.TURNSTILE_SECRET_KEY.trim():"";
 return {available:Boolean(siteKey&&secret),siteKey:siteKey&&secret?siteKey:""};
}
export async function verifyLookupChallenge(request,env,token,action){
 const settings=publicLookupChallengeSettings(env);
 if(!settings.available)return {ok:false,status:503};
 if(typeof token!=="string"||token.length<10||token.length>2048||!/^[-._A-Za-z0-9]+$/.test(token))
  return {ok:false,status:400};
 // The availability probe uses a trimmed secret. Siteverify MUST use that
 // same normalized value: surrounding whitespace from a pasted encrypted
 // variable must not turn a valid secret into "invalid-input-secret".
 const data=new URLSearchParams();
 data.set("secret",env.TURNSTILE_SECRET_KEY.trim());
 data.set("response",token);
 const ip=request.headers.get("CF-Connecting-IP");
 if(ip)data.set("remoteip",ip);
 try{
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:data,signal:AbortSignal.timeout(8000),redirect:"error"
  });
  // Cloudflare Siteverify may return a JSON error with HTTP 400. Parse its
  // error code *before* deciding whether the service is unavailable.
  let answer;
  try{answer=await response.json()}catch{
    console.warn("Turnstile Siteverify returned a non-JSON response",response.status);
    return {ok:false,status:503,reason:"non_json"};
  }
  if(!answer||typeof answer!=="object")return {ok:false,status:503,reason:"unexpected_response"};
  if(answer.success===true){
    const hostname=new URL(request.url).hostname;
    const match=response.ok&&answer.hostname===hostname&&answer.action===action;
    return {ok:match,status:match?200:400};
  }
  const codes=Array.isArray(answer["error-codes"])?
    answer["error-codes"].filter(x=>typeof x==="string").slice(0,8):[];
  if(codes.includes("invalid-input-secret")||codes.includes("missing-input-secret")){
    // Never log the submitted token or the secret, including partial values.
    console.warn("Turnstile Siteverify configuration rejected",codes.join(","));
    return {ok:false,status:503,reason:"configuration"};
  }
  if(codes.includes("invalid-input-response")||codes.includes("missing-input-response")||
     codes.includes("timeout-or-duplicate"))return {ok:false,status:400};
  if(codes.includes("bad-request"))return {ok:false,status:503,reason:"upstream_bad_request"};
  if(codes.includes("internal-error"))return {ok:false,status:503,reason:"upstream_internal"};
  if(!response.ok){
    console.warn("Turnstile Siteverify unexpected HTTP status",response.status,codes.join(","));
    return {ok:false,status:503,reason:"upstream_http"};
  }
  return {ok:false,status:400};
 }catch(error){
  console.warn("Turnstile Siteverify transport failed",error?.name||"Error");
  return {ok:false,status:503,reason:"transport"};
 }
}
