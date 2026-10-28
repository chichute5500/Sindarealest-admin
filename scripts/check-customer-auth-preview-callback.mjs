/**
 * Noninteractive, non-sensitive real D1 OAuth state-transaction diagnostic.
 * Starts one dummy Google OAuth state, calls callback with INVALID one-use code.
 * Expected: Google refuses code AFTER D1 state is consumed, so final status
 * is token_rejected. No actual social login, no account/session is created.
 */
import assert from "node:assert/strict";
const ORIGIN="https://feat-zalo-customer-login-202.sindarealest-admin-preview.pages.dev";
if(process.env.GITHUB_REF_NAME!=="feat/zalo-customer-login-2026-10-29" ||
 process.env.GITHUB_REF_TYPE!=="branch")
 throw Error("Not the isolated Preview feature branch");
const start=await fetch(ORIGIN+"/api/customer/auth/google/start",{
 redirect:"manual",signal:AbortSignal.timeout(12000),cache:"no-store"
});
assert.equal(start.status,302);
const state=new URL(start.headers.get("Location")).searchParams.get("state");
assert.match(state||"",/^[a-f0-9]{48}$/);
const cookie=(start.headers.get("Set-Cookie")||"").split(";")[0];
assert.match(cookie,/^sd_customer_oauth=[a-f0-9]{48}$/);
const callback=await fetch(ORIGIN+"/api/customer/auth/google/callback?state="+state+"&code=invalid-code-nonexistent-test-only",{
 headers:{Cookie:cookie},redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(15000)
});
assert.equal(callback.status,302);
const final=new URL(callback.headers.get("Location"));
assert.equal(final.origin,ORIGIN);
assert.equal(final.searchParams.get("customer_auth"),"failed");
const reason=final.searchParams.get("auth_reason");
console.log("Preview invalid-code callback reason:",reason||"missing");
assert.equal(reason,"token_rejected",
 "Expected real D1 consumeFlow success followed by Google's rejection of a dummy code. Other reasons require debugging.");
console.log("PASS: real PREVIEW D1 OAuth state consumed, browser cookie verified, provider token rejection classified.");
console.log("No user accounts, social tokens, private records or production writes were used.");
