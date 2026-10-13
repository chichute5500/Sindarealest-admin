import { dbOrFail, fail, fromRow, getSetting, json } from "../_lib.js";

export async function onRequestGet({ env }) {
  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  try {
    const showPrices = (await getSetting(env.DB, "show_prices", "0")) === "1";
    const result = await env.DB.prepare("SELECT * FROM products WHERE published = 1 ORDER BY sort_order ASC, sku ASC LIMIT 2000").all();
    return json((result.results || []).map((row) => fromRow(row, { publicView: true, showPrices })));
  } catch {
    return fail("Không thể tải dữ liệu sản phẩm từ D1. Vui lòng thử lại sau; dữ liệu tĩnh dự phòng đã được tắt để tránh hiển thị sản phẩm cũ.", 503);
  }
}
