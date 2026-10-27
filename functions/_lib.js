const encoder = new TextEncoder();
const SESSION_COOKIE = "sd_admin_session";
const SESSION_SECONDS = 10 * 60;

export const FULFILLMENT_TYPES = Object.freeze(["in_stock", "made_to_order", "unclassified"]);
export function normalizeFulfillmentType(value) {
  return FULFILLMENT_TYPES.includes(value) ? value : "unclassified";
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      ...headers,
    },
  });
}

export function fail(message, status = 400, headers = {}) {
  return json({ ok: false, error: message }, status, headers);
}

/**
 * Read a request body with a hard byte limit, even when Content-Length is absent.
 * Returns { bytes } on success or { error: "invalid" | "too_large" }.
 */
export async function readBodyBytesLimited(request, maxBytes = 64 * 1024) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return { error: "invalid" };
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return { error: "too_large" };
  if (!request.body) return { error: "invalid" };

  // Do not allocate based on an untrusted Content-Length; grow only as bytes arrive.
  let buffer = new Uint8Array(Math.min(maxBytes, 16 * 1024));
  let total = 0;
  const reader = request.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > maxBytes) {
        try { await reader.cancel(); } catch {}
        return { error: "too_large" };
      }
      const required = total + value.byteLength;
      if (required > buffer.byteLength) {
        const capacity = Math.min(maxBytes, Math.max(required, buffer.byteLength * 2));
        const grown = new Uint8Array(capacity);
        grown.set(buffer.subarray(0, total));
        buffer = grown;
      }
      buffer.set(value, total);
      total = required;
    }
  } catch {
    return { error: "invalid" };
  }
  return { bytes: buffer.subarray(0, total) };
}

/**
 * Parse a small JSON request without buffering an unbounded body in memory.
 * Returns { value } on success or { error: "invalid" | "too_large" }.
 */
export async function readJsonBodyLimited(request, maxBytes = 64 * 1024) {
  const body = await readBodyBytesLimited(request, maxBytes);
  if (body.error) return body;
  try {
    return { value: JSON.parse(new TextDecoder().decode(body.bytes)) };
  } catch {
    return { error: "invalid" };
  }
}

export function dbOrFail(env) {
  if (!env?.DB) return fail("Dịch vụ dữ liệu chưa được cấu hình. Hãy gắn D1 binding tên DB.", 503);
  return null;
}

export function storageOrFail(env) {
  if (!env?.IMAGES) return fail("Kho ảnh chưa được cấu hình. Hãy gắn R2 bucket binding tên IMAGES.", 503);
  return null;
}

export function getCurrentDateInVietnam(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

function isIsoCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export function warrantyStatusOnDate(status, startsAt, endsAt, today = getCurrentDateInVietnam()) {
  if (status !== "active") return status;
  const startDate = String(startsAt ?? "");
  const endDate = String(endsAt ?? "");
  if (!isIsoCalendarDate(startDate) || !isIsoCalendarDate(endDate) || startDate > endDate) return "invalid";
  if (endDate < today) return "expired";
  if (startDate > today) return "pending";
  return status;
}

export function isWarrantyEligibleOnDate(status, startsAt, endsAt, today = getCurrentDateInVietnam()) {
  const startDate = String(startsAt ?? "");
  const endDate = String(endsAt ?? "");
  return status === "active" &&
    isIsoCalendarDate(startDate) &&
    isIsoCalendarDate(endDate) &&
    startDate <= today &&
    endDate >= today;
}

function b64url(bytesOrString) {
  const bytes = typeof bytesOrString === "string" ? encoder.encode(bytesOrString) : bytesOrString;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function unb64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function sameBytes(a, b) {
  let mismatch = a.length ^ b.length;
  const size = Math.max(a.length, b.length);
  for (let i = 0; i < size; i++) mismatch |= (a[i % Math.max(1, a.length)] || 0) ^ (b[i % Math.max(1, b.length)] || 0);
  return mismatch === 0;
}

export function constantTimeTextEqual(left, right) {
  return sameBytes(encoder.encode(String(left)), encoder.encode(String(right)));
}

export function hasSecuritySecrets(env) {
  return typeof env?.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= 12 &&
    typeof env?.SESSION_SECRET === "string" && env.SESSION_SECRET.length >= 32;
}

function cookieValue(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const item = part.trim();
    const at = item.indexOf("=");
    if (at >= 0 && item.slice(0, at) === name) return item.slice(at + 1);
  }
  return "";
}

export async function createSession(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ iat: now, exp: now + SESSION_SECONDS, nonce: crypto.randomUUID() }));
  const signature = b64url(await hmac(payload, secret));
  return `${payload}.${signature}`;
}

