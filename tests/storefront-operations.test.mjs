import assert from 'node:assert/strict';
import { onRequest as seoMiddleware } from '../functions/_middleware.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as createWarrantyClaim } from '../functions/api/warranty-claims.js';
import { onRequestPost as lookupWarranty } from '../functions/api/warranty-lookup.js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';
import { onRequestGet as robots } from '../functions/robots.txt.js';
import { readFileSync } from 'node:fs';
const storefrontHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
assert.ok(storefrontHtml.includes('id="warrantyLookupForm"') && storefrontHtml.includes('/api/warranty-lookup') && !storefrontHtml.includes('warrantyOtpStep') && !storefrontHtml.includes('/api/warranty-verification'), 'Warranty lookup must work without OTP');
assert.ok(storefrontHtml.includes('Sequential welcome reveal') && storefrontHtml.includes('welcome-content>.welcome-logo') && storefrontHtml.includes('welcome-content>.welcome-skip'), 'Welcome should reveal the logo and brand intro sequentially before the entry button');
assert.ok(storefrontHtml.includes('html.theme-transitioning body:after') && storefrontHtml.includes('html.theme-transitioning .theme-bg') && storefrontHtml.includes('transition-duration:.25s!important;transition-timing-function:ease!important'), 'Theme-related transitions must be capped at 250 ms when switching themes');
assert.ok(!storefrontHtml.includes('CRAFTED WITH<br>CHARACTER') && !storefrontHtml.includes('hero-stamp-image-spacer') && !storefrontHtml.includes('.hero-stamp{'), 'Entire unwanted hero stamp and glass styling must be removed while preserving the sneaker hero');
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
assert.ok(warrantyLookupSource.includes('maskedWarrantyCode') && warrantyLookupSource.includes('maskedPhone') && warrantyLookupSource.includes('maskedAddress') && !warrantyLookupSource.includes('fullName:row.full_name') && !warrantyLookupSource.includes('address:row.purchaseAddress'), 'Public warranty lookup must mask personal details in its response');
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
  warranty_code: demoWarrantyCode, duration_months: 12, starts_at: '2026-01-01', ends_at: '2027-01-01', status: 'active',
  sku: 'SD-SN001', title: 'Giày thử', size: '42', purchasedAt: '2026-02-01 12:00:00', orderNumber: 'SD-ABC-123456',
  fullName: 'Nguyễn Văn An', customerPhone: '0901234567', purchaseAddress: '123 Đường thử, Phường thử, Lâm Đồng',
  imagesJson: '["images/example.webp"]'
};
function warrantyDB() {
  return {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() { return { meta: { changes: 1 } }; },
            async first() {
              if (sql.includes('SELECT attempts FROM public_rate_limits')) return { attempts: 1 };
              if (sql.includes('FROM warranties w') && sql.includes('upper(w.warranty_code)=?')) return demoWarrantyRow;
              return null;
            },
            async all() {
              if (sql.includes('FROM warranties w') && sql.includes('substr(')) return { results: [demoWarrantyRow] };
              return { results: [] };
            }
          };
        }
      };
    }
  };
}
const codeLookup = await lookupWarranty({
  request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.11'},body:JSON.stringify({lookup:demoWarrantyCode})}),
  env:{DB:warrantyDB()}
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
assert.ok(!JSON.stringify(lookupPayload).includes('Nguyễn Văn An'),'Full customer name must not be returned');
const phoneLookup = await lookupWarranty({
  request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.12'},body:JSON.stringify({lookup:'090 123 4567'})}),
  env:{DB:warrantyDB()}
});
assert.equal(phoneLookup.status,200,'Phone lookup should return warranty records without OTP');
lookupPayload = await phoneLookup.json();
assert.equal(lookupPayload.warranties.length,1);
assert.equal(lookupPayload.warranties[0].maskedWarrantyCode,'••••AAAA');
assert.ok(!JSON.stringify(lookupPayload).includes('0901234567'),'Raw customer phone must not be returned');

console.log('PASS: homepage/product SEO metadata, SKU URLs, masked warranty lookup by code/phone, sitemap/robots, and cross-origin request rejection.');
