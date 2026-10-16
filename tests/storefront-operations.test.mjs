import assert from 'node:assert/strict';
import { onRequest as seoMiddleware } from '../functions/_middleware.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as createWarrantyClaim } from '../functions/api/warranty-claims.js';
import { onRequestPost as lookupWarranty } from '../functions/api/warranty-lookup.js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';
import { onRequestGet as robots } from '../functions/robots.txt.js';
import { onRequest as unknownApiRoute } from '../functions/api/[[path]].js';
import { readFileSync } from 'node:fs';
const storefrontHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
assert.ok(storefrontHtml.includes('id="warrantyLookupForm"') && storefrontHtml.includes('/api/warranty-lookup') && !storefrontHtml.includes('warrantyOtpStep') && !storefrontHtml.includes('/api/warranty-verification'), 'Warranty lookup must work without OTP');
assert.ok(storefrontHtml.includes('Sequential welcome reveal') && storefrontHtml.includes('welcome-content>.welcome-logo') && storefrontHtml.includes('welcome-content>.welcome-skip'), 'Welcome should reveal the logo and brand intro sequentially before the entry button');
assert.ok(storefrontHtml.includes('html.theme-transitioning body:after') && storefrontHtml.includes('html.theme-transitioning .theme-bg') && storefrontHtml.includes('transition-duration:.25s!important;transition-timing-function:ease!important'), 'Theme-related transitions must be capped at 250 ms when switching themes');
assert.ok(
  (storefrontHtml.match(/<div class="service glass tap-target"/g) || []).length === 5 &&
  storefrontHtml.includes('<a class="service glass tap-target" href="https://zalo.me/0827049192"') &&
  storefrontHtml.includes('.service-strip .service:not(:last-child)::after{display:none!important}') &&
  storefrontHtml.includes('.glass{background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(24px) saturate(145%)') &&
  !storefrontHtml.includes('--sd-service-glass') &&
  !storefrontHtml.includes('--sd-service-border'),
  'All six brand-benefit tiles must use the original shared .glass component without custom dark/light surface overrides'
);
assert.ok(
  storefrontHtml.includes('<div class="detail-copy glass">') &&
  storefrontHtml.includes('.glass{background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(24px) saturate(145%)') &&
  storefrontHtml.includes('--glass:rgba(255,255,255,.40)') &&
  storefrontHtml.includes('html.dark{color-scheme:dark;--page:#050505;--ink:#f5f1e9;--muted:#c6bdad;--gold:#d8b36d;--gold-hi:#f1d6a0;--line:rgba(255,246,224,.28);--nav-bg:rgba(9,9,9,.50);--nav-glass-hover:rgba(255,255,255,.22);--glass:rgba(255,255,255,.40)') &&
  !storefrontHtml.includes('--sd-detail-panel') &&
  !storefrontHtml.includes('--sd-detail-highlight'),
  'Product detail information must reuse the original shared .glass surface in both themes without custom competing glass tokens'
);
assert.ok(
  storefrontHtml.includes('.featured-arrow:active,.slide-controls button:active{') &&
  storefrontHtml.includes('transform:scale(.8)!important;') &&
  storefrontHtml.includes('transform:translateY(-50%) scale(.8)!important;') &&
  storefrontHtml.includes('cubic-bezier(.34,1.56,.64,1)') &&
  storefrontHtml.includes('touch-action:manipulation;'),
  'Featured, in-page gallery, and fullscreen arrows must shrink to 80% on press and spring back without losing their vertical anchor'
);
assert.ok(
  storefrontHtml.includes('@keyframes sdGalleryOutLeft{to{opacity:.8;transform:translateX(-11%) scale(.985);filter:blur(1.5px)}}') &&
  storefrontHtml.includes('@keyframes sdGalleryOutRight{to{opacity:.8;transform:translateX(11%) scale(.985);filter:blur(1.5px)}}') &&
  storefrontHtml.includes('@keyframes sdGalleryInRight{from{opacity:.8;transform:translateX(11%) scale(.985);filter:blur(1.5px)}to{opacity:1;transform:translateX(0) scale(1);filter:blur(0)}}') &&
  storefrontHtml.includes('@keyframes sdGalleryInLeft{from{opacity:.8;transform:translateX(-11%) scale(.985);filter:blur(1.5px)}to{opacity:1;transform:translateX(0) scale(1);filter:blur(0)}}'),
  'Gallery transitions must briefly reduce opacity by about 20%, blur lightly, slide in the requested direction, then restore full sharpness'
);
assert.ok(
  storefrontHtml.includes("thumbs=$$('.detail-thumb')") &&
  !storefrontHtml.includes("thumbs=$('.detail-thumb')") &&
  storefrontHtml.includes('function clearGalleryTransitionClasses(img)') &&
  storefrontHtml.includes('clearTimeout(fullscreenSwapTimer);fullscreenSwapTimer=null;') &&
  storefrontHtml.includes("main.getAttribute('src')!==selected"),
  'Fullscreen arrow navigation must not throw, and closing zoom must restore a clear, correctly selected detail image'
);
assert.ok(
  storefrontHtml.includes('.featured-product-card [data-feature-track]{transition:transform 1.45s') &&
  storefrontHtml.includes('sdFeaturedImageShift .76s') &&
  storefrontHtml.includes('transition:opacity .52s ease,filter .52s ease,transform .52s') &&
  storefrontHtml.includes('transition:opacity .64s ease,filter .64s ease,transform .64s') &&
  storefrontHtml.includes('@keyframes sdGalleryOutLeft') &&
  storefrontHtml.includes('@keyframes sdGalleryOutRight') &&
  storefrontHtml.includes('@keyframes sdGalleryInRight') &&
  storefrontHtml.includes('@keyframes sdGalleryInLeft') &&
  storefrontHtml.includes('setFullscreenPhoto(next,direction)') &&
  storefrontHtml.includes('detailSwapTimer=setTimeout(swap,230)') &&
  storefrontHtml.includes('@media(prefers-reduced-motion:reduce)'),
  'Image transitions must combine subtle fade/zoom with the requested longer timing while respecting reduced-motion preferences'
);
assert.ok(!storefrontHtml.includes('CRAFTED WITH<br>CHARACTER') && !storefrontHtml.includes('hero-stamp-image-spacer') && !storefrontHtml.includes('.hero-stamp{'), 'Entire unwanted hero stamp and glass styling must be removed while preserving the sneaker hero');
assert.ok(!storefrontHtml.includes('id="heroDarkShoe"') && !storefrontHtml.includes('id="heroLightShoe"') && !storefrontHtml.includes('hero-art'), 'Hero product images must be removed from the storefront intro');
assert.ok(storefrontHtml.includes('SinDarealest mang đến những sản phẩm thời trang da cá sấu cao cấp') && storefrontHtml.includes('Khám phá bộ sưu tập') && storefrontHtml.includes('Khám phá sản phẩm'), 'Hero intro copy and both calls to action must remain after removing product imagery');
assert.ok(storefrontHtml.includes('.theme-bg{position:fixed;inset:0') && storefrontHtml.includes('transform:none;will-change:opacity'), 'Background artwork should not scale or drift while scrolling');
assert.ok(!storefrontHtml.includes('sd-admin-shortcut') && !storefrontHtml.includes('href="/admin/"'), 'The public storefront must not expose a management link while admin remains at its separate route');
assert.ok(storefrontHtml.includes('sdMenuItemIn') && storefrontHtml.includes('mobile-nav.open .navlink:nth-child(6)'), 'Mobile glass menu items should animate in a staggered sequence');
assert.ok(!storefrontHtml.includes("(mod&&['u','s','c'].includes(k))") && storefrontHtml.includes("e.target.closest('img, picture')"), 'Text selection and copy must remain available outside protected images');
assert.ok(storefrontHtml.includes('id="checkoutProvince"') && storefrontHtml.includes('id="checkoutWard"') && storefrontHtml.includes('streetAddress'), 'Checkout must collect province, ward, and detailed street address');
const warrantyClaimSource = readFileSync(new URL('../functions/api/warranty-claims.js', import.meta.url), 'utf8');
const backupSource = readFileSync(new URL('../functions/api/admin/backup.js', import.meta.url), 'utf8');
const restoreSource = readFileSync(new URL('../functions/api/admin/restore.js', import.meta.url), 'utf8');
for (const table of ['customer_address_details','order_shipping_addresses','order_item_details','warranty_claim_attachments']) {
  assert.ok(backupSource.includes('SELECT * FROM ' + table), 'Backup must include ' + table);
  assert.ok(restoreSource.includes('INSERT INTO ' + table), 'Restore must reinsert ' + table);
}
assert.ok(!restoreSource.includes('warranty_claim_uploads') && !restoreSource.includes('warranty_verifications') && restoreSource.includes("DELETE FROM settings WHERE key LIKE 'warranty_upload:%'") && restoreSource.includes("DELETE FROM settings WHERE key LIKE 'warranty_lookup:%'"), 'Restore must clear temporary upload and lookup tokens without requiring retired OTP tables');
const uploadSource = readFileSync(new URL('../functions/api/warranty-claim-uploads.js', import.meta.url), 'utf8');
assert.ok(uploadSource.includes('INSERT INTO settings(key,value,updated_at)') && uploadSource.includes('warranty_upload:'), 'New uploads must store short-lived tokens in the existing settings table');
assert.ok(warrantyClaimSource.includes('warranty_upload:') && warrantyClaimSource.includes('DELETE FROM settings WHERE key=?'), 'Claim submission must validate and consume the upload token');
assert.ok(restoreSource.includes('operations.warrantyClaimAttachments'), 'Restore must preserve claim attachment metadata');
assert.ok(!warrantyClaimSource.includes('warranty_verifications') && warrantyClaimSource.includes('warranty.status!=="active"'), 'Warranty claims must not require OTP and must require an active warranty');
const warrantyLookupSource = readFileSync(new URL('../functions/api/warranty-lookup.js', import.meta.url), 'utf8');
assert.ok(warrantyLookupSource.includes('maskedWarrantyCode') && warrantyLookupSource.includes('claimToken') && !warrantyLookupSource.includes('warrantyCode: code') && warrantyLookupSource.includes('maskedPhone') && warrantyLookupSource.includes('maskedAddress'), 'Public warranty lookup must return masked data and a short-lived action token');
assert.ok(uploadSource.includes('form.get("claimToken")') && warrantyClaimSource.includes('body?.claimToken'), 'Warranty photo upload and claim submission must resolve tokens server-side');
assert.ok(!storefrontHtml.includes('OTP') && !storefrontHtml.includes('otp') && !warrantyClaimSource.includes('ticketId'), 'Customer warranty flows must not include OTP or session tickets');
const adminOrdersSource = readFileSync(new URL('../functions/api/admin/orders.js', import.meta.url), 'utf8');
assert.ok(adminOrdersSource.includes('COALESCE(sa.full_address,c.address)') && adminOrdersSource.includes('LEFT JOIN order_shipping_addresses'), 'Admin orders must show the shipping address captured for that order');
assert.ok(storefrontHtml.includes('id="claimIssueType"') && storefrontHtml.includes('id="claimContactPhone"'), 'Warranty claim form must capture issue type and contact details');

