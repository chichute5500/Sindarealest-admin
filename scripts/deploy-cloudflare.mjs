import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  assertSafeName,
  findNamedRecord,
  listPagesProjects,
  parseCliJson,
  runWrangler,
} from './cloudflare-utils.mjs';

const ci = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const rl = createInterface({ input, output });
const ask = async (question, fallback = '') => {
  const answer = (await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback;
};

async function main() {
  if (ci && process.env.CLOUDFLARE_PAGES_ORIGINALS_READY !== 'true') {
    throw new Error('Deploy bị chặn: chưa xác minh binding ORIGINALS riêng tư. Xác minh ORIGINALS khác IMAGES, không public access/r2.dev/custom domain và được gắn trong đúng môi trường Pages; chỉ sau đó mới đặt CLOUDFLARE_PAGES_ORIGINALS_READY=true.');
  }
  if (!ci) {
    const originalsReady = (await ask('Đã xác minh binding ORIGINALS là bucket riêng tư, khác IMAGES và gắn đúng môi trường Pages chưa? Nhập YES', 'NO')).toUpperCase();
    if (originalsReady !== 'YES') throw new Error('Đã hủy deploy cho đến khi ORIGINALS được xác minh.');
  }
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
  // The new order-contact snapshot migration is a hard prerequisite for
  // routes and backup queries in this branch. Check schema read-only before any deploy.
  const databaseName = process.env.CLOUDFLARE_D1_DATABASE || (ci ? '' : await ask('Tên D1 database', 'sindarealest-db'));
  if (!databaseName) throw new Error('Thiếu CLOUDFLARE_D1_DATABASE; không thể xác minh migration bắt buộc.');
  assertSafeName(databaseName, 'Tên D1 database');
  console.log(`Xác minh schema và snapshot đơn hàng trong D1 ${databaseName} trước khi deploy…`);
  const schemaCheck = runWrangler([
    'd1', 'execute', databaseName, '--remote', '--json',
    '--command', 'SELECT COUNT(*) AS missing_order_contact_snapshots FROM orders o LEFT JOIN order_contact_details d ON d.order_id=o.id WHERE d.order_id IS NULL;',
  ], { quiet: true });
  const schemaData = parseCliJson(schemaCheck.stdout, 'kiểm tra snapshot liên hệ đơn hàng');
  const findMissingCount = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findMissingCount(item);
        if (found !== null) return found;
      }
    } else if (value && typeof value === 'object') {
      if (Object.hasOwn(value, 'missing_order_contact_snapshots')) {
        const count = Number(value.missing_order_contact_snapshots);
        return Number.isSafeInteger(count) && count >= 0 ? count : null;
      }
      for (const item of Object.values(value)) {
        const found = findMissingCount(item);
        if (found !== null) return found;
      }
    }
    return null;
  };
  const missingSnapshots = findMissingCount(schemaData);
  if (missingSnapshots === null || missingSnapshots > 0) {
    throw new Error(`Migration 0007 chưa sẵn sàng: còn ${missingSnapshots ?? 'không xác định'} đơn hàng thiếu snapshot liên hệ. Deploy bị chặn; không tự chạy migration.`);
  }
  try {
    runWrangler(['d1', 'execute', databaseName, '--remote', '--command', 'SELECT sku_verified FROM products LIMIT 0;'], { quiet: true });
    runWrangler(['d1', 'execute', databaseName, '--remote', '--command', 'SELECT sku_verified FROM order_items LIMIT 0;'], { quiet: true });
  } catch {
    throw new Error('Migration 0008_product_sku_verification.sql chưa được áp dụng trên D1. Deploy bị chặn; áp dụng và xác minh schema thủ công trước. Script không tự chạy migration production.');
  }

  console.log('Xác minh schema fulfillment/payment migration 0009 trước deploy…');
  try {
    for (const query of [
      "SELECT fulfillment_type FROM products LIMIT 0;",
      "SELECT fulfillment_type FROM order_items LIMIT 0;",
      "SELECT payment_terms_confirmed_at, payment_terms_confirmed_by, payment_terms_note, public_access_token_hash FROM orders LIMIT 0;",
      "SELECT id, order_id, installment_type, amount, shipping_benefit, transfer_reference, qr_image_key, bank_name, account_number, account_name, status, created_by, created_at, updated_at FROM order_payment_requests LIMIT 0;",
      "SELECT id, order_id, payment_request_id, direction, amount, transaction_reference, note, actor, verified_at, created_at FROM order_payment_transactions LIMIT 0;"
    ]) {
      runWrangler(['d1', 'execute', databaseName, '--remote', '--command', query], { quiet: true });
    }
  } catch {
    throw new Error('Migration 0009_fulfillment_and_manual_payments.sql chưa sẵn sàng trên D1. Deploy bị chặn; script chỉ đọc schema và không tự chạy hoặc sửa migration/D1.');
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