export async function verifySession(request, env) {
  if (!hasSecuritySecrets(env)) return false;
  const token = cookieValue(request, SESSION_COOKIE);
  const parts = token.split(".");
  if (parts.length !== 2 || parts.some((x) => !x)) return false;
  try {
    const expected = await hmac(parts[0], env.SESSION_SECRET);
    const received = unb64url(parts[1]);
    if (!sameBytes(expected, received)) return false;
    const payload = JSON.parse(new TextDecoder().decode(unb64url(parts[0])));
    const now = Math.floor(Date.now() / 1000);
    return Number.isInteger(payload.exp) && payload.exp > now && payload.iat <= now + 60 && payload.exp - payload.iat <= SESSION_SECONDS;
  } catch {
    return false;
  }
}

export function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function sameSiteRequest(request) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin) return false; }
    catch { return false; }
  }
  const site = request.headers.get("Sec-Fetch-Site");
  return site !== "cross-site";
}

export async function requireAdmin(context) {
  const { request, env } = context;
  const noDb = dbOrFail(env);
  if (noDb) return { response: noDb };
  if (!hasSecuritySecrets(env)) return { response: fail("Chưa cấu hình ADMIN_PASSWORD hoặc SESSION_SECRET. Hãy thêm hai secret cho môi trường Production.", 503) };
  if (!await verifySession(request, env)) return { response: fail("Phiên đăng nhập hết hạn hoặc chưa đăng nhập.", 401) };
  if (!sameSiteRequest(request)) return { response: fail("Yêu cầu không cùng website bị từ chối.", 403) };
  return { response: null };
}


