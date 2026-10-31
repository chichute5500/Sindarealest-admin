import assert from 'node:assert/strict';
import { onRequest as seoMiddleware } from '../functions/_middleware.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as createWarrantyClaim } from '../functions/api/warranty-claims.js';
import { onRequestPost as lookupWarranty } from '../functions/api/warranty-lookup.js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';
import { onRequestGet as robots } from '../functions/robots.txt.js';
import { readFileSync } from 'node:fs';
const themeCacheHeaders = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const adminThemeHtml = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
assert.ok(!adminThemeHtml.includes("'/images/theme-croc-dark.webp?v=20261017-1'"), 'Admin product cards must not use a branded theme texture as a fallback product photo');
assert.ok(!/theme-croc-dark\.webp(?!\?v=)/.test(adminThemeHtml), 'Any Admin dark texture asset reference must retain a cache-busting version query');
assert.ok(themeCacheHeaders.includes('/images/theme-croc-dark.webp\n  ! Cache-Control\n  Cache-Control: public, max-age=0, must-revalidate'), 'Dark theme asset must detach inherited immutable caching and revalidate when its stable path is requested');
assert.ok(themeCacheHeaders.includes('/images/theme-croc-albino.webp\n  ! Cache-Control\n  Cache-Control: public, max-age=0, must-revalidate'), 'Light theme asset must detach inherited immutable caching and revalidate when its stable path is requested');
const warrantyClaimSource = readFileSync(new URL('../functions/api/warranty-claims.js', import.meta.url), 'utf8');
const backupSource = readFileSync(new URL('../functions/api/admin/backup.js', import.meta.url), 'utf8');
const restoreSource = readFileSync(new URL('../functions/api/admin/restore.js', import.meta.url), 'utf8');
for (const table of ['customer_address_details','order_shipping_addresses','order_item_details','warranty_claim_attachments']) {
  assert.ok(backupSource.includes('boundedTableQuery(db, "' + table + '"'), 'Backup must include bounded query for ' + table);
  assert.ok(restoreSource.includes('INSERT INTO ' + table), 'Restore must reinsert ' + table);
}
assert.ok(restoreSource.includes('DELETE FROM warranty_claim_uploads') && restoreSource.includes("DELETE FROM settings WHERE key LIKE 'warranty_upload:%'") && restoreSource.includes("DELETE FROM settings WHERE key LIKE 'warranty_lookup:%'") && !restoreSource.includes('DELETE FROM warranty_verifications'), 'Restore must clear temporary upload and lookup tokens without requiring OTP tables');
const uploadSource = readFileSync(new URL('../functions/api/warranty-claim-uploads.js', import.meta.url), 'utf8');
assert.ok(uploadSource.includes('INSERT INTO settings(key,value,updated_at)') && uploadSource.includes('warranty_upload:'), 'New uploads must store short-lived tokens in the existing settings table');
assert.ok(warrantyClaimSource.includes('warranty_upload:') && warrantyClaimSource.includes('DELETE FROM settings WHERE key=?'), 'Claim submission must validate and consume the upload token');
assert.ok(restoreSource.includes('operations.warrantyClaimAttachments'), 'Restore must preserve claim attachment metadata');
assert.ok(!warrantyClaimSource.includes('warranty_verifications') && warrantyClaimSource.includes('isWarrantyEligibleOnDate'), 'Warranty claims must not require OTP and must validate the warranty using the shared Vietnam-local date check');
assert.ok(warrantyClaimSource.includes('w.starts_at'), 'Warranty claim validation must fetch the warranty start date');
assert.ok(uploadSource.includes('w.starts_at'), 'Warranty photo upload validation must fetch the warranty start date');
const warrantyLookupSource = readFileSync(new URL('../functions/api/warranty-lookup.js', import.meta.url), 'utf8');
const customerFacingHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
for (const privateDiagnostic of ['Mailjet Stats', 'Delivered/Bounced/Blocked', 'Email trên Preview']) {
  assert.ok(!customerFacingHtml.includes(privateDiagnostic), 'Customer login must not expose email provider or staging diagnostics: ' + privateDiagnostic);
}
assert.ok(!/Hãy kiểm tra các migration\s+\d/i.test(warrantyLookupSource), 'Public warranty errors must not expose internal database migrations');
assert.ok(warrantyLookupSource.includes('maskedWarrantyCode') && warrantyLookupSource.includes('claimToken') && !warrantyLookupSource.includes('warrantyCode: code') && warrantyLookupSource.includes('maskedPhone') && warrantyLookupSource.includes('maskedAddress'), 'Public warranty lookup must return masked data and a short-lived action token');
const adminWarrantiesSource = readFileSync(new URL('../functions/api/admin/warranties.js', import.meta.url), 'utf8');
const sharedLibSource = readFileSync(new URL('../functions/_lib.js', import.meta.url), 'utf8');
const adminHtmlSource = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
assert.ok(warrantyLookupSource.includes("warrantyStatusOnDate(row.status, row.starts_at, row.ends_at, today)"), 'Customer lookup must use start and end dates for its visible status');
assert.ok(adminWarrantiesSource.includes('warrantyStatusOnDate(warranty.status, warranty.startsAt, warranty.endsAt, today)'), 'Admin warranty list must use start and end dates for its visible status');
assert.ok(adminHtmlSource.includes("status==='pending'?'Chưa đến ngày bắt đầu'"), 'Admin warranty UI must localize a future-start warranty');
assert.ok(adminHtmlSource.includes("status==='invalid'?'Cần kiểm tra thông tin bảo hành'"), 'Admin UI must flag malformed warranty dates for review');
assert.ok(sharedLibSource.includes('timeZone: "Asia/Ho_Chi_Minh"') && sharedLibSource.includes('export function isWarrantyEligibleOnDate'), 'Warranty expiry must use shared Vietnam-local calendar date logic');
for (const [fileName, source] of [
  ['warranty lookup', warrantyLookupSource],
  ['warranty claim submission', warrantyClaimSource],
  ['warranty photo upload', uploadSource],
  ['admin warranty list', adminWarrantiesSource],
]) {
  assert.ok(source.includes('getCurrentDateInVietnam') || source.includes('warrantyStatusOnDate'), fileName + ' must use shared Vietnam-local expiry logic');
  assert.ok(!source.includes("new Date().toISOString().slice(0,10)") && !source.includes("date('now')"), fileName + ' must not compare warranty expiry using UTC');
}
assert.ok(uploadSource.includes('form.get("claimToken")') && warrantyClaimSource.includes('body?.claimToken'), 'Warranty photo upload and claim submission must resolve tokens server-side');
const adminOrdersSource = readFileSync(new URL('../functions/api/admin/orders.js', import.meta.url), 'utf8');
assert.ok(adminOrdersSource.includes('COALESCE(sa.full_address,c.address)') && adminOrdersSource.includes('LEFT JOIN order_shipping_addresses'), 'Admin orders must show the shipping address captured for that order');

