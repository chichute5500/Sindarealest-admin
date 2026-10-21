import { fail, fromRow, requireAdmin } from "../../_lib.js";
import { WATERMARK_DEFAULTS, normalizeWatermarkSettings } from "../../_lib/watermark-settings.js";

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_BACKUP_RECORDS = 5000;

const TOTAL_RECORD_COUNT_SQL = `SELECT
  (SELECT COUNT(*) FROM (SELECT 1 FROM products LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM customers LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM orders LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM order_items LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM warranties LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM warranty_claims LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM audit_logs LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM customer_address_details LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM order_shipping_addresses LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM order_contact_details LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM order_item_details LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM warranty_claim_attachments LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM order_payment_requests LIMIT 5001)) +
  (SELECT COUNT(*) FROM (SELECT 1 FROM order_payment_transactions LIMIT 5001)) AS total_count`;

function boundedTableQuery(db, table, orderBy) {
  return db.prepare(
    `WITH backup_counts AS (${TOTAL_RECORD_COUNT_SQL})
     SELECT * FROM ${table}
     WHERE (SELECT total_count FROM backup_counts) <= ?
     ORDER BY ${orderBy}
     LIMIT 5001`,
  ).bind(MAX_BACKUP_RECORDS);
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const db = context.env.DB;
    const settingKeys = [
      "show_prices",
      "welcome_enabled",
      "welcome_title_line_1",
      "welcome_title_line_2",
      "welcome_text",
      "watermark_enabled",
      "watermark_logo",
      "watermark_position",
      "watermark_size",
      "watermark_opacity",
    ];
    // A single D1 batch makes all exported tables/settings come from one
    // transactional read snapshot instead of mixing independent reads while
    // live orders or claims are being updated.
    const resultSets = await db.batch([
      db.prepare(TOTAL_RECORD_COUNT_SQL),
      boundedTableQuery(db, "products", "sort_order ASC, sku ASC"),
      boundedTableQuery(db, "customers", "created_at, id"),
      boundedTableQuery(db, "orders", "created_at, id"),
      boundedTableQuery(db, "order_items", "order_id, id"),
      boundedTableQuery(db, "warranties", "created_at, id"),
      boundedTableQuery(db, "warranty_claims", "created_at, id"),
      boundedTableQuery(db, "audit_logs", "created_at, id"),
      boundedTableQuery(db, "customer_address_details", "customer_id"),
      boundedTableQuery(db, "order_shipping_addresses", "order_id"),
      boundedTableQuery(db, "order_contact_details", "order_id"),
      boundedTableQuery(db, "order_item_details", "item_id"),
      boundedTableQuery(db, "warranty_claim_attachments", "claim_id"),
      boundedTableQuery(db, "order_payment_requests", "created_at, id"),
      boundedTableQuery(db, "order_payment_transactions", "created_at, id"),
      db.prepare("SELECT key,value FROM settings WHERE key IN (?,?,?,?,?,?,?,?,?,?)").bind(...settingKeys),
    ]);
    if (!Array.isArray(resultSets) || resultSets.length !== 16) {
      throw new Error("D1 snapshot returned an incomplete result set");
    }
    const totalRecords = Number(resultSets[0]?.results?.[0]?.total_count);
    if (!Number.isSafeInteger(totalRecords) || totalRecords < 0) {
      throw new Error("D1 snapshot returned an invalid record count");
    }
    if (totalRecords > MAX_BACKUP_RECORDS) {
      return fail("Bản sao lưu vượt giới hạn 5.000 bản ghi cho một lần xử lý. Hãy lên kế hoạch xuất/nhập theo lô trước khi tiếp tục.", 413);
    }
    const rowsAt = (index) => resultSets[index]?.results || [];
    const settingMap = new Map(rowsAt(15).map((row) => [row.key, row.value]));
    const setting = (key, fallback) => settingMap.get(key) ?? fallback;
    const productRows = { results: rowsAt(1) };
    const customers = { results: rowsAt(2) };
    const orders = { results: rowsAt(3) };
    const orderItems = { results: rowsAt(4) };
    const warranties = { results: rowsAt(5) };
    const warrantyClaims = { results: rowsAt(6) };
    const auditLogs = { results: rowsAt(7) };
    const customerAddressDetails = { results: rowsAt(8) };
    const orderShippingAddresses = { results: rowsAt(9) };
    const orderContactDetails = { results: rowsAt(10) };
    const orderItemDetails = { results: rowsAt(11) };
    const warrantyClaimAttachments = { results: rowsAt(12) };
    const orderPaymentRequests = { results: rowsAt(13) };
    const orderPaymentTransactions = { results: rowsAt(14) };
    const showPrices = setting("show_prices", "0");
    const welcomeEnabled = setting("welcome_enabled", "1");
    const welcomeTitleLine1 = setting("welcome_title_line_1", "Đẳng cấp thật.");
    const welcomeTitleLine2 = setting("welcome_title_line_2", "Từ chất liệu thật.");
    const welcomeText = setting("welcome_text", "Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu.");
    const watermarkEnabled = setting("watermark_enabled", WATERMARK_DEFAULTS.watermark_enabled);
    const watermarkLogo = setting("watermark_logo", WATERMARK_DEFAULTS.watermark_logo);
    const watermarkPosition = setting("watermark_position", WATERMARK_DEFAULTS.watermark_position);
    const watermarkSize = setting("watermark_size", WATERMARK_DEFAULTS.watermark_size);
    const watermarkOpacity = setting("watermark_opacity", WATERMARK_DEFAULTS.watermark_opacity);
    const watermark = normalizeWatermarkSettings({
      watermark_enabled: watermarkEnabled,
      watermark_logo: watermarkLogo,
      watermark_position: watermarkPosition,
      watermark_size: watermarkSize,
      watermark_opacity: watermarkOpacity,
    });
    const payload = {
      format: "sindarealest-backup-v2",
      createdAt: new Date().toISOString(),
      settings: {
        showPrices: showPrices === "1",
        welcomeEnabled: welcomeEnabled === "1",
        welcomeTitleLine1,
        welcomeTitleLine2,
        welcomeText,
        watermarkEnabled: watermark.watermarkEnabled,
        watermarkLogoUrl: watermark.watermarkLogoUrl,
        watermarkPosition: watermark.watermarkPosition,
        watermarkSize: watermark.watermarkSize,
        watermarkOpacity: watermark.watermarkOpacity,
      },
      products: (productRows.results || []).map(row => fromRow(row)),
      operations: {
        customers: customers.results || [],
        orders: orders.results || [],
        orderItems: orderItems.results || [],
        warranties: warranties.results || [],
        warrantyClaims: warrantyClaims.results || [],
        auditLogs: auditLogs.results || [],
        customerAddressDetails: customerAddressDetails.results || [],
        orderShippingAddresses: orderShippingAddresses.results || [],
        orderContactDetails: orderContactDetails.results || [],
        orderItemDetails: orderItemDetails.results || [],
        warrantyClaimAttachments: warrantyClaimAttachments.results || [],
        orderPaymentRequests: orderPaymentRequests.results || [],
        orderPaymentTransactions: orderPaymentTransactions.results || [],
      },
    };

    const recordCount = payload.products.length + Object.values(payload.operations)
      .reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
    if (recordCount > MAX_BACKUP_RECORDS) {
      return fail("Bản sao lưu vượt giới hạn 5.000 bản ghi cho một lần xử lý. Hãy lên kế hoạch xuất/nhập theo lô trước khi tiếp tục.", 413);
    }

    const serialized = JSON.stringify(payload);
    if (serialized.length > MAX_BACKUP_BYTES || new TextEncoder().encode(serialized).byteLength > MAX_BACKUP_BYTES) {
      return fail("Bản sao lưu vượt giới hạn 20 MB để có thể khôi phục an toàn. Hãy kiểm tra lượng nhật ký/dữ liệu trước khi tiếp tục.", 413);
    }
    return new Response(serialized, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fail("Không thể tạo bản sao lưu D1. Hãy xác minh các migration 0003–0007 đã được áp dụng.", 503);
  }
}
