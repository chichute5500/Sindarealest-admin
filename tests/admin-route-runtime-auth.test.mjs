/** Runtime authorization sweep for every protected Admin route and HTTP handler.
 * No valid business action is ever invoked, no D1 query or write is allowed.
 */
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createSession} from '../functions/_lib.js';

const root=fileURLToPath(new URL('../functions/api/admin/',import.meta.url));
function collect(dir){
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const file=join(dir,entry.name);
    return entry.isDirectory()?collect(file):entry.isFile()&&file.endsWith('.js')?[file]:[];
  });
}
const files=collect(root);
assert.equal(files.length,24,'All Admin route modules must be audited when the API surface changes');
const secret='runtime-route-auth-test-secret-more-than-32-chars';
const password='runtime-route-auth-test-password';
const validSession=await createSession(secret);
let protectedHandlers=0,unprotectedUnsupported=0,dbCalls=0;
const db=new Proxy({},{
  get(_target,key){
    if(key==='then')return undefined;
    dbCalls++;
    throw new Error('Unauthorized request must not reach D1 operation: '+String(key));
  }
});
for(const file of files){
  if(file.endsWith('/login.js') || file.endsWith('/logout.js'))continue;
  const code=readFileSync(file,'utf8');
  const methods=[...code.matchAll(/export async function (onRequest(?:Get|Post|Put|Patch|Delete))\s*\(/g)];
  const exports=await import(pathToFileURL(file).href);
  for(let index=0;index<methods.length;index++){
    const current=methods[index],next=methods[index+1];
    const body=code.slice(current.index,next?.index??code.length);
    const method=current[1].slice('onRequest'.length).toUpperCase();
    const name=file+' '+method;
    if(!body.includes('requireAdmin(')){
      assert.match(body,/\breturn fail\([^)]*405\)/s,
        name+': only explicitly unsupported 405 methods may skip authentication');
      unprotectedUnsupported++;
      continue;
    }
    const invoke=async(kind)=>{
      const headers=kind==='unauthenticated'?{Origin:'https://qa.invalid'}:{
        Cookie:'sd_admin_session='+validSession,
        Origin:'https://other.invalid',
        'Sec-Fetch-Site':'cross-site'
      };
      const request=new Request('https://qa.invalid/api/admin/qa-check',{method,headers});
      return exports[current[1]]({
        request,
        env:{DB:db,ADMIN_PASSWORD:password,SESSION_SECRET:secret},
        params:{id:'qa-nonexistent-product'}
      });
    };
    const noCookie=await invoke('unauthenticated');
    assert.equal(noCookie.status,401,name+': reject unauthenticated access');
    const crossSite=await invoke('cross-site');
    assert.equal(crossSite.status,403,name+': reject cross-site session replay');
    protectedHandlers++;
  }
}
assert.ok(protectedHandlers>=20,'Expected to cover every real Admin business endpoint');
assert.equal(dbCalls,0,'Auth rejections must happen without any D1 queries or writes');
console.log('PASS: '+protectedHandlers+' protected Admin HTTP handlers reject unauthenticated and cross-site sessions before DB calls; '+unprotectedUnsupported+' explicit 405 stubs excluded.');
