import { getAccount,configured,emailTestAllowed,json,error } from "../../_customer-auth.js";
export async function onRequestGet({request,env}) {
  if(!env?.DB)return error("Dịch vụ đăng nhập chưa được cấu hình.",503);
  try {
    const account=await getAccount(env,request);
    return json({ok:true,authenticated:!!account,providers:{zalo:configured(env,"zalo"),google:configured(env,"google"),facebook:configured(env,"facebook"),email:emailTestAllowed(request)},
      user:account?{name:account.display_name,provider:account.provider,email:account.email||null}:null});
  }catch{return error("Không thể tải phiên đăng nhập.",503);}
}
