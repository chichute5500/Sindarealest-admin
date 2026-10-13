import { dbOrFail, fail, getSetting, json, rateLimitPublicRequest } from "../_lib.js";
import { sendAdminPush } from "../_notifications.js";

const clean = (value, max = 240) => String(value ?? "").trim().slice(0, max);
const phoneOk = (value) => /^[+0-9() .-]{9,20}$/.test(value);

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin")) {
    try { if (new URL(request.headers.get("Origin")).origin !== new URL(request.url).origin) return fail("Yêu cầu không hợp lệ.", 403); }
    catch { return fail("Yêu cầu không hợp lệ.", 403); }
  }
  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  try { const limit = await rateLimitPublicRequest(env, request, "order_create", 6, 900); if (limit.limited) return fail("Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi 15 phút hoặc liên hệ qua Zalo.", 429, { "Retry-After": "900" }); } catch { return fail("Dịch vụ tiếp nhận đơn chưa sẵn sàng.", 503); }
  let body;
  try { body = await request.json(); } catch { return fail("Thông tin đặt hàng không hợp lệ."); }
  const fullName = clean(body?.fullName, 120), phone = clean(body?.phone, 24), email = clean(body?.email, 160), province = clean(body?.province, 100), provinceCode = clean(body?.provinceCode, 12), ward = clean(body?.ward, 120), wardCode = clean(body?.wardCode, 12), streetAddress = clean(body?.streetAddress, 300), address = clean(body?.address || [streetAddress, ward, province].filter(Boolean).join(", "), 400), customerNote = clean(body?.note, 1200);
  if (fullName.length < 2) return fail("Vui lòng nhập họ tên.");
  if ((province || ward || streetAddress || provinceCode || wardCode) && (!province || !ward || !streetAddress || !provinceCode || !wardCode)) return fail("Vui lòng chọn tỉnh/thành, xã/phường và nhập địa chỉ chi tiết.");
  if (!address) return fail("Vui lòng nhập địa chỉ nhận hàng.");
  if (!phoneOk(phone)) return fail("Số điện thoại chưa hợp lệ.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Email chưa hợp lệ.");
  if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 50) return fail("Giỏ hàng không hợp lệ.");
  const requested = new Map();
  for (const item of body.items) {
    const id = clean(item?.id, 100), quantity = Number(item?.quantity);
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) return fail("Sản phẩm hoặc số lượng không hợp lệ.");
    requested.set(id, (requested.get(id) || 0) + quantity);
  }
  if ([...requested.values()].some(q => q > 50)) return fail("Số lượng mỗi sản phẩm tối đa là 50.");
  try {
    const ids = [...requested.keys()];
    const rows = await env.DB.prepare(`SELECT id,sku,title,price,stock,published,source_price_confirmed FROM products WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all();
    const byId = new Map((rows.results || []).map(p => [p.id, p]));
    if (byId.size !== ids.length || ids.some(id => !byId.has(id) || Number(byId.get(id).published) !== 1)) return fail("Một hoặc nhiều sản phẩm không còn khả dụng. Vui lòng tải lại danh mục.", 409);
    for (const id of ids) { const stock = byId.get(id).stock; if (stock !== null && stock !== undefined && requested.get(id) > Number(stock)) return fail(`Số lượng yêu cầu của SKU ${byId.get(id).sku} vượt tồn kho đã ghi nhận. Vui lòng liên hệ cửa hàng để xác nhận.`, 409); }
    const showPrices = (await getSetting(env.DB, "show_prices", "0")) === "1";
    const items = ids.map(id => { const p = byId.get(id), quantity = requested.get(id); return { id: crypto.randomUUID(), productId: p.id, sku: p.sku, title: p.title, quantity, price: showPrices && p.price !== null && Number(p.source_price_confirmed) === 1 ? Number(p.price) : null }; });
    const priceKnown = items.every(i => Number.isSafeInteger(i.price) && i.price >= 0);
    const subtotal = priceKnown ? items.reduce((sum, i) => sum + i.price * i.quantity, 0) : null;
    if (subtotal !== null && !Number.isSafeInteger(subtotal)) return fail("Tổng giá trị đơn vượt giới hạn hợp lệ.");
    const customerId = crypto.randomUUID(), orderId = crypto.randomUUID();
    const orderNumber = `SD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const existing = await env.DB.prepare("SELECT id FROM customers WHERE phone=? LIMIT 1").bind(phone).first();
    const actualCustomerId = existing?.id || customerId;
    const statements = [];
    if (existing) statements.push(env.DB.prepare("UPDATE customers SET full_name=?,email=?,address=?,updated_at=datetime('now') WHERE id=?").bind(fullName,email,address,actualCustomerId));
    else statements.push(env.DB.prepare("INSERT INTO customers(id,full_name,phone,email,address) VALUES(?,?,?,?,?)").bind(actualCustomerId,fullName,phone,email,address));
    if (province && ward && streetAddress) statements.push(env.DB.prepare("INSERT INTO customer_address_details(customer_id,province_code,province,ward_code,ward,street_address,updated_at) VALUES(?,?,?,?,?,?,datetime('now')) ON CONFLICT(customer_id) DO UPDATE SET province_code=excluded.province_code,province=excluded.province,ward_code=excluded.ward_code,ward=excluded.ward,street_address=excluded.street_address,updated_at=datetime('now')").bind(actualCustomerId,provinceCode,province,wardCode,ward,streetAddress));
    statements.push(env.DB.prepare("INSERT INTO orders(id,order_number,customer_id,status,subtotal,total,price_confirmation_required,customer_note) VALUES(?,?,?,'pending_confirmation',?,?,?,?)").bind(orderId,orderNumber,actualCustomerId,subtotal,subtotal,priceKnown?0:1,customerNote));
    statements.push(env.DB.prepare("INSERT INTO order_shipping_addresses(order_id,province_code,province,ward_code,ward,street_address,full_address) VALUES(?,?,?,?,?,?,?)").bind(orderId,provinceCode,province,wardCode,ward,streetAddress,address));
    for (const item of items) statements.push(env.DB.prepare("INSERT INTO order_items(id,order_id,product_id,sku,title,quantity,unit_price,line_total) VALUES(?,?,?,?,?,?,?,?)").bind(item.id,orderId,item.productId,item.sku,item.title,item.quantity,item.price,item.price === null ? null : item.price * item.quantity));
    statements.push(env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'customer', 'order_created', 'order', ?, ?)").bind(crypto.randomUUID(),orderId,JSON.stringify({ orderNumber, itemCount: items.length })));
    await env.DB.batch(statements);
    await sendAdminPush(env, { title: "Đơn hàng mới", body: orderNumber + " · " + items.length + " loại sản phẩm", url: "/admin/" });
    return json({ ok: true, orderNumber, status: "pending_confirmation", priceConfirmationRequired: !priceKnown, total: subtotal, message: priceKnown ? "Đã tiếp nhận đơn. SinDarealest sẽ liên hệ xác nhận." : "Đã tiếp nhận yêu cầu. Giá và tổng tiền sẽ được SinDarealest xác nhận trước khi chốt đơn." }, 201);
  } catch { return fail("Chưa thể lưu đơn hàng. Vui lòng thử lại hoặc liên hệ SinDarealest qua Zalo.", 503); }
}

export async function onRequestGet() { return fail("Phương thức không được hỗ trợ.", 405); }
