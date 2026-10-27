import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const script=html.match(/<script>\(\(\)=>\{const root=document\.documentElement;[\s\S]*?<\/script>/)?.[0];
assert.ok(script,'Early bootstrap must set route class before the first paint');
const init=script.slice('<script>'.length,-'</script>'.length);
function routeClass(path){
 const classes=new Set();
 const root={classList:{add:v=>classes.add(v),toggle:(k,on)=>on?classes.add(k):classes.delete(k),contains:k=>classes.has(k)},dataset:{}};
 const document={documentElement:root,querySelector:()=>({content:''})};
 runInNewContext(init,{
   document,location:{pathname:path},window:{matchMedia:()=>({matches:false})},
   localStorage:{getItem:()=>null}
 });
 return classes.has('sd-catalog-route');
}
for(const path of ['/sanpham','/sanpham/','/sanpham/mu','/sanpham/giaytay','/sanpham/sneaker','/sanpham/tuideocheo']){
 assert.equal(routeClass(path),true,'Direct catalog link must hide home layout: '+path);
}
for(const path of ['/','/index.html','/sanpham/mu/SD-MU003','/san-pham/any','/admin/']){
 assert.equal(routeClass(path),false,'Do not change already approved page composition: '+path);
}
const css=html.match(/<style id="sd-catalog-direct-landing-20261027">([\s\S]*?)<\/style>/);
assert.ok(css,'Scoped direct-listing style must exist');
for(const rule of [
 /html\.sd-catalog-route main > section:not\(#products\)\s*\{display:none!important\}/,
 /html\.sd-catalog-route #products\s*\{/,
 /html\.sd-catalog-route #welcomeSplash\s*\{display:none!important\}/,
 /html\.sd-catalog-route #products \.filter-pills\s*\{/,
 /overflow-x:auto!important/,
]){
 assert.match(css[1],rule);
}
const source=html.slice(html.indexOf('function catalogCategoryFromLocation(){'),html.indexOf("let selectedCategory='all';"));
assert.match(source,/setCatalogLandingMode\(true\)/);
assert.match(source,/window\.scrollTo\(\{top:0,behavior:'instant'\}\)/);
assert.ok(html.includes("if(document.documentElement.classList.contains('sd-catalog-route'))window.setTimeout(dismiss,0);"),
 'Deep category URL must bypass homepage Welcome delay');
assert.match(html,/section\?\.closest\('main > section:not\(#products\)'\)/);
assert.match(html,/else\{setCatalogLandingMode\(false\)/);
assert.ok(html.includes("strip.scrollLeft+=item.left-area.left-(area.width-item.width)/2;"),
 'Active category must appear in horizontal filter without pushing products down');
console.log('PASS: catalog deep links show dedicated listing on first paint; homepage, product detail, home links and back navigation protected.');