const html = '<!doctype html><html><head><meta name="description" content="Home"><meta property="og:title" content="Home"><meta property="og:image" content="/og-sindarealest-crisp-20261028.jpg"><meta name="twitter:image" content="/og-sindarealest-crisp-20261028.jpg"><link rel="canonical" href="/"><title>Home</title></head><body></body></html>';
const homepageContext = { request: new Request('https://shop.example/'), env: {}, next: async () => new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}) };
let response = await seoMiddleware(homepageContext);
let text = await response.text();
assert.equal(response.status,200);
assert.match(text,/og:url" content="https:\/\/shop\.example\//);
assert.match(text,/og:image" content="https:\/\/shop\.example\/og-sindarealest-crisp-20261028\.jpg/);
assert.match(text,/canonical" href="https:\/\/shop\.example\//);

const seoDB = {
  prepare(sql) {
    return {
      bind(...values) {
        return {
          async first() {
            assert.match(sql, /lower\(slug\)=\?/);
            assert.deepEqual(values, [new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase(),new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase(),new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase()]);
            return { id: 'product-id-123', slug: 'test-sneaker', sku: 'SD-SN001', sku_verified: 1, title: 'Giày thử', description: 'Mô tả giày', images_json: '["images/example.webp"]', category: 'sneakers', category_label: 'Sneaker', published: 1 };
          }
        };
      }
    };
  }
};
const legacyResponse = await seoMiddleware({ request:new Request('https://shop.example/san-pham/test-sneaker'), env:{DB:seoDB}, next:async () => new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}) });
assert.equal(legacyResponse.status,301,'Legacy slug routes must redirect to the SKU URL');
assert.equal(legacyResponse.headers.get('Location'),'https://shop.example/sanpham/sneaker/SD-SN001');
response = await seoMiddleware({ request:new Request('https://shop.example/sanpham/sneaker/SD-SN001'), env:{DB:seoDB}, next:async (request)=>{assert.equal(new URL(request.url).pathname,'/index.html');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})} });
text = await response.text();
assert.equal(response.status,200);
assert.ok(text.includes('<title>Giày thử | SinDarealest</title>'));
assert.ok(text.includes('og:title" content="Giày thử | SinDarealest'));
assert.ok(text.includes('og:url" content="https://shop.example/sanpham/sneaker/SD-SN001'));
assert.ok(text.includes('og:image" content="https://shop.example/images/example.webp'));
assert.ok(text.includes('og:description" content="Mô tả giày · SKU: SD-SN001'), 'Product social preview should include the explicitly verified SKU even when descriptions are long');
assert.match(text,/application\/ld\+json/);

