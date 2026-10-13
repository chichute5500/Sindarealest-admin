import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  assertSafeName,
  findNamedRecord,
  listPagesProjects,
  runWrangler,
} from './cloudflare-utils.mjs';

const ci = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const rl = createInterface({ input, output });
const ask = async (question, fallback = '') => {
  const answer = (await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback;
};

async function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    if (ci) throw new Error('Thiếu CLOUDFLARE_API_TOKEN hoặc CLOUDFLARE_ACCOUNT_ID trong GitHub Actions Secrets.');
    console.log('Lưu ý: đăng nhập Wrangler trước bằng `npx wrangler login`; không dán token vào câu lệnh.');
  }
  const projects = listPagesProjects();
  const project = process.env.CLOUDFLARE_PAGES_PROJECT || (ci ? '' : await ask('Tên Pages project đã tồn tại trên Cloudflare'));
  if (!project) throw new Error('Thiếu CLOUDFLARE_PAGES_PROJECT. Script không tự tạo project.');
  assertSafeName(project, 'Tên Pages project');
  const record = findNamedRecord(projects, project, ['name', 'project_name', 'Project Name']);
  if (!record) throw new Error(`Không tìm thấy project “${project}” trong tài khoản Wrangler hiện tại; deploy bị hủy.`);

  const expectedBranch = typeof record.production_branch === 'string' ? record.production_branch : '';
  const branch = process.env.CLOUDFLARE_PAGES_BRANCH || (ci ? '' : await ask('Production branch', expectedBranch));
  if (!branch) throw new Error('Thiếu CLOUDFLARE_PAGES_BRANCH và không đọc được production branch từ Cloudflare.');
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) throw new Error('Tên branch chứa ký tự không hợp lệ.');
  if (expectedBranch && branch !== expectedBranch) {
    throw new Error(`Branch ${branch} không khớp production branch ${expectedBranch}; deploy bị hủy.`);
  }
  if (ci && process.env.GITHUB_REF_NAME && branch !== process.env.GITHUB_REF_NAME) {
    throw new Error(`GitHub đang chạy từ branch ${process.env.GITHUB_REF_NAME}, không phải production branch ${branch}; deploy bị hủy để tránh đẩy nhầm mã nguồn.`);
  }
  if (!ci) {
    const confirm = await ask(`Gõ chính xác DEPLOY ${project} ${branch} để triển khai`);
    if (confirm !== `DEPLOY ${project} ${branch}`) throw new Error('Xác nhận không khớp; đã hủy deploy.');
  }

  runWrangler(['pages', 'deploy', 'public', `--project-name=${project}`, `--branch=${branch}`], { interactive: true });
}

main().catch((error) => {
  console.error(`\nDEPLOY BỊ HỦY: ${error.message}`);
  process.exitCode = 1;
}).finally(() => rl.close());
