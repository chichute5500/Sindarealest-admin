import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }
function walk(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full)); else files.push(full);
  }
  return files;
}
function runTest(file) {
  const result = spawnSync(process.execPath, [file], { cwd: root, encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) failures.push(`Test thất bại: ${file}\n${result.stdout || ''}${result.stderr || ''}`);
}

for (const required of [
  'package.json', 'wrangler.toml',
  'functions/_lib.js', 'functions/_lib/watermark-settings.js', 'functions/_middleware.js', 'functions/sitemap.xml.js', 'functions/robots.txt.js', 'functions/api/products.js', 'functions/api/settings.js', 'functions/api/orders.js', 'functions/api/warranty-claims.js', 'functions/api/warranty-lookup.js', 'functions/api/warranty-claim-uploads.js', 'functions/api/admin/orders.js', 'functions/api/admin/customers.js', 'functions/api/admin/warranties.js', 'functions/api/admin/audit-logs.js', 'functions/api/admin/login.js',
  'functions/api/admin/logout.js', 'functions/api/admin/session.js', 'functions/api/admin/products.js',
  'functions/api/admin/products/[id].js', 'functions/api/admin/products/reset-skus.js', 'functions/api/admin/ai-description.js', 'functions/api/admin/push-subscriptions.js', 'functions/api/admin/settings.js', 'functions/api/admin/backup.js',
  'functions/api/admin/restore.js', 'functions/api/admin/upload.js', 'functions/api/admin/warranty-claim-image.js', 'functions/media/[key].js',
  'migrations/0001_schema.sql', 'migrations/0002_seed_products.sql', 'migrations/0003_storefront_operations.sql', 'migrations/0004_admin_notifications.sql', 'migrations/0005_address_warranty_verification.sql', 'migrations/0006_remove_warranty_otp.sql',
  'public/index.html', 'public/admin/index.html', 'public/ui/storefront.css', 'public/ui/admin.css', 'public/_redirects', 'public/og-sindarealest.jpg', 'public/watermark.webp',
  '.github/workflows/deploy.yml', 'scripts/setup-cloudflare.mjs', 'scripts/deploy-cloudflare.mjs',
]) check(existsSync(join(root, required)), `Thiếu tệp bắt buộc: ${required}`);

for (const f of walk(join(root, 'functions')).filter(x => x.endsWith('.js'))
  .concat(walk(join(root, 'scripts')).filter(x => x.endsWith('.mjs')))
  .concat(walk(join(root, 'tests')).filter(x => x.endsWith('.mjs')))) {
  const result = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  check(result.status === 0, `Cú pháp JavaScript lỗi: ${relative(root, f)} ${result.stderr || ''}`);
}

for (const htmlPath of [join(root, 'public/index.html'), join(root, 'public/admin/index.html')]) {
  if (!existsSync(htmlPath)) continue;
  const html = readFileSync(htmlPath, 'utf8');
  const matches = html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi);
  let index = 0;
  for (const match of matches) {
    const attrs = match[1] || '';
    if (/\bsrc\s*=/.test(attrs) || /application\/ld\+json|application\/json/i.test(attrs)) continue;
    index++;
    try { new vm.Script(match[2], { filename: `${relative(root, htmlPath)} inline-script-${index}` }); }
    catch (error) { failures.push(`JavaScript nhúng lỗi: ${relative(root, htmlPath)} #${index}: ${error.message}`); }
  }
}

const sourcePath = join(root, 'data/legacy-products.json');
let source = [];
try { source = JSON.parse(readFileSync(sourcePath, 'utf8')); }
catch { failures.push('Không đọc được data/legacy-products.json'); }
check(source.length === 235, `Số sản phẩm nguồn thay đổi ngoài dự kiến: ${source.length}`);
check(new Set(source.map(p => p.sku)).size === source.length, 'SKU bị trùng trong dữ liệu nguồn');
check(new Set(source.map(p => p.id)).size === source.length, 'ID bị trùng trong dữ liệu nguồn');
check(!existsSync(join(root, 'public/products.json')), 'products.json cũ không được phép nằm trong thư mục công khai');
check(!existsSync(join(root, 'public/catalog-fallback.json')), 'Không được có catalogue tĩnh cũ có thể che lỗi API/D1');

