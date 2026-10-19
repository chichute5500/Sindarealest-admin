import { fail, json, readBodyBytesLimited, requireAdmin, storageOrFail } from "../../_lib.js";

const MAX_DERIVATIVE_BYTES = 5 * 1024 * 1024;
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_ORIGINAL_BYTES + MAX_DERIVATIVE_BYTES + 1024 * 1024;
const ORIGINAL_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

function originalSignatureMatches(bytes, contentType) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;
  if (!context.env.ORIGINALS) {
    return fail("Kho ảnh gốc chưa được cấu hình. Hãy gắn R2 bucket riêng tư bằng binding ORIGINALS trước khi tải ảnh sản phẩm mới lên.", 503);
  }

  const parsedMultipart = await readBodyBytesLimited(context.request, MAX_MULTIPART_BYTES);
  if (parsedMultipart.error === "too_large") return fail("Biểu mẫu tải ảnh vượt giới hạn 26 MB.", 413);
  if (parsedMultipart.error) return fail("Không đọc được tệp ảnh.");

  let form;
  try {
    const headers = new Headers(context.request.headers);
    headers.delete("Content-Length");
    headers.delete("Transfer-Encoding");
    const boundedRequest = new Request(context.request.url, {
      method: "POST",
      headers,
      body: parsedMultipart.bytes,
    });
    form = await boundedRequest.formData();
  } catch {
    return fail("Không đọc được tệp ảnh.");
  }
  if (form.get("zipImport") === "1" && context.env.ZIP_IMPORT_ENABLED !== "1") {
    return fail("Nhập ZIP chưa được bật trong môi trường cách ly.", 403);
  }
  const file = form.get("file");
  const original = form.get("original");

  if (!file || typeof file.arrayBuffer !== "function") return fail("Chưa chọn ảnh.");
  if (file.size <= 0 || file.size > MAX_DERIVATIVE_BYTES) return fail("Ảnh hiển thị sau tối ưu phải nhỏ hơn hoặc bằng 5 MB.");
  if (file.type !== "image/webp") return fail("Ảnh hiển thị cần được tối ưu sang WebP trong trình duyệt.");

  if (!original || typeof original.arrayBuffer !== "function") return fail("Thiếu tệp ảnh gốc cần lưu riêng tư.");
  if (original.size <= 0 || original.size > MAX_ORIGINAL_BYTES) return fail("Ảnh gốc phải nhỏ hơn hoặc bằng 20 MB.");
  const originalType = ORIGINAL_TYPES[original.type];
  if (!originalType) return fail("Ảnh gốc cần là JPEG, PNG hoặc WebP.");

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isWebp = bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!isWebp) return fail("Nội dung tệp hiển thị không phải ảnh WebP hợp lệ.");

    const originalBytes = new Uint8Array(await original.arrayBuffer());
    if (!originalSignatureMatches(originalBytes, original.type)) {
      return fail("Nội dung ảnh gốc không khớp định dạng JPEG, PNG hoặc WebP đã khai báo.");
    }
    const id = crypto.randomUUID();
    const key = `${id}.webp`;
    const privateKey = `private-originals/${id}.${originalType}`;

    await context.env.ORIGINALS.put(privateKey, originalBytes, {
      httpMetadata: { contentType: original.type, cacheControl: "private, no-store" },
      customMetadata: { visibility: "private-original" },
    });
    try {
      await context.env.IMAGES.put(key, bytes, {
        httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { visibility: "public-optimized-derivative", originalKey: privateKey },
      });
    } catch (error) {
      try { await context.env.ORIGINALS.delete(privateKey); } catch {}
      throw error;
    }

    return json({
      ok: true,
      url: `/media/${key}`,
      originalStoredPrivately: true,
      message: "Đã lưu ảnh gốc vào bucket riêng tư và tạo bản WebP hiển thị chưa đóng dấu.",
    }, 201);
  } catch {
    return fail("Tải ảnh thất bại. Hãy kiểm tra bindings IMAGES và ORIGINALS rồi thử lại.", 503);
  }
}
