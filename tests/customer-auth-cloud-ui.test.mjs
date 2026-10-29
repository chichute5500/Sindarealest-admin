import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const auth=readFileSync(new URL("../public/customer-auth-ui.js",import.meta.url),"utf8");
new Script(auth,{filename:"customer-auth-ui.js"});
const emailOtp=readFileSync(new URL("../public/customer-email-otp-ui.js",import.meta.url),"utf8");
new Script(emailOtp,{filename:"customer-email-otp-ui.js"});
for(const id of ["sdAuthVerifyForm","sdAuthForgotForm","sdAuthResetForm"])
 assert.ok(html.includes('id="'+id+'"'),"OTP/Reset form missing: "+id);
assert.ok(auth.includes('payload.mode==="register"&&data.verification_required===true'),"Existing unverified Email must open OTP panel");
assert.ok(emailOtp.includes('scrollIntoView({block:"nearest"'),"OTP panel must be scrolled into view");
assert.ok(emailOtp.includes('mode:"reset-confirm"')&&emailOtp.includes('mode:"verify"'),
 "Email verification and reset must be accessible in account drawer");
assert.ok(html.includes('src="/customer-email-otp-ui.js?v=email-recovery-20261029"'),
 "OTP UI must be included after existing Google auth");

let parsed=0;
for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(!match[2].trim()||/type\s*=\s*["'](?:module|application\/ld\+json)/i.test(match[1]))continue;
 new Script(match[2],{filename:"index.html inline script "+(++parsed)});
}
assert.ok(parsed>=3,"All storefront inline JS must parse");
for(const marker of ['id="accountCloudStatus"','id="accountImportLocal"',"window.sdAccountBridge={onAuth:accountCloudOnAuth}","accountCloudAttachOrder(orderNumber,result.orderAccessToken||'')",'data-account-order-attach']){
 assert.ok(html.includes(marker),"Account cloud UI missing: "+marker);
}
assert.ok(auth.includes('google.querySelector("[data-auth-provider-label]").textContent'),"Google status update must preserve its logo");
assert.ok(html.includes('data-auth-email aria-expanded="false"'),"Email method must have accessible expand state");
assert.ok(html.includes('id="sdAuthEmailFields"'),"Email method must expand the existing form");
assert.ok(html.includes('name="customer_password" type="password" autocomplete="current-password" required minlength="7"'),"Email password field must accept 7+ characters");
assert.ok(html.includes('data-auth-password-hint hidden'),"Sign-up password requirement should appear only on registration");
assert.ok(auth.includes('toggleAttribute("hidden",!register)'),"Password hint must track registration mode");
assert.ok((html.match(/fill="#(?:4285F4|34A853|FBBC05|EA4335)"/g)||[]).length===4,"Google G must retain all four brand colors");
assert.ok(auth.includes('const emailEnabled=Boolean(data.providers?.email)'),"Email must be Preview-only by API flag");
assert.ok(auth.includes('const GOOGLE_ONLY_RELEASE = true'),"Only Google sign-in must be shown on PC and mobile");
assert.ok(auth.includes('const emailAvailable=emailEnabled && !GOOGLE_ONLY_RELEASE'),"Email remains hidden even when Preview email flag is enabled");
assert.ok(html.includes('id="accountOpen"'),"Desktop Account access missing");
assert.ok(html.includes('id="mobileAccountNav"'),"Mobile Account access missing");
assert.ok(html.includes('src="/customer-auth-ui.js?v=google-only-20261029"'),"Google-only auth script must be cache-busted");
assert.ok(auth.includes("window.sdAccountBridge?.onAuth(active)"),"OAuth session must trigger cloud-account sync");
assert.ok(html.includes("if(accountSyncMode==='cloud')"),"Cloud account branch is required");
assert.ok(!html.includes("Đăng nhập không tự động liên kết đơn hàng cũ; Shop sẽ bổ sung"),"Outdated local-only notice must be removed");
console.log("PASS: customer Google account UI syntax, login-triggered cloud sync and token-verified order hooks.");
