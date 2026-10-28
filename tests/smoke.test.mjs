import assert from 'node:assert/strict';
import { createSession, verifySession, validateProduct, fromRow, hasSecuritySecrets, getCurrentDateInVietnam, warrantyStatusOnDate, isWarrantyEligibleOnDate } from '../functions/_lib.js';
import { onRequestGet as publicProducts } from '../functions/api/products.js';
import { onRequestGet as adminProducts } from '../functions/api/admin/products.js';
import { onRequestPost as restoreProducts } from '../functions/api/admin/restore.js';
import { onRequestGet as createAdminBackup } from '../functions/api/admin/backup.js';
import { onRequestPost as adminLogin } from '../functions/api/admin/login.js';
import { readFileSync } from 'node:fs';

const secrets = { ADMIN_PASSWORD: 'mau-khau-quan-tri-demonstration', SESSION_SECRET: 's'.repeat(48) };
assert.equal(hasSecuritySecrets(secrets), true, 'secrets hợp lệ phải được chấp nhận');
assert.equal(hasSecuritySecrets({ ADMIN_PASSWORD: 'short', SESSION_SECRET: 'tiny' }), false, 'secrets yếu phải bị từ chối');

assert.equal(getCurrentDateInVietnam(new Date('2026-10-16T18:00:00.000Z')), '2026-10-17', 'Vietnam date must advance while UTC is still on the previous date');
assert.equal(getCurrentDateInVietnam(new Date('2026-10-17T16:59:59.000Z')), '2026-10-17', 'Vietnam date must remain on the same day before local midnight');
assert.equal(getCurrentDateInVietnam(new Date('2026-10-17T17:00:00.000Z')), '2026-10-18', 'Vietnam date must advance exactly at local midnight');
assert.equal(warrantyStatusOnDate('active', '2026-10-01', '2026-10-16', '2026-10-17'), 'expired', 'a warranty ended yesterday must be expired in Vietnam');
assert.equal(warrantyStatusOnDate('active', '2026-10-01', '2026-10-17', '2026-10-17'), 'active', 'the listed end date remains eligible through that date');
assert.equal(warrantyStatusOnDate('active', '2026-10-18', '2026-10-20', '2026-10-17'), 'pending', 'a future-start warranty must not be labelled active');
assert.equal(warrantyStatusOnDate('active', 'invalid-date', '2026-10-20', '2026-10-17'), 'invalid', 'invalid start dates must not be labelled active');
assert.equal(warrantyStatusOnDate('active', '2026-10-01', '2026-99-20', '2026-10-17'), 'invalid', 'invalid end dates must not be labelled active');
assert.equal(warrantyStatusOnDate('active', '2026-11-01', '2026-10-20', '2026-10-17'), 'invalid', 'a start date after the end date must be flagged');
assert.equal(isWarrantyEligibleOnDate('active', '2026-10-01', '2026-10-17', '2026-10-17'), true, 'warranty is eligible on its start date and its end date');
assert.equal(isWarrantyEligibleOnDate('active', '2026-10-01', '2026-10-16', '2026-10-17'), false, 'warranty is not eligible after its end date');
assert.equal(isWarrantyEligibleOnDate('expired', '2026-10-01', '2026-10-20', '2026-10-17'), false, 'an explicitly expired warranty is not eligible');
assert.equal(isWarrantyEligibleOnDate('active', 'not-a-date', '2026-10-20', '2026-10-17'), false, 'invalid start dates must fail closed');
assert.equal(isWarrantyEligibleOnDate('active', '2026-10-18', '2026-10-20', '2026-10-17'), false, 'future start date must not be eligible');
assert.equal(isWarrantyEligibleOnDate('active', '2026-10-01', 'not-a-date', '2026-10-17'), false, 'invalid end dates must fail closed');
assert.equal(isWarrantyEligibleOnDate('active', '2026-02-29', '2026-12-31', '2026-10-17'), false, 'invalid non-leap dates must fail closed');
assert.equal(isWarrantyEligibleOnDate('active', '2028-02-29', '2028-12-31', '2028-02-29'), true, 'valid leap dates must be accepted');
assert.equal(isWarrantyEligibleOnDate('active', '2026-99-01', '2026-12-31', '2026-10-17'), false, 'out-of-range months must fail closed');

