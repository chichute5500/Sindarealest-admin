import { dbOrFail, fail, getSetting, json, normalizeFulfillmentType, rateLimitPublicRequest, readJsonBodyLimited } from "../_lib.js";
import { createOrderAccessToken, hashOrderAccessToken, calculateCheckoutQuote, checkoutTransferSku, checkoutTransferReferenceMatches } from "../_payments.js";
import { sendAdminPush } from "../_notifications.js";
import { normalizeProductOption, productOptionKind, productOptionLabel } from "../_product-options.js";

const clean = (value, max = 240) => String(value ?? "").trim().slice(0, max);
const phoneOk = (value) => {
  if(typeof value!=="string" || value.length>24 || !/^[+0-9() .-]+$/.test(value))return false;
  let digits=value.replace(/[() .-]/g,"");
  if(digits.startsWith("+84"))digits="0"+digits.slice(3);
  else if(digits.startsWith("84"))digits="0"+digits.slice(2);
  return /^0[35789][0-9]{8}$/.test(digits);
};

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin")) {
    try { if (new URL(request.headers.get("Origin")).origin !== new URL(request.url).origin) return fail("Yêu cầu không hợp lệ.", 403); }
    catch { return fail("Yêu cầu không hợp lệ.", 403); }
  }
  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  try { const limit = await rateLimitPublicRequest(env, request, "order_create", 6, 900); if (limit.limited) return fail("Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi 15 phút hoặc liên hệ qua Zalo.", 429, { "Retry-After": "900" }); } catch { return fail("Dịch vụ tiếp nhận đơn chưa sẵn sàng.", 503); }
  const parsedBody = await readJsonBodyLimited(request, 64 * 1024);
  if (parsedBody.error === "too_large") return fail("Thông tin đặt hàng vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Thông tin đặt hàng không hợp lệ.");
  const body = parsedBody.value;
  const fullName = clean(body?.fullName, 120), phone = clean(body?.phone, 24), email = clean(body?.email, 160), province = clean(body?.province, 100), provinceCode = clean(body?.provinceCode, 12), ward = clean(body?.ward, 120), wardCode = clean(body?.wardCode, 12), streetAddress = clean(body?.streetAddress, 300), address = clean(body?.address || [streetAddress, ward, province].filter(Boolean).join(", "), 400), customerNote = clean(body?.note, 1200);
  if (fullName.length < 2) return fail("Vui lòng nhập họ tên.");
  if ((province || ward || streetAddress || provinceCode || wardCode) && (!province || !ward || !streetAddress || !provinceCode || !wardCode)) return fail("Vui lòng chọn tỉnh/thành, xã/phường và nhập địa chỉ chi tiết.");
  if (!address) return fail("Vui lòng nhập địa chỉ nhận hàng.");
  if (!phoneOk(phone)) return fail("Số điện thoại chưa hợp lệ.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Email chưa hợp lệ.");
  if (!Array.isArray(body?.items) || body.items.length < 1 || body.items.length > 50) return fail("Giỏ hàng không hợp lệ.");
  const requested = [];
  const totalsById = new Map();
  for (const item of body.items) {
    const id = clean(item?.id, 100), quantity = Number(item?.quantity);
    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 50 || (item?.option != null && typeof item.option !== "string")) return fail("Sản phẩm, lựa chọn hoặc số lượng không hợp lệ.");
    requested.push({ id, quantity, option: item?.option ?? "" });
    totalsById.set(id, (totalsById.get(id) || 0) + quantity);
  }
  if ([...totalsById.values()].some(q => q > 50)) return fail("Số lượng mỗi sản phẩm tối đa là 50.");
  try {
    const ids = [...totalsById.keys()];
    const rows = await env.DB.prepare(`SELECT id,sku,sku_verified,title,category,price,stock,published,source_price_confirmed,fulfillment_type FROM products WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all();
    const byId = new Map((rows.results || []).map(p => [p.id, p]));
    if (byId.size !== ids.length || ids.some(id => !byId.has(id) || Number(byId.get(id).published) !== 1)) return fail("Một hoặc nhiều sản phẩm không còn khả dụng. Vui lòng tải lại danh mục.", 409);
    for (const id of ids) { const product = byId.get(id), stock = product.stock; if (stock !== null && stock !== undefined && totalsById.get(id) > Number(stock)) return fail(`Số lượng yêu cầu của ${Number(product.sku_verified) === 1 ? "SKU " + product.sku : "sản phẩm " + product.title} vượt tồn kho đã ghi nhận. Vui lòng liên hệ cửa hàng để xác nhận.`, 409); }
    // Validate options against the authoritative database category, not
    // browser-submitted product names. Keep different sizes as separate lines.
    const selected = new Map();
    for (const line of requested) {
      const p = byId.get(line.id);
      const option = normalizeProductOption(p.category, line.option);
      if (option === null) return fail("Vui lòng chọn đúng size, bản dây hoặc dòng điện thoại cho sản phẩm.", 400);
      const key = JSON.stringify([line.id, option]);
      const previous = selected.get(key);
      if (previous) previous.quantity += line.quantity;
      else selected.set(key, { id: line.id, option, quantity: line.quantity });
    }
    const showPrices = (await getSetting(env.DB, "show_prices", "0")) === "1";
    const items = [...selected.values()].map(line => {
      const p = byId.get(line.id), quantity = line.quantity;
      const suffix = productOptionLabel(p.category, line.option);
      const rawPrice = p.price;
      const candidatePrice = rawPrice === null || rawPrice === undefined || (typeof rawPrice === "string" && !rawPrice.trim())
        ? null
        : Number(rawPrice);
      const confirmedPrice = showPrices && Number(p.source_price_confirmed) === 1
        && Number.isSafeInteger(candidatePrice) && candidatePrice >= 0
        ? candidatePrice
        : null;
      return { id: crypto.randomUUID(), productId: p.id, sku: p.sku, skuVerified: Number(p.sku_verified) === 1, fulfillmentType: normalizeFulfillmentType(p.fulfillment_type), title: p.title + (suffix ? " · " + suffix : ""), shoeSize: productOptionKind(p.category) === "shoe" ? line.option : "", quantity, price: confirmedPrice };
    });
    const priceKnown = items.every(i => Number.isSafeInteger(i.price) && i.price >= 0);
    const subtotal = priceKnown ? items.reduce((sum, i) => sum + i.price * i.quantity, 0) : null;
    if (subtotal !== null && !Number.isSafeInteger(subtotal)) return fail("Tổng giá trị đơn vượt giới hạn hợp lệ.");
    // A pre-order checkout quote is informational. The authoritative price,
    // fulfillment type and selected amount are re-derived from the DB here.
    const selectedPaymentOption = body.paymentOption == null || body.paymentOption === "" ? "" : String(body.paymentOption);
    if (selectedPaymentOption && !["deposit","full"].includes(selectedPaymentOption)) return fail("Phương thức thanh toán đã chọn không hợp lệ.", 400);
    const serverQuote = calculateCheckoutQuote(items.map(i => ({fulfillmentType:i.fulfillmentType,unitPrice:i.price,quantity:i.quantity})));
    if (selectedPaymentOption) {
      if (!serverQuote.eligible) return fail("Giá hoặc tình trạng hàng đã thay đổi. Vui lòng kiểm tra lại bước thanh toán.", 409);
      if (!Number.isSafeInteger(body.quotedTotal) || body.quotedTotal !== serverQuote.total) return fail("Giá trị đơn đã thay đổi. Vui lòng xem lại lựa chọn thanh toán.", 409);
    }
    const choice = selectedPaymentOption ? serverQuote.options.find(option=>option.value===selectedPaymentOption) : null;
    const selectedAmount = choice?.amount ?? null;
    const selectedRemainingAmount = choice?.remainingAmount ?? null;
    const selectedDiscountAmount = choice?.discountAmount ?? 0;
    const transferReference = selectedPaymentOption ? String(body.transferReference||"").trim().toUpperCase() : "";
    if (selectedPaymentOption && !checkoutTransferReferenceMatches(transferReference,phone,checkoutTransferSku(items)))
      return fail("Nội dung chuyển khoản không hợp lệ hoặc không khớp số điện thoại và SKU. Vui lòng kiểm tra lại bước QR.",409);
    const customerId = crypto.randomUUID(), orderId = crypto.randomUUID();
    const orderAccessToken = createOrderAccessToken();
    const orderAccessTokenHash = await hashOrderAccessToken(orderAccessToken);
    const orderNumber = `SD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const statements = [];

    // The customer row is a long-lived profile, not an order form. Never
    // overwrite it from an unauthenticated checkout where phone ownership is
    // not verified. ON CONFLICT(phone) also makes simultaneous same-phone
    // submissions converge on the existing profile without a race failure.
    statements.push(env.DB.prepare(
      "INSERT INTO customers(id,full_name,phone,email,address) VALUES(?,?,?,?,?) ON CONFLICT(phone) DO NOTHING",
    ).bind(customerId, fullName, phone, email, address));

    // Keep structured address fields only for the newly-created profile.
    // Existing profiles must be changed only through an authenticated flow.
    if (province && ward && streetAddress) statements.push(env.DB.prepare(
      "INSERT INTO customer_address_details(customer_id,province_code,province,ward_code,ward,street_address,updated_at) " +
      "SELECT id,?,?,?,?,?,datetime('now') FROM customers WHERE phone=? AND id=? ON CONFLICT(customer_id) DO NOTHING",
    ).bind(provinceCode, province, wardCode, ward, streetAddress, phone, customerId));

    // Select the canonical customer ID after the conflict-safe insert. The
    // statement stays inside the D1 batch so the FK is satisfied atomically.
    statements.push(env.DB.prepare(
      "INSERT INTO orders(id,order_number,customer_id,status,subtotal,total,price_confirmation_required,customer_note,public_access_token_hash) " +
      "SELECT ?,?,c.id,'pending_confirmation',?,?,?,?,? FROM customers c WHERE c.phone=?",
    ).bind(orderId, orderNumber, subtotal, subtotal, priceKnown ? 0 : 1, customerNote, orderAccessTokenHash, phone));

    // Immutable snapshot: admin order views and warranty lookup must describe
    // the contact details used for this purchase, not a subsequently changed
    // customer profile.
    statements.push(env.DB.prepare(
      "INSERT INTO order_contact_details(order_id,full_name,phone,email,created_at) VALUES(?,?,?,?,datetime('now'))",
    ).bind(orderId, fullName, phone, email));

    statements.push(env.DB.prepare("INSERT INTO order_shipping_addresses(order_id,province_code,province,ward_code,ward,street_address,full_address) VALUES(?,?,?,?,?,?,?)").bind(orderId,provinceCode,province,wardCode,ward,streetAddress,address));
    for (const item of items) {
      statements.push(env.DB.prepare("INSERT INTO order_items(id,order_id,product_id,sku,sku_verified,title,quantity,unit_price,line_total,fulfillment_type) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(item.id,orderId,item.productId,item.sku,item.skuVerified?1:0,item.title,item.quantity,item.price,item.price === null ? null : item.price * item.quantity,item.fulfillmentType));
      // Already-existing order_item_details table (migration 0005) ensures
      // warranty lookups receive shoe size without a Production D1 migration.
      if (item.shoeSize) statements.push(env.DB.prepare("INSERT INTO order_item_details(item_id,size) VALUES(?,?)").bind(item.id,item.shoeSize));
    }
    statements.push(env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'customer', 'order_created', 'order', ?, ?)").bind(crypto.randomUUID(),orderId,JSON.stringify({ orderNumber, itemCount: items.length, selectedPaymentOption, selectedPaymentAmount:selectedAmount, selectedRemainingAmount, selectedDiscountAmount, transferReference, customerPaymentVerified:false })));
    await env.DB.batch(statements);
    await sendAdminPush(env, { title: "Đơn hàng mới", body: orderNumber + " · " + items.length + " loại sản phẩm", url: "/admin/" });
    return json({ ok: true, orderNumber, orderAccessToken, status: "pending_confirmation", priceConfirmationRequired: !priceKnown, total: subtotal, selectedPaymentOption, selectedPaymentAmount:selectedAmount, selectedRemainingAmount, selectedDiscountAmount, transferReference, message: priceKnown ? "Đã tiếp nhận đơn. SinDarealest sẽ liên hệ xác nhận." : "Đã tiếp nhận yêu cầu. Giá và tổng tiền sẽ được SinDarealest xác nhận trước khi chốt đơn." }, 201);
  } catch { return fail("Chưa thể lưu đơn hàng. Vui lòng thử lại hoặc liên hệ SinDarealest qua Zalo.", 503); }
}

export async function onRequestGet() { return fail("Phương thức không được hỗ trợ.", 405); }
