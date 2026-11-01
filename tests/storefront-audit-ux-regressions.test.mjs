import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert.equal([...html.matchAll(/<main\b/g)].length,1,'Only one main landmark is present.');
assert.match(html,/<div id="notFoundPage" class="not-found-page"/,'Retain 404 UX without a second main');
assert.match(html,/function ensureOrderGuideOpen\(\)/,'Order guide can be expanded by deep link');
assert.match(html,/#detailOrderLink'\)\.addEventListener\('click',[^\n]*ensureOrderGuideOpen\(\)/,'Product detail link expands order guide');
assert.match(html,/hashchange',[^\n]*location\.hash==='#order'/,'Hashchange expands order guide');
assert.match(html,/async function consultProduct\(id\)[^\n]*optionText=option\?/,'Zalo product message includes selected variant');
assert.match(html,/async function consultCart\(\)[^\n]*Biến thể:/,'Zalo cart message includes variants');
assert.match(html,/revealObserver\.unobserve\(el\)/,'Reveal observer stops after first show');
assert.doesNotMatch(html,/el\.classList\.remove\('is-visible'\)/,'Reveal must not hide elements on reverse scroll');
assert.match(html,/window\.setTimeout\(dismiss,reduced\?100:1050\)/,'Welcome has a shorter delay');
assert.match(html,/<h2 class="welcome-title">/, 'Welcome is not a competing document H1');
assert.match(html,/<h1 class="sdh-title" id="sdh-title">/, 'Main Hero remains the primary H1');

/* On the first parse, drawer markup precedes its full animation CSS. aria-hidden
   and inert never hide a painted surface, so preserve a first-paint visibility
   gate until the user explicitly opens the drawer. This catches the Android
   refresh/Welcome-bypass one-frame checkout flash. */
for(const [id,openPattern] of [
  ['cartDrawer',/const panel=\$\('#cartDrawer'\);panel\.style\.visibility='';panel\.removeAttribute\('inert'\)/],
  ['checkoutDrawer',/panel\.style\.visibility='';backdrop\.style\.visibility='';/],
  ['checkoutBackdrop',/panel\.style\.visibility='';backdrop\.style\.visibility='';/],
  ['accountDrawer',/panel\.style\.visibility='';panel\.removeAttribute\('inert'\)/]
]){
  assert.match(html,new RegExp('id="'+id+'"[^>]*style="visibility:hidden"'),'Closed '+id+' must be hidden before deferred CSS is parsed');
  assert.match(html,openPattern,'First deliberate open must clear the initial inline guard for '+id);
}
assert.match(html,/\.checkout-drawer\.open\{transform:translateX\(0\);visibility:visible/,'Keep the original checkout slide-in effect');
assert.match(html,/\.checkout-drawer\{position:fixed;[^\n]*visibility:hidden;pointer-events:none;transition:transform/,'Closed checkout uses the original delayed visibility slide-out');

console.log('PASS: Storefront 404/route/consultation/reveal/Welcome/drawer first-paint contracts');
