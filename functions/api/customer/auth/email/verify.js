import {PREVIEW_ORIGIN,emailTestAllowed,issueSession,sessionCookie,redirect} from "../../../../_customer-auth.js";
import {emailOnly,findEmailAccount,normEmail,emailPattern,useChallenge} from "../../../../_customer-email.js";
export async function onRequestGet({request,env}){
 const bad=()=>redirect(PREVIEW_ORIGIN+"/?customer_auth=email_verify_failed");
 if(!emailTestAllowed(request)||!emailOnly(request,env))return bad();
 try{
  const u=new URL(request.url),email=normEmail(u.searchParams.get("email")),token=u.searchParams.get("token")||"";
  if(!emailPattern.test(email)||!/^[a-f0-9]{64}$/.test(token))return bad();
  const account=await findEmailAccount(env,email);
  if(!account||!await useChallenge(env,account.id,"verify",{token}))return bad();
  await env.DB.prepare("UPDATE customer_auth_email_state SET verified_at=? WHERE account_id=?").bind(Math.floor(Date.now()/1000),account.id).run();
  const session=await issueSession(env,account.id);
  return redirect(PREVIEW_ORIGIN+"/?customer_auth=email_verified",[sessionCookie(session)]);
 }catch{return bad()}
}
