import { fail, requireAdmin, storageOrFail } from "../../_lib.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;
  const reviewId = new URL(context.request.url).searchParams.get("reviewId") || "";
  if (!/^[0-9a-f-]{36}$/i.test(reviewId)) return fail("Mã ảnh ứng viên không hợp lệ.", 400);
  if (!context.env.DB) return fail("Không thể xác minh trạng thái ảnh ứng viên.", 503);

  let review;
  try {
    review = await context.env.DB.prepare(
      "SELECT image_kind,status,r2_key,image_ref FROM image_ai_reviews WHERE id=? LIMIT 1"
    ).bind(reviewId).first();
  } catch {
    return fail("Không thể đọc trạng thái ảnh ứng viên.", 503);
  }
  if (!review || review.image_kind !== "candidate" ||
      !/^[0-9a-f-]{36}-ai\.webp$/i.test(review.r2_key || "") ||
      review.image_ref !== "/media/" + review.r2_key) {
    return fail("Không tìm thấy ảnh ứng viên.", 404);
  }

  try {
    const object = await context.env.IMAGES.get(review.r2_key);
    if (!object) return fail("Không tìm thấy tệp ảnh trong R2.", 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "image/webp");
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Vary", "Cookie");
    return new Response(object.body, { status: 200, headers });
  } catch {
    return fail("Không thể đọc ảnh ứng viên từ R2.", 503);
  }
}
