import assert from 'node:assert/strict';
import { verifyProductionR2Bindings, fetchProductionPagesProject } from '../scripts/verify-pages-bindings.mjs';

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
