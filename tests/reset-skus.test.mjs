import assert from 'node:assert/strict';
import { createSession } from '../functions/_lib.js';
import { onRequestPost as resetSkus } from '../functions/api/admin/products/reset-skus.js';

const ADMIN_PASSWORD = 'test-only-admin-password-long';
const SESSION_SECRET = 'test-only-session-secret-0123456789abcdef';
const categories = [
  ['sneakers', 'Sneaker', 62, 'SD-SN'],
  ['loafers', 'Giày lười', 52, 'SD-GL'],
  ['dress-shoes', 'Giày tây', 22, 'SD-GT'],
  ['wallets', 'Ví da', 28, 'SD-VD'],
  ['belts', 'Thắt lưng', 22, 'SD-TL'],
  ['sandals', 'Dép', 22, 'SD-DD'],
  ['watch-straps', 'Dây đồng hồ', 21, 'SD-DH'],
  ['phone-cases', 'Ốp điện thoại', 6, 'SD-ODT'],
];

function makeRows({ unsupported = false } = {}) {
  const rows = [];
  let index = 0;
  for (const [category, category_label, count] of categories) {
    for (let i = 0; i < count; i++) {
      index++;
      rows.push({
        id: `product-${String(index).padStart(3, '0')}`,
        sku: `SD${String(index).padStart(3, '0')}`,
        title: `Product ${index}`,
        category,
        category_label,
        sort_order: index,
        price: index * 100,
        stock: index % 7,
        images_json: JSON.stringify([`images/image-${index}.webp`]),
        published: index % 2,
        slug: `product-${index}`,
        description: `Description ${index}`,
      });
    }
  }
  if (unsupported) {
    rows[4].category = 'unknown-category';
    rows[4].category_label = 'Danh mục lạ';
  }
  return rows;
}