response = await createOrder({request:new Request('https://shop.example/api/orders',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin order submission is rejected');
response = await createWarrantyClaim({request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin warranty submission is rejected');
const sitemapResponse = await sitemap({ request:new Request('https://shop.example/sitemap.xml'), env:{DB:{prepare(sql){assert.match(sql,/SELECT id,slug,sku,sku_verified,category,updated_at FROM products/);return {async all(){return {results:[{id:'test-product-id',slug:'test-sneaker',sku:'SD-SN001',sku_verified:1,category:'sneakers',updated_at:'2026-01-01 00:00:00'}]}}}}}} });
const sitemapText = await sitemapResponse.text();
assert.equal(sitemapResponse.status,200);
assert.match(sitemapText,/https:\/\/shop\.example\/sanpham\/sneaker\/SD-SN001/);
const robotsText = await (await robots({request:new Request('https://shop.example/robots.txt')})).text();
assert.match(robotsText,/Disallow: \/admin\//);
assert.match(robotsText,/Sitemap: https:\/\/shop\.example\/sitemap\.xml/);

const demoWarrantyCode = 'SDW-' + 'A'.repeat(24);
const demoWarrantyRow = {
  id:'warranty-id-1', warrantyId:'warranty-id-1', order_id:'order-id-1', customer_id:'customer-id-1',
  warranty_code: demoWarrantyCode, duration_months: 12, starts_at: '2026-01-01', ends_at: '2027-01-01', status: 'active',
  sku: 'SD-SN001', skuVerified: 0, title: 'Giày thử', size: '42', purchasedAt: '2026-02-01 12:00:00', orderNumber: 'SD-ABC-123456',
  fullName: 'Nguyễn Văn An', customerPhone: '0901234567', purchaseAddress: '123 Đường thử, Phường thử, Lâm Đồng',
  imagesJson: '["images/example.webp"]'
};
function warrantyDB() {
  const settings = new Map();
  const query = (sql, values=[]) => ({
    sql,
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
    async batch(statements) {
      for (const statement of statements) await statement.run();
      if (statements[0]?.sql.includes('INSERT INTO warranty_claims')) {
        return statements.map((_, index) => ({ meta: { changes: 1 } }));
      }
      if (statements[0]?.sql.includes('INSERT INTO public_rate_limits')) {
        return [{ success: true }, { success: true, results: [{ attempts: 1 }] }];
      }
      return statements.map(() => ({ meta: { changes: 1 } }));
    }
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
assert.equal(lookupPayload.warranty.sku,'','Warranty lookup must not expose an unverified internal SKU');
assert.equal(lookupPayload.warranty.size,'42');
assert.equal(lookupPayload.warranty.purchasedAt,'2026-02-01');
assert.equal(lookupPayload.warranty.eligible,true);
assert.ok(!JSON.stringify(lookupPayload).includes('123 Đường thử'),'Raw street address must not be returned');
assert.ok(!JSON.stringify(lookupPayload).includes(demoWarrantyCode),'Raw warranty code must not be returned');
const codeActionToken = lookupPayload.warranty.claimToken;
assert.match(codeActionToken,/^[0-9a-f]{32}$/);
assert.ok(!JSON.stringify(lookupPayload).includes('Nguyễn Văn An'),'Full customer name must not be returned');
const originalSiteverifyFetch=globalThis.fetch;
globalThis.fetch=async url=>{
 assert.ok(String(url).startsWith("https://challenges.cloudflare.com/turnstile/v0/siteverify"));
 return new Response(JSON.stringify({success:true,hostname:"shop.example",action:"warranty_lookup"}),{status:200});
};
const phoneLookup = await lookupWarranty({
  request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.12'},body:JSON.stringify({lookup:'090 123 4567',turnstileToken:'qa-valid-proof-2026'})}),
  env:{DB:warrantyDBInstance,TURNSTILE_SITE_KEY:"qa-site",TURNSTILE_SECRET_KEY:"qa-secret"}
});
globalThis.fetch=originalSiteverifyFetch;
assert.equal(phoneLookup.status,200,'Phone lookup should verify Turnstile without OTP');
lookupPayload = await phoneLookup.json();
assert.equal(lookupPayload.warranties.length,1);
assert.equal(lookupPayload.warranties[0].maskedWarrantyCode,'••••AAAA');
assert.ok(!JSON.stringify(lookupPayload).includes(demoWarrantyCode),'Phone lookup must not expose the raw warranty code');
assert.ok(!JSON.stringify(lookupPayload).includes('0901234567'),'Raw customer phone must not be returned');


const codeOnlyClaimResponse = await createWarrantyClaim({
  request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.15'},body:JSON.stringify({warrantyCode:demoWarrantyCode,issueType:'other',message:'Thử gửi thẳng bằng mã'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(codeOnlyClaimResponse.status,403,'Warranty claim must require a short-lived token from a successful lookup');

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

console.log('PASS: SKU SEO URLs, masked warranty lookups, expiring claim tokens, sitemap/robots, and cross-origin request rejection.');

