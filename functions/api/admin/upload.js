import { fail, json, requireAdmin, storageOrFail } from "../../_lib.js";

const MAX_DERIVATIVE_BYTES = 5 * 1024 * 1024;
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_ORIGINAL_BYTES + MAX_DERIVATIVE_BYTES + 1024 * 1024;
const ORIGINAL_TYPES = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
});

// Retries happen on the server so a browser tab opened before a Preview
// deployment can continue importing without refreshing or losing edits.
// Same key + bytes within this request: repeating a put is idempotent.
async function putR2WithBackoff(binding, key, bytes, options, stage) {
  let lastError;
  for(let attempt=1;attempt<=3;attempt++) {
    try {
      await binding.put(key, bytes, options);
      return;
    } catch(error) {
      lastError=error;
      console.error("product-photo transient R2 write", {
        stage, attempt, code:String(error?.name||"R2WriteError").slice(0,80)
      });
      if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt===1?400:1100));
    }
  }
  throw lastError;
}

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

  // Large photo batches must not copy the whole 26 MB multipart body into a
  // second buffer before parsing; that can exhaust a Pages Function's memory.
  // Stream with a hard byte cap, then let the runtime parse form-data once.
  const declared=Number(context.request.headers.get("Content-Length")||0);
  if(Number.isFinite(declared)&&declared>MAX_MULTIPART_BYTES)
    return fail("Biểu mẫu tải ảnh vượt giới hạn 26 MB.",413);
  if(!context.request.body)return fail("Không đọc được tệp ảnh.");
  let exceeded=false,consumed=0,form;
  try {
    const headers=new Headers(context.request.headers);
    headers.delete("Content-Length");
    headers.delete("Transfer-Encoding");
    const limited=context.request.body.pipeThrough(new TransformStream({
      transform(chunk,controller){
        consumed+=chunk.byteLength;
        if(consumed>MAX_MULTIPART_BYTES){
          exceeded=true;
          throw new Error("photo_multipart_too_large");
        }
        controller.enqueue(chunk);
      }
    }));
    const boundedRequest=new Request(context.request.url,{
      method:"POST",headers,body:limited,duplex:"half"
    });
    form=await boundedRequest.formData();
  } catch(error) {
    if(exceeded)return fail("Biểu mẫu tải ảnh vượt giới hạn 26 MB.",413);
    console.error("product-photo form-data parsing failed",{code:String(error?.name||"InvalidMultipart").slice(0,80)});
    return fail("Không đọc được tệp ảnh. Hãy kiểm tra định dạng JPEG/PNG/WebP và tải lại ảnh này.",400);
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
    // Validate only the header. R2.put() supports Blob directly; forwarding
    // the already-parsed File avoids another 25 MB worth of ArrayBuffer copies
    // in a 128 MB Workers runtime during hundreds of consecutive uploads.
    const webpHeader = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isWebp = originalSignatureMatches(webpHeader, "image/webp");
    if (!isWebp) return fail("Nội dung tệp hiển thị không phải ảnh WebP hợp lệ.");

    const originalHeader = new Uint8Array(await original.slice(0, 12).arrayBuffer());
    if (!originalSignatureMatches(originalHeader, original.type)) {
      return fail("Nội dung ảnh gốc không khớp định dạng JPEG, PNG hoặc WebP đã khai báo.");
    }
    const id = crypto.randomUUID();
    const key = `${id}.webp`;
    const privateKey = `private-originals/${id}.${originalType}`;

    try {
      await putR2WithBackoff(context.env.ORIGINALS, privateKey, original, {
        httpMetadata: { contentType: original.type, cacheControl: "private, no-store" },
        customMetadata: { visibility: "private-original" },
      }, "original");
    } catch (error) {
      console.error("product-photo upload failure", { stage: "original", code: String(error?.name || "R2WriteError").slice(0, 80) });
      return fail("Kho ảnh gốc ORIGINALS tạm thời không ghi được. Ảnh này chưa được xác nhận lưu; hãy thử tiếp tục sau.", 503, { "Retry-After": "5" });
    }
    try {
      await putR2WithBackoff(context.env.IMAGES, key, file, {
        httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: { visibility: "public-optimized-derivative", originalKey: privateKey },
      }, "derivative");
    } catch (error) {
      try { await context.env.ORIGINALS.delete(privateKey); }
      catch (cleanupError) { console.error("product-photo rollback failed", {stage:"original-cleanup",code:String(cleanupError?.name||"R2DeleteError").slice(0,80)}); }
      console.error("product-photo upload failure", { stage: "derivative", code: String(error?.name || "R2WriteError").slice(0, 80) });
      return fail("Kho ảnh hiển thị IMAGES tạm thời không ghi được. Đã cố gắng dọn ảnh gốc của lượt tải lỗi; hãy thử tiếp tục sau.", 503, { "Retry-After": "5" });
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