function createMockDb(rows, { failAudit = false } = {}) {
  let batchCalls = 0;
  let selectCalls = 0;
  let auditStatement = null;

  const db = {
    prepare(sql) {
      return {
        sql,
        params: [],
        bind(...params) {
          this.params = params;
          return this;
        },
        async all() {
          selectCalls++;
          return { results: rows.map((row) => ({ ...row })) };
        },
        async first() {
          return null;
        },
        async run() {
          return { success: true };
        },
      };
    },
    async batch(statements) {
      batchCalls++;
      // Emulate D1 batch atomicity: commit the clone only after every statement succeeds.
      const draft = rows.map((row) => ({ ...row }));
      for (const statement of statements) {
        if (statement.sql.startsWith('UPDATE products SET sku = CASE id')) {
          const pairCount = (statement.sql.match(/WHEN \? THEN \?/g) || []).length;
          const pairs = [];
          for (let i = 0; i < pairCount * 2; i += 2) {
            pairs.push([statement.params[i], statement.params[i + 1]]);
          }
          const ids = statement.params.slice(pairCount * 2);
          for (const row of draft) {
            if (!ids.includes(row.id)) continue;
            const pair = pairs.find(([id]) => id === row.id);
            if (pair) { row.sku = pair[1]; row.sku_verified = 0; }
          }
          assert.equal(
            new Set(draft.map((row) => row.sku)).size,
            draft.length,
            'SKU phải duy nhất sau mỗi câu UPDATE',
          );
          assert.ok(statement.params.length <= 100, 'Không vượt giới hạn bind params của D1');
        } else if (statement.sql.startsWith('INSERT INTO audit_logs')) {
          auditStatement = statement;
          if (failAudit) throw new Error('forced audit insert failure');
        } else {
          throw new Error(`Câu SQL ngoài dự kiến trong mock: ${statement.sql}`);
        }
      }
      rows.splice(0, rows.length, ...draft);
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };

  return {
    db,
    stats: () => ({ batchCalls, selectCalls, auditStatement }),
  };
}

async function makeContext(db, body, { authorized = true, malformedJson = false } = {}) {
  const headers = new Headers({
    Origin: 'https://example.test',
    'Sec-Fetch-Site': 'same-origin',
    'Content-Type': 'application/json',
  });
  if (authorized) {
    const session = await createSession(SESSION_SECRET);
    headers.set('Cookie', `sd_admin_session=${session}`);
  }
  const request = new Request('https://example.test/api/admin/products/reset-skus', {
    method: 'POST',
    headers,
    body: malformedJson ? '{invalid json' : JSON.stringify(body),
  });
  return {
    request,
    env: { DB: db, ADMIN_PASSWORD, SESSION_SECRET },
  };
}

const originals = makeRows();
const rows = makeRows();
const mock = createMockDb(rows);
const response = await resetSkus(await makeContext(mock.db, { confirm: true }));
const data = await response.json();

assert.equal(response.status, 200, 'Reset đầy đủ phải trả HTTP 200');
assert.equal(data.ok, true);
assert.equal(data.count, 235);
assert.equal(new Set(rows.map((row) => row.sku)).size, rows.length, 'Không được trùng SKU sau reset');

const counters = Object.fromEntries(categories.map(([key]) => [key, 0]));
const prefixByCategory = Object.fromEntries(categories.map(([key, , , prefix]) => [key, prefix]));
for (const row of rows) {
  counters[row.category]++;
  const expectedSku = prefixByCategory[row.category] + String(counters[row.category]).padStart(3, '0');
  assert.equal(row.sku, expectedSku, `Mã nội bộ không đúng thứ tự tại ${row.title}`);
  assert.equal(row.sku_verified, 0, `Mã reset phải được đánh dấu chưa xác minh tại ${row.title}`);
}
for (let i = 0; i < rows.length; i++) {
  for (const field of ['id', 'title', 'category', 'category_label', 'sort_order', 'price', 'stock', 'images_json', 'published', 'slug', 'description']) {
    assert.equal(rows[i][field], originals[i][field], `Trường ${field} bị đổi tại ${rows[i].title}`);
  }
}
assert.equal(mock.stats().batchCalls, 1, 'Reset phải gửi một DB.batch');
assert.equal(mock.stats().selectCalls, 1);
assert.ok(mock.stats().auditStatement, 'Phải ghi audit log trong batch');
assert.equal(mock.stats().auditStatement.params[1] && JSON.parse(mock.stats().auditStatement.params[1]).count, 235);

{
  const mixedRows = makeRows();
  mixedRows[0].sku = 'SD-SN001';
  mixedRows[0].sku_verified = 1;
  const verifiedSnapshot = { sku: mixedRows[0].sku, sku_verified: mixedRows[0].sku_verified };
  const dbMock = createMockDb(mixedRows);
  const result = await resetSkus(await makeContext(dbMock.db, { confirm: true }));
  const payload = await result.json();
  assert.equal(result.status, 200);
  assert.equal(payload.count, 234, 'Only products without a verified commercial SKU should be reset');
  assert.equal(mixedRows[0].sku, verifiedSnapshot.sku, 'Reset must preserve the commercial SKU');
  assert.equal(mixedRows[0].sku_verified, verifiedSnapshot.sku_verified, 'Reset must preserve the verification flag');
  assert.equal(mixedRows[1].sku, 'SD-SN002', 'Internal code allocation must skip a verified SKU collision');
  assert.equal(mixedRows[1].sku_verified, 0);
  assert.equal(new Set(mixedRows.map((row) => row.sku)).size, mixedRows.length, 'verified and internal SKU values must remain unique');
  assert.equal(JSON.parse(dbMock.stats().auditStatement.params[1]).count, 234, 'audit log counts only internal codes changed');
}

{
  const rowsWithNewCategory = makeRows({ unsupported: true });
  const dbMock = createMockDb(rowsWithNewCategory);
  const result = await resetSkus(await makeContext(dbMock.db, { confirm: true }));
  const data = await result.json();
  assert.equal(result.status, 200, 'Danh mục mới phải được hỗ trợ tự động');
  assert.equal(data.ok, true);
  assert.equal(dbMock.stats().batchCalls, 1, 'Danh mục mới phải được reset trong một batch');
  const newCategoryRow = rowsWithNewCategory[4];
  assert.match(newCategoryRow.sku, /^SD-UNKNON/);
  assert.equal(newCategoryRow.category, 'unknown-category');
  assert.equal(newCategoryRow.category_label, 'Danh mục lạ');
}

{
  const untouched = makeRows();
  const snapshot = JSON.stringify(untouched);
  const dbMock = createMockDb(untouched);
  const result = await resetSkus(await makeContext(dbMock.db, { confirm: false }));
  assert.equal(result.status, 400);
  assert.equal(dbMock.stats().batchCalls, 0);
  assert.equal(JSON.stringify(untouched), snapshot);
}

{
  const untouched = makeRows();
  const snapshot = JSON.stringify(untouched);
  const dbMock = createMockDb(untouched);
  const result = await resetSkus(await makeContext(dbMock.db, { confirm: true }, { authorized: false }));
  assert.equal(result.status, 401, 'Không đăng nhập phải bị từ chối');
  assert.equal(dbMock.stats().batchCalls, 0);
  assert.equal(dbMock.stats().selectCalls, 0);
  assert.equal(JSON.stringify(untouched), snapshot);
}

{
  const untouched = makeRows();
  const snapshot = JSON.stringify(untouched);
  const dbMock = createMockDb(untouched, { failAudit: true });
  const result = await resetSkus(await makeContext(dbMock.db, { confirm: true }));
  assert.equal(result.status, 500);
  assert.equal(JSON.stringify(untouched), snapshot, 'Lỗi audit phải không lưu một phần thay đổi');
}

{
  const untouched = makeRows();
  const snapshot = JSON.stringify(untouched);
  const dbMock = createMockDb(untouched);
  const result = await resetSkus(await makeContext(dbMock.db, {}, { malformedJson: true }));
  assert.equal(result.status, 400);
  assert.equal(dbMock.stats().batchCalls, 0);
  assert.equal(JSON.stringify(untouched), snapshot);
}

{
  const prototypeRows = [{ ...makeRows()[0], category: 'constructor', category_label: 'Constructor' }];
  const dbMock = createMockDb(prototypeRows);
  const result = await resetSkus(await makeContext(dbMock.db, { confirm: true }));
  assert.equal(result.status, 200, 'prototype-named custom categories must not break SKU reset');
  assert.match(prototypeRows[0].sku, /^SD-CONST[A-Z0-9]{2}001$/);
}

console.log('PASS: reset SKU — 235 sản phẩm, SKU duy nhất, giữ nguyên trường khác, phân quyền, xác nhận, danh mục mới, prototype-safe categories và rollback giả lập.');
