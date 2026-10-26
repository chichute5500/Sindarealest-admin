import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { onRequest } from '../functions/_middleware.js';
import { clearSessionCookie, createSession, verifySession } from '../functions/_lib.js';

const secret = 'test-session-secret-which-is-long-enough-123456';
const token = await createSession(secret);
const clearCookie = clearSessionCookie();
const request = new Request('https://sindarealest.example/api/admin/logout', {
  method: 'POST',
  headers: { cookie: `sd_admin_session=${token}` },
});
const response = await onRequest({
  request,
  env: { ADMIN_PASSWORD: 'test-admin-password-long', SESSION_SECRET: secret },
  next: async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearCookie },
  }),
});
assert.equal(response.status, 200);
assert.equal(response.headers.get('Set-Cookie'), clearCookie, 'Logout must keep the clear-cookie response and must not append a fresh authenticated session');
assert.doesNotMatch(response.headers.get('Set-Cookie') || '', /sd_admin_session=[^.]+\./, 'Logout must not issue a new session token');

// The signed session slides forward only upon a successful, same-site Admin
// request. This lets an unchanged import tab keep uploading for hours while
// the token still expires 10 minutes after the final successful request.
const realNow=Date.now;
const base=realNow();
const env={ADMIN_PASSWORD:'test-admin-password-long',SESSION_SECRET:secret,DB:{}};
try{
  Date.now=()=>base;
  const first=await createSession(secret);
  const mk=(jwt,origin='https://sindarealest.example')=>new Request('https://sindarealest.example/api/admin/products',{
    method:'GET',headers:{Cookie:'sd_admin_session='+jwt,Origin:origin}
  });
  Date.now=()=>base+9*60*1000;
  const refreshed=await onRequest({request:mk(first),env,next:async()=>new Response('{"products":[]}',{
    status:200,headers:{'Content-Type':'application/json'}})});
  assert.equal(refreshed.status,200);
  const setCookie=refreshed.headers.get('Set-Cookie')||'';
  assert.match(setCookie,/^sd_admin_session=/);
  assert.match(setCookie,/HttpOnly; Secure; SameSite=Strict; Max-Age=600/);
  const nextToken=setCookie.split(';')[0].split('=')[1];
  assert.ok(nextToken&&nextToken!==first,'Successful API use reissues short-lived session');
  Date.now=()=>base+11*60*1000;
  assert.equal(await verifySession(mk(first),env),false,'Original 10-minute token expires');
  assert.equal(await verifySession(mk(nextToken),env),true,'Upload activity extends session without page reload');
  const expired=await onRequest({request:mk(first),env,next:async()=>new Response('{"ok":false}',{status:401})});
  assert.equal(expired.headers.has('Set-Cookie'),false,'Expired token cannot renew itself');
  const failure=await onRequest({request:mk(nextToken),env,next:async()=>new Response('error',{status:503})});
  assert.equal(failure.headers.has('Set-Cookie'),false,'Server errors do not renew a session');
  const otherSite=await onRequest({request:mk(nextToken,'https://outside.example'),env,
    next:async()=>new Response('incorrectly accepted',{status:200})});
  assert.equal(otherSite.headers.has('Set-Cookie'),false,'Cross-site requests cannot refresh a session');
  Date.now=()=>base+20*60*1000;
  assert.equal(await verifySession(mk(nextToken),env),false,'No activity for 10 minutes always expires refreshed token');
}finally{
  Date.now=realNow;
}
// Dormant Admin page must not revoke shared cookie while a separate import
// tab is still creating products. Explicit logout continues to call the API.
const adminHtml=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.match(adminHtml,/async function logout\(inactive=false\)\{clearTimeout\(inactivityTimer\);[^]*?if\(!inactive\)\{try\{await api\('\/api\/admin\/logout'/);
assert.match(adminHtml,/inactivityTimer=setTimeout\(\(\)=>logout\(true\),600000\)/);
const importerHtml=readFileSync(new URL('../public/admin/import.html',import.meta.url),'utf8');
assert.match(importerHtml,/setInterval\(refreshActiveImportSession,60_000\)/);
assert.match(importerHtml,/if\(!busy && now-lastImportActivity>=9\*60\*1000\)return/);
assert.match(importerHtml,/fetch\("\/api\/admin\/session",\{method:"GET",credentials:"same-origin"/);
console.log('PASS: 10-minute sliding session, idle-tab isolation, import heartbeat, same-site and expired-session guards.');
console.log('Admin session rotation regression tests passed.');
