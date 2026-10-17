import { fail, fromRow, getSetting, json, requireAdmin } from "../../_lib.js";
import { WATERMARK_DEFAULTS, normalizeWatermarkSettings } from "../../_lib/watermark-settings.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const db = context.env.DB;
    const productRows = await db.prepare("SELECT * FROM products ORDER BY sort_order ASC, sku ASC").all();
    const [
      customers, orders, orderItems, warranties, warrantyClaims, auditLogs,
      customerAddressDetails, orderShippingAddresses, orderItemDetails, warrantyClaimAttachments,
      showPrices, welcomeEnabled, welcomeTitleLine1, welcomeTitleLine2, welcomeText,
      watermarkEnabled, watermarkPosition, watermarkSize, watermarkOpacity,
    ] = await Promise.all([
      db.prepare("SELECT * FROM customers ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM orders ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM order_items ORDER BY order_id,id").all(),
      db.prepare("SELECT * FROM warranties ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM warranty_claims ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM audit_logs ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM customer_address_details ORDER BY customer_id").all(),
      db.prepare("SELECT * FROM order_shipping_addresses ORDER BY order_id").all(),
      db.prepare("SELECT * FROM order_item_details ORDER BY item_id").all(),
      db.prepare("SELECT * FROM warranty_claim_attachments ORDER BY claim_id").all(),
      getSetting(db, "show_prices", "0"),
      getSetting(db, "welcome_enabled", "1"),
      getSetting(db, "welcome_title_line_1", "Đẳng cấp thật."),
      getSetting(db, "welcome_title_line_2", "Từ chất liệu thật."),
      getSetting(db, "welcome_text", "Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu."),
      getSetting(db, "watermark_enabled", WATERMARK_DEFAULTS.watermark_enabled),
      getSetting(db, "watermark_position", WATERMARK_DEFAULTS.watermark_position),
      getSetting(db, "watermark_size", WATERMARK_DEFAULTS.watermark_size),
      getSetting(db, "watermark_opacity", WATERMARK_DEFAULTS.watermark_opacity),
    ]);
    const watermark = normalizeWatermarkSettings({
      watermark_enabled: watermarkEnabled,
      watermark_position: watermarkPosition,
      watermark_size: watermarkSize,
      watermark_opacity: watermarkOpacity,
    });
    return json({
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
        orderItemDetails: orderItemDetails.results || [],
        warrantyClaimAttachments: warrantyClaimAttachments.results || [],
      },
    });
  } catch {
    return fail("Không thể tạo bản sao lưu D1. Hãy xác minh các migration 0003–0005 đã được áp dụng.", 503);
  }
}
