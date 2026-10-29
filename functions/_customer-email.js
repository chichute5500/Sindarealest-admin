import {PREVIEW_ORIGIN,customerOrigin,digest,randomToken,now,json,error,issueSession,sessionCookie,redirect} from "./_customer-auth.js";
import {rateLimitPublicRequest,readJsonBodyLimited} from "./_lib.js";
export const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normEmail=value=>typeof value==="string"?value.trim().toLowerCase():"";
export const emailReady=env=>Boolean(env?.DB &&
 typeof env.MAILJET_API_KEY==="string"&&env.MAILJET_API_KEY.length>=8 &&
 typeof env.MAILJET_SECRET_KEY==="string"&&env.MAILJET_SECRET_KEY.length>=8 &&
 typeof env.MAILJET_FROM_EMAIL==="string"&&emailPattern.test(env.MAILJET_FROM_EMAIL));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const emailOnly=(request,env)=>customerOrigin(request)===PREVIEW_ORIGIN&&emailReady(env);
export const genericReset="Nếu Email đã đăng ký và xác minh, Shop sẽ gửi hướng dẫn đặt lại mật khẩu.";
export async function mailjetSend(env,to,purpose,otp,link) {
 if(!emailReady(env))throw Error("mailjet_not_configured");
 const isVerify=purpose==="verify";
 const action=isVerify?"Xác minh Email":"Đặt lại mật khẩu";
 const safeLink=escapeHtml(link);
 const body='Mã xác minh: '+otp+' (hết hạn sau 5 phút).\n'+action+': '+link+
  '\nNếu bạn không yêu cầu, hãy bỏ qua email này. Không chia sẻ mã với bất kỳ ai.';
 const payload={Messages:[{
  From:{Email:env.MAILJET_FROM_EMAIL,Name:"SinDarealest"},
  To:[{Email:to}],Subject:"SinDarealest · "+action,
  TextPart:body,HTMLPart:'<div style="font:15px/1.6 Arial,sans-serif;max-width:540px;margin:auto;padding:24px"><h2>SinDarealest</h2><p>'+action+' cho tài khoản của bạn.</p><p>Mã OTP của bạn:</p><div style="font-size:30px;font-weight:700;letter-spacing:7px">'+otp+'</div><p>Hiệu lực 5 phút.</p><p><a href="'+safeLink+'" style="background:#245e47;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block">'+action+'</a></p><p>Nếu không yêu cầu, bạn có thể bỏ qua. Không chia sẻ OTP.</p></div>'
 }]};
 const headers=new Headers({"Content-Type":"application/json","Authorization":"Basic "+btoa(env.MAILJET_API_KEY+":"+env.MAILJET_SECRET_KEY)});
 const response=await fetch("https://api.mailjet.com/v3.1/send",{
  method:"POST",headers,body:JSON.stringify(payload),redirect:"manual",signal:AbortSignal.timeout(10000)
 });
 if(response.status!==200)throw Error("mailjet_send_failed");
 const data=await response.json();
 if(data?.Messages?.[0]?.Status!=="success")throw Error("mailjet_rejected");
 return true;
}
async function allow(env,request,scope,limit=5){
 const result=await rateLimitPublicRequest(env,request,"email_"+scope,limit,900);
 return !result.limited;
}
export async function generateChallenge(env,accountId,email,purpose){
 const timestamp=now(),otp=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0"),token=randomToken(32);
 const codeHash=await digest(accountId+":"+purpose+":"+otp),linkHash=await digest(accountId+":"+purpose+":"+token);
 const reserved=await env.DB.prepare("UPDATE customer_auth_email_state SET last_sent_at=? WHERE account_id=? AND last_sent_at<=?")
  .bind(timestamp,accountId,timestamp-60).run();
 if(Number(reserved?.meta?.changes)!==1)return {cooldown:true};
 await env.DB.prepare("INSERT INTO customer_auth_email_challenges(account_id,purpose,code_hash,link_hash,expires_at,attempts,consumed_at,created_at) VALUES(?,?,?,?,?,0,NULL,?) "+
  "ON CONFLICT(account_id,purpose) DO UPDATE SET code_hash=excluded.code_hash,link_hash=excluded.link_hash,expires_at=excluded.expires_at,attempts=0,consumed_at=NULL,created_at=excluded.created_at")
  .bind(accountId,purpose,codeHash,linkHash,timestamp+300,timestamp).run();
 const link=purpose==="verify"?
  PREVIEW_ORIGIN+"/api/customer/auth/email/verify?email="+encodeURIComponent(email)+"&token="+encodeURIComponent(token):
  PREVIEW_ORIGIN+"/#customer-reset="+encodeURIComponent(email)+"&token="+encodeURIComponent(token);
 try{await mailjetSend(env,email,purpose,otp,link)}
 catch{
  // Fail closed: invalidate the unsent challenge, allow a follow-up retry.
  await env.DB.prepare("UPDATE customer_auth_email_challenges SET consumed_at=? WHERE account_id=? AND purpose=? AND code_hash=? AND consumed_at IS NULL")
   .bind(now(),accountId,purpose,codeHash).run();
  await env.DB.prepare("UPDATE customer_auth_email_state SET last_sent_at=0 WHERE account_id=? AND last_sent_at=?")
   .bind(accountId,timestamp).run();
  throw Error("email_send_failed");
 }
 return {sent:true};
}
export async function useChallenge(env,accountId,purpose,{code,token}){
 if(!((typeof code==="string"&&/^\d{6}$/.test(code))||(typeof token==="string"&&/^[a-f0-9]{64}$/.test(token))))return false;
 const timestamp=now();
 const row=await env.DB.prepare("SELECT code_hash,link_hash FROM customer_auth_email_challenges WHERE account_id=? AND purpose=? AND consumed_at IS NULL AND expires_at>? AND attempts<5")
  .bind(accountId,purpose,timestamp).first();
 if(!row)return false;
 const expected=token?await digest(accountId+":"+purpose+":"+token):await digest(accountId+":"+purpose+":"+code);
 const key=token?"link_hash":"code_hash";
 const candidate=row[key];
 if(typeof candidate!=="string"||expected!==candidate){
  await env.DB.prepare("UPDATE customer_auth_email_challenges SET attempts=attempts+1 WHERE account_id=? AND purpose=? AND consumed_at IS NULL AND expires_at>? AND attempts<5")
   .bind(accountId,purpose,timestamp).run();
  return false;
 }
 const used=await env.DB.prepare("UPDATE customer_auth_email_challenges SET consumed_at=? WHERE account_id=? AND purpose=? AND "+key+"=? AND consumed_at IS NULL AND expires_at>? AND attempts<5")
  .bind(timestamp,accountId,purpose,expected,timestamp).run();
 return Number(used?.meta?.changes)===1;
}
export async function findEmailAccount(env,email){
 return env.DB.prepare("SELECT a.id,a.display_name,v.verified_at FROM customer_auth_accounts a LEFT JOIN customer_auth_email_state v ON v.account_id=a.id WHERE a.provider='email' AND a.provider_subject=?").bind(email).first();
}
export async function emailChallengeHandler({request,env},action){
 if(!emailOnly(request,env))return error("Email đang được cấu hình trên Preview.",503);
 if(request.headers.get("Origin")!==customerOrigin(request))return error("Yêu cầu không hợp lệ.",403);
 const parsed=await readJsonBodyLimited(request,4096);
 if(parsed.error||!parsed.value||typeof parsed.value!=="object"||Array.isArray(parsed.value))return error("Dữ liệu không hợp lệ.");
 const b=parsed.value,email=normEmail(b.email);
 if(!emailPattern.test(email)||email.length>254)return error("Email không hợp lệ.");
 try{
  if(!await allow(env,request,action,action==="reset-request"?4:6))return error("Vui lòng thử lại sau 15 phút.",429);
  const account=await findEmailAccount(env,email);
  if(action==="resend"){
   if(account&&!account.verified_at){
    await env.DB.prepare("INSERT OR IGNORE INTO customer_auth_email_state(account_id,verified_at,last_sent_at) VALUES(?,NULL,0)").bind(account.id).run();
    const result=await generateChallenge(env,account.id,email,"verify");
    if(result.cooldown)return error("Vui lòng đợi 60 giây trước khi gửi lại.",429);
   }
   return json({ok:true,message:"Nếu tài khoản chưa xác minh, Shop sẽ gửi email mới."});
  }
  if(action==="reset-request"){
   if(account?.verified_at)await generateChallenge(env,account.id,email,"reset");
   return json({ok:true,message:genericReset});
  }
  if(action==="verify"){
   if(!account)return error("Mã xác minh không hợp lệ hoặc đã hết hạn.",400);
   if(!await useChallenge(env,account.id,"verify",{code:b.code,token:b.token}))return error("Mã xác minh không hợp lệ hoặc đã hết hạn.",400);
   const t=now();
   await env.DB.prepare("UPDATE customer_auth_email_state SET verified_at=? WHERE account_id=?").bind(t,account.id).run();
   return json({ok:true,message:"Email đã được xác minh. Bạn có thể đăng nhập."});
  }
  return error("Thao tác không được hỗ trợ.");
 }catch{return error("Không thể gửi hoặc xác minh Email. Kiểm tra Mailjet và thử lại.",503)}
}
