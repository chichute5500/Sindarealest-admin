import assert from 'node:assert/strict';
import { verifyProductionR2Bindings, fetchProductionPagesProject, fetchR2BucketPublicAccess, assertPrivateR2Access } from '../scripts/verify-pages-bindings.mjs';

const valid = {
  name: 'sindarealest2',
  deployment_configs: {
    production: {
      r2_buckets: {
        IMAGES: { name: 'sindarealest-images' },
        ORIGINALS: { name: 'sindarealest-originals-private' },
      },
    },
  },
};
assert.deepEqual(verifyProductionR2Bindings(valid, 'sindarealest2'), {
  imagesBucket: 'sindarealest-images',
  originalsBucket: 'sindarealest-originals-private',
});
assert.throws(() => verifyProductionR2Bindings({
  ...valid,
  deployment_configs: { production: { r2_buckets: { IMAGES: { name: 'same' }, ORIGINALS: { name: 'same' } } } },
}, 'sindarealest2'), /cùng một bucket/i);
assert.throws(() => verifyProductionR2Bindings({
  ...valid,
  deployment_configs: { production: { r2_buckets: { IMAGES: { name: 'images' } } } },
}, 'sindarealest2'), /thiếu R2 binding ORIGINALS/i);
assert.throws(() => verifyProductionR2Bindings({
  ...valid,
  deployment_configs: { preview: valid.deployment_configs.production },
}, 'sindarealest2'), /không đọc được R2 bindings/i);
assert.throws(() => verifyProductionR2Bindings(valid, 'wrong-project'), /không khớp tên/i);
assert.deepEqual(assertPrivateR2Access({ r2devEnabled: false, customDomains: [] }), { r2devEnabled: false, enabledCustomDomains: 0 });
assert.throws(() => assertPrivateR2Access({ r2devEnabled: true, customDomains: [] }), /r2\.dev/i);
assert.throws(() => assertPrivateR2Access({ r2devEnabled: false, customDomains: [{ domain: 'public.example', enabled: true }] }), /custom domain công khai/i);
assert.throws(() => assertPrivateR2Access({ r2devEnabled: false, customDomains: [{ domain: 'unknown.example' }] }), /không đọc được đầy đủ/i);

const accessCalls = [];
const access = await fetchR2BucketPublicAccess({
  accountId: 'account-id',
  bucketName: 'private-originals',
  apiToken: 'test-token',
  fetchImpl: async (url, options) => {
    accessCalls.push({ url, options });
    if (url.endsWith('/domains/managed')) return { ok: true, json: async () => ({ success: true, result: { enabled: false } }) };
    if (url.endsWith('/domains/custom')) return { ok: true, json: async () => ({ success: true, result: { domains: [] } }) };
    throw new Error('Unexpected URL');
  },
});
assert.equal(access.r2devEnabled, false);
assert.deepEqual(access.customDomains, []);
assert.equal(accessCalls.length, 2);
assert.ok(accessCalls.every(call => call.options.headers.Authorization === 'Bearer test-token'));
await assert.rejects(fetchR2BucketPublicAccess({
  accountId: 'account-id',
  bucketName: 'private-originals',
  apiToken: 'test-token',
  fetchImpl: async () => ({ ok: false, status: 403 }),
}), /HTTP 403/);

let requestArgs;
const apiProject = await fetchProductionPagesProject({
  accountId: 'account-id',
  projectName: 'sindarealest2',
  apiToken: 'test-token',
  fetchImpl: async (url, options) => {
    requestArgs = { url, options };
    return { ok: true, json: async () => ({ success: true, result: valid }) };
  },
});
assert.equal(apiProject.name, 'sindarealest2');
assert.match(requestArgs.url, /accounts\/account-id\/pages\/projects\/sindarealest2$/);
assert.equal(requestArgs.options.headers.Authorization, 'Bearer test-token');
await assert.rejects(fetchProductionPagesProject({
  accountId: 'account-id',
  projectName: 'sindarealest2',
  apiToken: 'test-token',
  fetchImpl: async () => ({ ok: false, status: 403 }),
}), /HTTP 403/);
console.log('Production Pages binding verification tests passed.');
