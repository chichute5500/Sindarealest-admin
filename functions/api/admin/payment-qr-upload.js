import { fail, json, readBodyBytesLimited, requireAdmin, storageOrFail } from "../../_lib.js";
import { validPublicQrImageKey } from "../../_payments.js";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT = Object.freeze({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" });

function signatureMatches(bytes, type) {
  if (type === "image/png") return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
  return false;
}
function setting(db,key,value) {
  return db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,value);
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;
  const bounded = await readBodyBytesLimited(context.request, MAX_BYTES + 256 * 1024);
  if (bounded.error === "too_large") return fail("Ảnh QR vượt giới hạn 5 MB.", 413);
  if (bounded.error) return fail("Không đọc được ảnh QR.");
  let form;
  try {
    const headers = new Headers(context.request.headers);
    headers.delete("Content-Length"); headers.delete("Transfer-Encoding");
    form = await new Request(context.request.url, { method: "POST", headers, body: bounded.bytes }).formData();
  } catch { return fail("Biểu mẫu ảnh QR không hợp lệ."); }
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return fail("Vui lòng chọn ảnh QR ngân hàng.");
  if (file.size <= 0 || file.size > MAX_BYTES) return fail("Ảnh QR phải lớn hơn 0 và không vượt 5 MB.", 413);
  if (!Object.hasOwn(EXT, file.type)) return fail("Chỉ chấp nhận ảnh PNG, JPEG hoặc WebP.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(bytes, file.type)) return fail("Nội dung ảnh không khớp định dạng đã khai báo.");
  const key = "qr-" + crypto.randomUUID() + "." + EXT[file.type];
  if (!validPublicQrImageKey(key)) return fail("Không tạo được mã ảnh QR an toàn.", 500);
  let uploaded = false;
  try {
    await context.env.IMAGES.put(key, bytes, {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=300" },
      customMetadata: { purpose: "pending-bank-payment-qr", verified: "false" }
    });
    uploaded = true;
    // The pointer and its audit trail must commit together. Otherwise an audit
    // failure could return 503 after silently replacing the pending QR key.
    await context.env.DB.batch([
      setting(context.env.DB, "payment_qr_pending_key", key),
      context.env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?,'admin','payment_qr_uploaded','payment_qr',?,?)")
        .bind(crypto.randomUUID(), key, JSON.stringify({ mimeType: file.type, size: bytes.byteLength, activation: "pending_review" }))
    ]);
    return json({ ok: true, pendingImageUrl: "/api/admin/payment-qr-preview?key=" + encodeURIComponent(key), pendingKey: key, active: false, requiresManualVerification: true,
      message: "Ảnh QR đã tải lên nhưng CHƯA kích hoạt. Hãy kiểm tra đúng tài khoản và không có số tiền cố định trước khi xác nhận." }, 201);
  } catch {
    // Only this request's random, newly-created key is eligible for cleanup.
    // Never delete the previously pending or active QR as part of rollback.
    if (uploaded && typeof context.env.IMAGES.delete === "function") {
      try { await context.env.IMAGES.delete(key); } catch { /* preserve the original failure */ }
    }
    return fail("Không lưu được ảnh QR. QR đang hoạt động hiện tại không bị thay đổi.", 503);
  }
}
