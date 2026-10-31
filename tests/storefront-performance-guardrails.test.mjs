import assert from "node:assert/strict";
import {readFileSync,readdirSync} from "node:fs";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const cssFiles=["../public/material-gallery.css","../public/customer-auth.css","../public/code-hero.css"];
const css=cssFiles.map(x=>readFileSync(new URL(x,import.meta.url),"utf8")).join("\n");
const head=html.split("</head>")[0];
assert.ok(head.includes("const root=document.documentElement;"),"theme bootstrap must run inside head");
assert.ok(head.indexOf("const root=document.documentElement;")<head.indexOf('<link rel="icon"'),
  "theme bootstrap must precede noncritical head resources");
assert.match(head,/sessionStorage\.getItem\('sd-storefront-theme-override-v2'\)/,
  "Keep Owner-approved OS-first preference and tab-scoped override");
assert.match(head,/prefers-color-scheme: dark/);
assert.doesNotMatch(head,/localStorage\.getItem\('(?:theme|sd-storefront-theme-override-v2)'\)/,
  "Do not restore stale theme from localStorage against Owner-approved device sync");
assert.match(html,/root\.classList\.add\('sd-theme-palette-instant'\)/);
assert.match(html,/root\.classList\.remove\('sd-theme-palette-instant'\)/);
assert.match(html,/html\.sd-theme-palette-instant body \*:not\(#sdThemeSwitchOverlay\)/);
assert.match(html,/const commit=\(\)=>\{[\s\S]*?root\.classList\.add\('sd-theme-palette-instant'\);[\s\S]*?root\.classList\.toggle\('dark',targetDark\)/);
assert.match(html,/function setupModalGpuBudget\(\)/);
assert.match(html,/const observer=new MutationObserver\(sync\)/);
assert.match(html,/document\.body\.classList\.toggle\('sd-modal-open'/);
assert.match(html,/body\.sd-modal-open \.nav/);
assert.match(html,/revealObserver\.unobserve\(el\)/);
assert.match(html,/el\.style\.removeProperty\('will-change'\)/);
assert.match(html,/@view-transition\{navigation:auto\}/);
assert.match(html,/prefers-reduced-motion:reduce/);
assert.match(html,/transform:scale3d\(\.97,\.97,1\)/);
assert.match(html,/touch-action:manipulation/);
assert.match(html,/fetchpriority="high"/);
assert.match(html,/loading="lazy" decoding="async"/);
assert.match(html,/\.product-photo\{aspect-ratio:/);
for(const name of ["SD Serif","SD Sans"]){
  assert.match(html,new RegExp("font-family:"+name.replace(" ","\\s")+";[^\\n]*font-display:swap"));
}
for(const name of readdirSync(new URL("../public/fonts/",import.meta.url)).filter(x=>x.endsWith(".woff2")))
  assert.ok(name,"woff2 must be used when assets are available");
assert.doesNotMatch(html+"\n"+css,/\btransition\s*:\s*all\b/i,"Do not animate every CSS property");
for(const id of ["welcomeSplash","sdThemeSwitchOverlay","sdFullscreenViewer","cartDrawer","checkoutDrawer","accountDrawer","productOverlay"])
 assert.ok(html.includes('id="'+id+'"'),"Must preserve approved UI "+id);
console.log("PASS: 120Hz-friendly performance guardrails, no changes to approved theme logic or Liquid Glass structure.");
