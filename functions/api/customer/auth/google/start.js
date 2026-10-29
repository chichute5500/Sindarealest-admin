import { customerOrigin,callback,configured,startFlow,pkce,flowCookie,redirect,error } from "../../../../_customer-auth.js";
import { rateLimitPublicRequest } from "../../../../_lib.js";
export async function onRequestGet({request,env}) {
  const origin=customerOrigin(request);
  if(!origin || !configured(env,"google"))return error("Đăng nhập Google chưa được cấu hình.",503);
  try {
    // Rate-limit OAuth start before creating one-use state rows in D1.
    const limit=await rateLimitPublicRequest(env,request,"customer_oauth_google",10,900);
    if(limit.limited)return error("Bạn thao tác quá nhiều. Vui lòng thử lại sau 15 phút.",429);
  }catch{return error("Đăng nhập tạm thời không khả dụng.",503);}
  try {
    const flow=await startFlow(env,"google");
    const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
    for(const [key,value] of Object.entries({
      client_id:env.GOOGLE_CLIENT_ID,redirect_uri:callback("google",origin),
      response_type:"code",scope:"openid email profile",state:flow.state,
      code_challenge_method:"S256",code_challenge:await pkce(flow.verifier),
      prompt:"select_account"
    }))url.searchParams.set(key,value);
    return redirect(url.toString(),[flowCookie(flow.browser)]);
  }catch{return error("Chưa thể bắt đầu đăng nhập Google.",503);}
}
