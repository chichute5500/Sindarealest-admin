import { fail, requireAdmin, storageOrFail } from "../../_lib.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;

  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;

  const key = String(new URL(context.request.url).searchParams.get("key") || "");
  if (!/^warranty-claims\/[0-9a-f]{32}\.webp$/.test(key)) {
    return fail("Ảnh đính kèm không hợp lệ.", 404);
  }

  try {
    const row = await context.env.DB.prepare(
      "SELECT image_key FROM warranty_claim_attachments WHERE image_key=? LIMIT 1",
    ).bind(key).first();
    if (!row) return fail("Không tìm thấy ảnh đính kèm.", 404);

    // New attachments live in the private ORIGINALS bucket.
    // Fall back to IMAGES only for legacy attachments created before this fix.
    let object = null;
    // A failed private-bucket read is a service error, not proof the legacy
    // object is missing. Never silently substitute a public object after a
    // private R2 outage; the outer handler returns a safe 503 instead.
    if (context.env.ORIGINALS) object = await context.env.ORIGINALS.get(key);
    if (!object) object = await context.env.IMAGES.get(key);
    if (!object) return fail("Không tìm thấy ảnh đính kèm.", 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "image/webp");
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Disposition", 'inline; filename="warranty-claim.webp"');
    return new Response(object.body, { headers });
  } catch {
    return fail("Không thể đọc ảnh đính kèm.", 503);
  }
}

export async function onRequestPost() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
