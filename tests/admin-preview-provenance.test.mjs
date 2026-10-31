import assert from 'node:assert/strict';
import {assessDeployments, sanitizedDeployments, safeApiErrorCodes} from '../scripts/admin-preview-provenance-readonly.mjs';
const expected='a'.repeat(40), old='b'.repeat(40);
const alias='https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev/admin/';
const glassAlias='https://admin-glass-2026-10-30.sindarealest-admin-preview.pages.dev/admin/';
const valid = ({sha=expected, aliases=['https://feature-admin-isolated-hando.sindarealest-admin-preview.pages.dev'], branch='feature-admin-isolated-handoff-2026-10-20', environment='preview', stage='success', id='new', created_on='2026-10-24T11:10:00Z'}={}) => ({
  id, aliases, environment, created_on, deployment_trigger:{metadata:{branch,commit_hash:sha}}, latest_stage:{name:'deploy',status:stage}
});
assert.equal(assessDeployments([valid()],alias,expected).status,'REPORTED_SHA_MATCH');
assert.equal(assessDeployments([valid({aliases:['https://admin-glass-2026-10-30.sindarealest-admin-preview.pages.dev'],branch:'admin-glass-2026-10-30'})],glassAlias,expected).status,'REPORTED_SHA_MATCH');
assert.equal(assessDeployments([valid({aliases:['https://admin-glass-2026-10-30.sindarealest-admin-preview.pages.dev']})],glassAlias,expected).status,'NOT_VERIFIED_BRANCH_MISMATCH');
assert.equal(assessDeployments([valid({branch:'feat/admin-liquid-glass-2-2026-10-30'})],alias,expected).status,'NOT_VERIFIED_BRANCH_MISMATCH');
assert.equal(assessDeployments([valid({sha:old})],alias,expected).status,'REPORTED_SHA_MISMATCH');
assert.equal(assessDeployments([valid({aliases:['https://wrong.pages.dev']})],alias,expected).status,'NOT_VERIFIED_ALIAS_UNMAPPED');
assert.equal(assessDeployments([valid({environment:'production'})],alias,expected).status,'NOT_VERIFIED_ALIAS_UNMAPPED');
assert.equal(assessDeployments([valid({stage:'failure'})],alias,expected).status,'NOT_VERIFIED_ALIAS_UNMAPPED');
assert.equal(assessDeployments([valid({sha:'short'})],alias,expected).status,'NOT_VERIFIED_INVALID_COMMIT');
assert.equal(assessDeployments([valid({branch:'main'})],alias,expected).status,'NOT_VERIFIED_BRANCH_MISMATCH');
assert.equal(assessDeployments([],alias,expected).status,'NOT_VERIFIED_ALIAS_UNMAPPED');
assert.equal(assessDeployments([valid({sha:old,id:'old'}),valid({id:'new',created_on:'2026-10-24T12:12:00Z'})],alias,expected).status,'REPORTED_SHA_MATCH');
assert.equal(sanitizedDeployments([valid()]).length,1);
assert.ok(!JSON.stringify(assessDeployments([valid()],alias,expected)).includes('token'));
assert.deepEqual(safeApiErrorCodes([{code:1001,message:'do-not-log'},{code:'1002'},{code:'oops'},{},null]),[1001,1002]);
console.log('PASS: Preview deployment provenance remains fail-closed across SHA, alias, branch and environment variations.');
