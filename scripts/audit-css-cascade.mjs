// Read-only CSS cascade report; potential overrides are not automatically bugs.
// The Owner-approved visual CSS is never rewritten by this scanner.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const paths=['public/index.html','public/admin/index.html','public/code-hero.css','public/material-gallery.css','public/customer-auth.css'];
const sources=paths.flatMap(file=>{
  const content=load(file);
  if(!file.endsWith('.html'))return [{file,index:0,css:content}];
  return [...content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match,index)=>({file,index:index+1,css:match[1]}));
});
function balanced(css){
  let quote='',escape=false,depth=0,minDepth=0;
  const withoutComments=css.replace(/\/\*[\s\S]*?\*\//g,'');
  for(const char of withoutComments){
    if(quote){if(escape)escape=false;else if(char==='\\')escape=true;else if(char===quote)quote='';continue}
    if(char==='"'||char==="'"){quote=char;continue}
    if(char==='{')depth++;
    if(char==='}')minDepth=Math.min(minDepth,--depth);
  }
  return depth===0&&minDepth===0&&!quote;
}
for(const source of sources)assert.ok(balanced(source.css),'Unbalanced CSS in '+source.file+' style#'+source.index);
function listRules(source){
 const css=source.css.replace(/\/\*[\s\S]*?\*\//g,'');
 const rules=[];let pos=0;
 function skip(){while(pos<css.length&&/\s/.test(css[pos]))pos++}
 function readUntil(chars){
   let output='',quote='',escape=false,bracket=0;
   for(;pos<css.length;pos++){
     const ch=css[pos];
     if(quote){output+=ch;if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue}
     if(ch==='"'||ch==="'"){quote=ch;output+=ch;continue}
     if(ch==='('||ch==='['){bracket++;output+=ch;continue}
     if(ch===')'||ch===']'){bracket--;output+=ch;continue}
     if(!bracket&&chars.includes(ch))break;
     output+=ch;
   }
   return output.trim();
 }
 function walk(scope=[]){
   while(pos<css.length){
     skip();
     if(pos>=css.length)return;
     if(css[pos]==='}'){pos++;return}
     const selector=readUntil('{};');const separator=css[pos++];
     if(separator===';'||separator==='}')continue;
     if(separator!=='{')return;
     if(/^@(?:media|supports|container|layer)\b/i.test(selector)){walk([...scope,selector]);continue}
     if(selector.startsWith('@')){readUntil('}');if(css[pos]==='}')pos++;continue}
     const raw=readUntil('}');
     if(css[pos]==='}')pos++;
     const declarations=raw.split(';').map(item=>{
       const n=item.indexOf(':');
       return n>0?[item.slice(0,n).trim().toLowerCase(),item.slice(n+1).trim().replace(/\s+/g,' ')]:null;
     }).filter(Boolean);
     if(declarations.length)rules.push({
       file:source.file,block:source.index,selector:selector.replace(/\s+/g,' '),
       context:scope.join(' | '),declarations
     });
   }
 }
 walk();
 return rules;
}
const rules=sources.flatMap(listRules);
const map=new Map();
for(const rule of rules){
 const key=[rule.file,rule.context,rule.selector].join('|');
 if(!map.has(key))map.set(key,[]);
 map.get(key).push(rule);
}
const duplicates=[...map.values()].filter(group=>group.length>1);
const conflicts=duplicates.filter(group=>{
 const byProperty=new Map();
 for(const rule of group)for(const [name,value] of rule.declarations){
   if(!byProperty.has(name))byProperty.set(name,new Set());
   byProperty.get(name).add(value);
 }
 return [...byProperty.values()].some(values=>values.size>1);
});
const top=[...conflicts].sort((a,b)=>b.length-a.length).slice(0,15)
 .map(g=>({file:g[0].file,context:g[0].context,selector:g[0].selector.slice(0,140),declarations:g.length}));
const report={
 status:'informational_not_a_visual_pass',styleBlocks:sources.length,
 estimatedRules:rules.length,sameSelectorContextGroups:duplicates.length,
 groupsWithDifferentValues:conflicts.length,
 byFile:paths.map(file=>({file,styleBlocks:sources.filter(x=>x.file===file).length,
   bytes:sources.filter(x=>x.file===file).reduce((n,x)=>n+x.css.length,0)})),
 topPotentialOverrides:top
};
const homepage=load('public/index.html');
assert.match(homepage,/<\/body>\s*<\/html>\s*$/i,
  'Storefront HTML must close the body and document');
assert.ok([...homepage.matchAll(/<style\b[^>]*>/gi)].every(m=>m.index<homepage.indexOf('</head>')),
  'Every Storefront stylesheet must be parsed in the head before visible content');
assert.doesNotMatch(homepage,/transition:background-color 1\.05s ease,border-color 1\.05s ease,box-shadow 1\.05s ease/);
assert.doesNotMatch(homepage,/transition:background-color 1s ease,border-color 1s ease,box-shadow \.3s ease,color \.8s ease/);
console.log('PASS: CSS syntax balance and obsolete transition guard. '+JSON.stringify(report));
