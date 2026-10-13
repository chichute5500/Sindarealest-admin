import assert from 'node:assert/strict';
import { onRequest as seoMiddleware } from '../functions/_middleware.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as createWarrantyClaim } from '../functions/api/warranty-claims.js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';
import { onRequestGet as robots } from '../functions/robots.txt.js';

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
