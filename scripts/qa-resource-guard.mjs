/** SinDarealest: local-only CI safety guard (no network or Cloudflare calls). */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const required=['AGENTS.md','.github/copilot-instructions.md','docs/QA_RESOURCE_POLICY.md'];
function review(name,source){
 const failures=[];
 const trigger=source.split(/\n(?:permissions|jobs|concurrency|defaults):\s*\n/)[0];
 const remote=/pages\.dev|ADMIN_TEST_URL|AUDIT_TARGET_URL|wrangler\s+pages\s+deploy/i.test(source);
 const fullQa=/\blighthouse\b|AUDIT_STRICT_VISUAL|audit-readonly\.mjs|audit-lcp-probe\.mjs/i.test(source);
 const autoPush=/^\s{2,4}push:\s*(?:#.*)?$/m.test(trigger);
 const hasConcurrency=/^concurrency:\s*$/m.test(source)
  && /^\s+group:\s*.+$/m.test(source)
  && /^\s+cancel-in-progress:\s*(true|false|\$\{\{.+\}\})/m.test(source);
 if(remote&&!hasConcurrency)failures.push('live workflow missing concurrency group + cancel-in-progress');
 if(remote&&fullQa&&autoPush)failures.push('full live Lighthouse/visual QA auto-triggers on source push; use candidate-only/manual QA');
 if(remote&&/while\s+(true|:)|for\s*\(\s*;\s*;\s*\)/i.test(source))failures.push('unbounded remote request loop');
 return failures.map(f=>name+': '+f);
}
function selfTest(){
 const ok='name: QA\non:\n  workflow_dispatch:\nconcurrency:\n  group: preview-sha\n  cancel-in-progress: true\njobs:\n  qa:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npx lighthouse https://example.pages.dev';
 const bad='name: QA\non:\n  push:\n    branches: [fix/audit]\njobs:\n  qa:\n    steps:\n      - run: npx lighthouse https://example.pages.dev';
 assert.deepEqual(review('ok',ok),[]);
 assert.equal(review('bad',bad).length,2);
 console.log('PASS: QA resource policy self-tests');
}
if(process.argv.includes('--self-test')){selfTest();process.exit(0)}
const errors=[];
for(const path of required){if(!existsSync(path))errors.push('Missing '+path)}
if(!existsSync('scripts/qa-resource-guard.mjs'))errors.push('Missing shared QA guard');
let changed=[];
try{
 changed=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
 if(!changed.length)changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
}catch(e){console.log('No Git history available: checking policy presence and self-test only');}
for(const path of changed.filter(p=>/^\.github\/workflows\/[^/]+\.ya?ml$/.test(p)&&existsSync(p))){
 try{errors.push(...review(path,readFileSync(path,'utf8')))}
 catch(e){errors.push('Could not read '+path+': '+e.message)}
}
selfTest();
if(errors.length){for(const e of errors)console.error('QA RESOURCE POLICY FAIL:',e);process.exitCode=1}
else console.log('PASS: shared policy files present and changed workflow safeguards checked ('+changed.length+' changed paths).');
