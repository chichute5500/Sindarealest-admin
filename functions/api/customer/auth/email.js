import { sameOrigin,now,issueSession,passwordHash,randomToken,equalHash,sessionCookie,json,error } from "../../../_customer-auth.js";
import { rateLimitPublicRequest,readJsonBodyLimited } from "../../../_lib.js";
const normalizeEmail=x=>String(x||"").trim().toLowerCase();
export async function onRequestPost({request,env}) {
  if(!sameOrigin(request))return error("Yêu cầu không hợp lệ.",403);
  if(!env?.DB)return error("Dịch vụ tài khoản chưa sẵn sàng.",503);
  const parsed=await readJsonBodyLimited(request,2048);
  if(parsed.error||!parsed.value||typeof parsed.value!=="object"||Array.isArray(parsed.value))
    return error("Thông tin đăng nhập không hợp lệ.",400);
  const {mode,password,name}=parsed.value;
  const email=normalizeEmail(parsed.value.email);
  if(!["register","login"].includes(mode)||!email||email.length>254||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=="string"||
    password.length<12||password.length>256)return error("Email hoặc mật khẩu không hợp lệ (mật khẩu tối thiểu 12 ký tự).",400);
  try {
    // Limit password grinding and signup abuse by caller address, never by email alone.
    const rate=await rateLimitPublicRequest(env,request,"customer_auth_"+mode,mode==="login"?6:3,900);
    if(rate.limited)return error("Bạn thao tác quá nhiều. Vui lòng thử lại sau 15 phút.",429);
  }catch{return error("Dịch vụ tạm thời không khả dụng.",503);}
  try {
    if(mode==="register"){
      if(typeof name!=="string"||name.trim().length<2||name.length>100)
        return error("Vui lòng nhập tên từ 2 đến 100 ký tự.",400);
      const salt=randomToken(24),hash=await passwordHash(password,salt),id=crypto.randomUUID();
      try {
        await env.DB.prepare("INSERT INTO customer_auth_accounts(id,provider,provider_subject,display_name,email,password_salt,password_hash) VALUES(?,'email',?,?,?,?,?)")
          .bind(id,email,name.trim(),email,salt,hash).run();
      }catch{return error("Không thể đăng ký với email này.",409);}
      const token=await issueSession(env,id);
      // Email ownership is NOT verified; do not link old orders/warranties based solely on address.
      return json({ok:true,verified_email:false},201,{},[sessionCookie(token)]);
    }
    const account=await env.DB.prepare("SELECT id,password_salt,password_hash FROM customer_auth_accounts WHERE provider='email' AND provider_subject=?")
      .bind(email).first();
    const salt=account?.password_salt||"f".repeat(48);
    const expected=account?.password_hash||"0".repeat(64);
    const actual=await passwordHash(password,salt);
    if(!account||!equalHash(actual,expected))return error("Email hoặc mật khẩu không đúng.",401);
    const token=await issueSession(env,account.id);
    return json({ok:true,verified_email:false},200,{},[sessionCookie(token)]);
  }catch{return error("Dịch vụ tài khoản tạm thời không khả dụng.",503);}
}
