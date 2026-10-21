import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/admin/index.html', import.meta.url), 'utf8');
const start = html.indexOf('function dashboard()');
const end = html.indexOf('\nfunction productList()', start);
assert.ok(start >= 0 && end > start, 'dashboard renderer must exist');
const dashboard = html.slice(start, end);

assert.match(dashboard, /id="dashboardRevenueTitle"/, 'dashboard must include the revenue panel heading');
assert.match(dashboard, /Xu hướng doanh thu/, 'revenue panel should match the reference screen concept');
assert.match(dashboard, /Chờ dữ liệu xác minh/, 'panel must clearly disclose its unverified-data state');
assert.match(dashboard, /Chưa có chuỗi doanh thu đủ tin cậy/, 'panel must explain why no chart is drawn');
assert.match(dashboard, /Không vẽ đường xu hướng từ danh sách đơn bị giới hạn/, 'panel must not misrepresent capped order data as complete history');
assert.match(dashboard, /role="status"/, 'empty state must be announced accessibly');
assert.match(html, /\.dashboard-revenue-empty/, 'revenue empty state must have dedicated styling');
assert.doesNotMatch(dashboard, /\$\s?[0-9][0-9,.]*|₫\s?[0-9][0-9,.]*/, 'no fabricated revenue amount should appear in the dashboard panel');

console.log('admin-dashboard-revenue-empty-state: PASS');
