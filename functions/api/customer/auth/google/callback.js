import { customerOrigin,callback,configured,consumeFlow,beginSession,sessionCookie,clearFlow,redirect,error } from "../../../../_customer-auth.js";
export async function onRequestGet({request,env}) {
  const origin=customerOrigin(request);
  if(!origin||!configured(env,"google"))return error("Đăng nhập Google chưa sẵn sàng.",503);
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
  let phase="state_store";
  try {
    const verifier=await consumeFlow(env,"google",url.searchParams.get("state")||"",request);
    if(!verifier)return fail("invalid_state");
    const body=new URLSearchParams({
      code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,
      redirect_uri:callback("google",origin),grant_type:"authorization_code",code_verifier:verifier
    });
    phase="token_network";
    const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body,redirect:"manual",signal:AbortSignal.timeout(10000)
    });
    if(!tokenResponse.ok)return fail("token_rejected");
    const token=await tokenResponse.json();
    if(typeof token.access_token!=="string"||!token.access_token)return fail("token_invalid");
    phase="profile_network";
    const profileResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{
      headers:{"Authorization":"Bearer "+token.access_token},
      redirect:"manual",signal:AbortSignal.timeout(10000)
    });
    if(!profileResponse.ok)return fail("profile_rejected");
    const profile=await profileResponse.json();
    if(!profile.sub||profile.email_verified!==true)return fail("profile_invalid");
    let session;
    try {session=await beginSession(env,"google",String(profile.sub),profile.name,profile.email);}
    catch {return fail("session_store");}
    return redirect(origin+"/?customer_auth=success",[clearFlow(),sessionCookie(session)]);
  }catch{return fail(phase); }
}