const html = '<!doctype html><html><head><meta name="description" content="Home"><meta property="og:title" content="Home"><meta property="og:image" content="/og-sindarealest.jpg"><meta name="twitter:image" content="/og-sindarealest.jpg"><link rel="canonical" href="/"><title>Home</title></head><body></body></html>';
const homepageContext = { request: new Request('https://shop.example/'), env: {}, next: async () => new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}) };
let response = await seoMiddleware(homepageContext);
let text = await response.text();
assert.equal(response.status,200);
assert.match(text,/og:url" content="https:\/\/shop\.example\//);
assert.match(text,/og:image" content="https:\/\/shop\.example\/og-sindarealest\.jpg/);
assert.match(text,/canonical" href="https:\/\/shop\.example\//);

const seoDB = {
  prepare(sql) {
    return {
      bind(...values) {
        return {
          async first() {
            assert.match(sql, /lower\(slug\)=\?/);
            assert.deepEqual(values, [new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase(),new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase(),new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase()]);
            return { id: 'product-id-123', slug: 'test-sneaker', sku: 'SD-SN001', title: 'Giày thử', description: 'Mô tả giày', images_json: '["images/example.webp"]', category_label: 'Sneaker', published: 1 };
          }
        };
      }
    };
  }
};
const legacyResponse = await seoMiddleware({ request:new Request('https://shop.example/san-pham/test-sneaker'), env:{DB:seoDB}, next:async () => new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}) });
assert.equal(legacyResponse.status,301,'Legacy slug routes must redirect to the SKU URL');
assert.equal(legacyResponse.headers.get('Location'),'https://shop.example/san-pham/SD-SN001');
response = await seoMiddleware({ request:new Request('https://shop.example/san-pham/SD-SN001'), env:{DB:seoDB}, next:async (request)=>{assert.equal(new URL(request.url).pathname,'/index.html');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})} });
text = await response.text();
assert.equal(response.status,200);
assert.ok(text.includes('<title>Giày thử | SinDarealest</title>'));
assert.ok(text.includes('og:title" content="Giày thử | SinDarealest'));
assert.ok(text.includes('og:url" content="https://shop.example/san-pham/SD-SN001'));
assert.ok(text.includes('og:image" content="https://shop.example/images/example.webp'));
assert.ok(text.includes('og:description" content="Mô tả giày · Mã sản phẩm: SD-SN001'), 'Product social preview should include the SKU even when descriptions are long');
assert.match(text,/application\/ld\+json/);

