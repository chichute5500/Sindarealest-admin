import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const start=html.indexOf("function syncThemeMeta()");
const end=html.indexOf("// Android WebView safe theme handoff",start);
assert.ok(start>0&&end>start,"theme-color synchronizer exists");
const text=html.slice(start,end);
for(const dark of [false,true]){
 const metas=[{content:""},{content:""}];
 runInNewContext(text+"\nsyncThemeMeta();",{
  document:{documentElement:{classList:{contains:()=>dark}}},
  $:()=>metas[0],$$:()=>metas
 });
 assert.deepEqual(metas.map(x=>x.content),dark?["#061522","#061522"]:["#eaf3fb","#eaf3fb"],
  "Light and dark browser chrome tags must both update without JS exceptions");
}
console.log("PASS: theme-color sync affects both meta tags without throwing on startup.");
