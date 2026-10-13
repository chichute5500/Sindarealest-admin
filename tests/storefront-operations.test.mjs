import assert from 'node:assert/strict';
import { onRequest as seoMiddleware } from '../functions/_middleware.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as createWarrantyClaim } from '../functions/api/warranty-claims.js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';
import { onRequestGet as robots } from '../functions/robots.txt.js';
import { readFileSync } from 'node:fs';
const storefrontHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
assert.ok(storefrontHtml.includes('id="warrantyLookupForm"') && storefrontHtml.includes('/api/warranty-lookup') && !storefrontHtml.includes('warrantyOtpStep') && !storefrontHtml.includes('/api/warranty-verification'), 'Warranty lookup must work without OTP');
assert.ok(storefrontHtml.includes('Sequential welcome reveal') && storefrontHtml.includes('welcome-content>.welcome-logo') && storefrontHtml.includes('welcome-content>.welcome-skip'), 'Welcome should reveal the logo and brand intro sequentially before the entry button');
assert.ok(storefrontHtml.includes('html.theme-transitioning body:after') && storefrontHtml.includes('html.theme-transitioning .theme-bg') && storefrontHtml.includes('transition-duration:.25s!important;transition-timing-function:ease!important'), 'Theme-related transitions must be capped at 250 ms when switching themes');
assert.ok(storefrontHtml.includes('class="hero-stamp-image-spacer"') && storefrontHtml.includes('CRAFTED WITH<br>CHARACTER') && !storefrontHtml.includes('<div class="hero-stamp"><img'), 'Remove only the cutout emblem in the Crafted With Character stamp while preserving text spacing');
assert.ok(storefrontHtml.includes('id="checkoutProvince"') && storefrontHtml.includes('id="checkoutWard"') && storefrontHtml.includes('streetAddress'), 'Checkout must collect province, ward, and detailed street address');
const warrantyClaimSource = readFileSync(new URL('../functions/api/warranty-claims.js', import.meta.url), 'utf8');
const backupSource = readFileSync(new URL('../functions/api/admin/backup.js', import.meta.url), 'utf8');
const restoreSource = readFileSync(new URL('../functions/api/admin/restore.js', import.meta.url), 'utf8');
for (const table of ['customer_address_details','order_shipping_addresses','order_item_details','warranty_claim_attachments']) {
  assert.ok(backupSource.includes('SELECT * FROM ' + table), 'Backup must include ' + table);
  assert.ok(restoreSource.includes('INSERT INTO ' + table), 'Restore must reinsert ' + table);
}
assert.ok(restoreSource.includes('DELETE FROM warranty_claim_uploads') && restoreSource.includes("DELETE FROM settings WHERE key LIKE 'warranty_upload:%'") && !restoreSource.includes('DELETE FROM warranty_verifications'), 'Restore must clear temporary uploads without requiring OTP tables');
const uploadSource = readFileSync(new URL('../functions/api/warranty-claim-uploads.js', import.meta.url), 'utf8');
assert.ok(uploadSource.includes('INSERT INTO settings(key,value,updated_at)') && uploadSource.includes('warranty_upload:'), 'New uploads must store short-lived tokens in the existing settings table');
assert.ok(warrantyClaimSource.includes('warranty_upload:') && warrantyClaimSource.includes('DELETE FROM settings WHERE key=?'), 'Claim submission must validate and consume the upload token');
assert.ok(restoreSource.includes('operations.warrantyClaimAttachments'), 'Restore must preserve claim attachment metadata');
assert.ok(!warrantyClaimSource.includes('warranty_verifications') && warrantyClaimSource.includes('warranty.status!=="active"'), 'Warranty claims must not require OTP and must require an active warranty');
const warrantyLookupSource = readFileSync(new URL('../functions/api/warranty-lookup.js', import.meta.url), 'utf8');
assert.ok(warrantyLookupSource.includes('maskedWarrantyCode') && !warrantyLookupSource.includes('customer_id') && !warrantyLookupSource.includes('phone'), 'Public warranty lookup must not expose customer personal data');
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
            assert.deepEqual(values, ['test-sneaker', 'test-sneaker', 'test-sneaker']);
            return { id: 'test-sneaker', slug: 'test-sneaker', sku: 'SD-SN001', title: 'Giày thử', description: 'Mô tả giày', images_json: '["images/example.webp"]', category_label: 'Sneaker', published: 1 };
          }
        };
      }
    };
  }
};
response = await seoMiddleware({ request:new Request('https://shop.example/san-pham/test-sneaker'), env:{DB:seoDB}, next:async (request)=>{assert.equal(new URL(request.url).pathname,'/index.html');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})} });
text = await response.text();
assert.equal(response.status,200);
assert.match(text,/<title>Giày thử \| SinDarealest<\/title>/);
assert.match(text,/og:title" content="Giày thử \| SinDarealest/);
assert.match(text,/og:image" content="https:\/\/shop\.example\/images\/example\.webp/);
assert.match(text,/application\/ld\+json/);

response = await createOrder({request:new Request('https://shop.example/api/orders',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin order submission is rejected');
response = await createWarrantyClaim({request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin warranty submission is rejected');
const sitemapResponse = await sitemap({ request:new Request('https://shop.example/sitemap.xml'), env:{DB:{prepare(){return {async all(){return {results:[{id:'test-product-id',slug:'test-sneaker',updated_at:'2026-01-01 00:00:00'}]}}}}}} });
const sitemapText = await sitemapResponse.text();
assert.equal(sitemapResponse.status,200);
assert.match(sitemapText,/https:\/\/shop\.example\/san-pham\/test-product-id/);
const robotsText = await (await robots({request:new Request('https://shop.example/robots.txt')})).text();
assert.match(robotsText,/Disallow: \/admin\//);
assert.match(robotsText,/Sitemap: https:\/\/shop\.example\/sitemap\.xml/);
console.log('PASS: homepage/product SEO metadata, absolute social preview URLs, JSON-LD, sitemap/robots, and cross-origin request rejection.');
