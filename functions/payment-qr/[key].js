import { fail, getSetting, storageOrFail } from "../_lib.js";
import { validPublicQrImageKey } from "../_payments.js";
export async function onRequestGet({ params, env }) {
  const noStorage = storageOrFail(env); if (noStorage) return noStorage;
  const key = String(params.key || "");
  if (!validPublicQrImageKey(key)) return fail("Ảnh QR không hợp lệ.",404);
  try {
    const [active,activeKey] = await Promise.all([getSetting(env.DB,"payment_qr_active","0"),getSetting(env.DB,"payment_qr_active_key","")]);
    if (active !== "1" || activeKey !== key) return fail("Ảnh QR chưa được kích hoạt.",404);
    const object = await env.IMAGES.get(key); if (!object) return fail("Không tìm thấy ảnh QR.",404);
    const headers = new Headers(); object.writeHttpMetadata(headers);
    const type = object.httpMetadata?.contentType || "";
    if (!["image/png","image/jpeg","image/webp"].includes(type)) return fail("Định dạng ảnh QR không hợp lệ.",415);
    headers.set("Content-Type",type); headers.set("Cache-Control","no-store");
    headers.set("X-Content-Type-Options","nosniff");
    return new Response(object.body,{headers});
  } catch { return fail("Không thể tải ảnh QR.",503); }
}
