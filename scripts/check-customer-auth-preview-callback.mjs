/**
 * Noninteractive, non-sensitive real D1 OAuth state-transaction diagnostic.
 * Starts one dummy state per Google/Facebook, calls callbacks with INVALID one-use codes.
 * Expected: Google refuses code AFTER D1 state is consumed, so final status
 * is token_rejected. No actual social login, no account/session is created.
 */
import assert from "node:assert/strict";
const ORIGIN="https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev";
if(process.env.GITHUB_REF_NAME!=="feat/zalo-customer-login-2026-10-29" ||
 process.env.GITHUB_REF_TYPE!=="branch")
 throw Error("Not the isolated Preview feature branch");

for(const provider of ["google","facebook"]){
  // The intentionally invalid authorization code must always be rejected by
  // the provider. This probes our Preview D1 state/cookie/callback path only.
  const start=await fetch(ORIGIN+"/api/customer/auth/"+provider+"/start",{
    redirect:"manual",signal:AbortSignal.timeout(12000),cache:"no-store"
  });
  assert.equal(start.status,302,provider+": OAuth start");
  const state=new URL(start.headers.get("Location")).searchParams.get("state");
  assert.match(state||"",/^[a-f0-9]{48}$/);
  const cookie=(start.headers.get("Set-Cookie")||"").split(";")[0];
  assert.match(cookie,/^sd_customer_oauth=[a-f0-9]{48}$/);
  const callback=await fetch(ORIGIN+"/api/customer/auth/"+provider+
    "/callback?state="+state+"&code=invalid-code-nonexistent-test-only",{
    headers:{Cookie:cookie},redirect:"manual",cache:"no-store",
    signal:AbortSignal.timeout(16000)
  });
  assert.equal(callback.status,302,provider+": callback redirect");
  const final=new URL(callback.headers.get("Location"));
  assert.equal(final.origin,ORIGIN);
  assert.equal(final.searchParams.get("customer_auth"),"failed");
  const reason=final.searchParams.get("auth_reason");
  console.log("Preview "+provider+" invalid-code callback reason:",reason||"missing");
  assert.equal(reason,"token_rejected",
    provider+": expected D1 consumeFlow success, followed by the provider rejecting a fake code.");
  console.log("PASS: "+provider+" Preview D1 OAuth one-time state and callback error classification.");
}
console.log("No social login was attempted, no account/session was created, and no Production records were accessed.");
