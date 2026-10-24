import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  assertSafeName,
  findNamedRecord,
  listD1Databases,
  listPagesProjects,
  readProductCount,
  parseCliJson,
  runWrangler,
} from './cloudflare-utils.mjs';

const rl = createInterface({ input, output });
const ask = async (question, fallback = '') => {
  const answer = (await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback;
};
const required = (value, label) => {
  if (!value) throw new Error(`Chưa nhập ${label}. Đã dừng, không có tài nguyên từ xa nào bị thay đổi.`);
  return value;
};

function runLocalCheck() {
  const result = spawnSync(process.execPath, ['scripts/check-project.mjs'], { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error('Kiểm tra mã nguồn thất bại. Sửa toàn bộ lỗi trước khi cấu hình Cloudflare.');
}

async function ensureLogin() {
  try {
    runWrangler(['whoami'], { quiet: true });
  } catch {
    console.log('\nWrangler chưa xác minh được phiên đăng nhập. Hãy hoàn tất đăng nhập Cloudflare trong trình duyệt.');
    runWrangler(['login'], { interactive: true });
    runWrangler(['whoami'], { quiet: true });
  }
}

async function main() {
  console.log('\n=== SINDAREALest · KIỂM TRA AN TOÀN TRƯỚC THIẾT LẬP ===');
  console.log('Script này KHÔNG tạo project mới và KHÔNG xóa token, project, D1 database hay R2 bucket.');
  console.log('Các tên tài nguyên phải lấy trực tiếp từ Cloudflare Dashboard; không tự dùng tên mặc định.\n');

  runLocalCheck();
  await ensureLogin();

  const projects = listPagesProjects();
  const dbs = listD1Databases();

  const project = required(await ask('Tên Pages project CHÍNH XÁC đang dùng cho website'), 'tên Pages project');
  assertSafeName(project, 'Tên Pages project');
  const projectRecord = findNamedRecord(projects, project, ['name', 'project_name']);
  if (!projectRecord) throw new Error(`Không tìm thấy Pages project “${project}” trong tài khoản Wrangler hiện tại. Kiểm tra tài khoản Cloudflare rồi chạy lại; script không tạo project mới.`);

  const dbName = required(await ask('Tên D1 database CHÍNH XÁC sẽ lưu sản phẩm'), 'tên D1 database');
  assertSafeName(dbName, 'Tên D1 database');
  if (!findNamedRecord(dbs, dbName, ['name', 'database_name'])) {
    throw new Error(`Không tìm thấy D1 database “${dbName}”. Script không tự tạo database để tránh nhầm tài nguyên.`);
  }

  const bucket = required(await ask('Tên R2 bucket IMAGES dùng cho ảnh WebP hiển thị và logo'), 'tên R2 bucket IMAGES');
  assertSafeName(bucket, 'Tên R2 bucket IMAGES');
  runWrangler(['r2', 'bucket', 'info', bucket, '--json'], { quiet: true });
  const originalsBucket = required(await ask('Tên R2 bucket ORIGINALS RIÊNG TƯ để lưu ảnh gốc'), 'tên R2 bucket ORIGINALS');
  assertSafeName(originalsBucket, 'Tên R2 bucket ORIGINALS');
  if (originalsBucket === bucket) throw new Error('ORIGINALS phải là bucket riêng tư khác IMAGES.');
  runWrangler(['r2', 'bucket', 'info', originalsBucket, '--json'], { quiet: true });

  const productionBranch = typeof projectRecord.production_branch === 'string' ? projectRecord.production_branch : '';
  const branch = required(await ask('Production branch của Pages project', productionBranch), 'production branch');
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) throw new Error('Tên branch chứa ký tự không hợp lệ.');
  if (productionBranch && branch !== productionBranch) {
    throw new Error(`Branch vừa nhập (${branch}) khác production branch mà Cloudflare trả về (${productionBranch}). Đã dừng để tránh tạo deployment preview ngoài ý muốn.`);
  }

  let freshAnswer = (await ask('Bảng products của D1 này đang trống và bạn muốn nạp 235 sản phẩm ban đầu? Chỉ trả lời YES hoặc NO', 'NO')).toUpperCase();
  if (freshAnswer !== 'YES' && freshAnswer !== 'NO') throw new Error('Chỉ chấp nhận YES hoặc NO. Đã dừng trước khi thay đổi D1.');

  console.log('\nTÓM TẮT TÀI NGUYÊN SẼ DÙNG');
  console.log(`Pages project : ${project}`);
  console.log(`Production branch: ${branch}`);
  console.log(`D1 database   : ${dbName}`);
  console.log(`R2 bucket IMAGES: ${bucket}`);
  console.log(`R2 bucket ORIGINALS (riêng tư): ${originalsBucket}`);
  console.log(`Nạp dữ liệu gốc: ${freshAnswer}`);
  console.log('\nTRƯỚC KHI CHẠY SQL/DEPLOY: trong Cloudflare Dashboard, hãy lưu đúng hai bindings Production (DB → D1; IMAGES → bucket ảnh công khai; ORIGINALS → bucket R2 riêng tư khác IMAGES, không public access/r2.dev/custom domain) và hai secrets ADMIN_PASSWORD, SESSION_SECRET.');
  const bindingsReady = (await ask('Bạn đã lưu và kiểm tra đúng 3 bindings DB/IMAGES/ORIGINALS (ORIGINALS riêng tư, khác IMAGES) cùng 2 secrets ADMIN_PASSWORD và SESSION_SECRET trên đúng Pages project chưa? Nhập YES để tiếp tục', 'NO')).toUpperCase();
  if (bindingsReady !== 'YES') {
    throw new Error('Dừng trước mọi lệnh SQL và deploy. Hãy kiểm tra bindings DB/IMAGES/ORIGINALS và 2 secrets ADMIN_PASSWORD, SESSION_SECRET, rồi chạy lại npm run setup:cloudflare.');
  }
  const confirm = await ask(`Để xác nhận, nhập chính xác: DEPLOY ${project} USING ${dbName} AND ${bucket} AND ${originalsBucket}`);
  if (confirm !== `DEPLOY ${project} USING ${dbName} AND ${bucket} AND ${originalsBucket}`) {
    throw new Error('Chuỗi xác nhận không khớp. Đã hủy trước khi chạy SQL hoặc deploy.');
  }

  console.log('\n1/6 · Áp dụng schema SQL idempotent cho D1…');
  runWrangler(['d1', 'execute', dbName, '--remote', '--file=migrations/0001_schema.sql'], { interactive: true });

  console.log('\n2/6 · Áp dụng bảng đơn hàng, khách hàng, bảo hành và audit log…');
  runWrangler(['d1', 'execute', dbName, '--remote', '--file=migrations/0003_storefront_operations.sql'], { interactive: true });
  console.log('Áp dụng migration thông báo quản trị (idempotent)…');
  runWrangler(['d1', 'execute', dbName, '--remote', '--file=migrations/0004_admin_notifications.sql'], { interactive: true });
  console.log('Áp dụng địa chỉ giao hàng và metadata bảo hành (idempotent)…');
  runWrangler(['d1', 'execute', dbName, '--remote', '--file=migrations/0005_address_warranty_verification.sql'], { interactive: true });
  runWrangler(['d1', 'execute', dbName, '--remote', '--file=migrations/0006_remove_warranty_otp.sql'], { interactive: true });
  console.log('Áp dụng snapshot liên hệ đơn hàng (idempotent)…');
  runWrangler(['d1', 'execute', dbName, '--remote', '--file=migrations/0007_order_contact_details.sql'], { interactive: true });
  console.log('Đảm bảo schema migrations/0008_product_sku_verification.sql; chỉ bổ sung các cột còn thiếu…');
  const d1HasColumn = (tableName, columnName) => {
    const result = runWrangler(['d1', 'execute', dbName, '--remote', '--json', '--command', `PRAGMA table_info(${tableName});`], { quiet: true });
    const parsed = parseCliJson(result.stdout, `schema D1 ${tableName}`);
    const containsColumn = (value) => {
      if (Array.isArray(value)) return value.some(containsColumn);
      if (!value || typeof value !== 'object') return false;
      if (value.name === columnName) return true;
      return Object.values(value).some(containsColumn);
    };
    return containsColumn(parsed);
  };
  if (!d1HasColumn('products', 'sku_verified')) {
    runWrangler(['d1', 'execute', dbName, '--remote', '--command', 'ALTER TABLE products ADD COLUMN sku_verified INTEGER NOT NULL DEFAULT 0 CHECK (sku_verified IN (0,1));'], { interactive: true });
  }
  if (!d1HasColumn('order_items', 'sku_verified')) {
    runWrangler(['d1', 'execute', dbName, '--remote', '--command', 'ALTER TABLE order_items ADD COLUMN sku_verified INTEGER NOT NULL DEFAULT 0 CHECK (sku_verified IN (0,1));'], { interactive: true });
  }

  console.log('\n3/6 · Xác minh các cột cần thiết của D1…');
  for (const query of [
    'SELECT id, slug, sku, sku_verified, title, category, category_label, description, price, stock, published, images_json, source_price_confirmed, sort_order, created_at, updated_at FROM products LIMIT 0;',
    'SELECT key, value, updated_at FROM settings LIMIT 0;',
    'SELECT ip_hash, window_start, attempts FROM admin_login_attempts LIMIT 0;',
    'SELECT id, order_number, customer_id, status, total FROM orders LIMIT 0;',
    'SELECT id, full_name, phone, email FROM customers LIMIT 0;',
    'SELECT id, order_id, warranty_code, duration_months, status FROM warranties LIMIT 0;',
    'SELECT id, order_id, customer_id, message, status FROM warranty_claims LIMIT 0;',
    'SELECT id, actor, action, entity_type, entity_id FROM audit_logs LIMIT 0;',
    'SELECT scope, ip_hash, window_start, attempts FROM public_rate_limits LIMIT 0;',
    'SELECT customer_id, province_code, province, ward_code, ward, street_address FROM customer_address_details LIMIT 0;',
    'SELECT order_id, province_code, province, ward_code, ward, street_address, full_address FROM order_shipping_addresses LIMIT 0;',
    'SELECT claim_id, image_key FROM warranty_claim_attachments LIMIT 0;',
    'SELECT sku_verified FROM order_items LIMIT 0;'
  ]) {
    runWrangler(['d1', 'execute', dbName, '--remote', '--command', query], { interactive: true });
  }

  console.log('\n4/6 · Xác minh schema fulfillment/payment của migration 0009 trước seed/deploy…');
  try {
    for (const query of [
      "SELECT fulfillment_type FROM products LIMIT 0;",
      "SELECT fulfillment_type FROM order_items LIMIT 0;",
      "SELECT payment_terms_confirmed_at, payment_terms_confirmed_by, payment_terms_note, public_access_token_hash FROM orders LIMIT 0;",
      "SELECT id, order_id, installment_type, amount, shipping_benefit, transfer_reference, qr_image_key, bank_name, account_number, account_name, status, created_by, created_at, updated_at FROM order_payment_requests LIMIT 0;",
      "SELECT id, order_id, payment_request_id, direction, amount, transaction_reference, note, actor, verified_at, created_at FROM order_payment_transactions LIMIT 0;"
    ]) {
      runWrangler(['d1', 'execute', dbName, '--remote', '--command', query], { quiet: true });
    }
  } catch {
    throw new Error('Migration 0009_fulfillment_and_manual_payments.sql chưa sẵn sàng trên D1. Đã dừng trước bước seed và Pages deploy; script không tự động chạy migration 0009. Chỉ tiếp tục sau quy trình được chủ dự án phê duyệt và xác minh lại schema.');
  }

  let productCount = readProductCount(dbName);
  if (freshAnswer === 'YES') {
    if (productCount !== 0) {
      throw new Error(`D1 đang có ${productCount} sản phẩm. Đã từ chối nạp seed để tránh khôi phục/trộn nhầm dữ liệu. Không có sản phẩm nào bị seed ghi đè.`);
    }
    console.log('\n5/6 · D1 đang trống; nhập seed 235 sản phẩm…');
    runWrangler(['d1', 'execute', dbName, '--remote', '--file=migrations/0002_seed_products.sql'], { interactive: true });
    productCount = readProductCount(dbName);
    if (productCount !== 235) {
      throw new Error(`Seed kết thúc nhưng số sản phẩm là ${productCount}, không phải 235. Đã dừng trước khi deploy; kiểm tra D1 trước khi tiếp tục.`);
    }
  } else {
    console.log(`\n5/6 · Giữ nguyên dữ liệu D1 hiện tại (${productCount} sản phẩm); bỏ qua seed.`);
  }

  console.log('\n6/6 · Triển khai website cùng Pages Functions…');
  runWrangler(['pages', 'deploy', 'public', `--project-name=${project}`, `--branch=${branch}`], { interactive: true });

  console.log('\n=== KIỂM TRA SAU DEPLOY ===');
  console.log('1. Vì đã xác nhận bindings/secrets trước deploy, kiểm tra /api/products và /admin/ ngay.');
  console.log('2. Đăng nhập admin; lưu một sản phẩm thử, thử ẩn/hiện sản phẩm và tải lên một ảnh WebP.');
  console.log('3. Xác nhận API công khai trả đúng dữ liệu đã chọn; nếu vừa nạp seed thì phải là 235 sản phẩm.');
  console.log('4. Tải backup JSON trước khi thử Khôi phục vì chức năng này thay thế toàn bộ danh sách sản phẩm/cài đặt.');
  console.log('\nScript không tự xóa hoặc thu hồi bất kỳ tài nguyên/token nào. Không xóa D1/R2 để sửa lỗi.');
}

main().catch((error) => {
  console.error(`\nĐÃ DỪNG AN TOÀN: ${error.message}`);
  console.error('Không triển khai tiếp sau lỗi. Đọc thông báo, xác minh tên tài nguyên/tài khoản và chạy lại sau khi đã sửa nguyên nhân.');
  process.exitCode = 1;
}).finally(() => rl.close());
