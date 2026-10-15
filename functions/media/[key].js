import { fail, storageOrFail } from "../_lib.js";

export async function onRequestGet({ params, env }) {
  const noStorage = storageOrFail(env);
  if (noStorage) return noStorage;
  const key = String(params.key || "");
  if (!/^[A-Za-z0-9-]{30,40}\.webp$/.test(key)) return fail("Ảnh không hợp lệ.", 404);
  try {
    const object = await env.IMAGES.get(key);
    if (!object) return fail("Không tìm thấy ảnh.", 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "image/webp");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  } catch { return fail("Không thể đọc ảnh từ R2.", 503); }
}
