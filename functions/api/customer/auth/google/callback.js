import { customerOrigin,callback,configured,consumeFlow,beginSession,sessionCookie,clearFlow,redirect,error } from "../../../../_customer-auth.js";
export async function onRequestGet({request,env}) {
  const origin=customerOrigin(request);
  if(!origin||!configured(env,"google"))return error("Đăng nhập Google chưa sẵn sàng.",503);
  const url=new URL(request.url);
  const fail=()=>redirect(origin+"/?customer_auth=failed",[clearFlow()]);
  if(url.searchParams.has("error")||!url.searchParams.has("code"))return fail();
  const code=url.searchParams.get("code")||"";
  if(code.length>2048)return fail();
  try {
    const verifier=await consumeFlow(env,"google",url.searchParams.get("state")||"",request);
    if(!verifier)return fail();
    const body=new URLSearchParams({
      code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,
      redirect_uri:callback("google",origin),grant_type:"authorization_code",code_verifier:verifier
    });
    const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body,redirect:"error",signal:AbortSignal.timeout(10000)
    });
    if(!tokenResponse.ok)return fail();
    const token=await tokenResponse.json();
    if(typeof token.access_token!=="string"||!token.access_token)return fail();
    const profileResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{
      headers:{"Authorization":"Bearer "+token.access_token},
      redirect:"error",signal:AbortSignal.timeout(10000)
    });
    if(!profileResponse.ok)return fail();
    const profile=await profileResponse.json();
    if(!profile.sub||profile.email_verified!==true)return fail();
    const session=await beginSession(env,"google",String(profile.sub),profile.name,profile.email);
    return redirect(origin+"/?customer_auth=success",[clearFlow(),sessionCookie(session)]);
  }catch{return fail();}
}