for (const p of source) {
  check(Array.isArray(p.images), `Ảnh không phải mảng tại SKU ${p.sku}`);
  for (const image of (p.images || [])) check(existsSync(join(root, 'public', image)), `Thiếu ảnh ${image} (${p.sku})`);
}

const seed = existsSync(join(root, 'migrations/0002_seed_products.sql'))
  ? readFileSync(join(root, 'migrations/0002_seed_products.sql'), 'utf8') : '';
check((seed.match(/INSERT OR IGNORE INTO products/g) || []).length === 235, 'Tệp seed SQL không có đúng 235 sản phẩm');
const seedSkus = [...seed.matchAll(/,\s*'(SD\d{3})',/g)].map(m => m[1]);
check(seedSkus.length === 235, `Số SKU đọc được trong SQL seed là ${seedSkus.length}, không phải 235`);
check(new Set(seedSkus).size === seedSkus.length, 'SKU bị trùng trong tệp seed SQL');
check(seedSkus.every(sku => source.some(p => p.sku === sku)), 'SKU trong SQL seed không khớp dữ liệu nguồn');

const homepage = existsSync(join(root, 'public/index.html')) ? readFileSync(join(root, 'public/index.html'), 'utf8') : '';
const storefrontCss = existsSync(join(root, 'public/ui/storefront.css')) ? readFileSync(join(root, 'public/ui/storefront.css'), 'utf8') : '';
const adminCss = existsSync(join(root, 'public/ui/admin.css')) ? readFileSync(join(root, 'public/ui/admin.css'), 'utf8') : '';
check(homepage.includes('/ui/storefront.css?v=20261017-2'), 'Trang chủ chưa liên kết stylesheet giao diện đã hợp nhất');
check(!/<style\\b/i.test(homepage), 'Trang chủ không được giữ các khối CSS vá nhúng trong HTML');
check(!homepage.includes('class="theme-watermark"') && !storefrontCss.includes('theme-watermark{'), 'Không được giữ watermark thử nghiệm phủ nền toàn trang');
check(storefrontCss.includes('theme-croc-dark.webp?v=') && storefrontCss.includes('theme-croc-albino.webp?v='), 'Thiếu ảnh nền có phiên bản cho hai chế độ sáng/tối');
check(/\\.theme-bg--dark\\{[^}]*theme-croc-dark\\.webp/.test(storefrontCss), 'Chế độ tối phải dùng ảnh nền da cá sấu tối');
check(/\\.theme-bg--light\\{[^}]*theme-croc-albino\\.webp/.test(storefrontCss), 'Chế độ sáng phải dùng ảnh nền albino sáng');
check(adminCss.includes('theme-croc-dark.webp?v=') && adminCss.includes('theme-croc-albino.webp?v='), 'Admin phải đồng bộ ảnh nền hai chế độ');
check(!/<style\\b/i.test(adminHtml), 'Admin không được giữ stylesheet CSS vá nhúng');
check(homepage.includes("fetch('/api/products'"), 'Trang chủ chưa lấy sản phẩm từ API');
check(homepage.includes('og:title') && homepage.includes('twitter:card'), 'Thiếu metadata social preview');
check(homepage.includes('window.__sdUpdateDetailWatermark') && homepage.includes("document.querySelector('.detail-image-stage')"), 'Watermark phải phủ ảnh lớn trong chi tiết sản phẩm');
check(!homepage.includes("document.querySelectorAll('.product-photo") && !homepage.includes('.product-photo .sd-viewer-watermark') && !homepage.includes('.detail-thumb .sd-viewer-watermark'), 'Watermark không được phủ thẻ danh sách hoặc thumbnail');
check(homepage.includes('/api/orders') && homepage.includes('/api/warranty-claims'), 'Trang chủ chưa kết nối yêu cầu đặt hàng và bảo hành');
check(!homepage.includes('/catalog-fallback.json'), 'Trang chủ còn gọi catalogue fallback tĩnh');
const newMigration = existsSync(join(root, 'migrations/0003_storefront_operations.sql')) ? readFileSync(join(root, 'migrations/0003_storefront_operations.sql'), 'utf8') : '';
for (const table of ['customers','orders','order_items','warranties','warranty_claims','audit_logs','public_rate_limits']) check(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`).test(newMigration), `Migration 0003 thiếu bảng ${table}`);
const redirects = existsSync(join(root, 'public/_redirects')) ? readFileSync(join(root, 'public/_redirects'), 'utf8') : '';
check(redirects.includes('/admin/ /admin/index.html 200'), 'Thiếu rewrite để mở trang /admin/');

const adminHtml = existsSync(join(root, 'public/admin/index.html')) ? readFileSync(join(root, 'public/admin/index.html'), 'utf8') : '';
check(adminHtml.includes('/ui/admin.css?v=20261017-2'), 'Admin chưa liên kết stylesheet giao diện đã hợp nhất');
const endpointMap = {
  '/api/admin/login': 'functions/api/admin/login.js',
  '/api/admin/logout': 'functions/api/admin/logout.js',
  '/api/admin/session': 'functions/api/admin/session.js',
  '/api/admin/products': 'functions/api/admin/products.js',
  '/api/admin/products/reset-skus': 'functions/api/admin/products/reset-skus.js',
  '/api/admin/ai-description': 'functions/api/admin/ai-description.js',
  '/api/admin/push-subscriptions': 'functions/api/admin/push-subscriptions.js',
  '/api/admin/settings': 'functions/api/admin/settings.js',
  '/api/admin/orders': 'functions/api/admin/orders.js',
  '/api/admin/customers': 'functions/api/admin/customers.js',
  '/api/admin/warranties': 'functions/api/admin/warranties.js',
  '/api/admin/audit-logs': 'functions/api/admin/audit-logs.js',
  '/api/admin/backup': 'functions/api/admin/backup.js',
  '/api/admin/restore': 'functions/api/admin/restore.js',
  '/api/admin/upload': 'functions/api/admin/upload.js',
};
for (const [route, file] of Object.entries(endpointMap)) {
  check(adminHtml.includes(route), `Trang admin không tham chiếu endpoint ${route}`);
  check(existsSync(join(root, file)), `Thiếu API route ${file}`);
}
for (const file of [
  'functions/api/admin/products.js', 'functions/api/admin/products/[id].js', 'functions/api/admin/products/reset-skus.js', 'functions/api/admin/settings.js',
  'functions/api/admin/upload.js', 'functions/api/admin/backup.js', 'functions/api/admin/restore.js',
  'functions/api/admin/orders.js', 'functions/api/admin/customers.js', 'functions/api/admin/warranties.js', 'functions/api/admin/audit-logs.js',
]) {
  if (existsSync(join(root, file))) check(readFileSync(join(root, file), 'utf8').includes('requireAdmin'), `API quản trị chưa kiểm quyền: ${file}`);
}

const config = existsSync(join(root, 'package.json')) ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) : {};
check(config.engines?.node === '>=22 <23', 'package.json phải pin dòng Node.js 22.x để môi trường CI/Termux nhất quán');
check(config.scripts?.deploy === 'node scripts/deploy-cloudflare.mjs', 'npm run deploy phải đi qua script xác minh project/branch');
const wranglerConfig = existsSync(join(root, 'wrangler.toml')) ? readFileSync(join(root, 'wrangler.toml'), 'utf8') : '';
check(!/^\s*pages_build_output_dir\s*=/m.test(wranglerConfig), 'Không được bật Wrangler production-config mode trước khi tải/đối chiếu config thật của Pages project');
const ignore = existsSync(join(root, '.gitignore')) ? readFileSync(join(root, '.gitignore'), 'utf8') : '';
for (const entry of ['.env', '.env.*', '.dev.vars', '.dev.vars.*', 'node_modules/', '.wrangler/']) {
  check(ignore.includes(entry), `.gitignore thiếu mục bảo vệ ${entry}`);
}
for (const secretFile of ['.env', '.dev.vars', '.env.production', '.dev.vars.production']) {
  check(!existsSync(join(root, secretFile)), `Không đưa tệp bí mật ${secretFile} vào source/ZIP`);
}

for (const file of ['tests/smoke.test.mjs', 'tests/config-integrity.test.mjs', 'tests/storefront-operations.test.mjs', 'tests/reset-skus.test.mjs']) {
  if (existsSync(join(root, file))) runTest(file);
}

if (failures.length) {
  console.error('\nKIỂM TRA THẤT BẠI:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: cấu trúc, cú pháp, ${source.length} sản phẩm/SKU, ảnh tham chiếu, endpoints admin, seed SQL và kiểm tra tích hợp.`);
}
