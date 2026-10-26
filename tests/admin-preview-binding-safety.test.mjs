import assert from 'node:assert/strict';
import {assessAdminPreviewBindings} from '../scripts/admin-preview-binding-safety.mjs';

const make = ({adminDb='db-admin-preview',adminImages='r2-admin-preview',adminOriginals,
  prodDb='db-production',prodImages='r2-production-images',prodOriginals='r2-production-private',
  adminName='sindarealest-admin-preview',storeName='sindarealest2'}={}) => ([
  {success:true,result:{name:adminName,production_branch:'main',deployment_configs:{
    preview:{d1_databases:{DB:{id:adminDb}},r2_buckets:{IMAGES:{name:adminImages},
      ...(adminOriginals===undefined?{}:{ORIGINALS:{name:adminOriginals}})}}
  }}},
  {success:true,result:{name:storeName,production_branch:'main',deployment_configs:{
    production:{d1_databases:{DB:{id:prodDb}},r2_buckets:{IMAGES:{name:prodImages},ORIGINALS:{name:prodOriginals}}}
  }}}
]);
const check = params => assessAdminPreviewBindings(...make(params));
assert.equal(check().deployAllowed,true,'missing ORIGINALS may not block static Admin UI deploy');
assert.equal(check().privateUploadsBindingSeparated,false,'missing original bucket is never upload-ready');
assert.ok(check().warnings.includes('ADMIN_PREVIEW_ORIGINALS_UNBOUND_UPLOADS_DISABLED'));
assert.equal(check({adminOriginals:'r2-private-preview'}).privateUploadsBindingSeparated,true);
assert.equal(check({adminDb:'db-production'}).deployAllowed,false,'never deploy Preview backed by Production D1');
assert.equal(check({adminImages:'r2-production-images'}).deployAllowed,false,'never expose Production IMAGES to Preview');
assert.equal(check({adminImages:'r2-production-private'}).deployAllowed,false,'never expose Production private bucket');
assert.equal(check({adminOriginals:'r2-production-private'}).deployAllowed,false,'never write private originals to Production');
assert.equal(check({adminOriginals:'r2-production-images'}).deployAllowed,false,'never write private originals to public Production bucket');
assert.equal(check({adminOriginals:'r2-admin-preview'}).deployAllowed,false,'private originals cannot use public Preview bucket');
assert.equal(check({prodDb:''}).deployAllowed,false,'missing Production metadata must fail closed');
assert.equal(check({adminName:'unexpected'}).deployAllowed,false,'project identity mismatch must fail closed');
assert.equal(check({storeName:'unexpected'}).deployAllowed,false,'Production project identity mismatch must fail closed');
assert.equal(check({adminOriginals:'r2-private-preview'}).warnings.includes('BINDING_NAMES_ARE_NOT_PROOF_OF_R2_BUCKET_PRIVACY'),true);
assert.doesNotMatch(JSON.stringify(check({adminDb:'db-production'})), /db-production|r2-production/,'no binding names or IDs in diagnostics');
console.log('PASS: isolated Admin Preview deployment checks Production D1/R2 identity and fails closed without modifying storage.');