const valid = validateProduct({
  title: 'Ví da cá sấu', sku: 'sd-236', category: 'Ví da',
  price: null, stock: null, published: true,
  images: ['images/example.webp', '/media/12345678-1234-1234-1234-123456789012.webp'],
});
assert.equal(valid.error, undefined, 'sản phẩm hợp lệ phải qua kiểm tra');
assert.equal(valid.value.sku, 'SD-236');
assert.equal(valid.value.category, 'vi-nam', 'Tên Ví da phải chuẩn hóa sang Ví nam, không tạo danh mục legacy wallets');
assert.equal(valid.value.price, null, 'không tự gán giá');
assert.equal(valid.value.stock, null, 'không tự gán tồn kho');

const stockRow = {
  id: 'stock-product', slug: 'stock-product', sku: 'SD-SN099', title: 'Sneaker thử',
  category: 'sneakers', category_label: 'Sneaker', price: 1230000, stock: 7, sku_verified: 1,
  published: 1, images_json: '[]', description: '', source_price_confirmed: 0, sort_order: 1,
};
assert.equal(fromRow(stockRow, { publicView: true, showPrices: true }).stock, null,
  'public product API must not reveal internal inventory counts even when prices are visible');
assert.equal(fromRow(stockRow).stock, 7, 'admin view must retain the actual stock count');
assert.equal(fromRow(stockRow, { publicView: true, showPrices: true }).skuVerified, true,
  'category-prefixed SKU codes remain usable for products outside the historical seed range');
const legacySeedRow = { ...stockRow, id: 'legacy-seed-row', sku: 'SD001', sku_verified: 0 };
assert.equal(fromRow(legacySeedRow).skuVerified, false,
  'historic SD001–SD235 fixture identifiers must not be treated as verified commercial SKUs');
assert.equal(fromRow(legacySeedRow, { publicView: true }).sku, null,
  'public product responses must not expose unverified historic seed identifiers');
const generatedCodeRow = { ...stockRow, sku: 'SD-SN099', sku_verified: 0 };
assert.equal(fromRow(generatedCodeRow).skuVerified, false, 'persisted flag overrides a SKU-looking pattern for generated internal codes');
assert.equal(fromRow(generatedCodeRow, { publicView: true }).sku, null, 'public API hides generated category-prefixed codes');
assert.equal(fromRow(stockRow, { publicView: true }).sku, 'SD-SN099', 'explicitly verified SKU remains visible even if it resembles a generated pattern');
const prototypeNamedCategory = validateProduct({
  title: 'Sản phẩm danh mục tùy chỉnh', sku: 'SD-CON001', category: 'constructor',
  price: null, stock: null, published: true, images: [],
});
assert.equal(prototypeNamedCategory.error, undefined, 'prototype-named custom categories must not resolve to inherited functions');
assert.equal(prototypeNamedCategory.value.category, 'constructor');
assert.equal(typeof prototypeNamedCategory.value.category, 'string');
assert.ok(validateProduct({ title: 'Hỏng', sku: '../x', category: 'Ví' }).error, 'SKU traversal phải bị từ chối');
assert.ok(validateProduct({ title: 'Hỏng', sku: 'SD237', category: 'Ví', images: ['../secret.webp'] }).error, 'đường dẫn ảnh traversal phải bị từ chối');
assert.ok(validateProduct({ title: 'Hỏng', sku: 'SD237', category: 'Ví', images: ['https://evil.example/x.webp'] }).error, 'ảnh remote không tin cậy phải bị từ chối');
assert.ok(validateProduct({ title: 'Hỏng', sku: 'SD237', category: 'Ví', images: ['images/payload.html'] }).error, 'đuôi tệp ảnh không hợp lệ phải bị từ chối');
assert.ok(validateProduct({ title: 'Hỏng', sku: 'SD237', category: 'Ví', price: -1 }).error, 'giá âm phải bị từ chối');
const sourceProducts = JSON.parse(readFileSync(new URL('../data/legacy-products.json', import.meta.url), 'utf8'));
assert.equal(sourceProducts.length, 235, 'nguồn sản phẩm phải có đủ 235 bản ghi');
for (const [index, product] of sourceProducts.entries()) {
  assert.equal(product.sku, null, `SKU fixture phải để trống khi chưa được xác minh: ${product.id}`);
  assert.equal(product.skuVerified, false, `Nguồn fixture phải đánh dấu SKU chưa xác minh: ${product.id}`);
  const validationCandidate = { ...product, sku: `AUDIT-${String(index + 1).padStart(3, '0')}` };
  assert.equal(validateProduct(validationCandidate).error, undefined, `các trường sản phẩm nguồn không hợp lệ: ${product.id}`);
  assert.match(validateProduct(product).error || '', /SKU|Mã sản phẩm/i, `luồng quản trị vẫn phải từ chối sản phẩm mới thiếu SKU: ${product.id}`);
}



