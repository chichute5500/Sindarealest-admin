import { ZALO_APP_ID,customerOrigin,configured,consumeFlow,beginSession,sessionCookie,clearFlow,redirect,error } from "../../../../_customer-auth.js";
import {getZaloProfile} from "../../../../_zalo-profile.js";
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
  let phase="state_store";
  try {
    const verifier=await consumeFlow(env,"zalo",url.searchParams.get("state")||"",request);
    if(!verifier)return fail("invalid_state");
    const body=new URLSearchParams({code,app_id:ZALO_APP_ID,code_verifier:verifier,grant_type:"authorization_code"});
    phase="token_network";
    const tokenResponse=await fetch("https://oauth.zaloapp.com/v4/access_token",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","secret_key":env.ZALO_APP_SECRET},
      body,redirect:"manual",signal:AbortSignal.timeout(10000)
    });
    if(!tokenResponse.ok)return fail("token_rejected");
    const token=await tokenResponse.json();
    if(typeof token.access_token!=="string"||!token.access_token)return fail("token_invalid");
    // Verified Zalo profile is required before issuing customer session.
    // For confirmed profile API -501 only, an optional self-hosted private
    // Vietnam relay may be used if explicitly configured. No public proxy.
    phase="profile_network";
    const profile=await getZaloProfile(env,token.access_token);
    if(profile?.error==="relay_unavailable")return fail("profile_relay_unavailable");
    // Zalo can return a JSON error with HTTP 200; never accept one as an identity.
    if(!profile || typeof profile!=="object")
      return fail("profile_api_error");
    if(Object.hasOwn(profile,"error") && String(profile.error)!=="0"){
      // Only return a bounded numeric status code on isolated Preview.
      // Do not reveal the provider's arbitrary message or any credential.
      const code=Number(profile.error);
      return fail(Number.isSafeInteger(code) && code>=-99999 && code<=99999 ?
        "profile_api_error_"+code : "profile_api_error");
    }
    // Zalo's documentation defines id as an opaque UserId, not necessarily decimal.
    // Bound the provider subject to the schema and reject missing/unsafe identity values.
    const subject=typeof profile.id==="string"?profile.id:
      (typeof profile.id==="number" && Number.isSafeInteger(profile.id)?String(profile.id):"");
    if(!/^[A-Za-z0-9:_-]{1,255}$/.test(subject))return fail("profile_invalid");
    let session;
    try {session=await beginSession(env,"zalo",subject,profile.name);}
    catch {return fail("session_store");}
    return redirect(origin+"/?customer_auth=success",[clearFlow(),sessionCookie(session)]);
  }catch{return fail(phase); }
}