response = await createOrder({request:new Request('https://shop.example/api/orders',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin order submission is rejected');
response = await createWarrantyClaim({request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin warranty submission is rejected');
const sitemapResponse = await sitemap({ request:new Request('https://shop.example/sitemap.xml'), env:{DB:{prepare(sql){assert.match(sql,/SELECT id,slug,sku,updated_at/);return {async all(){return {results:[{id:'test-product-id',slug:'test-sneaker',sku:'SD-SN001',updated_at:'2026-01-01 00:00:00'}]}}}}}} });
const sitemapText = await sitemapResponse.text();
assert.equal(sitemapResponse.status,200);
assert.match(sitemapText,/https:\/\/shop\.example\/san-pham\/SD-SN001/);
const robotsText = await (await robots({request:new Request('https://shop.example/robots.txt')})).text();
assert.match(robotsText,/Disallow: \/admin\//);
assert.match(robotsText,/Sitemap: https:\/\/shop\.example\/sitemap\.xml/);

const demoWarrantyCode = 'SDW-' + 'A'.repeat(24);
const demoWarrantyRow = {
  id:'warranty-id-1', warrantyId:'warranty-id-1', order_id:'order-id-1', customer_id:'customer-id-1',
  warranty_code: demoWarrantyCode, duration_months: 12, starts_at: '2026-01-01', ends_at: '2027-01-01', status: 'active',
  sku: 'SD-SN001', title: 'Giày thử', size: '42', purchasedAt: '2026-02-01 12:00:00', orderNumber: 'SD-ABC-123456',
  fullName: 'Nguyễn Văn An', customerPhone: '0901234567', purchaseAddress: '123 Đường thử, Phường thử, Lâm Đồng',
  imagesJson: '["images/example.webp"]'
};
function warrantyDB() {
  const settings = new Map();
  const query = (sql, values=[]) => ({
    async run() {
      if (sql.includes('INSERT INTO settings')) settings.set(values[0],{value:values[1],updated_at:new Date().toISOString().replace('T',' ').replace('Z','')});
      if (sql.includes('DELETE FROM settings WHERE key=?')) settings.delete(values[0]);
      return { meta: { changes: 1 } };
    },
    async first() {
      if (sql.includes('SELECT attempts FROM public_rate_limits')) return { attempts: 1 };
      if (sql.includes('FROM settings WHERE key=?')) return settings.get(values[0]) || null;
      if (sql.includes('FROM warranties w') && sql.includes('upper(w.warranty_code)=?')) return demoWarrantyRow;
      return null;
    },
    async all() {
      if (sql.includes('FROM warranties w') && sql.includes('substr(')) return { results: [demoWarrantyRow] };
      return { results: [] };
    }
  });
  return {
    prepare(sql) { return { ...query(sql), bind(...values) { return query(sql,values); } }; },
    async batch(statements) { for (const statement of statements) await statement.run(); return []; }
  };
}
const warrantyDBInstance = warrantyDB();
const codeLookup = await lookupWarranty({
  request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.11'},body:JSON.stringify({lookup:demoWarrantyCode})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(codeLookup.status,200,'Warranty-code lookup should work without OTP');
let lookupPayload = await codeLookup.json();
assert.equal(lookupPayload.warranty.maskedWarrantyCode,'••••AAAA');
assert.equal(lookupPayload.warranty.maskedPhone,'090••••67');
assert.equal(lookupPayload.warranty.maskedAddress,'••••, Phường thử, Lâm Đồng');
assert.equal(lookupPayload.warranty.maskedName,'N••• V••• A•••');
assert.equal(lookupPayload.warranty.title,'Giày thử');
assert.equal(lookupPayload.warranty.size,'42');
assert.equal(lookupPayload.warranty.purchasedAt,'2026-02-01');
assert.equal(lookupPayload.warranty.eligible,true);
assert.ok(!JSON.stringify(lookupPayload).includes('123 Đường thử'),'Raw street address must not be returned');
assert.ok(!JSON.stringify(lookupPayload).includes(demoWarrantyCode),'Raw warranty code must not be returned');
const codeActionToken = lookupPayload.warranty.claimToken;
assert.match(codeActionToken,/^[0-9a-f]{32}$/);
assert.ok(!JSON.stringify(lookupPayload).includes('Nguyễn Văn An'),'Full customer name must not be returned');
const phoneLookup = await lookupWarranty({
  request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.12'},body:JSON.stringify({lookup:'090 123 4567'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(phoneLookup.status,200,'Phone lookup should return warranty records without OTP');
lookupPayload = await phoneLookup.json();
assert.equal(lookupPayload.warranties.length,1);
assert.equal(lookupPayload.warranties[0].maskedWarrantyCode,'••••AAAA');
assert.ok(!JSON.stringify(lookupPayload).includes(demoWarrantyCode),'Phone lookup must not expose the raw warranty code');
assert.ok(!JSON.stringify(lookupPayload).includes('0901234567'),'Raw customer phone must not be returned');


const claimResponse = await createWarrantyClaim({
  request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.13'},body:JSON.stringify({claimToken:codeActionToken,issueType:'other',contactPhone:'0901234567',message:'Lỗi bề mặt cần kiểm tra'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(claimResponse.status,201,'Temporary lookup token should authorize a warranty claim without exposing the raw code');
const reusedTokenResponse = await createWarrantyClaim({
  request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.14'},body:JSON.stringify({claimToken:codeActionToken,issueType:'other',message:'Một lần gửi lại để thử token'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(reusedTokenResponse.status,400,'A consumed lookup token must not authorize a second claim');


for (const method of ['GET', 'POST']) {
  const missingApi = await unknownApiRoute({
    request: new Request('https://shop.example/api/admin/removed-experiment', { method }),
  });
  assert.equal(missingApi.status, 404, 'Unknown API routes must return 404 instead of the storefront fallback');
  assert.ok((missingApi.headers.get('Content-Type') || '').toLowerCase().includes('application/json'));
  assert.equal(missingApi.headers.get('Cache-Control'), 'no-store');
  const missingApiPayload = await missingApi.json();
  assert.equal(missingApiPayload.code, 'API_ROUTE_NOT_FOUND');
}

console.log('PASS: SKU SEO URLs, masked warranty lookups, expiring claim tokens, sitemap/robots, and cross-origin request rejection.');
