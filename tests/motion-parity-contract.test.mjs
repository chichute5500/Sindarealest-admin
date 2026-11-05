import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const store=readFileSync('public/index.html','utf8');
const admin=readFileSync('public/admin/index.html','utf8');
const motion=readFileSync('public/motion-parity.css','utf8');
const engine=readFileSync('public/shared-motion.js','utf8');
const {existsSync}=await import('node:fs');
assert.ok(store.includes('class="brand-symbol" src="images/brand-emblem-nav.webp"'),'header must reference approved compact emblem');
assert.ok(existsSync('public/images/brand-emblem.png'),'original official emblem source must exist');
assert.ok(readFileSync('.github/workflows/motion-parity-preview.yml','utf8').includes('python3 scripts/build-logo-asset.py'),'isolated preview must generate compact logo before deploy');
const cssLinks=/href="\/motion-parity\.css\?v=balanced-20261105"/g;
for(const [label,html] of [['store',store],['admin',admin]]){
 assert.equal([...html.matchAll(cssLinks)].length,1,label+' loads the motion stylesheet exactly once');
}
for(const selector of ['#productOverlay.open','#productOverlay>.detail-modal','#sdFullscreenViewer.open','#sdFullscreenViewer .sd-fullscreen-stage','#mobileNavBackdrop.open','#accountDrawer .account-panel-content','html.sd-service-route #sdServicePage','html.sd-catalog-route #products','@media(prefers-reduced-motion:reduce)']){
 assert.ok(motion.includes(selector),'Missing scoped animation '+selector);
}
// Product detail glass is a sibling plane and MUST NOT inherit parent opacity.
// Parent opacity/blur creates a backdrop root that destroys the approved native glass.
assert.match(motion,/#productOverlay\s*\{[^}]*visibility:hidden/s);
assert.doesNotMatch(motion,/#productOverlay(?:\.open)?\s*\{[^}]*opacity\s*:/s);
assert.doesNotMatch(motion,/#productOverlay(?:\.open)?\s*\{[^}]*backdrop-filter\s*:/s);
assert.match(store,/sdAccountPanelTransitionId/);
assert.match(store,/sdAccountCleanupLeavingPanel/);
assert.match(store,/current\.style\.position='absolute'/);
assert.match(admin,/sdAdminModalExitSeq/);
assert.match(admin,/deactivateAdminModal\(\$\('#backdrop'\),\(\)=>\{if\(editorEntry\)history\.back\(\)\}\)/);
assert.match(admin,/sdAdminHideMorePanel/);
assert.match(admin,/sdAdminShowMorePanel/);
assert.match(motion,/--sd-motion-balanced:280ms/);

/* Protect the fixes against reintroducing overlapping CSS transforms or the
   fullscreen image's stylesheet opacity:1!important overriding the ghost. */
assert.doesNotMatch(motion,/scale\(\.(?:986|990)\)/);
assert.match(engine,/setProperty\('opacity','0','important'\)/);
assert.match(engine,/setProperty\('transition','none','important'\)/);
assert.match(engine,/querySelector\('#sdFullscreenViewer \.sd-fullscreen-image\.is-active'\)/);
assert.match(engine,/function reset\(key\)/);
assert.match(store,/window\.SDSharedMotion\?\.cancel\('product-detail'\)/);
assert.match(store,/window\.SDSharedMotion\?\.reset\?\.\('full-gallery'\)/);

// Syntax-check all executable inline scripts without loading external dependencies.
const {Script}=await import('node:vm');
for(const [name,html] of [['storefront',store],['admin',admin]]){
 const chunks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
   .filter(([,attrs,body])=>!(/\bsrc\s*=/.test(attrs))&&!(/type\s*=\s*["'](?:application\/json|module)["']/.test(attrs))&&body.trim());
 for(const [,attrs,body] of chunks)new Script(body,{filename:name+'-inline.js'});
 console.log(name+': '+chunks.length+' inline scripts syntax PASS');
}
console.log('Motion parity static invariants PASS');
