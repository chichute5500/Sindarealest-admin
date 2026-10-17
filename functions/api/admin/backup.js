import { fail, fromRow, requireAdmin } from "../../_lib.js";
import { WATERMARK_DEFAULTS, normalizeWatermarkSettings } from "../../_lib/watermark-settings.js";

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_BACKUP_RECORDS = 5000;

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
      "watermark_position",
      "watermark_size",
      "watermark_opacity",
    ];
    // A single D1 batch makes all exported tables/settings come from one
    // transactional read snapshot instead of mixing independent reads while
    // live orders or claims are being updated.
    const resultSets = await db.batch([
      db.prepare("SELECT * FROM products ORDER BY sort_order ASC, sku ASC"),
      db.prepare("SELECT * FROM customers ORDER BY created_at,id"),
      db.prepare("SELECT * FROM orders ORDER BY created_at,id"),
      db.prepare("SELECT * FROM order_items ORDER BY order_id,id"),
      db.prepare("SELECT * FROM warranties ORDER BY created_at,id"),
      db.prepare("SELECT * FROM warranty_claims ORDER BY created_at,id"),
      db.prepare("SELECT * FROM audit_logs ORDER BY created_at,id"),
      db.prepare("SELECT * FROM customer_address_details ORDER BY customer_id"),
      db.prepare("SELECT * FROM order_shipping_addresses ORDER BY order_id"),
      db.prepare("SELECT * FROM order_contact_details ORDER BY order_id"),
      db.prepare("SELECT * FROM order_item_details ORDER BY item_id"),
      db.prepare("SELECT * FROM warranty_claim_attachments ORDER BY claim_id"),
      db.prepare("SELECT key,value FROM settings WHERE key IN (?,?,?,?,?,?,?,?,?)").bind(...settingKeys),
    ]);
    if (!Array.isArray(resultSets) || resultSets.length !== 13) {
      throw new Error("D1 snapshot returned an incomplete result set");
    }
    const rowsAt = (index) => resultSets[index]?.results || [];
    const settingMap = new Map(rowsAt(12).map((row) => [row.key, row.value]));
    const setting = (key, fallback) => settingMap.get(key) ?? fallback;
    const productRows = { results: rowsAt(0) };
    const customers = { results: rowsAt(1) };
    const orders = { results: rowsAt(2) };
    const orderItems = { results: rowsAt(3) };
    const warranties = { results: rowsAt(4) };
    const warrantyClaims = { results: rowsAt(5) };
    const auditLogs = { results: rowsAt(6) };
    const customerAddressDetails = { results: rowsAt(7) };
    const orderShippingAddresses = { results: rowsAt(8) };
    const orderContactDetails = { results: rowsAt(9) };
    const orderItemDetails = { results: rowsAt(10) };
    const warrantyClaimAttachments = { results: rowsAt(11) };
    const showPrices = setting("show_prices", "0");
    const welcomeEnabled = setting("welcome_enabled", "1");
    const welcomeTitleLine1 = setting("welcome_title_line_1", "Đẳng cấp thật.");
    const welcomeTitleLine2 = setting("welcome_title_line_2", "Từ chất liệu thật.");
    const welcomeText = setting("welcome_text", "Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu.");
    const watermarkEnabled = setting("watermark_enabled", WATERMARK_DEFAULTS.watermark_enabled);
    const watermarkPosition = setting("watermark_position", WATERMARK_DEFAULTS.watermark_position);
    const watermarkSize = setting("watermark_size", WATERMARK_DEFAULTS.watermark_size);
    const watermarkOpacity = setting("watermark_opacity", WATERMARK_DEFAULTS.watermark_opacity);
    const watermark = normalizeWatermarkSettings({
      watermark_enabled: watermarkEnabled,
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
    return fail("Không thể tạo bản sao lưu D1. Hãy xác minh các migration 0003–0005 đã được áp dụng.", 503);
  }
}
