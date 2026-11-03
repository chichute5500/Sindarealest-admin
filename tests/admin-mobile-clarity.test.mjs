import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.equal((html.match(/<\/style>/g)||[]).length,1,'Keep one Admin stylesheet');
const a=html.indexOf('function adminAuditDetails('),b=html.indexOf('function head(',a);
const c=html.indexOf('function eventLabel('),d=html.indexOf('function renderNotifications(',c);
const e=html.indexOf('function adminCustomerMobileCard('),f=html.indexOf('function customersPage(',e);
assert.ok(a>=0&&b>a&&c>=0&&d>c&&e>=0&&f>e);
const helpers=html.slice(a,b)+html.slice(c,d)+html.slice(e,f);
const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const ctx={
 products:[{id:'prod-1',title:'Giày da cá sấu',sku:'SD-SN001'}],
 orders:[{id:'order-1',order_number:'SD-QA-1001'}],
 customers:[{id:'customer-1',fullName:'Nguyễn A'}],
 orderStatusLabel:s=>({cancelled:'Đã hủy',confirmed:'Đã xác nhận'})[s]||'Chưa rõ',
 orderDeliveryStatusLabel:s=>({delivered:'Giao thành công'})[s]||'Chưa rõ',
 esc,customerInitials:()=> 'NA',
 customerRecentOrderImages:()=>'<span class="customer-order-images">Giày</span>'
};
const fns=runInNewContext(helpers+'\n;({adminAuditDetails,adminAuditActor,adminReadableDate,adminAuditSubject,adminAuditNote,eventLabel,adminCustomerMobileCard})',ctx);
assert.equal(fns.eventLabel({action:'product_created'}),'Đã thêm sản phẩm');
assert.equal(fns.eventLabel({action:'order_updated'}),'Đã cập nhật đơn hàng');
assert.equal(fns.eventLabel({action:'order_delivery_updated'}),'Đã cập nhật giao hàng');
assert.equal(fns.eventLabel({action:'unknown_action'}),'Đã ghi nhận hoạt động quản trị');
assert.equal(fns.adminAuditActor('admin'),'Quản trị viên');
assert.equal(fns.adminReadableDate('2026-11-03 11:52:59'),'03/11/2026 · 11:52');
assert.equal(fns.adminAuditSubject({entity_type:'product',entity_id:'prod-1'}),'Sản phẩm: Giày da cá sấu');
assert.equal(fns.adminAuditSubject({entity_type:'order',entity_id:'order-1'}),'Đơn hàng: SD-QA-1001');
assert.equal(fns.adminAuditSubject({entity_type:'customer',entity_id:'customer-1'}),'Khách hàng: Nguyễn A');
assert.equal(fns.adminAuditSubject({entity_type:'order',entity_id:'opaque-uuid'}),'Đơn hàng');
assert.equal(fns.adminAuditSubject({entity_type:'product',entity_id:'opaque-uuid'}),'Sản phẩm');
assert.equal(fns.adminAuditNote({action:'order_updated',details_json:'{"status":"cancelled"}'}),'Trạng thái: Đã hủy');
assert.equal(Object.keys(fns.adminAuditDetails({details_json:'{bad'})).length,0);
const customer=fns.adminCustomerMobileCard({fullName:'Anh <Test>',phone:'090 12+3<script>',address:'123 Đường ABC',email:'test@example.com',orderCount:3,lastOrderAt:'2026-10-31 11:18:11'});
assert.match(customer,/Anh &lt;Test&gt;/);
assert.doesNotMatch(customer,/<script>/);
for(const label of ['Số điện thoại','Địa chỉ','Email','Tổng đơn hàng','Đơn gần nhất','Sản phẩm gần đây'])assert.ok(customer.includes(label));
assert.doesNotMatch(customer,/<details|customer-mobile-last-order/);
const dash=html.slice(html.indexOf('function dashboard()'),html.indexOf('function activityLogPage()'));
assert.match(dash,/class="sd-activity-feed"/);
assert.match(dash,/esc\(eventLabel\(log\)\)/);
assert.match(dash,/esc\(adminAuditSubject\(log\)\)/);
assert.doesNotMatch(dash,/esc\(l\.action\)|esc\(l\.entity_id\)/);
const detail=html.slice(html.indexOf('function orderDetailMarkup('),html.indexOf('function orderDetailPage()'));
const overview=detail.slice(detail.indexOf('<section class="panel sd-order-overview">'),detail.indexOf('<section class="panel sd-order-items">'));
assert.equal((overview.match(/<span class="status /g)||[]).length,0,'Order status must not be duplicated in customer overview');
const orderHeader=html.slice(html.indexOf('function orderDetailPage()'),html.indexOf('function showOrderDetails('));
assert.match(orderHeader,/class="sd-order-meta"/,'The order code and status share one heading row');
assert.match(orderHeader,/class="sd-order-meta-state status /,'One real order status beside the order code');
assert.match(orderHeader,/orderStatusLabel\(order.status,order.delivery_status\)/,'The badge uses the actual order status, including delivery outcomes');
assert.equal((orderHeader.match(/class="sd-order-meta-state status /g)||[]).length,1,'Only one primary status badge');
for(const label of ['Khách hàng','Số điện thoại','Địa chỉ giao hàng'])assert.ok(overview.includes(label));
assert.doesNotMatch(overview,/orderPaymentStatusLabel|orderDeliveryStatusLabel/);
assert.match(html,/class="sd-order-number"/);
assert.match(html,/font-size:clamp\(13px,3.45vw,17px\)/,'Order number is reduced one font step without losing prominence');
assert.match(html,/#main \.sd-order-buyer-info\{display:grid;grid-template-columns:minmax\(0,1.15fr\) minmax\(0,.85fr\)/,'Name and phone share two columns');
assert.match(html,/#main \.sd-order-buyer-field>strong,#main \.sd-order-buyer-field>a\{font-size:14px/,'Contact values are one size smaller');
assert.match(html,/#main \.sd-order-buyer-address>strong\{font-size:13px/,'Address is one size smaller');
const customersPage=html.slice(html.indexOf('function customersPage()'),html.indexOf('function warrantiesPage()'));
assert.ok(customersPage.includes('$'+'{adminCustomerMobileCard(c)}'));
assert.doesNotMatch(customersPage,/class='customer-mobile-details'/);
const rule=html.match(/\.sd-activity-entry\{([^}]+)\}/)?.[1]||'';
assert.match(rule,/background:var\(--sd-admin-tile-face\)/);
assert.doesNotMatch(rule,/backdrop-filter/);
console.log('PASS: Admin logs, order code/state and readable mobile customer cards; isolated glass surfaces.');
