import { fail, getSetting, storageOrFail, requireAdmin } from "../../_lib.js";
import { validPublicQrImageKey } from "../../_payments.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;
  const key = String(new URL(context.request.url).searchParams.get("key") || "");
  if (!validPublicQrImageKey(key)) return fail("Ảnh QR xem trước không hợp lệ.",404);
  try {
    const pendingKey = await getSetting(context.env.DB,"payment_qr_pending_key","");
    if (pendingKey !== key) return fail("Chỉ có thể xem trước ảnh QR đang chờ kiểm tra.",404);
    const object = await context.env.IMAGES.get(key);
    if (!object) return fail("Không tìm thấy ảnh QR đang chờ.",404);
    const type = object.httpMetadata?.contentType || "";
    if (!["image/png","image/jpeg","image/webp"].includes(type)) return fail("Định dạng ảnh QR không hợp lệ.",415);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type",type);
    headers.set("Cache-Control","private, no-store");
    headers.set("Referrer-Policy","no-referrer");
    headers.set("X-Content-Type-Options","nosniff");
    headers.set("Content-Disposition","inline");
    return new Response(object.body,{headers});
  } catch { return fail("Không thể tải ảnh QR xem trước.",503); }
}
