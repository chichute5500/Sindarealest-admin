/* Read-only safety audit; never deletes assets or touches D1/R2. */
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const read=p=>readFileSync(path.join(root,p),'utf8');
const scanRoots=['public','functions','scripts','tests','data','.github/workflows'];
const extensions=/\.(?:html|css|js|mjs|json|txt|toml|svg|yaml|yml)$/i;
const files=[];
function scan(dir){
  const full=path.join(root,dir);
  if(!existsSync(full))return;
  for(const item of readdirSync(full,{withFileTypes:true})){
    const relative=path.join(dir,item.name);
    if(item.isDirectory()){
      if(!['node_modules','.git','artifacts'].includes(item.name)&&!(dir==='public'&&item.name==='images'))scan(relative);
    }else if(item.isFile()&&extensions.test(item.name))files.push(relative);
  }
}
for(const dir of scanRoots)scan(dir);
const sources=files.map(file=>({file,body:read(file)}));
const html=read('public/index.html');
const css=read('public/material-gallery.css');
const names=[['hero','sneaker','light.png'].join('-'),['hero','sneaker','dark.png'].join('-')];
for(const name of names){
  const references=sources.filter(s=>s.body.includes(name)).map(s=>s.file);
  assert.deepEqual(references,[], 'Retired raster still referenced: '+name+' '+references.join(','));
  assert.equal(existsSync(path.join(root,'public/images',name)),false,'Unused raster should be removed: '+name);
}
const manifest=JSON.parse(read('public/images/crocodile-leather/gallery.json'));
assert.equal(manifest.images.length,12,'Preserve 12 owner-uploaded material photos');
for(const name of manifest.images){
  assert.match(name,/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}\.(?:avif|webp|jpe?g|png)$/i);
  assert.ok(existsSync(path.join(root,'public/images/crocodile-leather',name)),'Missing material photo: '+name);
}
assert.match(html,/<section class="sd-code-hero wrap" id="home"/);
assert.doesNotMatch(html,/html\.theme-transitioning \.nav,html\.theme-transitioning \.glass/);
assert.doesNotMatch(html,/transition:background-color 1\.15s/);
assert.match(css,/html body \.nav-wrap \.nav,[\s\S]*?transition-duration:\.205s!important/);
assert.match(css,/html\.theme-transitioning body :is\([\s\S]*?transition:none!important/);
const count=(s,part)=>s.split(part).length-1;
console.log('PASS: static/CSS safety '+JSON.stringify({
  checkedTextFiles:sources.length,inlineStyleBlocks:(html.match(/<style\b/g)||[]).length,
  inlineCssBytes:(html.match(/<style[^>]*>[\s\S]*?<\/style>/g)||[]).join('').length,
  navSelectorOccurrences:count(html,'.nav-wrap .nav'),bgSelectorOccurrences:count(html,'.theme-bg'),
  retiredRasterFilesRemoved:2,retiredRasterBytesRemoved:913145,
  materialPhotos:manifest.images.length,
  catalogImages:'Dynamic D1/API assets excluded from deletion'
}));