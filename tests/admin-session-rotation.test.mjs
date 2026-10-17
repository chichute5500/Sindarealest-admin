import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';
import { clearSessionCookie, createSession } from '../functions/_lib.js';

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

console.log('Admin session rotation regression tests passed.');
