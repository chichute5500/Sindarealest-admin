import { fail, getSetting, json, requireAdmin } from "../../_lib.js";
const welcomeDefaults = {
  welcome_enabled: "1",
  welcome_title_line_1: "Đẳng cấp thật.",
  welcome_title_line_2: "Từ chất liệu thật.",
  welcome_text: "Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu.",
};
export async function onRequestGet(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  try {
    const [showPrices,...welcome] = await Promise.all([
      getSetting(context.env.DB,"show_prices","0"),
      ...Object.entries(welcomeDefaults).map(([key,fallback])=>getSetting(context.env.DB,key,fallback)),
    ]);
    const values = Object.fromEntries(Object.keys(welcomeDefaults).map((key,i)=>[key,welcome[i]]));
    return json({ showPrices: showPrices === "1", welcomeEnabled: values.welcome_enabled === "1", welcomeTitleLine1: values.welcome_title_line_1, welcomeTitleLine2: values.welcome_title_line_2, welcomeText: values.welcome_text });
  } catch { return fail("Không đọc được cài đặt D1.", 503); }
}
export async function onRequestPut(context) {
  const auth = await requireAdmin(context); if (auth.response) return auth.response;
  let body; try { body = await context.request.json(); } catch { return fail("Cài đặt không hợp lệ."); }
  const updates = [];
  if (body?.showPrices !== undefined) {
    if (typeof body.showPrices !== "boolean") return fail("Cần chọn bật hoặc tắt hiển thị giá.");
    updates.push(["show_prices",body.showPrices?"1":"0"]);
  }
  if (body?.welcomeEnabled !== undefined) {
    if (typeof body.welcomeEnabled !== "boolean") return fail("Trạng thái trang chào mừng không hợp lệ.");
    updates.push(["welcome_enabled",body.welcomeEnabled?"1":"0"]);
  }
  const fields = [
    ["welcomeTitleLine1","welcome_title_line_1",80],
    ["welcomeTitleLine2","welcome_title_line_2",80],
    ["welcomeText","welcome_text",500],
  ];
  for (const [input,key,max] of fields) if (body?.[input] !== undefined) {
    if (typeof body[input] !== "string" || !body[input].trim() || body[input].trim().length > max) return fail(`${input} bắt buộc và tối đa ${max} ký tự.`);
    updates.push([key,body[input].trim()]);
  }
  if (!updates.length) return fail("Không có cài đặt hợp lệ để lưu.");
  try {
    const statements = [];
    for (const [key,value] of updates) {
      statements.push(context.env.DB.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,value));
      statements.push(context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'setting_updated', 'setting', ?, ?)").bind(crypto.randomUUID(),key,JSON.stringify({ key, value: key==='show_prices'||key==='welcome_enabled'?value==='1':value })));
    }
    await context.env.DB.batch(statements);
    const response = { ok:true, message:"Đã lưu cài đặt." };
    if (body.showPrices !== undefined) response.showPrices=body.showPrices;
    if (body.welcomeEnabled !== undefined) response.welcomeEnabled=body.welcomeEnabled;
    return json(response);
  } catch { return fail("Không thể lưu cài đặt. Chưa có thay đổi nào được xác nhận.", 503); }
}