const dbState = {
  showPrices: false,
  rows: [
    { id: 'p1', slug: 'vi-a', sku: 'SD001', title: 'Ví A', category: 'wallets', category_label: 'Ví da', description: '', price: 1290000, stock: 4, published: 1, images_json: '["images/example.webp"]', source_price_confirmed: 1, sort_order: 1, updated_at: '2026-01-01 00:00:00' },
    { id: 'p2', slug: 'hidden', sku: 'SD002', title: 'Không công khai', category: 'wallets', category_label: 'Ví da', description: '', price: 999000, stock: 1, published: 0, images_json: '[]', source_price_confirmed: 1, sort_order: 2, updated_at: null },
  ],
};
const mockDB = {
  prepare(sql) {
    let bound = [];
    const statement = {
      sql,
      get boundValues() { return bound; },
      bind(...values) { bound = values; return statement; },
      async first() {
        if (sql.includes('FROM settings')) return { value: dbState.showPrices ? '1' : '0' };
        return null;
      },
      async all() {
        if (sql.includes('WHERE published = 1')) return { results: dbState.rows.filter(r => r.published === 1) };
        return { results: dbState.rows };
      },
      async run() { return { meta: { changes: 1 }, bound }; },
    };
    return statement;
  },
  async batch(statements) {
    if (statements[0]?.sql?.includes('INSERT INTO admin_login_attempts')) {
      return [{ success: true }, { success: true, results: [{ attempts: 1 }] }];
    }
    return [];
  },
};
const wrongOriginLogin = await adminLogin({
  request: new Request('https://shop.example/api/admin/login', {
    method: 'POST', headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: secrets.ADMIN_PASSWORD }),
  }),
  env: { DB: mockDB, ...secrets },
});
assert.equal(wrongOriginLogin.status, 403, 'đăng nhập từ origin ngoài phải bị từ chối');
const loginResponse = await adminLogin({
  request: new Request('https://shop.example/api/admin/login', {
    method: 'POST', headers: { Origin: 'https://shop.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: secrets.ADMIN_PASSWORD }),
  }),
  env: { DB: mockDB, ...secrets },
});
assert.equal(loginResponse.status, 200, 'đăng nhập đúng mật khẩu phải thành công');
assert.match(loginResponse.headers.get('Set-Cookie') || '', /HttpOnly/);
assert.match(loginResponse.headers.get('Set-Cookie') || '', /Secure/);
assert.match(loginResponse.headers.get('Set-Cookie') || '', /SameSite=Strict/);


const unavailable = await publicProducts({ request: new Request('https://shop.example/api/products'), env: {} });
assert.equal(unavailable.status, 503, 'API công khai phải báo cấu hình thiếu, không dùng dữ liệu dự phòng');
const publicContext = { request: new Request('https://shop.example/api/products'), env: { DB: mockDB } };
let response = await publicProducts(publicContext);
assert.equal(response.status, 200);
let data = await response.json();
assert.equal(data.length, 1, 'API công khai chỉ trả về sản phẩm published');
assert.equal(data[0].price, null, 'khi ẩn giá, API không gửi giá thật');
assert.equal(data[0].stock, null, 'public API must not expose internal inventory counts');

dbState.showPrices = true;
response = await publicProducts(publicContext);
data = await response.json();
assert.equal(data[0].price, 1290000, 'khi bật giá, API trả giá đã lưu');

dbState.showPrices = false;
const token = await createSession(secrets.SESSION_SECRET);
const authenticatedRequest = new Request('https://shop.example/api/admin/products', {
  headers: { Cookie: `sd_admin_session=${token}`, Origin: 'https://shop.example' },
});
assert.equal(await verifySession(authenticatedRequest, { ...secrets }), true, 'session hợp lệ được xác minh');
assert.equal(await verifySession(new Request('https://shop.example/api/admin/products'), secrets), false, 'request không có cookie không được xác minh');

response = await adminProducts({ request: new Request('https://shop.example/api/admin/products'), env: { DB: mockDB, ...secrets } });
assert.equal(response.status, 401, 'API quản trị phải từ chối khi chưa đăng nhập');
response = await adminProducts({ request: authenticatedRequest, env: { DB: mockDB, ...secrets } });
assert.equal(response.status, 200, 'API quản trị cho phép session hợp lệ');
data = await response.json();
assert.equal(data.products.length, 2, 'quản trị được thấy cả sản phẩm đang ẩn');
assert.ok(data.products.some((product) => product.stock === 4), 'admin API must retain access to internal stock counts');

let batchCalls = 0;
const restoreBatchStatements = [];
const restoreDB = {
  ...mockDB,
  async batch(statements) {
    batchCalls++;
    restoreBatchStatements.push(statements.map(statement => ({
      sql: statement.sql,
      values: statement.boundValues || [],
    })));
    return statements.map(() => ({ success: true }));
  },
};
const restoredProduct = {
  id: 'restore-product-1', slug: 'restore-product-1', sku: 'SD-RESTORE-1',
  title: 'Ví thử khôi phục', category: 'wallets', categoryLabel: 'Ví da',
  description: 'Sản phẩm kiểm tra', price: null, stock: null, published: true,
  images: ['images/example.webp'], sourcePriceConfirmed: false, sortOrder: 7,
};
const makeRestoreRequest = (payload) => new Request('https://shop.example/api/admin/restore', {
  method: 'POST',
  headers: { Cookie: `sd_admin_session=${token}`, Origin: 'https://shop.example', 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const validBackup = { format: 'sindarealest-backup-v1', settings: { showPrices: false }, products: [restoredProduct] };
response = await restoreProducts({ request: makeRestoreRequest(validBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 200, 'backup hợp lệ phải khôi phục thành công');
assert.equal(batchCalls, 1, 'backup hợp lệ thực hiện một batch giao dịch');
const oversizedDeclaredRequest = new Request('https://shop.example/api/admin/restore', {
  method: 'POST',
  headers: {
    Cookie: `sd_admin_session=${token}`,
    Origin: 'https://shop.example',
    'Content-Type': 'application/json',
    'Content-Length': String(20 * 1024 * 1024 + 1),
  },
  body: JSON.stringify(validBackup),
});
response = await restoreProducts({ request: oversizedDeclaredRequest, env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 413, 'restore must reject oversized declared payload before parsing JSON');
assert.equal(batchCalls, 1, 'oversized backup must not start a database batch');
const duplicateSlugBackup = {
  ...validBackup,
  products: [restoredProduct, { ...restoredProduct, id: 'restore-product-2', sku: 'SD-RESTORE-2' }],
};
response = await restoreProducts({ request: makeRestoreRequest(duplicateSlugBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 400, 'backup có slug trùng phải bị từ chối');
assert.equal(batchCalls, 1, 'backup không hợp lệ không được chạm vào cơ sở dữ liệu');
const malformedIdBackup = { ...validBackup, products: [{ ...restoredProduct, id: '../invalid' }] };
response = await restoreProducts({ request: makeRestoreRequest(malformedIdBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 400, 'backup có ID không hợp lệ phải bị từ chối');
assert.equal(batchCalls, 1, 'ID không hợp lệ không được ghi vào D1');

console.log('PASS: kiểm tra sản phẩm, ảnh, giá/tồn kho trống, API công khai, session, quyền admin và backup/restore an toàn.');

const operationsBackup = {
  ...validBackup,
  format: 'sindarealest-backup-v2',
  settings: { showPrices:false, welcomeEnabled:true, welcomeTitleLine1:'Đẳng cấp thật.', welcomeTitleLine2:'Từ chất liệu thật.', welcomeText:'Lời chào kiểm thử hợp lệ.' },
  operations: {
    customers: [{ id:'customer-1', full_name:'Khách kiểm thử', phone:'0900000000', email:'', address:'', created_at:'2026-01-01 00:00:00', updated_at:'2026-01-01 00:00:00' }],
    orders: [{ id:'order-1', order_number:'SD-TEST-123456', customer_id:'customer-1', status:'pending_confirmation', payment_status:'unpaid', subtotal:null, total:null, price_confirmation_required:1, customer_note:'', created_at:'2026-01-01 00:00:00', updated_at:'2026-01-01 00:00:00' }],
    orderItems: [{ id:'item-1', order_id:'order-1', product_id:'restore-product-1', sku:'SD-RESTORE-1', title:'Ví thử khôi phục', quantity:1, unit_price:null, line_total:null }],
    warranties: [{
      id:'warranty-1', order_id:'order-1', order_item_id:'item-1', warranty_code:'SDW-TEST-001',
      policy_name:'Chính sách thử', duration_months:12, starts_at:'2026-01-01', ends_at:'2027-01-01',
      status:'active', created_at:'2026-01-01 00:00:00',
    }],
    warrantyClaims: [{
      id:'claim-1', order_id:'order-1', customer_id:'customer-1', warranty_code:'SDW-TEST-001',
      message:'Mô tả lỗi kiểm thử', status:'received', admin_note:'',
      created_at:'2026-01-01 00:00:00', updated_at:'2026-01-01 00:00:00',
    }],
    auditLogs: [],
    customerAddressDetails: [{
      customer_id:'customer-1', province_code:'68', province:'Lâm Đồng', ward_code:'68001', ward:'Phường thử',
      street_address:'12 Đường thử', updated_at:'2026-01-01 00:00:00',
    }],
    orderShippingAddresses: [{
      order_id:'order-1', province_code:'68', province:'Lâm Đồng', ward_code:'68001', ward:'Phường thử',
      street_address:'12 Đường thử', full_address:'12 Đường thử, Phường thử, Lâm Đồng', created_at:'2026-01-01 00:00:00',
    }],
    orderItemDetails: [{ item_id:'item-1', size:'42' }],
    warrantyClaimAttachments: [{ claim_id:'claim-1', image_key:'warranty-claims/0123456789abcdef0123456789abcdef.webp' }],
  },
};
const excessiveOperationsBackup = {
  ...operationsBackup,
  operations: {
    ...operationsBackup.operations,
    auditLogs: Array.from({ length: 4995 }, (_, i) => ({
      id: `restore-log-${i}`, actor: 'admin', action: 'backup_test',
      entity_type: 'test', entity_id: String(i), details_json: '{}',
      created_at: '2026-01-01 00:00:00',
    })),
  },
};
response = await restoreProducts({ request: makeRestoreRequest(excessiveOperationsBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 413, 'oversized backup transaction must be rejected before mutation');
assert.equal(batchCalls, 1, 'backup exceeding restore record budget must not touch D1');
response = await restoreProducts({ request: makeRestoreRequest(operationsBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 200, 'backup v2 có quan hệ vận hành hợp lệ phải được chấp nhận');
assert.equal(batchCalls, 2, 'backup v2 đời cũ vẫn được khôi phục bằng batch');
assert.ok(!restoreBatchStatements[1].some(statement => (statement.values || [])[0] === 'watermark_enabled'), 'Legacy v2 backups without watermark fields must preserve existing watermark settings');

const watermarkBackup = {
  ...operationsBackup,
  settings: {
    ...operationsBackup.settings,
    watermarkEnabled: false,
    watermarkPosition: 'top-left',
    watermarkSize: 24,
    watermarkOpacity: 73,
  },
};
response = await restoreProducts({ request: makeRestoreRequest(watermarkBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 200, 'backup v2 with valid watermark settings must restore');
assert.equal(batchCalls, 3, 'watermark settings restore must be part of the same D1 batch');
const restoredSettings = new Map(restoreBatchStatements.at(-1)
  .filter(statement => (statement.sql || '').includes('INSERT INTO settings'))
  .map(statement => [statement.values[0], statement.values[1]]));
assert.equal(restoredSettings.get('watermark_enabled'), '0');
assert.equal(restoredSettings.get('watermark_position'), 'top-left');
assert.equal(restoredSettings.get('watermark_size'), '24');
assert.equal(restoredSettings.get('watermark_opacity'), '73');

const invalidWatermarkBackup = {
  ...watermarkBackup,
  settings: { ...watermarkBackup.settings, watermarkSize: 99 },
};
response = await restoreProducts({ request: makeRestoreRequest(invalidWatermarkBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 400, 'backup with out-of-range watermark settings must be rejected');
assert.equal(batchCalls, 3, 'invalid watermark settings must not touch D1');

const brokenOperationsBackup = { ...operationsBackup, operations: { ...operationsBackup.operations, orders: [{ ...operationsBackup.operations.orders[0], customer_id:'missing-customer' }] } };
response = await restoreProducts({ request: makeRestoreRequest(brokenOperationsBackup), env: { DB: restoreDB, ...secrets } });
assert.equal(response.status, 400, 'backup v2 tham chiếu khách hàng không tồn tại phải bị từ chối');
assert.equal(batchCalls, 3, 'backup v2 không hợp lệ không được chạm vào D1');

const backupSettingValues = new Map([
  ['show_prices','1'],
  ['welcome_enabled','0'],
  ['welcome_title_line_1','Đẳng cấp thật.'],
  ['welcome_title_line_2','Từ chất liệu thật.'],
  ['welcome_text','Lời chào sao lưu kiểm thử.'],
  ['watermark_enabled','0'],
  ['watermark_position','top-left'],
  ['watermark_size','24'],
  ['watermark_opacity','73'],
]);
const backupDB = {
  batchCalls: 0,
  prepare(sql) {
    let bound = [];
    const statement = {
      sql,
      bind(...values) { bound = values; return statement; },
      boundValues() { return bound; },
    };
    return statement;
  },
  async batch(statements) {
    this.batchCalls++;
    return statements.map((statement) => ({
      results: statement.sql.startsWith('SELECT') && statement.sql.includes('AS total_count')
        ? [{ total_count: 0 }]
        : statement.sql.includes('FROM settings')
          ? [...backupSettingValues.entries()].map(([key, value]) => ({ key, value }))
          : [],
    }));
  },
};
const backupResponse = await createAdminBackup({
  request: new Request('https://shop.example/api/admin/backup', {
    headers: { Cookie: `sd_admin_session=${token}`, Origin: 'https://shop.example' },
  }),
  env: { DB: backupDB, ...secrets },
});
assert.equal(backupResponse.status, 200, 'admin backup must succeed for an authenticated session');
const exportedBackup = await backupResponse.json();
assert.equal(exportedBackup.format, 'sindarealest-backup-v2');
assert.equal(exportedBackup.settings.watermarkEnabled, false);
assert.equal(exportedBackup.settings.watermarkPosition, 'top-left');
assert.equal(exportedBackup.settings.watermarkSize, 24);
assert.equal(exportedBackup.settings.watermarkOpacity, 73);
assert.equal(backupDB.batchCalls, 1, 'backup must read tables and settings from one D1 batch snapshot');
