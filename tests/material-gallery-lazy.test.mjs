import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../public/material-gallery.js',import.meta.url),'utf8');
const fakeClasses=()=>({add(){},remove(){}});
const tile={classList:fakeClasses()};
const host={replaceChildren(...children){this.children=children}};
let manifestFetches=0, probes=[],interval=null;
const observers=[];
class Observer{
 constructor(callback,options){this.callback=callback;this.options=options;observers.push(this)}
 observe(){}
 disconnect(){}
}
class Probe{
 set src(value){this._src=value;probes.push(value);queueMicrotask(()=>this.onload?.())}
 get src(){return this._src}
}
const document={
 hidden:false,
 getElementById:id=>id==='materialTile'?tile:id==='materialGallery'?host:null,
 createElement:()=>({classList:fakeClasses(),setAttribute(){},set src(x){this._src=x},get src(){return this._src}})
};
const window={
 IntersectionObserver:Observer,
 setInterval(callback,ms){assert.equal(ms,1500);interval=callback;return 4},
 clearInterval(){},addEventListener(){}
};
const fetch=async path=>{
 manifestFetches++;
 assert.ok(path.endsWith('/gallery.json'));
 return {ok:true,json:async()=>({images:['one.jpg','two.jpg','three.jpg']})};
};
runInNewContext(source,{document,window,fetch,Image:Probe,IntersectionObserver:Observer,encodeURIComponent});
assert.equal(manifestFetches,0,'Do not even fetch manifest before gallery is near viewport');
assert.equal(probes.length,0,'No photo downloads during home/catalog initial paint');
assert.equal(observers.length,1,'Gallery activates through a single viewport observer');
observers[0].callback([{isIntersecting:false}]);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(manifestFetches,0,'Offscreen gallery must stay dormant');
observers[0].callback([{isIntersecting:true}]);
for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(manifestFetches,1);
assert.equal(probes.length,1,'Only first gallery photo may preload at activation');
assert.ok(host.children?.length===2,'Preserve two-layer glass crossfade');
assert.equal(typeof interval,'function');
interval();
for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(probes.length,2,'Advance slide on demand without preloading every photo');
document.hidden=true;
interval();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(probes.length,2,'Do not load additional photos in hidden tabs');
console.log('PASS: gallery image network deferred until viewport and only one additional image loaded per transition.');
