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

async function main() {
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT;
  const project = await fetchProductionPagesProject({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    projectName,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
  });
  const result = verifyProductionR2Bindings(project, projectName);
  console.log(`Đã xác minh binding Production: IMAGES → ${result.imagesBucket}; ORIGINALS → ${result.originalsBucket}. Việc xác minh public access của bucket ORIGINALS vẫn cần hoàn tất trước khi bật readiness flag.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Kiểm tra binding thất bại: ${error.message}`);
    process.exitCode = 1;
  });
}
