import { fail, fromRow, getSetting, json, requireAdmin } from "../../_lib.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const db = context.env.DB;
    const productRows = await db.prepare("SELECT * FROM products ORDER BY sort_order ASC, sku ASC").all();
    const [customers,orders,orderItems,warranties,warrantyClaims,auditLogs,showPrices,welcomeEnabled,welcomeTitleLine1,welcomeTitleLine2,welcomeText] = await Promise.all([
      db.prepare("SELECT * FROM customers ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM orders ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM order_items ORDER BY order_id,id").all(),
      db.prepare("SELECT * FROM warranties ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM warranty_claims ORDER BY created_at,id").all(),
      db.prepare("SELECT * FROM audit_logs ORDER BY created_at,id").all(),
      getSetting(db,"show_prices","0"), getSetting(db,"welcome_enabled","1"),
      getSetting(db,"welcome_title_line_1","Đẳng cấp thật."), getSetting(db,"welcome_title_line_2","Từ chất liệu thật."),
      getSetting(db,"welcome_text","Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu."),
    ]);
    return json({
      format: "sindarealest-backup-v2",
      createdAt: new Date().toISOString(),
      settings: { showPrices: showPrices === "1", welcomeEnabled: welcomeEnabled === "1", welcomeTitleLine1, welcomeTitleLine2, welcomeText },
      products: (productRows.results || []).map(row => fromRow(row)),
      operations: {
        customers: customers.results || [], orders: orders.results || [], orderItems: orderItems.results || [],
        warranties: warranties.results || [], warrantyClaims: warrantyClaims.results || [], auditLogs: auditLogs.results || [],
      },
    });
  } catch { return fail("Không thể tạo bản sao lưu D1. Nếu chưa áp dụng migration 0003, hãy chạy npm run setup:cloudflare.", 503); }
}
