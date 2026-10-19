import { fail, getSetting, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { WATERMARK_DEFAULTS, normalizeWatermarkSettings, validateWatermarkSettingUpdates } from "../../_lib/watermark-settings.js";

const welcomeDefaults = {
  welcome_enabled: "1",
  welcome_title_line_1: "Đẳng cấp thật.",
  welcome_title_line_2: "Từ chất liệu thật.",
  welcome_text: "Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu.",
};

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const defaults = { ...WATERMARK_DEFAULTS, ...welcomeDefaults };
    const [showPrices, ...entries] = await Promise.all([
      getSetting(context.env.DB, "show_prices", "0"),
      ...Object.entries(defaults).map(async ([key, fallback]) => [key, await getSetting(context.env.DB, key, fallback)]),
    ]);
    const values = Object.fromEntries(entries);
    return json({
      showPrices: showPrices === "1",
      welcomeEnabled: values.welcome_enabled === "1",
      welcomeTitleLine1: values.welcome_title_line_1,
      welcomeTitleLine2: values.welcome_title_line_2,
      welcomeText: values.welcome_text,
      ...normalizeWatermarkSettings(values),
    });
  } catch {
    return fail("Không đọc được cài đặt D1.", 503);
  }
}

export async function onRequestPut(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const parsedBody = await readJsonBodyLimited(context.request, 8 * 1024);
  if (parsedBody.error === "too_large") return fail("Cài đặt vượt giới hạn kích thước.", 413);
  if (parsedBody.error || !parsedBody.value || typeof parsedBody.value !== "object" || Array.isArray(parsedBody.value)) return fail("Cài đặt không hợp lệ.");
  const body = parsedBody.value;
  const updates = [];

  if (body?.showPrices !== undefined) {
    if (typeof body.showPrices !== "boolean") return fail("Cần chọn bật hoặc tắt hiển thị giá.");
    updates.push(["show_prices", body.showPrices ? "1" : "0"]);
  }
  if (body?.welcomeEnabled !== undefined) {
    if (typeof body.welcomeEnabled !== "boolean") return fail("Trạng thái trang chào mừng không hợp lệ.");
    updates.push(["welcome_enabled", body.welcomeEnabled ? "1" : "0"]);
  }

  const watermark = validateWatermarkSettingUpdates(body || {});
  if (watermark.error) return fail(watermark.error);
  if (body.watermarkLogoUrl !== undefined && body.watermarkLogoUrl !== WATERMARK_DEFAULTS.watermark_logo) {
    const key = body.watermarkLogoUrl.slice("/media/".length);
    if (!context.env.IMAGES || typeof context.env.IMAGES.head !== "function") {
      return fail("Kho ảnh hiển thị chưa được cấu hình để xác minh logo.", 503);
    }
    try {
      if (!await context.env.IMAGES.head(key)) return fail("Không tìm thấy ảnh logo trong kho ảnh. Hãy tải ảnh WebP lên trước.", 404);
    } catch {
      return fail("Không thể xác minh ảnh logo trong kho ảnh.", 503);
    }
  }
  updates.push(...watermark.updates);

  const fields = [
    ["welcomeTitleLine1", "welcome_title_line_1", 80],
    ["welcomeTitleLine2", "welcome_title_line_2", 80],
    ["welcomeText", "welcome_text", 500],
  ];
  for (const [input, key, max] of fields) if (body?.[input] !== undefined) {
    if (typeof body[input] !== "string" || !body[input].trim() || body[input].trim().length > max) {
      return fail(`${input} bắt buộc và tối đa ${max} ký tự.`);
    }
    updates.push([key, body[input].trim()]);
  }
  if (!updates.length) return fail("Không có cài đặt hợp lệ để lưu.");

  try {
    const statements = [];
    for (const [key, value] of updates) {
      statements.push(context.env.DB.prepare(
        "INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
      ).bind(key, value));
      statements.push(context.env.DB.prepare(
        "INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'setting_updated', 'setting', ?, ?)",
      ).bind(crypto.randomUUID(), key, JSON.stringify({
        key,
        value: key === "show_prices" || key === "welcome_enabled" || key === "watermark_enabled"
          ? value === "1" : value,
      })));
    }
    await context.env.DB.batch(statements);
    const response = { ok: true, message: "Đã lưu cài đặt." };
    if (body.showPrices !== undefined) response.showPrices = body.showPrices;
    if (body.welcomeEnabled !== undefined) response.welcomeEnabled = body.welcomeEnabled;
    if (body.watermarkEnabled !== undefined) response.watermarkEnabled = body.watermarkEnabled;
    if (body.watermarkLogoUrl !== undefined) response.watermarkLogoUrl = body.watermarkLogoUrl.trim();
    if (body.watermarkPosition !== undefined) response.watermarkPosition = body.watermarkPosition;
    if (body.watermarkSize !== undefined) response.watermarkSize = Number(body.watermarkSize);
    if (body.watermarkOpacity !== undefined) response.watermarkOpacity = Number(body.watermarkOpacity);
    return json(response);
  } catch {
    return fail("Không thể lưu cài đặt. Chưa có thay đổi nào được xác nhận.", 503);
  }
}
