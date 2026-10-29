import {customerOrigin,callback,configured,consumeFlow,beginSession,sessionCookie,clearFlow,redirect,error} from "../../../../_customer-auth.js";

// No tokens, provider errors, personal data or secrets are sent to the browser.
export async function onRequestGet({request,env}){
  const origin=customerOrigin(request);
  if(!origin||!configured(env,"facebook"))
    return error("Đăng nhập Facebook chưa sẵn sàng.",503);
  const url=new URL(request.url);
  const fail=(reason="unknown")=>redirect(origin+"/?customer_auth=failed"+
    (origin.includes("sindarealest-admin-preview.pages.dev")?"&auth_reason="+reason:""),
    [clearFlow()]);
  if(url.searchParams.has("error")||url.searchParams.has("error_code"))return fail("provider_denied");
  const code=url.searchParams.get("code")||"";
  if(!code)return fail("no_code");
  if(code.length>2048)return fail("invalid_code");
  let phase="state_store";
  try{
    const verifier=await consumeFlow(env,"facebook",url.searchParams.get("state")||"",request);
    if(!verifier)return fail("invalid_state");
    // Facebook exchange is performed via POST so App Secret never enters a URL.
    phase="token_network";
    const tokenResponse=await fetch("https://graph.facebook.com/v26.0/oauth/access_token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({
        client_id:env.FACEBOOK_APP_ID,
        client_secret:env.FACEBOOK_APP_SECRET,
        redirect_uri:callback("facebook",origin),
        code
      }),
      redirect:"manual",signal:AbortSignal.timeout(10000)
    });
    if(!tokenResponse.ok)return fail("token_rejected");
    const token=await tokenResponse.json();
    if(typeof token?.access_token!=="string"||!token.access_token||
       token.access_token.length>4096)return fail("token_invalid");
    // Only request the essential profile fields; email is not required or assumed.
    phase="profile_network";
    const profileResponse=await fetch("https://graph.facebook.com/v26.0/me?fields=id%2Cname",{
      headers:{"Authorization":"Bearer "+token.access_token},
      redirect:"manual",signal:AbortSignal.timeout(10000)
    });
    if(!profileResponse.ok)return fail("profile_rejected");
    const profile=await profileResponse.json();
    // Facebook returns structured errors, sometimes without an HTTP error.
    if(!profile||typeof profile!=="object"||Array.isArray(profile)||
       Object.hasOwn(profile,"error"))return fail("profile_invalid");
    const subject=typeof profile.id==="string"?profile.id:"";
    if(!/^[0-9]{1,64}$/.test(subject))return fail("profile_invalid");
    let session;
    try{session=await beginSession(env,"facebook",subject,profile.name);}
    catch{return fail("session_store");}
    return redirect(origin+"/?customer_auth=success",[clearFlow(),sessionCookie(session)]);
  }catch{return fail(phase);}
}