export async function rateLimitPublicRequest(env, request, scope, maxAttempts = 6, windowSeconds = 900) {
  if (!env?.DB) return { limited: false };
  const ip = request.headers.get("CF-Connecting-IP") || "unknown-client";
  const salt = typeof env.SESSION_SECRET === "string" && env.SESSION_SECRET.length >= 32 ? env.SESSION_SECRET : "sindarealest-public-rate-limit";
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${ip}`)));
  const ipHash = b64url(digest);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;

  // Increment and read the resulting count in one atomic transaction. Separate
  // run()/first() calls let concurrent requests observe stale counts and exceed
  // the configured limit.
  const results = await env.DB.batch([
    env.DB.prepare("INSERT INTO public_rate_limits(scope,ip_hash,window_start,attempts) VALUES(?,?,?,1) " +
      "ON CONFLICT(scope,ip_hash) DO UPDATE SET " +
      "attempts=CASE WHEN public_rate_limits.window_start=excluded.window_start THEN public_rate_limits.attempts+1 ELSE 1 END," +
      "window_start=excluded.window_start").bind(scope,ipHash,windowStart),
    env.DB.prepare("SELECT attempts FROM public_rate_limits WHERE scope=? AND ip_hash=? LIMIT 1").bind(scope,ipHash),
  ]);
  const attempts = Number(results?.[1]?.results?.[0]?.attempts);
  // A successful write with a missing/invalid read result is not proof that the
  // limit was applied. Fail closed so callers can return 503 instead of silently
  // turning rate limiting off.
  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    throw new Error("Public rate-limit counter could not be verified");
  }

  // Cleanup is opportunistic: a cleanup failure must not turn an otherwise
  // valid order or warranty operation into a 503.
  if (now % 17 === 0) {
    try {
      await env.DB.prepare("DELETE FROM public_rate_limits WHERE window_start < ?")
        .bind(now - windowSeconds * 4).run();
    } catch {}
  }
  return { limited: attempts > maxAttempts };
}

export async function getSetting(db, key, fallback = "0") {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ? LIMIT 1").bind(key).first();
  return row?.value ?? fallback;
}

export function parseImages(value) {
  try {
    const images = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(images)) return [];
    // Only serve known local WebP paths. Old or imported DB values must not turn
    // a stored image field into a remote request or an HTML attribute payload.
    return images.filter((x) =>
      typeof x === "string" &&
      (/^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(x) ||
       /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(x))
    );
  } catch { return []; }
}

export function isVerifiedCommercialSku(row) {
  if (!row || typeof row !== "object") return false;
  if (row.sku_verified !== null && row.sku_verified !== undefined) return Number(row.sku_verified) === 1;
  if (row.skuVerified !== null && row.skuVerified !== undefined) return row.skuVerified === true || Number(row.skuVerified) === 1;
  const storedSku = String(row.sku ?? "").trim();
  return Boolean(storedSku) && !/^(?:SD\d{3}|SD-[A-Z0-9-]{2,12}\d{3,})$/i.test(storedSku);
}

export function fromRow(row, { publicView = false, showPrices = false } = {}) {
  const rawPrice = row.price;
  const parsedPrice = rawPrice === null || rawPrice === undefined || rawPrice === "" ? null : Number(rawPrice);
  const price = parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null;
  const skuVerified = isVerifiedCommercialSku(row);
  const sourcePriceConfirmed = row.source_price_confirmed !== null && row.source_price_confirmed !== undefined
    ? Number(row.source_price_confirmed) === 1
    : row.sourcePriceConfirmed === true || Number(row.sourcePriceConfirmed) === 1;
  const publicPriceIsValid = Number.isSafeInteger(price) && price >= 0;
  return {
    id: row.id,
    slug: row.slug,
    sku: publicView && !skuVerified ? null : row.sku,
    skuVerified,
    fulfillmentType: normalizeFulfillmentType(row.fulfillment_type ?? row.fulfillmentType),
    title: row.title,
    category: row.category,
    categoryLabel: row.category_label || row.category,
    description: row.description || "",
    price: !publicView ? price : (showPrices && sourcePriceConfirmed && publicPriceIsValid ? price : null),
    stock: publicView || row.stock === null || row.stock === undefined ? null : Number(row.stock),
    published: Number(row.published) === 1,
    images: parseImages(row.images_json),
    sourcePriceConfirmed,
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

export function slugify(input) {
  return String(input || "san-pham")
    .toLocaleLowerCase("vi")
    .replace(/đ/g, "d")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "san-pham";
}

function optionalInteger(value, field, max = 2_000_000_000) {
  if (value === "" || value === null || value === undefined) return { value: null };
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > max) return { error: `${field} phải là số nguyên không âm hoặc để trống.` };
  return { value: number };
}

export function validateProduct(input, existing = null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Dữ liệu sản phẩm không hợp lệ." };
  const title = String(input.title ?? "").trim();
  const rawSku = String(input.sku ?? "").trim().toUpperCase();
  const sku = rawSku || String(existing?.sku ?? "").trim().toUpperCase();
  const flag = input.skuVerified ?? input.sku_verified;
  const skuVerified = flag === undefined || flag === null
    ? Boolean(existing ? isVerifiedCommercialSku(existing) : false)
    : flag === true || flag === 1 || flag === "1";
  if (!title || title.length > 180) return { error: "Tên sản phẩm là bắt buộc và tối đa 180 ký tự." };
  if (skuVerified && !rawSku) return { error: "Nhập SKU thương mại đã xác nhận trước khi đánh dấu SKU là chính thức." };
  if (!/^[A-Z0-9][A-Z0-9._-]{0,47}$/.test(sku)) return { error: "Mã sản phẩm nội bộ/SKU không hợp lệ. SKU thương mại phải được nhập và xác nhận rõ ràng." };
  const rawCategory = String(input.category ?? "").trim();
  if (!rawCategory || rawCategory.length > 80) return { error: "Danh mục là bắt buộc và tối đa 80 ký tự." };
  const aliases = { sneaker: "sneakers", sneakers: "sneakers", "giay-luoi": "loafers", loafers: "loafers", "giay-tay": "dress-shoes", "dress-shoes": "dress-shoes", "thắt-lưng": "belts", "that-lung": "belts", belts: "belts", "vi-da": "wallets", wallets: "wallets", dep: "sandals", sandals: "sandals", "day-dong-ho": "watch-straps", "op-dien-thoai": "phone-cases" };
  const categoryKey = slugify(rawCategory);
  const category = existing && rawCategory === existing.categoryLabel ? existing.category : (Object.hasOwn(aliases, categoryKey) ? aliases[categoryKey] : (/^[a-z0-9-]+$/.test(rawCategory) ? rawCategory : categoryKey));
  const description = String(input.description ?? "");
  if (description.length > 10000) return { error: "Mô tả tối đa 10.000 ký tự." };
  const price = optionalInteger(input.price, "Giá");
  if (price.error) return { error: price.error };
  const stock = optionalInteger(input.stock, "Tồn kho", 1_000_000);
  if (stock.error) return { error: stock.error };
  const rawFulfillmentType = input.fulfillmentType ?? input.fulfillment_type ?? existing?.fulfillmentType ?? "unclassified";
  if (typeof rawFulfillmentType !== "string" || !FULFILLMENT_TYPES.includes(rawFulfillmentType)) {
    return { error: "Loại hàng không hợp lệ. Chọn Hàng có sẵn, Hàng đặt riêng hoặc Chưa phân loại." };
  }
  const fulfillmentType = rawFulfillmentType;
  const images = input.images === undefined ? (existing?.images || []) : input.images;
  if (!Array.isArray(images) || images.length > 30 || images.some((x) => typeof x !== "string" || x.length > 240 || (!/^images\/[A-Za-z0-9_-]{1,120}\.webp$/.test(x) && !/^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(x)))) {
    return { error: "Bộ ảnh không hợp lệ. Chỉ dùng ảnh WebP có sẵn trong images/ hoặc ảnh tải lên qua trang quản trị." };
  }
  const id = existing?.id || crypto.randomUUID();
  const slug = existing?.slug || `${slugify(title).slice(0, 70)}-${id.slice(0, 8)}`;
  return {
    value: {
      id,
      slug,
      sku,
      skuVerified,
      title,
      category,
      categoryLabel: String(input.categoryLabel ?? rawCategory).trim().slice(0, 80),
      description,
      price: price.value,
      stock: stock.value,
      fulfillmentType,
      published: input.published === false || input.published === 0 || input.published === "0" ? 0 : 1,
      images,
      sourcePriceConfirmed: price.value !== null,
      sortOrder: existing?.sortOrder ?? Date.now(),
    },
  };
}

export function productInsertStatement(db, p, ignore = false) {
  const verb = ignore ? "INSERT OR IGNORE" : "INSERT";
  return db.prepare(`${verb} INTO products (id,slug,sku,sku_verified,title,category,category_label,description,price,stock,published,images_json,source_price_confirmed,sort_order,fulfillment_type,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
    .bind(p.id, p.slug, p.sku, p.skuVerified ? 1 : 0, p.title, p.category, p.categoryLabel, p.description, p.price, p.stock, p.published, JSON.stringify(p.images), p.sourcePriceConfirmed ? 1 : 0, p.sortOrder, p.fulfillmentType);
}

export function toAdminProduct(p) {
  return {
    id: p.id, slug: p.slug, sku: p.sku, skuVerified: Boolean(p.skuVerified), title: p.title,
    category: p.category, categoryLabel: p.categoryLabel,
    fulfillmentType: normalizeFulfillmentType(p.fulfillmentType),
    description: p.description, price: p.price, stock: p.stock,
    published: Boolean(p.published), images: p.images,
    sourcePriceConfirmed: Boolean(p.sourcePriceConfirmed), sortOrder: p.sortOrder,
  };
}

export function genericDbError(error) {
  const message = String(error?.message || "");
  if (/UNIQUE constraint failed/i.test(message)) return fail("SKU hoặc mã đường dẫn đã tồn tại. Hãy kiểm tra SKU rồi lưu lại.", 409);
  if (/no such table|no such column|D1_ERROR|database/i.test(message)) return fail("Cơ sở dữ liệu chưa khởi tạo đúng. Hãy chạy hai tệp SQL trong thư mục migrations/.", 503);
  return fail("Không thể lưu dữ liệu. Hãy kiểm tra cấu hình D1 và thử lại.", 500);
}

export async function rateLimitLogin(db, request, secret) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipHash = b64url(await hmac(ip, secret));
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;

  // Increment/reset and read the resulting counter in one D1 transaction.
  // A separate SELECT followed by UPDATE permits concurrent login attempts to
  // observe the same old count and race past the threshold.
  const results = await db.batch([
    db.prepare(
      "INSERT INTO admin_login_attempts(ip_hash,window_start,attempts) VALUES(?,?,1) " +
      "ON CONFLICT(ip_hash) DO UPDATE SET " +
      "window_start=CASE WHEN ? - admin_login_attempts.window_start >= ? THEN excluded.window_start ELSE admin_login_attempts.window_start END, " +
      "attempts=CASE WHEN ? - admin_login_attempts.window_start >= ? THEN 1 ELSE admin_login_attempts.attempts+1 END",
    ).bind(ipHash, now, now, windowMs, now, windowMs),
    db.prepare("SELECT attempts FROM admin_login_attempts WHERE ip_hash=?").bind(ipHash),
  ]);

  const attempts = Number(results?.[1]?.results?.[0]?.attempts);
  // A missing counter result is not evidence that this IP is below the
  // threshold. Fail closed so the login endpoint returns 503 rather than
  // allowing attempts when D1 cannot verify the limiter state.
  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    throw new Error("Login rate-limit counter could not be verified");
  }

  // Expired rows for one-off IPs otherwise accumulate forever. Cleanup is
  // opportunistic and must never disable or fail an otherwise valid check.
  if (Math.floor(now / 1000) % 17 === 0) {
    try {
      await db.prepare("DELETE FROM admin_login_attempts WHERE window_start < ?")
        .bind(now - windowMs * 4).run();
    } catch {}
  }
  return { limited: attempts > 5, ipHash };
}

export { SESSION_SECONDS };
