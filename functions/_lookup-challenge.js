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
 const data=new FormData();
 data.set("secret",env.TURNSTILE_SECRET_KEY);
 data.set("response",token);
 const ip=request.headers.get("CF-Connecting-IP");
 if(ip)data.set("remoteip",ip);
 try{
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
    method:"POST",body:data,signal:AbortSignal.timeout(8000),redirect:"error"
  });
  if(!response.ok)return {ok:false,status:503};
  const answer=await response.json();
  const hostname=new URL(request.url).hostname;
  const match=answer?.success===true&&answer.hostname===hostname&&answer.action===action;
  return {ok:match,status:match?200:400};
 }catch{return {ok:false,status:503}}
}
