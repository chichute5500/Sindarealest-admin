import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyProductionR2Bindings(project, projectName = process.env.CLOUDFLARE_PAGES_PROJECT) {
  if (!project || typeof project !== 'object') throw new Error('Cloudflare Pages trả về cấu hình project không hợp lệ.');
  const production = project.deployment_configs?.production;
  const buckets = production?.r2_buckets;
  if (!buckets || typeof buckets !== 'object') {
    throw new Error('Không đọc được R2 bindings của môi trường Production; deploy bị chặn.');
  }
  const images = buckets.IMAGES?.name;
  const originals = buckets.ORIGINALS?.name;
  if (!images) throw new Error('Production Pages thiếu R2 binding IMAGES; deploy bị chặn.');
  if (!originals) throw new Error('Production Pages thiếu R2 binding ORIGINALS; deploy bị chặn.');
  if (images === originals) throw new Error('IMAGES và ORIGINALS đang trỏ cùng một bucket; deploy bị chặn.');
  if (project.name && projectName && project.name !== projectName) {
    throw new Error('Cloudflare API trả về project không khớp tên đã xác nhận; deploy bị chặn.');
  }
  return { imagesBucket: images, originalsBucket: originals };
}

export async function fetchProductionPagesProject({ accountId, projectName, apiToken, fetchImpl = fetch }) {
  if (!accountId || !projectName || !apiToken) throw new Error('Thiếu thông tin xác thực Cloudflare Pages để kiểm tra binding.');
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`;
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`Không đọc được cấu hình Cloudflare Pages (HTTP ${response.status}); cần quyền Pages Read và không được deploy khi chưa xác minh.`);
  }
  const payload = await response.json();
  if (payload?.success !== true || !payload?.result) {
    throw new Error('Cloudflare API không trả về cấu hình Pages hợp lệ; deploy bị chặn.');
  }
  return payload.result;
}

export function getR2ReadToken(env = process.env) {
  if (!env.CLOUDFLARE_R2_READ_API_TOKEN) {
    throw new Error('Thiếu CLOUDFLARE_R2_READ_API_TOKEN để xác minh quyền riêng tư R2.');
  }
  return env.CLOUDFLARE_R2_READ_API_TOKEN;
}

export function assertPrivateR2Access(access) {
  if (!access || typeof access.r2devEnabled !== 'boolean' || !Array.isArray(access.customDomains) ||
      !access.customDomains.every((domain) => domain && typeof domain.enabled === 'boolean')) {
    throw new Error('Không đọc được đầy đủ trạng thái public access của ORIGINALS; deploy bị chặn.');
  }
  if (access.r2devEnabled) throw new Error('Bucket ORIGINALS đang bật public access qua r2.dev; deploy bị chặn.');
  const enabledDomains = access.customDomains.filter((domain) => domain.enabled === true);
  if (enabledDomains.length) throw new Error('Bucket ORIGINALS đang có custom domain công khai bật: ' + enabledDomains.map((domain) => domain.domain || '(không rõ tên)').join(', ') + '; deploy bị chặn.');
  return { r2devEnabled: false, enabledCustomDomains: 0 };
}

export async function fetchR2BucketPublicAccess({ accountId, bucketName, apiToken, fetchImpl = fetch }) {
  if (!accountId || !bucketName || !apiToken) throw new Error('Thiếu thông tin xác thực Cloudflare R2 để kiểm tra public access.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/domains`;
  const headers = { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' };
  const [managedResponse, customResponse] = await Promise.all([
    fetchImpl(`${base}/managed`, { method: 'GET', headers, signal: AbortSignal.timeout(15000) }),
    fetchImpl(`${base}/custom`, { method: 'GET', headers, signal: AbortSignal.timeout(15000) }),
  ]);
  if (!managedResponse.ok || !customResponse.ok) {
    const status = !managedResponse.ok ? managedResponse.status : customResponse.status;
    throw new Error(`Không đọc được cài đặt public access R2 (HTTP ${status}); cần quyền R2 Read và không được deploy khi chưa xác minh.`);
  }
  const [managedPayload, customPayload] = await Promise.all([managedResponse.json(), customResponse.json()]);
  if (managedPayload?.success !== true || typeof managedPayload?.result?.enabled !== 'boolean' ||
      customPayload?.success !== true || !Array.isArray(customPayload?.result?.domains)) {
    throw new Error('Cloudflare API không trả về trạng thái public access R2 hợp lệ; deploy bị chặn.');
  }
  return {
    r2devEnabled: managedPayload.result.enabled,
    customDomains: customPayload.result.domains,
  };
}

async function main() {
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT;
  const project = await fetchProductionPagesProject({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    projectName,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
  });
  const result = verifyProductionR2Bindings(project, projectName);
  const access = await fetchR2BucketPublicAccess({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    bucketName: result.originalsBucket,
    // R2 domain settings require R2 Read scope; keep this separate from the Pages token.
    apiToken: getR2ReadToken(),
  });
  const privacy = assertPrivateR2Access(access);
  console.log(`Đã xác minh Production bindings: IMAGES → ${result.imagesBucket}; ORIGINALS → ${result.originalsBucket}. Public access ORIGINALS: r2.dev tắt, ${privacy.enabledCustomDomains} custom domain công khai đang bật.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Kiểm tra binding thất bại: ${error.message}`);
    process.exitCode = 1;
  });
}
