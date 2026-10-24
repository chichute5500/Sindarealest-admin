export const WATERMARK_DEFAULTS = Object.freeze({
  watermark_enabled: "1",
  watermark_logo: "/watermark.webp",
  watermark_position: "bottom-right",
  watermark_size: "16",
  watermark_opacity: "68",
});

export const WATERMARK_POSITIONS = Object.freeze([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
]);

function safeLogoUrl(value) {
  if (typeof value !== "string") return WATERMARK_DEFAULTS.watermark_logo;
  const url = value.trim();
  return url === WATERMARK_DEFAULTS.watermark_logo || /^\/media\/[A-Za-z0-9-]{30,40}\.webp$/.test(url)
    ? url : WATERMARK_DEFAULTS.watermark_logo;
}

function integerInRange(value, min, max) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

export function normalizeWatermarkSettings(values = {}) {
  const position = WATERMARK_POSITIONS.includes(values.watermark_position)
    ? values.watermark_position : WATERMARK_DEFAULTS.watermark_position;
  const size = integerInRange(values.watermark_size, 6, 35);
  const opacity = integerInRange(values.watermark_opacity, 10, 100);
  return {
    watermarkEnabled: values.watermark_enabled === "0" ? false : true,
    watermarkLogoUrl: safeLogoUrl(values.watermark_logo),
    watermarkPosition: position,
    watermarkSize: size ?? Number(WATERMARK_DEFAULTS.watermark_size),
    watermarkOpacity: opacity ?? Number(WATERMARK_DEFAULTS.watermark_opacity),
  };
}

export function validateWatermarkSettingUpdates(body = {}) {
  const updates = [];
  if (body.watermarkLogoUrl !== undefined) {
    if (typeof body.watermarkLogoUrl !== "string" || safeLogoUrl(body.watermarkLogoUrl) !== body.watermarkLogoUrl.trim()) {
      return { error: "Logo watermark phải là /watermark.webp hoặc đường dẫn ảnh WebP nội bộ /media/...webp hợp lệ." };
    }
    updates.push(["watermark_logo", body.watermarkLogoUrl.trim()]);
  }
  if (body.watermarkEnabled !== undefined) {
    if (typeof body.watermarkEnabled !== "boolean") {
      return { error: "Cần chọn bật hoặc tắt watermark." };
    }
    updates.push(["watermark_enabled", body.watermarkEnabled ? "1" : "0"]);
  }
  if (body.watermarkPosition !== undefined) {
    if (!WATERMARK_POSITIONS.includes(body.watermarkPosition)) {
      return { error: "Vị trí watermark không hợp lệ." };
    }
    updates.push(["watermark_position", body.watermarkPosition]);
  }
  if (body.watermarkSize !== undefined) {
    const size = integerInRange(body.watermarkSize, 6, 35);
    if (size === null) return { error: "Kích thước watermark phải là số nguyên từ 6 đến 35%." };
    updates.push(["watermark_size", String(size)]);
  }
  if (body.watermarkOpacity !== undefined) {
    const opacity = integerInRange(body.watermarkOpacity, 10, 100);
    if (opacity === null) return { error: "Độ mờ watermark phải là số nguyên từ 10 đến 100%." };
    updates.push(["watermark_opacity", String(opacity)]);
  }
  return { updates };
}
