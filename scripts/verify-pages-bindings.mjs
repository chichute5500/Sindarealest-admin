import { appendFileSync } from 'node:fs';
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

export function verifyPrivateR2Access(managedPayload, customPayload) {
  if (managedPayload?.success !== true || typeof managedPayload?.result?.enabled !== 'boolean') {
    throw new Error('Không xác minh được trạng thái public access của r2.dev; deploy bị chặn.');
  }
  if (managedPayload.result.enabled) {
    throw new Error('Bucket ORIGINALS đang bật public access qua r2.dev; hãy tắt trước khi deploy.');
  }
  const domains = customPayload?.result?.domains;
  if (customPayload?.success !== true || !Array.isArray(domains)) {
    throw new Error('Không xác minh được custom domains của bucket ORIGINALS; deploy bị chặn.');
  }
  const enabledDomains = domains.filter((domain) => domain?.enabled === true);
  if (enabledDomains.length) {
    throw new Error('Bucket ORIGINALS có custom domain đang public: ' + enabledDomains.map((domain) => String(domain.domain || '(unknown)')).join(', ') + '. Hãy tắt/xóa quyền public trước khi deploy.');
  }
  return { r2DevEnabled: false, enabledCustomDomains: [] };
}

async function cloudflareGet(url, apiToken, fetchImpl) {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Không đọc được cấu hình R2 (HTTP ${response.status}); cần quyền R2 Read và không được deploy khi chưa xác minh.`);
  const payload = await response.json();
  if (payload?.success !== true) throw new Error('Cloudflare API không trả về cấu hình R2 hợp lệ; deploy bị chặn.');
  return payload;
}

export async function fetchProductionPagesProject({ accountId, projectName, apiToken, fetchImpl = fetch }) {
  if (!accountId || !projectName || !apiToken) throw new Error('Thiếu thông tin xác thực Cloudflare Pages để kiểm tra binding.');
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`;
  const payload = await cloudflareGet(url, apiToken, fetchImpl);
  if (!payload.result) throw new Error('Cloudflare API không trả về cấu hình Pages hợp lệ; deploy bị chặn.');
  return payload.result;
}

export async function fetchR2PublicAccess({ accountId, bucketName, apiToken, fetchImpl = fetch }) {
  if (!accountId || !bucketName || !apiToken) throw new Error('Thiếu thông tin xác thực Cloudflare R2 để kiểm tra quyền public.');
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/domains`;
  const [managed, custom] = await Promise.all([
    cloudflareGet(`${base}/managed`, apiToken, fetchImpl),
    cloudflareGet(`${base}/custom`, apiToken, fetchImpl),
  ]);
  return verifyPrivateR2Access(managed, custom);
}

async function main() {
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const project = await fetchProductionPagesProject({ accountId, projectName, apiToken });
  const bindings = verifyProductionR2Bindings(project, projectName);
  const access = await fetchR2PublicAccess({ accountId, bucketName: bindings.originalsBucket, apiToken });
  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, 'CLOUDFLARE_PAGES_ORIGINALS_VERIFIED=true\n', { encoding: 'utf8' });
  }
  console.log(`Đã xác minh Production bindings: IMAGES → ${bindings.imagesBucket}; ORIGINALS → ${bindings.originalsBucket}. Đã xác minh r2.dev bị tắt và không có custom domain public; cho phép tiếp tục deploy.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Kiểm tra binding/quyền riêng tư thất bại: ${error.message}`);
    process.exitCode = 1;
  });
}
