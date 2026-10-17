import { fail, getSetting, json, productInsertStatement, readJsonBodyLimited, requireAdmin, validateProduct } from "../../_lib.js";
import { validateWatermarkSettingUpdates } from "../../_lib/watermark-settings.js";

const str = (v, max, required = false) => typeof v === "string" && v.length <= max && (!required || v.trim().length > 0);
const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(Number(v)) && Number(v) >= min && Number(v) <= max;
const nullableInteger = (v, max = Number.MAX_SAFE_INTEGER) => v === null || integer(v, 0, max);
const timestamp = (v) => str(v, 50, true);
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_RESTORE_RECORDS = 5000;
// D1 Workers scripts have an approximately 5,000-bindings budget. Keep margin
// for runtime overhead and reject before building a destructive batch.
const MAX_RESTORE_BINDINGS = 4500;


function validateOperations(operations) {
  const keys = ["customers","orders","orderItems","warranties","warrantyClaims","auditLogs"];
  if (!operations || typeof operations !== "object" || keys.some(k => !Array.isArray(operations[k])) || keys.some(k => operations[k].length > 20000)) return { error: "Bản sao lưu thiếu danh sách dữ liệu vận hành hoặc vượt giới hạn." };
  const customers = operations.customers, orders = operations.orders, items = operations.orderItems, warranties = operations.warranties, claims = operations.warrantyClaims, logs = operations.auditLogs;
  const optionalKeys = ["customerAddressDetails","orderShippingAddresses","orderContactDetails","orderItemDetails","warrantyClaimAttachments"];
  for (const key of optionalKeys) {
    if (operations[key] !== undefined && (!Array.isArray(operations[key]) || operations[key].length > 20000)) {
      return { error: "Bản sao lưu có danh sách địa chỉ/ảnh đính kèm không hợp lệ hoặc vượt giới hạn." };
    }
  }
  for (const key of [...keys, ...optionalKeys]) {
    const rows = operations[key];
    if (rows !== undefined && rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
      return { error: "Bản sao lưu chứa bản ghi vận hành không đúng định dạng đối tượng." };
    }
  }
  const customerAddressDetails = operations.customerAddressDetails || [];
  const orderShippingAddresses = operations.orderShippingAddresses || [];
  const orderItemDetails = operations.orderItemDetails || [];
  const warrantyClaimAttachments = operations.warrantyClaimAttachments || [];
  const providedOrderContactDetails = operations.orderContactDetails === undefined ? null : operations.orderContactDetails;
  const customerById = new Map();
  const orderById = new Map(), itemById = new Map();
  const customerIds = new Set(), phones = new Set(), orderIds = new Set(), orderNumbers = new Set(), itemIds = new Set(), warrantyCodes = new Set(), claimIds = new Set(), logIds = new Set();
  const contactOrderIds = new Set();
  const customerAddressIds = new Set(), shippingOrderIds = new Set(), itemDetailIds = new Set(), attachmentClaimIds = new Set(), attachmentKeys = new Set();
  for (const c of customers) {
    if (!str(c.id,100,true) || !str(c.full_name,120,true) || !str(c.phone,24,true) || !str(c.email,160) || !str(c.address,400) || !timestamp(c.created_at) || !timestamp(c.updated_at)) return { error: "Bản sao lưu có hồ sơ khách hàng không hợp lệ." };
    if (customerIds.has(c.id) || phones.has(c.phone)) return { error: "Bản sao lưu có ID khách hàng hoặc số điện thoại trùng." };
    customerIds.add(c.id); phones.add(c.phone); customerById.set(c.id, c);
  }
  for (const o of orders) {
    if (!str(o.id,100,true) || !str(o.order_number,80,true) || !customerIds.has(o.customer_id) || !["pending_confirmation","confirmed","processing","shipped","completed","cancelled"].includes(o.status) || !["unpaid","pending","paid","refunded"].includes(o.payment_status) || !nullableInteger(o.subtotal) || !nullableInteger(o.total) || ![0,1,"0","1",false,true].includes(o.price_confirmation_required) || !str(o.customer_note,1200) || !timestamp(o.created_at) || !timestamp(o.updated_at)) return { error: "Bản sao lưu có đơn hàng không hợp lệ hoặc tham chiếu khách hàng không tồn tại." };
    if (orderIds.has(o.id) || orderNumbers.has(o.order_number)) return { error: "Bản sao lưu có ID hoặc mã đơn hàng trùng." };
    orderIds.add(o.id); orderNumbers.add(o.order_number); orderById.set(o.id, o);
  }
  if (providedOrderContactDetails !== null) {
    if (providedOrderContactDetails.length !== orders.length) return { error: "Bản sao lưu thiếu thông tin liên hệ cho một hoặc nhiều đơn hàng." };
    for (const contact of providedOrderContactDetails) {
      if (!orderIds.has(contact.order_id) || !str(contact.full_name,120,true) || !str(contact.phone,24,true) || !str(contact.email,160) || !timestamp(contact.created_at)) return { error: "Bản sao lưu có thông tin liên hệ đơn hàng không hợp lệ hoặc thiếu đơn hàng liên kết." };
      if (contactOrderIds.has(contact.order_id)) return { error: "Bản sao lưu có thông tin liên hệ đơn hàng trùng." };
      contactOrderIds.add(contact.order_id);
    }
  }
  for (const i of items) {
    if (!str(i.id,100,true) || !orderIds.has(i.order_id) || !str(i.product_id,100,true) || !str(i.sku,48,true) || !str(i.title,180,true) || !integer(i.quantity,1,50) || !nullableInteger(i.unit_price,2_000_000_000) || !nullableInteger(i.line_total)) return { error: "Bản sao lưu có dòng sản phẩm trong đơn không hợp lệ." };
    if (itemIds.has(i.id)) return { error: "Bản sao lưu có ID dòng đơn hàng trùng." };
    itemIds.add(i.id); itemById.set(i.id, i);
  }
  for (const w of warranties) {
    if (!str(w.id,100,true) || !orderIds.has(w.order_id) || !itemIds.has(w.order_item_id) || itemById.get(w.order_item_id)?.order_id !== w.order_id || !str(w.warranty_code,100,true) || !str(w.policy_name,160,true) || !integer(w.duration_months,1,120) || !str(w.starts_at,10,true) || !str(w.ends_at,10,true) || !["active","expired","void"].includes(w.status) || !timestamp(w.created_at)) return { error: "Bản sao lưu có bản ghi bảo hành không hợp lệ hoặc dòng sản phẩm không thuộc đúng đơn hàng." };
    if (warrantyCodes.has(w.warranty_code)) return { error: "Bản sao lưu có mã bảo hành trùng." };
    warrantyCodes.add(w.warranty_code);
  }
  for (const c of claims) {
    if (!str(c.id,100,true) || !orderIds.has(c.order_id) || !customerIds.has(c.customer_id) || orderById.get(c.order_id)?.customer_id !== c.customer_id || !str(c.warranty_code,100) || !str(c.message,1600,true) || !["received","reviewing","approved","rejected","resolved"].includes(c.status) || !str(c.admin_note,1600) || !timestamp(c.created_at) || !timestamp(c.updated_at)) return { error: "Bản sao lưu có yêu cầu bảo hành không hợp lệ hoặc khách hàng không thuộc đơn hàng." };
    if (claimIds.has(c.id)) return { error: "Bản sao lưu có ID yêu cầu bảo hành trùng." };
    claimIds.add(c.id);
  }
  for (const l of logs) {
    if (!str(l.id,100,true) || !str(l.actor,80,true) || !str(l.action,120,true) || !str(l.entity_type,80,true) || !str(l.entity_id,100) || !str(l.details_json,20000,true) || !timestamp(l.created_at)) return { error: "Bản sao lưu có bản ghi nhật ký không hợp lệ." };
    try { JSON.parse(l.details_json); } catch { return { error: "Bản sao lưu có JSON nhật ký không hợp lệ." }; }
    if (logIds.has(l.id)) return { error: "Bản sao lưu có ID nhật ký trùng." };
    logIds.add(l.id);
  }
  for (const a of customerAddressDetails) {
    if (!customerIds.has(a.customer_id) || !str(a.province_code,12) || !str(a.province,100) || !str(a.ward_code,12) || !str(a.ward,120) || !str(a.street_address,300) || !timestamp(a.updated_at)) return { error: "Bản sao lưu có địa chỉ khách hàng không hợp lệ hoặc thiếu khách hàng liên kết." };
    if (customerAddressIds.has(a.customer_id)) return { error: "Bản sao lưu có địa chỉ khách hàng trùng." };
    customerAddressIds.add(a.customer_id);
  }
  for (const a of orderShippingAddresses) {
    if (!orderIds.has(a.order_id) || !str(a.province_code,12) || !str(a.province,100) || !str(a.ward_code,12) || !str(a.ward,120) || !str(a.street_address,300) || !str(a.full_address,400,true) || !timestamp(a.created_at)) return { error: "Bản sao lưu có địa chỉ giao hàng không hợp lệ hoặc thiếu đơn hàng liên kết." };
    if (shippingOrderIds.has(a.order_id)) return { error: "Bản sao lưu có địa chỉ giao hàng trùng." };
    shippingOrderIds.add(a.order_id);
  }
  for (const d of orderItemDetails) {
    if (!itemIds.has(d.item_id) || !str(d.size,80)) return { error: "Bản sao lưu có thông tin biến thể sản phẩm không hợp lệ hoặc thiếu dòng đơn liên kết." };
    if (itemDetailIds.has(d.item_id)) return { error: "Bản sao lưu có thông tin biến thể sản phẩm trùng." };
    itemDetailIds.add(d.item_id);
  }
  for (const a of warrantyClaimAttachments) {
    if (!claimIds.has(a.claim_id) || !/^warranty-claims\/[0-9a-f]{32}\.webp$/.test(String(a.image_key || ""))) return { error: "Bản sao lưu có ảnh bảo hành không hợp lệ hoặc thiếu yêu cầu liên kết." };
    if (attachmentClaimIds.has(a.claim_id) || attachmentKeys.has(a.image_key)) return { error: "Bản sao lưu có ảnh bảo hành trùng." };
    attachmentClaimIds.add(a.claim_id); attachmentKeys.add(a.image_key);
  }
  const orderContactDetails = providedOrderContactDetails ?? orders.map((order) => {
    const customer = customerById.get(order.customer_id);
    return { order_id: order.id, full_name: customer.full_name, phone: customer.phone, email: customer.email || "", created_at: order.created_at };
  });
  return { value: { customers,orders,items,warranties,claims,logs,customerAddressDetails,orderShippingAddresses,orderContactDetails,orderItemDetails,warrantyClaimAttachments } };
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const parsed = await readJsonBodyLimited(context.request, MAX_BACKUP_BYTES);
  if (parsed.error === "too_large") return fail("Tệp sao lưu vượt giới hạn 20 MB. Hãy tạo bản sao lưu nhỏ hơn.", 413);
  if (parsed.error || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return fail("Tệp sao lưu JSON không đọc được.");
  }
  const backup = parsed.value;
  const v1 = backup?.format === "sindarealest-backup-v1";
  const v2 = backup?.format === "sindarealest-backup-v2";
  if ((!v1 && !v2) || !Array.isArray(backup.products) || backup.products.length > 2000 || typeof backup.settings?.showPrices !== "boolean") return fail("Định dạng bản sao lưu không hợp lệ.");
  if (v2 && (typeof backup.settings.welcomeEnabled !== "boolean" || !str(backup.settings.welcomeTitleLine1,80,true) || !str(backup.settings.welcomeTitleLine2,80,true) || !str(backup.settings.welcomeText,500,true))) return fail("Bản sao lưu thiếu cài đặt trang chào mừng hợp lệ.");

  let watermarkUpdates = [];
  if (v2) {
    const watermarkFields = ["watermarkEnabled", "watermarkPosition", "watermarkSize", "watermarkOpacity"];
    const present = watermarkFields.filter((key) => Object.hasOwn(backup.settings, key));
    if (present.length > 0 && present.length !== watermarkFields.length) {
      return fail("Bản sao lưu có bộ cài đặt watermark chưa đầy đủ.");
    }
    if (present.length === watermarkFields.length) {
      const checkedWatermark = validateWatermarkSettingUpdates({
        watermarkEnabled: backup.settings.watermarkEnabled,
        watermarkPosition: backup.settings.watermarkPosition,
        watermarkSize: backup.settings.watermarkSize,
        watermarkOpacity: backup.settings.watermarkOpacity,
      });
      if (checkedWatermark.error) return fail(`Cài đặt watermark trong bản sao lưu không hợp lệ: ${checkedWatermark.error}`);
      watermarkUpdates = checkedWatermark.updates;
    }
  }

  const products = [], ids = new Set(), skus = new Set(), slugs = new Set();
  for (const raw of backup.products) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("Bản sao lưu chứa bản ghi sản phẩm không hợp lệ.");
    const checked = validateProduct(raw);
    if (checked.error) return fail(`Bản sao lưu có sản phẩm không hợp lệ: ${checked.error}`);
    const p = checked.value, rawId = raw.id, rawSlug = raw.slug;
    if (typeof rawId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(rawId)) return fail("Bản sao lưu chứa ID sản phẩm không hợp lệ.");
    if (typeof rawSlug !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(rawSlug)) return fail("Bản sao lưu chứa slug sản phẩm không hợp lệ.");
    p.id = rawId; p.slug = rawSlug; if (typeof raw.sourcePriceConfirmed === "boolean" || raw.sourcePriceConfirmed === 0 || raw.sourcePriceConfirmed === 1) p.sourcePriceConfirmed = raw.sourcePriceConfirmed === true || raw.sourcePriceConfirmed === 1; p.sortOrder = Number.isSafeInteger(Number(raw.sortOrder)) ? Number(raw.sortOrder) : products.length + 1;
    if (ids.has(p.id) || skus.has(p.sku) || slugs.has(p.slug)) return fail("Bản sao lưu chứa ID, SKU hoặc slug trùng nhau.");
    ids.add(p.id); skus.add(p.sku); slugs.add(p.slug); products.push(p);
  }
  let operations = null;
  if (v2) {
    const checked = validateOperations(backup.operations);
    if (checked.error) return fail(checked.error);
    operations = checked.value;
  }

  const operationRecordCount = operations
    ? Object.values(operations).reduce((total, rows) => total + rows.length, 0)
    : 0;
  if (products.length + operationRecordCount > MAX_RESTORE_RECORDS) {
    return fail("Bản sao lưu vượt giới hạn 5.000 bản ghi cho một lần khôi phục an toàn. Hãy tạo bản nhỏ hơn hoặc liên hệ để lên kế hoạch nhập theo lô.", 413);
  }

  // D1 applies a per-Worker-script bound-parameter budget across a batch.
  // Count conservatively before creating any write statements so valid-looking
  // backups cannot fail mid-restore due to too many bindings.
  const bindingCount = products.length * 13 + (operations
    ? operations.customers.length * 7
      + operations.customerAddressDetails.length * 7
      + operations.orders.length * 11
      + operations.orderShippingAddresses.length * 8
      + operations.orderContactDetails.length * 5
      + operations.items.length * 8
      + operations.orderItemDetails.length * 2
      + operations.warranties.length * 10
      + operations.claims.length * 9
      + operations.warrantyClaimAttachments.length * 2
      + operations.logs.length * 7
    : 0) + 1 + (v2 ? 8 + watermarkUpdates.length * 2 : 0);
  if (bindingCount > MAX_RESTORE_BINDINGS) {
    return fail("Bản sao lưu vượt giới hạn an toàn của số tham số D1 cho một lần khôi phục. Hãy chia dữ liệu thành các bản nhỏ hơn trước khi tiếp tục.", 413);
  }

  try {
    const db = context.env.DB;
    const statements = [];
    if (operations) statements.push(
      db.prepare("DELETE FROM warranty_claim_attachments"), db.prepare("DELETE FROM settings WHERE key LIKE 'warranty_upload:%'"), db.prepare("DELETE FROM settings WHERE key LIKE 'warranty_lookup:%'"), db.prepare("DELETE FROM warranty_claim_uploads"),
      db.prepare("DELETE FROM customer_address_details"), db.prepare("DELETE FROM order_shipping_addresses"), db.prepare("DELETE FROM order_item_details"),
      db.prepare("DELETE FROM warranty_claims"), db.prepare("DELETE FROM warranties"), db.prepare("DELETE FROM order_items"),
      db.prepare("DELETE FROM order_contact_details"), db.prepare("DELETE FROM orders"), db.prepare("DELETE FROM customers"), db.prepare("DELETE FROM audit_logs"), db.prepare("DELETE FROM public_rate_limits")
    );
    statements.push(db.prepare("DELETE FROM products"));
    for (const p of products) statements.push(productInsertStatement(db,p));
    statements.push(db.prepare("INSERT INTO settings(key,value,updated_at) VALUES('show_prices',?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(backup.settings.showPrices ? "1" : "0"));
    if (v2) {
      for (const [key,value] of [["welcome_enabled",backup.settings.welcomeEnabled?"1":"0"],["welcome_title_line_1",backup.settings.welcomeTitleLine1],["welcome_title_line_2",backup.settings.welcomeTitleLine2],["welcome_text",backup.settings.welcomeText]]) statements.push(db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,value));
      for (const [key,value] of watermarkUpdates) statements.push(db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,value));
    }
    if (operations) {
      for (const c of operations.customers) statements.push(db.prepare("INSERT INTO customers(id,full_name,phone,email,address,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").bind(c.id,c.full_name,c.phone,c.email,c.address,c.created_at,c.updated_at));
      for (const a of operations.customerAddressDetails) statements.push(db.prepare("INSERT INTO customer_address_details(customer_id,province_code,province,ward_code,ward,street_address,updated_at) VALUES(?,?,?,?,?,?,?)").bind(a.customer_id,a.province_code,a.province,a.ward_code,a.ward,a.street_address,a.updated_at));
      for (const o of operations.orders) statements.push(db.prepare("INSERT INTO orders(id,order_number,customer_id,status,payment_status,subtotal,total,price_confirmation_required,customer_note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(o.id,o.order_number,o.customer_id,o.status,o.payment_status,o.subtotal,o.total,Number(o.price_confirmation_required)?1:0,o.customer_note,o.created_at,o.updated_at));
      for (const a of operations.orderShippingAddresses) statements.push(db.prepare("INSERT INTO order_shipping_addresses(order_id,province_code,province,ward_code,ward,street_address,full_address,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(a.order_id,a.province_code,a.province,a.ward_code,a.ward,a.street_address,a.full_address,a.created_at));
      for (const c of operations.orderContactDetails) statements.push(db.prepare("INSERT INTO order_contact_details(order_id,full_name,phone,email,created_at) VALUES(?,?,?,?,?)").bind(c.order_id,c.full_name,c.phone,c.email,c.created_at));
      for (const i of operations.items) statements.push(db.prepare("INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?,?)").bind(i.id,i.order_id,i.product_id,i.sku,i.title,i.quantity,i.unit_price,i.line_total));
      for (const d of operations.orderItemDetails) statements.push(db.prepare("INSERT INTO order_item_details(item_id,size) VALUES(?,?)").bind(d.item_id,d.size));
      for (const w of operations.warranties) statements.push(db.prepare("INSERT INTO warranties(id,order_id,order_item_id,warranty_code,policy_name,duration_months,starts_at,ends_at,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(w.id,w.order_id,w.order_item_id,w.warranty_code,w.policy_name,w.duration_months,w.starts_at,w.ends_at,w.status,w.created_at));
      for (const c of operations.claims) statements.push(db.prepare("INSERT INTO warranty_claims(id,order_id,customer_id,warranty_code,message,status,admin_note,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(c.id,c.order_id,c.customer_id,c.warranty_code,c.message,c.status,c.admin_note,c.created_at,c.updated_at));
      for (const a of operations.warrantyClaimAttachments) statements.push(db.prepare("INSERT INTO warranty_claim_attachments(claim_id,image_key) VALUES(?,?)").bind(a.claim_id,a.image_key));
      for (const l of operations.logs) statements.push(db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?)").bind(l.id,l.actor,l.action,l.entity_type,l.entity_id,l.details_json,l.created_at));
    }
    await db.batch(statements);
    const message = operations ? `Đã khôi phục ${products.length} sản phẩm cùng ${operations.orders.length} đơn hàng, ${operations.customers.length} khách hàng, thông tin liên hệ theo đơn, địa chỉ giao nhận và metadata ảnh bảo hành.` : `Đã khôi phục ${products.length} sản phẩm và cài đặt. Bản sao lưu v1 không chứa dữ liệu đơn hàng/khách hàng/bảo hành; dữ liệu vận hành hiện tại được giữ nguyên.`;
    return json({ ok: true, count: products.length, message });
  } catch { return fail("Khôi phục thất bại. D1 có thể chưa được thay đổi; hãy kiểm tra dữ liệu và thử lại.", 503); }
}
