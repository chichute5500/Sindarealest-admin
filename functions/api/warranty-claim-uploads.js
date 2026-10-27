import { dbOrFail, fail, getCurrentDateInVietnam, isWarrantyEligibleOnDate, json, rateLimitPublicRequest, readBodyBytesLimited, storageOrFail } from "../_lib.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 1024 * 1024;
import { isWarrantyCode } from "../_warranty-policy.js";


export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return fail("Yêu cầu không hợp lệ.", 403);
      }
    } catch {
      return fail("Yêu cầu không hợp lệ.", 403);
    }
  }

  const unavailable = dbOrFail(env);
  if (unavailable) return unavailable;
  const noStorage = storageOrFail(env);
  if (noStorage) return noStorage;
  if (!env.ORIGINALS) {
    return fail("Kho ảnh bảo hành riêng tư chưa được cấu hình. Hãy gắn R2 binding ORIGINALS trước khi tải ảnh.", 503);
  }

  try {
    const limit = await rateLimitPublicRequest(env, request, "warranty_claim_upload", 3, 900);
    if (limit.limited) {
      return fail("Bạn đã tải lên quá nhiều ảnh. Vui lòng đợi.", 429, { "Retry-After": "900" });
    }
  } catch {
    return fail("Dịch vụ tải ảnh chưa sẵn sàng.", 503);
  }

  const parsedMultipart = await readBodyBytesLimited(request, MAX_MULTIPART_BYTES);
  if (parsedMultipart.error === "too_large") return fail("Biểu mẫu tải ảnh vượt quá giới hạn 6 MB.", 413);
  if (parsedMultipart.error) return fail("Không đọc được biểu mẫu ảnh.");

  let form;
  try {
    const headers = new Headers(request.headers);
    headers.delete("Content-Length");
    headers.delete("Transfer-Encoding");
    const boundedRequest = new Request(request.url, {
      method: "POST",
      headers,
      body: parsedMultipart.bytes,
    });
    form = await boundedRequest.formData();
  } catch {
    return fail("Không đọc được biểu mẫu ảnh.");
  }

  const claimToken = String(form.get("claimToken") || "").trim().toLowerCase();
  if (!claimToken) return fail("Hãy tra cứu bảo hành thành công trước khi tải ảnh lên.", 403);

  let warrantyCode = String(form.get("warrantyCode") || "").trim().toUpperCase();
  let tokenWarrantyId = "";

  if (claimToken) {
    if (!/^[0-9a-f]{32}$/.test(claimToken)) return fail("Phiên tra cứu không hợp lệ.", 400);
    try {
      const tokenRow = await env.DB.prepare(
        "SELECT value FROM settings WHERE key=? AND julianday(updated_at)>julianday('now','-15 minutes') LIMIT 1",
      ).bind("warranty_lookup:" + claimToken).first();
      let tokenData;
      try { tokenData = JSON.parse(tokenRow?.value || "{}"); } catch {}
      warrantyCode = String(tokenData?.warrantyCode || "").toUpperCase();
      tokenWarrantyId = String(tokenData?.warrantyId || "");
    } catch {
      return fail("Không thể xác minh phiên tra cứu.", 503);
    }
  }

  const file = form.get("file");
  if (!isWarrantyCode(warrantyCode)) {
    return fail("Mã bảo hành hoặc phiên tra cứu không hợp lệ.");
  }
  if (!file || typeof file.arrayBuffer !== "function" || file.size <= 0 ||
      file.size > MAX_IMAGE_BYTES || file.type !== "image/webp") {
    return fail("Ảnh phải là WebP hợp lệ và không vượt quá 5 MB.");
  }

  let key = "";
  try {
    const warranty = await env.DB.prepare(
      "SELECT w.id,w.warranty_code,w.status,w.starts_at,w.ends_at FROM warranties w WHERE upper(w.warranty_code)=? LIMIT 1",
    ).bind(warrantyCode).first();
    if (!warranty || (tokenWarrantyId && String(warranty.id) !== tokenWarrantyId) ||
        !isWarrantyEligibleOnDate(warranty.status, warranty.starts_at, warranty.ends_at, getCurrentDateInVietnam())) {
      return fail("Không tìm thấy bảo hành còn hiệu lực.", 404);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 12 ||
        new TextDecoder().decode(bytes.slice(0, 4)) !== "RIFF" ||
        new TextDecoder().decode(bytes.slice(8, 12)) !== "WEBP") {
      return fail("Nội dung tệp không phải WebP hợp lệ.");
    }

    key = "warranty-claims/" + crypto.randomUUID().replaceAll("-", "") + ".webp";
    await env.ORIGINALS.put(key, bytes, {
      httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" },
      customMetadata: { visibility: "private-warranty-claim", purpose: "warranty-claim", warrantyCode },
    });

    await env.DB.prepare(
      "INSERT INTO settings(key,value,updated_at) VALUES(?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
    ).bind("warranty_upload:" + key, warrantyCode).run();

    return json({ ok: true, imageKey: key }, 201);
  } catch {
    if (key) {
      try { await env.ORIGINALS.delete(key); } catch {}
    }
    return fail("Không thể lưu ảnh lỗi. Vui lòng thử lại.", 503);
  }
}

export async function onRequestGet() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
