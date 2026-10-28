import { ZALO_APP_ID,customerOrigin,configured,consumeFlow,beginSession,sessionCookie,clearFlow,redirect,error,zaloAppSecretProof } from "../../../../_customer-auth.js";
export async function onRequestGet({request,env}) {
  const origin=customerOrigin(request);
  if(!origin||!configured(env,"zalo"))return error("Đăng nhập Zalo chưa sẵn sàng.",503);
  const url=new URL(request.url);
  // Diagnostic reason is a fixed, non-sensitive code. Never expose auth codes,
  // provider payloads, identity data, access tokens or OAuth verifier.
  const fail=(reason="unknown")=>redirect(origin+"/?customer_auth=failed"+(
    origin.includes("sindarealest-admin-preview.pages.dev") ? "&auth_reason="+reason : ""
  ),[clearFlow()]);
  if(url.searchParams.has("error"))return fail("provider_denied");
  if(!url.searchParams.has("code"))return fail("no_code");
  const code=url.searchParams.get("code")||"";
  if(code.length>2048)return fail("invalid_code");
  try {
    const verifier=await consumeFlow(env,"zalo",url.searchParams.get("state")||"",request);
    if(!verifier)return fail("invalid_state");
    const body=new URLSearchParams({code,app_id:ZALO_APP_ID,code_verifier:verifier,grant_type:"authorization_code"});
    const tokenResponse=await fetch("https://oauth.zaloapp.com/v4/access_token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","secret_key":env.ZALO_APP_SECRET},
      body,redirect:"error",signal:AbortSignal.timeout(10000)
    });
    if(!tokenResponse.ok)return fail("token_rejected");
    const token=await tokenResponse.json();
    if(typeof token.access_token!=="string"||!token.access_token)return fail("token_invalid");
    // The Zalo App enables App Secret Proof for access-token API calls.
    // The secret stays on the server and is never sent to the client.
    const profileUrl=new URL("https://graph.zalo.me/v2.0/me");
    profileUrl.searchParams.set("fields","id,name");
    profileUrl.searchParams.set("appsecret_proof",await zaloAppSecretProof(token.access_token,env.ZALO_APP_SECRET));
    const profileResponse=await fetch(profileUrl.toString(),{
      headers:{"access_token":token.access_token},
      redirect:"error",signal:AbortSignal.timeout(10000)
    });
    if(!profileResponse.ok)return fail("profile_rejected");
    const profile=await profileResponse.json();
    if(!/^[0-9]{1,50}$/.test(String(profile.id||"")))return fail("profile_invalid");
    const session=await beginSession(env,"zalo",String(profile.id),profile.name);
    return redirect(origin+"/?customer_auth=success",[clearFlow(),sessionCookie(session)]);
  }catch{return fail("callback_error");}
}
