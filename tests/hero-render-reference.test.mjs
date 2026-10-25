// Regression: HERO must be a real layered web component, not a flattened render.
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const base=new URL('../public/',import.meta.url);
const html=readFileSync(new URL('index.html',base),'utf8');
const shoePath=new URL('images/hero-upload/tb_image_share_1792519964514 (1).png',base);
const pedestalPath=new URL('images/hero-upload/ai-marble-pedestal.webp',base);
const shoe=readFileSync(shoePath),pedestal=readFileSync(pedestalPath);
assert.deepEqual([...shoe.subarray(0,8)],[137,80,78,71,13,10,26,10]);
assert.equal(shoe.readUInt32BE(16),1200);
assert.equal(shoe.readUInt32BE(20),1600);
assert.equal(pedestal.toString('ascii',0,4),'RIFF');
assert.equal(pedestal.toString('ascii',8,12),'WEBP');
assert.ok(statSync(shoePath).size>10000&&statSync(pedestalPath).size>1000);
const section=html.match(/<section class="hero wrap" id="home">([\s\S]*?)<\/section>/)?.[1];
assert.ok(section,'A native hero section is required');
assert.doesNotMatch(section,/<picture|heroReferenceArt|hero-reference-(?:desktop|mobile)/,
  'Do not paste the complete rendered HERO or hide a web CTA over the baked-in text');
assert.match(section,/<h1 class="serif"><span>Phong cách<\/span><span>đẳng cấp<\/span><span>từ da cá sấu<\/span><\/h1>/,
  'All 3 lines must remain editable/searchable DOM text');
assert.match(section,/<p class="hero-description">Sự tinh tế trong từng đường nét, khẳng định giá trị thẩm mỹ của bạn\.<\/p>/);
assert.match(section,/<a class="pill-btn primary tap-target" href="#products">Khám phá ngay <span class="arrow">→<\/span><\/a>/,
  'Use an actual text CTA, not an invisible hitbox');
assert.match(section,/<span class="hero-pedestal-art" aria-hidden="true"><\/span>/);
assert.match(section,/<img id="heroProductImage" hidden alt="" decoding="async" fetchpriority="high">/,
  'Independent transparent shoe product must be loaded by existing app JS');
assert.match(html,/target\.src='\/images\/hero-upload\/tb_image_share_1792519964514%20\(1\)\.png'/);
const marker=html.indexOf('/* HERO V10 — REAL WEB COMPOSITION.');
assert.ok(marker>=0,'Native composition CSS is mandatory');
const css=html.slice(marker);
assert.doesNotMatch(css,/hero-reference-(?:desktop|mobile)|hero-reference-art|heroReferenceArt/);
assert.match(css,/#home \.hero-copy h1\{/);
assert.match(css,/#home \.hero-copy h1 span:nth-child\(2\)\{/);
assert.match(css,/-webkit-text-fill-color:#b01925!important/,'Emphasis red is CSS, not pixels baked in');
assert.match(css,/#home \.hero-actions \.pill-btn\{/);
assert.match(css,/font:700 14px\/1\.3 SD Sans/,'CTA must have real font size');
assert.match(css,/#home \.hero-visual #heroProductImage\{/);
assert.match(css,/ai-marble-pedestal\.webp/,'Marble stage must be a distinct image layer');
assert.match(css,/@media\(max-width:760px\)/,'Mobile must have responsive native layout');
assert.doesNotMatch(css,/font-size:0!important|clip-path:inset\(50%\)/,
 'Live text must not be visually hidden behind screenshot');
console.log('PASS: HERO native semantic text, native CTA, standalone product and stage, responsive CSS; no composite wallpaper');
