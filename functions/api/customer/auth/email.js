import {sameOrigin,emailTestAllowed,issueSession,passwordHash,randomToken,equalHash,sessionCookie,json,error,now} from "../../../_customer-auth.js";
import {rateLimitPublicRequest,readJsonBodyLimited} from "../../../_lib.js";
import {emailOnly,findEmailAccount,normEmail,emailPattern,generateChallenge,emailChallengeHandler,genericReset,useChallenge} from "../../../_customer-email.js";
export async function onRequestPost({request,env}) {
 if(!sameOrigin(request))return error("Yêu cầu không hợp lệ.",403);
 if(!emailTestAllowed(request))return error("Đăng nhập Email chỉ dành cho Preview.",503);
 if(!emailOnly(request,env))return error("Email xác minh chưa được cấu hình trên Preview.",503);
 const parsed=await readJsonBodyLimited(request,4096);
 if(parsed.error||!parsed.value||typeof parsed.value!=="object"||Array.isArray(parsed.value))
  return error("Thông tin đăng nhập không hợp lệ.",400);
 const body=parsed.value,mode=body.mode,email=normEmail(body.email),password=body.password;
 if(["resend","verify","reset-request"].includes(mode))return emailChallengeHandler({request,env},mode,body);
 if(!emailPattern.test(email)||email.length>254)return error("Email không hợp lệ.");
 if(mode==="reset-confirm"){
  if(typeof password!=="string"||password.length<7||password.length>256)return error("Mật khẩu mới phải từ 7 đến 256 ký tự.");
  try {
   const limit=await rateLimitPublicRequest(env,request,"customer_email_reset_confirm",8,900);
   if(limit.limited)return error("Bạn thử quá nhiều lần.",429);
   const account=await findEmailAccount(env,email);
   if(!account?.verified_at)return error("Mã đặt lại không hợp lệ hoặc đã hết hạn.",400);
   const accepted=await useChallenge(env,account.id,"reset",{code:body.code,token:body.token});
   if(!accepted)return error("Mã đặt lại không hợp lệ hoặc đã hết hạn.",400);
   const salt=randomToken(24),hash=await passwordHash(password,salt);
   await env.DB.batch([
    env.DB.prepare("UPDATE customer_auth_accounts SET password_salt=?,password_hash=? WHERE id=? AND provider='email'").bind(salt,hash,account.id),
    env.DB.prepare("DELETE FROM customer_auth_sessions WHERE account_id=?").bind(account.id)
   ]);
   return json({ok:true,message:"Mật khẩu đã thay đổi. Hãy đăng nhập lại."});
  }catch{return error("Chưa đặt lại được mật khẩu.",503)}
 }
 if(!["register","login"].includes(mode)||typeof password!=="string"||password.length<7||password.length>256)
  return error("Email hoặc mật khẩu không hợp lệ (mật khẩu tối thiểu 7 ký tự).",400);
 try{
  const rate=await rateLimitPublicRequest(env,request,"customer_auth_"+mode,mode==="login"?6:3,900);
  if(rate.limited)return error("Bạn thao tác quá nhiều. Vui lòng thử lại sau 15 phút.",429);
 }catch{return error("Dịch vụ tạm thời không khả dụng.",503)}
 try {
  if(mode==="register"){
   const name=body.name;
   if(typeof name!=="string"||name.trim().length<2||name.length>100)return error("Vui lòng nhập tên từ 2 đến 100 ký tự.");
   const existing=await findEmailAccount(env,email);
   if(existing){
    if(!existing.verified_at)
      return json({ok:false,verification_required:true,
        error:"Tài khoản này chưa xác minh Email. Nhập OTP đã nhận hoặc chọn Gửi lại mã."},409);
    return error("Email đã có tài khoản. Hãy chọn Đăng nhập hoặc Quên mật khẩu.",409);
   }
   const salt=randomToken(24),hash=await passwordHash(password,salt),id=crypto.randomUUID();
   await env.DB.batch([
    env.DB.prepare("INSERT INTO customer_auth_accounts(id,provider,provider_subject,display_name,email,password_salt,password_hash) VALUES(?,'email',?,?,?,?,?)").bind(id,email,name.trim(),email,salt,hash),
    env.DB.prepare("INSERT INTO customer_auth_email_state(account_id,verified_at,last_sent_at) VALUES(?,NULL,0)").bind(id)
   ]);
   try{await generateChallenge(env,id,email,"verify")}
   catch{return json({ok:false,verification_required:true,
    error:"Tài khoản đã được tạo nhưng chưa gửi được Email. Mở phần xác minh và chọn Gửi lại mã."},503)}
   return json({ok:true,verification_required:true,message:"Mailjet đã tiếp nhận yêu cầu gửi OTP 6 số và liên kết xác minh. Vui lòng kiểm tra cả Spam. Trạng thái nhận thư cần xác nhận trong Mailjet Stats."},202);
  }
  const a=await env.DB.prepare("SELECT a.id,a.password_salt,a.password_hash,v.verified_at FROM customer_auth_accounts a LEFT JOIN customer_auth_email_state v ON v.account_id=a.id WHERE a.provider='email' AND a.provider_subject=?").bind(email).first();
  const candidate=await passwordHash(password,a?.password_salt||"f".repeat(48));
  if(!a||!equalHash(candidate,a.password_hash||"0".repeat(64)))return error("Email hoặc mật khẩu không đúng.",401);
  if(!a.verified_at)return error("Email chưa được xác minh. Hãy nhập mã hoặc mở liên kết trong thư.",403);
  const token=await issueSession(env,a.id);
  return json({ok:true,verified_email:true},200,{},[sessionCookie(token)]);
 }catch{return error("Dịch vụ tài khoản tạm thời không khả dụng.",503)}
}
