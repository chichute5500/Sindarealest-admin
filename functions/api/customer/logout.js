import { sameOrigin,endSession,clearSession,json,error } from "../../_customer-auth.js";
export async function onRequestPost({request,env}) {
  if(!sameOrigin(request))return error("Yêu cầu không hợp lệ.",403);
  try {
    await endSession(env,request);
    return json({ok:true},200,{},[clearSession()]);
  }catch{return error("Không thể đăng xuất.",503);}
}
