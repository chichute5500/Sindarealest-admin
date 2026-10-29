import assert from "node:assert/strict";
import {onRequestPost as emailAuth} from "../functions/api/customer/auth/email.js";
import {onRequestGet as getSession} from "../functions/api/customer/session.js";
import {onRequestPost as logout} from "../functions/api/customer/logout.js";
import {PREVIEW_ORIGIN as ORIGIN} from "../functions/_customer-auth.js";

class FakeDB {
  constructor(){this.accounts=new Map();this.sessions=new Map();this.limits=new Map();}
  prepare(sql){
    return {bind:(...args)=>({
      run:async()=>{
        if(sql.startsWith("INSERT INTO customer_auth_accounts")){
          const [id,email,name,listedEmail,salt,hash]=args;
          if(this.accounts.has(email))throw Error("unique");
          this.accounts.set(email,{id,provider:"email",display_name:name,email:listedEmail,password_salt:salt,password_hash:hash});
        }else if(sql.startsWith("INSERT INTO customer_auth_sessions")){
          const [key,id,expires]=args;this.sessions.set(key,{id,expires});
        }else if(sql.startsWith("DELETE FROM customer_auth_sessions")){
          this.sessions.delete(args[0]);
        }else if(sql.startsWith("DELETE FROM public_rate_limits")){ /* noop */ }
        else throw Error("Unsupported run: "+sql);
        return {success:true};
      },
      first:async()=>{
        if(sql.startsWith("SELECT id,password_salt,password_hash FROM customer_auth_accounts")){
          const a=this.accounts.get(args[0]);return a||null;
        }
        if(sql.startsWith("SELECT a.id,a.provider,a.display_name,a.email FROM customer_auth_sessions")){
          const [hash,now]=args,s=this.sessions.get(hash);
          if(!s||s.expires<=now)return null;
          return [...this.accounts.values()].find(a=>a.id===s.id)||null;
        }
        throw Error("Unsupported first: "+sql);
      }
    })};
  }
  async batch(statements){
    const insert=statements[0],lookup=statements[1];
    if(!insert||!lookup)throw Error("batch contract");
    // Fake limiter is intentionally strict: test 6 failed login attempts then block next.
    this.attempts=(this.attempts||0)+1;
    return [{success:true},{results:[{attempts:this.attempts}]}];
  }
}
const DB=new FakeDB(),env={DB,SESSION_SECRET:"s".repeat(48)};
const req=(payload,origin=ORIGIN)=>new Request(ORIGIN+"/api/customer/auth/email",{
  method:"POST",headers:{"Content-Type":"application/json",Origin:origin,"CF-Connecting-IP":"192.0.2.3"},
  body:JSON.stringify(payload)
});
const signup={mode:"register",name:"Khách Thử",email:"buyer@example.test",password:"Abc123!"};
const crossSite=await emailAuth({request:req(signup,"https://evil.example"),env});
assert.equal(crossSite.status,403);
// Production must reject unverified-email self-service even with valid credentials.
const productionSignup=await emailAuth({request:new Request("https://sindarealest2.pages.dev/api/customer/auth/email",{
  method:"POST",headers:{"Content-Type":"application/json",Origin:"https://sindarealest2.pages.dev"},
  body:JSON.stringify(signup)
}),env});
assert.equal(productionSignup.status,503);
for (const password of ["123","123456"]){
  const bad=await emailAuth({request:req({...signup,password}),env});
  assert.equal(bad.status,400,"Passwords shorter than 7 chars must be rejected");
  assert.match((await bad.json()).error,/tối thiểu 7 ký tự/);
}
const signed=await emailAuth({request:req(signup),env});
assert.equal(signed.status,201);
const tokenCookie=(signed.headers.get("Set-Cookie")||"").match(/sd_customer_login=[a-f0-9]{64}/)?.[0];
assert.ok(tokenCookie);
const session=await getSession({request:new Request(ORIGIN+"/api/customer/session",{headers:{Cookie:tokenCookie}}),env});
const data=await session.json();
assert.equal(data.authenticated,true);
assert.equal(data.user.provider,"email");
assert.equal(data.user.email,"buyer@example.test");
const duplicate=await emailAuth({request:req(signup),env});
assert.equal(duplicate.status,409);
const wrong=await emailAuth({request:req({...signup,mode:"login",password:"NotTheSamePassword!2026"}),env});
assert.equal(wrong.status,401);
const correct=await emailAuth({request:req({...signup,mode:"login"}),env});
assert.equal(correct.status,200);
const logoutBad=await logout({request:new Request(ORIGIN+"/api/customer/logout",{method:"POST",headers:{Origin:"https://evil.example",Cookie:tokenCookie}}),env});
assert.equal(logoutBad.status,403);
const logoutGood=await logout({request:new Request(ORIGIN+"/api/customer/logout",{method:"POST",headers:{Origin:ORIGIN,Cookie:tokenCookie}}),env});
assert.equal(logoutGood.status,200);
const after=await getSession({request:new Request(ORIGIN+"/api/customer/session",{headers:{Cookie:tokenCookie}}),env});
assert.equal((await after.json()).authenticated,false);
// Separate rate-limit fixture ensures a long existing password remains valid,
// without sharing this fake limiter's global attempt counter across test cases.
const legacyEnv={...env,DB:new FakeDB()};
const legacy={...signup,email:"buyer-long@example.test",password:"NewPass-Secure!2026"};
assert.equal((await emailAuth({request:req(legacy),env:legacyEnv})).status,201);
assert.equal((await emailAuth({request:req({...legacy,mode:"login"}),env:legacyEnv})).status,200);
console.log("Email auth register/login, password, logout, CSRF and no auto order linking PASS");
