import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const auth=readFileSync(new URL("../public/customer-auth-ui.js",import.meta.url),"utf8");
new Script(auth,{filename:"customer-auth-ui.js"});
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
assert.ok((html.match(/fill="#(?:4285F4|34A853|FBBC05|EA4335)"/g)||[]).length===4,"Google G must retain all four brand colors");
assert.ok(auth.includes('const emailEnabled=Boolean(data.providers?.email)'),"Email must be Preview-only by API flag");
assert.ok(auth.includes("window.sdAccountBridge?.onAuth(active)"),"OAuth session must trigger cloud-account sync");
assert.ok(html.includes("if(accountSyncMode==='cloud')"),"Cloud account branch is required");
assert.ok(!html.includes("Đăng nhập không tự động liên kết đơn hàng cũ; Shop sẽ bổ sung"),"Outdated local-only notice must be removed");
console.log("PASS: customer Google account UI syntax, login-triggered cloud sync and token-verified order hooks.");
