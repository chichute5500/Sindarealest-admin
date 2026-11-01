import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const adminDir=fileURLToPath(new URL('../functions/api/admin/',import.meta.url));
const root=fileURLToPath(new URL('..',import.meta.url));
function walk(dir) {
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry => {
    const full=join(dir,entry.name);
    return entry.isDirectory()?walk(full):(entry.isFile()&&entry.name.endsWith('.js')?[full]:[]);
  });
}
const files=walk(adminDir);
assert.equal(files.length,24,'Unexpected Admin API surface: review every new/removed route before release');
for(const file of files) {
  const source=readFileSync(file,'utf8');
  const path=relative(root,file).split(sep).join('/');
  assert.match(source,/export async function onRequest(?:Get|Post|Put|Patch|Delete)/,
    path+': explicit HTTP handler required');
  if(path.endsWith('/login.js')||path.endsWith('/logout.js')) {
    assert.match(source,/sameSiteRequest\s*\(/,path+': reject cross-origin authentication/logout attempts');
    continue;
  }
  assert.match(source,/requireAdmin\s*\(/,path+': authenticated Admin permission required');
  assert.match(source,/auth\s*\.\s*response/,path+': fail closed before reads or mutations');
}
const core=readFileSync(join(root,'functions/_lib.js'),'utf8');
assert.match(core,/export async function requireAdmin\s*\(/);
assert.match(core,/await verifySession\s*\(request,\s*env\)/,'all Admin operations must verify signed sessions');
assert.match(core,/sameSiteRequest\s*\(request\)/,'all Admin operations must reject other-site requests');
assert.match(core,/SameSite=Strict/,'Admin authentication cookie must be same-site only');
assert.match(core,/HttpOnly/,'Admin authentication cookie must not be readable by JS');
assert.match(core,/Secure/,'Admin authentication cookie must be HTTPS-only');
console.log('PASS: 24 Admin API route modules declare expected session/CSRF authorization guards; login and logout remain same-site only.');
