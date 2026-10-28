import { ZALO_APP_ID,ORIGIN,callback,configured,startFlow,pkce,flowCookie,redirect,error } from "../../../../_customer-auth.js";
import { rateLimitPublicRequest } from "../../../../_lib.js";
export async function onRequestGet({request,env}) {
  if(new URL(request.url).origin!==ORIGIN || !configured(env,"zalo"))return error("Đăng nhập Zalo chưa được cấu hình.",503);
  try {
    // Rate-limit OAuth start before creating one-use state rows in D1.
    const limit=await rateLimitPublicRequest(env,request,"customer_oauth_zalo",10,900);
    if(limit.limited)return error("Bạn thao tác quá nhiều. Vui lòng thử lại sau 15 phút.",429);
  }catch{return error("Đăng nhập tạm thời không khả dụng.",503);}
  try {
    const flow=await startFlow(env,"zalo");
    const url=new URL("https://oauth.zaloapp.com/v4/permission");
    url.searchParams.set("app_id",ZALO_APP_ID);
    url.searchParams.set("redirect_uri",callback("zalo"));
    url.searchParams.set("state",flow.state);
    url.searchParams.set("code_challenge",await pkce(flow.verifier));
    return redirect(url.toString(),[flowCookie(flow.browser)]);
  }catch{return error("Chưa thể bắt đầu đăng nhập Zalo.",503);}
}
