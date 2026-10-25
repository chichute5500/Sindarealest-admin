import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const desk=new URL('../public/images/hero-rebuild/hero-reference-desktop.webp',import.meta.url);
const mobile=new URL('../public/images/hero-rebuild/hero-reference-mobile.webp',import.meta.url);
const paths=[desk,mobile];
for(const p of paths){
 const bytes=readFileSync(p);
 assert.equal(bytes.toString('ascii',0,4),'RIFF','Hero asset must be a RIFF WebP');
 assert.equal(bytes.toString('ascii',8,12),'WEBP','Hero asset must be a WebP');
 assert.ok(bytes.length>20000&&bytes.length<240000,'Reference image must be visual and fast-loading');
}
assert.ok(html.includes('<picture class="hero-reference-art" aria-hidden="true">'));
assert.ok(html.includes('srcset="/images/hero-rebuild/hero-reference-mobile.webp"'));
assert.ok(html.includes('id="heroReferenceArt" src="/images/hero-rebuild/hero-reference-desktop.webp"'));
assert.ok(html.includes('href="#products">Khám phá ngay'),'CTA remains navigable');
assert.ok(html.includes('/* HERO SOURCE-IMAGE PARITY V9'));
assert.ok(html.includes('aspect-ratio:1779 / 884!important'));
assert.ok(html.includes('#home .hero-actions .pill-btn:focus-visible'));
assert.ok(!html.includes('prefers-reduced-motion:no-preference) #home .hero-reference-art img{animation'));
console.log('PASS: original artwork is directly displayed, optimized and CTA remains interactive');
