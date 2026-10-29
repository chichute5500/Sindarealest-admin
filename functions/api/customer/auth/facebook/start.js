import {customerOrigin,callback,configured,startFlow,flowCookie,redirect,error} from "../../../../_customer-auth.js";
import {rateLimitPublicRequest} from "../../../../_lib.js";

// Facebook OAuth code flow: CSRF state is one-use and bound to an HttpOnly cookie.
// Facebook web code flow does not promise PKCE; client secret stays server-side.
export async function onRequestGet({request,env}){
  const origin=customerOrigin(request);
  if(!origin||!configured(env,"facebook"))
    return error("Đăng nhập Facebook chưa được cấu hình.",503);
  try{
    const limit=await rateLimitPublicRequest(env,request,"customer_oauth_facebook",10,900);
    if(limit.limited)return error("Bạn thao tác quá nhiều. Vui lòng thử lại sau 15 phút.",429);
  }catch{return error("Đăng nhập Facebook tạm thời không khả dụng.",503);}
  try{
    const flow=await startFlow(env,"facebook");
    const url=new URL("https://www.facebook.com/v26.0/dialog/oauth");
    for(const [key,value] of Object.entries({
      client_id:env.FACEBOOK_APP_ID,
      redirect_uri:callback("facebook",origin),
      response_type:"code",
      scope:"public_profile",
      state:flow.state
    }))url.searchParams.set(key,value);
    return redirect(url.toString(),[flowCookie(flow.browser)]);
  }catch{return error("Chưa thể bắt đầu đăng nhập Facebook.",503);}
}
