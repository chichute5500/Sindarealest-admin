/**
 * Real, limited smoke test for the Owner's isolated Cloudflare Pages Preview
 * deployment only. Never accesses Production D1 and never reads customer data.
 * Creates at most two short-lived OAuth state rows in Preview, no accounts/orders.
 */
import assert from "node:assert/strict";
const ORIGIN="https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev";
const APP_ID="3933116436838564742";
const branch=process.env.GITHUB_REF_NAME;
if(branch!=="feat/zalo-customer-login-2026-10-29" || process.env.GITHUB_REF_TYPE!=="branch")
  throw new Error("Ref is not the auth Preview branch; stopping before network requests");
async function get(url){
  return fetch(url,{cache:"no-store",redirect:"manual",headers:{"Accept":"application/json, text/html"},
    signal:AbortSignal.timeout(12000)});
}
async function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
let session;
for(let attempt=1;attempt<=8;attempt++){
  try {
    const r=await get(ORIGIN+"/api/customer/session");
    if(r.status===200) {
      const value=await r.json();
      if(value?.ok===true && value.authenticated===false &&
        value.providers?.zalo===true && value.providers?.google===true && value.providers?.facebook===true && value.providers?.email===true) {
        session=value;break;
      }
      throw new Error("Preview session payload missing expected auth capabilities");
    }
    throw new Error("Unexpected session status "+r.status);
  }catch(e){
    if(attempt===8)throw new Error("Live Preview session smoke test failed: "+e.message);
    await wait(2500);
  }
}
assert.ok(session);
const root=await get(ORIGIN+"/");
assert.equal(root.status,200,"Preview frontend must be publicly reachable");
const html=await root.text();
assert.ok(html.includes('id="sdCustomerAuth"'),"Preview must have the exact customer login drawer");
assert.ok(html.includes('id="accountOpen"'),"PC header must expose the Account button");
assert.ok(html.includes("$('#accountOpen')?.addEventListener('click',()=>toggleStorefrontModal('account'))"),
  "PC Account button must open the existing mobile-approved account drawer");
assert.ok(html.includes('data-auth-google>Tiếp tục với Google'),"Google Login must be present in Account drawer");
assert.ok(html.includes('data-auth-zalo hidden disabled'),"Temporarily disabled Zalo Login must not be offered");
assert.ok(html.includes('data-auth-facebook hidden disabled'),"Temporarily disabled Facebook Login must not be offered");
console.log("PASS: real Preview includes wired desktop Account button, Google Login and inactive other providers.");
for(const provider of ["zalo","google","facebook"]){
  const r=await get(ORIGIN+"/api/customer/auth/"+provider+"/start");
  assert.equal(r.status,302,"OAuth must start on Preview for "+provider);
  const location=r.headers.get("Location");
  const auth=new URL(location);
  assert.equal(auth.protocol,"https:");
  assert.equal(auth.hostname,provider==="zalo"?"oauth.zaloapp.com":provider==="google"?"accounts.google.com":"www.facebook.com");
  assert.equal(auth.searchParams.get("redirect_uri"),
    ORIGIN+"/api/customer/auth/"+provider+"/callback",
    "Provider callback must remain on the exact Cloudflare Preview alias");
  assert.match(auth.searchParams.get("state")||"",/^[a-f0-9]{48}$/);
  if(provider!=="facebook")assert.match(auth.searchParams.get("code_challenge")||"",/^[a-zA-Z0-9_-]{43}$/);
  if(provider==="google"){
    assert.equal(auth.searchParams.get("scope"),"openid email profile");
    assert.equal(auth.searchParams.get("code_challenge_method"),"S256");
    assert.equal(auth.searchParams.get("prompt"),"select_account");
  }
  if(provider==="zalo")assert.equal(auth.searchParams.get("app_id"),APP_ID);
  if(provider==="facebook"){
    assert.equal(auth.searchParams.get("client_id"),"2013705155992867");
    assert.equal(auth.searchParams.get("scope"),"public_profile");
  }
  const cookie=r.headers.get("Set-Cookie")||"";
  assert.ok(cookie.startsWith("sd_customer_oauth="),"missing browser-bound state cookie");
  assert.ok(cookie.includes("HttpOnly")&&cookie.includes("Secure")&&cookie.includes("SameSite=Lax"));
  console.log(provider.toUpperCase()+": Preview OAuth start 302, PKCE/state/callback/cookie PASS");
}
console.log("PASS: real Cloudflare PREVIEW homepage + PC Account UI + D1 session + three provider OAuth start endpoints.");
console.log("No social accounts created and no Production backend accessed.");
