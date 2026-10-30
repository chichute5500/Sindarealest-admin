import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequest as middleware } from '../functions/_middleware.js';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
const notFound=readFileSync(new URL('../public/404.html',import.meta.url),'utf8');
const withoutInlineScripts=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
assert.equal((withoutInlineScripts.match(/<main\b/gi)||[]).length,1,'Homepage must have just one main landmark');
assert.equal((withoutInlineScripts.match(/<h1\b/gi)||[]).length,1,'Homepage must have one live H1');
assert.match(withoutInlineScripts, /id="sdh-title"/,'Original Hero H1 must stay');
assert.doesNotMatch(withoutInlineScripts, /id="notFoundPage"/,'404 belongs to a separate page, not homepage DOM');
assert.match(notFound, /id="sdNotFoundPage"/);
assert.match(notFound,/name="robots" content="noindex,nofollow"/);
assert.match(html,/Nghệ thuật chế tác độc bản/);
assert.match(html,/Tư vấn đặt sản phẩm theo yêu cầu qua Zalo/);
assert.match(html,/Vui lòng kiểm tra hộp thư đến hoặc thư mục Spam/);
assert.doesNotMatch(html,/Mailjet Stats|Delivered\/Bounced\/Blocked|Email trên Preview/);
assert.match(html,/id="orderDetailsToggle" aria-expanded="true"/);
assert.match(html,/id="orderDetailsPanel" class="order-details-panel">/);
assert.match(html,/function updateAccountAddressPrivacy\(\)/);
assert.match(html,/accountSyncMode==='cloud'\?'Lưu vào tài khoản'/);
assert.match(html,/id="catalogGrid"/);
assert.match(html,/<noscript><nav aria-label="Danh mục SinDarealest"/);
assert.match(html,/id="sd-ux-audit-motion-20261031"/);
assert.match(admin,/\/\* sd-admin-ux-audit-motion-20261031 \*\//);
assert.equal((admin.match(/<\/style>/g)||[]).length,1,'Admin must retain Owner-approved single stylesheet');
assert.match(html,/prefers-reduced-motion:reduce/);
assert.match(admin,/prefers-reduced-motion:reduce/);
for(const file of [html,admin])assert.match(file,/cubic-bezier\(\.22,1,\.36,1\)/);
for(const file of [html,admin]){
 const motion=file===admin
  ? file.match(/\/\* sd-admin-ux-audit-motion-20261031 \*\/([\s\S]*?)<\/style>/)
  : file.match(/<style id="sd-ux-audit-motion-20261031">([\s\S]*?)<\/style>/);
 assert.ok(motion,'Motion rules must be separately scoped');
 assert.doesNotMatch(motion[1],/\b(?:transition|animation)[^;\n]*(?:height|width|top|left)\s*:/i);
}
const next=async(request)=>new Response('<html><body><main id="sdNotFoundPage"><h1>404</h1>Không tìm thấy trang</main></body></html>',{headers:{'content-type':'text/html'}});
const response=await middleware({
 request:new Request('https://shop.example/unknown-test-route'),
 env:{},
 next
});
assert.equal(response.status,404);
assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
assert.match(await response.text(),/sdNotFoundPage/);
const passThrough=await middleware({
 request:new Request('https://shop.example/favicon.ico'),
 env:{},
 next:async()=>new Response('asset',{status:200})
});
assert.equal(passThrough.status,200,'Static assets should not be trapped by custom 404');
console.log('PASS: public copy, SEO semantics, real 404, shipping sync, visible four steps and scoped motion.');
