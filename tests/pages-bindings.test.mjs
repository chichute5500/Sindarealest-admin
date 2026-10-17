import assert from 'node:assert/strict';
import { verifyProductionR2Bindings, verifyPrivateR2Access, fetchProductionPagesProject, fetchR2PublicAccess } from '../scripts/verify-pages-bindings.mjs';

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
assert.deepEqual(verifyPrivateR2Access(
  { success: true, result: { enabled: false, domain: 'pub-example.r2.dev' } },
  { success: true, result: { domains: [] } },
), { r2DevEnabled: false, enabledCustomDomains: [] });
assert.throws(() => verifyPrivateR2Access(
  { success: true, result: { enabled: true } },
  { success: true, result: { domains: [] } },
), /đang bật public access qua r2.dev/i);
assert.throws(() => verifyPrivateR2Access(
  { success: true, result: { enabled: false } },
  { success: true, result: { domains: [{ domain: 'images.example.com', enabled: true }] } },
), /custom domain đang public/i);
assert.throws(() => verifyPrivateR2Access(
  { success: true, result: {} },
  { success: true, result: { domains: [] } },
), /không xác minh được trạng thái public access/i);

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
const r2Calls = [];
const privateAccess = await fetchR2PublicAccess({
  accountId: 'account-id',
  bucketName: 'sindarealest-original',
  apiToken: 'test-token',
  fetchImpl: async (url) => {
    r2Calls.push(url);
    if (url.endsWith('/domains/managed')) return { ok: true, json: async () => ({ success: true, result: { enabled: false } }) };
    return { ok: true, json: async () => ({ success: true, result: { domains: [] } }) };
  },
});
assert.equal(privateAccess.r2DevEnabled, false);
assert.equal(r2Calls.length, 2);
assert.ok(r2Calls.some(url => url.endsWith('/domains/managed')));
assert.ok(r2Calls.some(url => url.endsWith('/domains/custom')));
await assert.rejects(fetchProductionPagesProject({
  accountId: 'account-id',
  projectName: 'sindarealest2',
  apiToken: 'test-token',
  fetchImpl: async () => ({ ok: false, status: 403 }),
}), /HTTP 403/);
console.log('Production Pages binding verification tests passed.');
