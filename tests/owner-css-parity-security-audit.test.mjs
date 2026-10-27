import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {json} from '../functions/_lib.js';
import {onRequest as storefrontMiddleware} from '../functions/_middleware.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const web=read('public/index.html');
const admin=read('public/admin/index.html');
const staticHeaders=read('public/_headers');
const middleware=read('functions/_middleware.js');
const css=(admin.match(/<style[^>]*>[\s\S]*?<\/style>/gi)||[]).join('\n');
const count=(source,needle)=>source.split(needle).length-1;

test('Admin has exactly one approved blue palette for each theme, not obsolete beige/gold overrides',()=>{
 assert.equal(count(admin,'<style>'),1,'Keep only existing single Admin CSS block');
 assert.equal(count(css,':root{'),1,'Only one canonical Admin light token set');
 assert.equal(count(css,':root[data-admin-theme="dark"]{'),1,'Only one canonical Admin dark token set');
 assert.equal(count(css,':root[data-admin-theme="light"]{'),1,'Only one Admin light scheme opt-out');
 for(const obsolete of ['--bg:#f4f0e9','--bg:#eee7dc','--bg:#f2eee6','--bg:#090908'])
  assert.ok(!css.includes(obsolete),'Obsolete overwritten theme should be removed: '+obsolete);
 assert.match(css,/:root\{[\s\S]*?color-scheme:only light;[\s\S]*?--bg:#eaf3fb;/);
 assert.match(css,/:root\[data-admin-theme="dark"\]\{[\s\S]*?color-scheme:only dark;[\s\S]*?--bg:#09131d;/);
 assert.match(css,/font-family:Inter,"Noto Sans",system-ui/,'Preserve approved Admin typography');
 assert.match(css,/color:var\(--ink\)/,'Preserve inherited Admin text');
});

test('Admin and Storefront share the approved light-blue identity without forcing same layouts or dark palettes',()=>{
 for(const token of ['--ink:#142a3c','--gold:#5c91b9']){
  assert.ok(css.includes(token),'Admin missing shared token '+token);
  assert.ok(web.includes(token),'Storefront missing shared token '+token);
 }
 assert.ok(css.includes('--bg:#eaf3fb;'));
 assert.ok(web.includes('--page:#eaf3fb;'));
 assert.ok(web.includes(':root{color-scheme:only light;'));
 assert.ok(web.includes('html.dark{color-scheme:only dark;'));
 assert.match(admin,/id="adminThemeColor" content="#eaf3fb"/);
 assert.match(web,/sd-storefront-theme-override-v2/,'Previously Owner-PASSed device-first storefront theme preserved');
 assert.match(admin,/document\.documentElement\.dataset\.adminTheme/,'Admin keeps its independent supported light/dark toggle');
 assert.match(admin,/src="\/images\/brand-emblem\.png"|src="\/logo\.png"/,'Admin brand artwork still present');
});

test('Cloudflare static HTML sends safe framing/object/base controls without blocking the existing app',()=>{
 for(const value of [
  "Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  'X-Frame-Options: DENY','X-Content-Type-Options: nosniff',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Permissions-Policy: camera=(), microphone=(), geolocation=()'
 ])assert.ok(staticHeaders.includes(value),'Missing static defense: '+value);
 assert.doesNotMatch(staticHeaders,/unsafe-inline|unsafe-eval|default-src 'none'/,'HTML site must keep approved inline scripts working');
});

test('Shared Admin/Storefront JSON responses have no caching and defensive document policy',async()=>{
 const response=json({ok:true,message:'API contract'});
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
 assert.equal(response.headers.get('X-Frame-Options'),'DENY');
 assert.match(response.headers.get('Content-Security-Policy'),/default-src 'none'/);
 assert.match(response.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);
 assert.equal(response.headers.get('Referrer-Policy'),'strict-origin-when-cross-origin');
 assert.deepEqual(await response.json(),{ok:true,message:'API contract'});
});

test('Dynamic homepage and category HTML get security headers even when Pages static _headers are bypassed',async()=>{
 const base='<!doctype html><html><head><title>SinDarealest</title></head><body>Trang chủ</body></html>';
 for(const path of ['/','/sanpham']){
  let calls=0;
  const context={
   request:new Request('https://example.test'+path),
   env:{},
   next:async()=>{calls++;return new Response(base,{headers:{'Content-Type':'text/html; charset=utf-8'}});}
  };
  const r=await storefrontMiddleware(context);
  assert.equal(r.status,200,'HTML route '+path);
  assert.equal(calls,1,'Only approved original HTML fetch');
  assert.equal(r.headers.get('X-Frame-Options'),'DENY');
  assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(r.headers.get('Referrer-Policy'),'strict-origin-when-cross-origin');
  assert.equal(r.headers.get('Content-Security-Policy'),"frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
  const html=await r.text();
  assert.match(html,/<title>/);
 }
 assert.equal(count(middleware,'hardenStorefrontHtmlHeaders(headers)'),3,
  'Every generated homepage/category/product HTML response must use shared header defense');
});
console.log('PASS: canonical Admin/Storefront brand tokens, single active Admin theme palette and static/API/dynamic HTML security.');
