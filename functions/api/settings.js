import { dbOrFail, fail, getSetting, json } from "../_lib.js";
const defaults = {
  welcome_enabled: "1",
  welcome_title_line_1: "Đẳng cấp thật.",
  welcome_title_line_2: "Từ chất liệu thật.",
  welcome_text: "Từ vân da tự nhiên đến từng đường nét hoàn thiện, mỗi thiết kế được chăm chút để tôn lên chất liệu và phong cách riêng của người sở hữu.",
};
export async function onRequestGet({ env }) {
  const unavailable = dbOrFail(env); if (unavailable) return unavailable;
  try {
    const values = await Promise.all(Object.entries(defaults).map(async ([key,fallback]) => [key,await getSetting(env.DB,key,fallback)]));
    const settings = Object.fromEntries(values);
    return json({ welcomeEnabled: settings.welcome_enabled === "1", welcomeTitleLine1: settings.welcome_title_line_1, welcomeTitleLine2: settings.welcome_title_line_2, welcomeText: settings.welcome_text });
  } catch { return fail("Không đọc được cài đặt hiển thị.",503); }
}
export async function onRequestPut() { return fail("Phương thức không được hỗ trợ.",405); }
