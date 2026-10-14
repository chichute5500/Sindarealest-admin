import { fail, storageOrFail } from "../_lib.js";

const AI_CANDIDATE_SUFFIX = "-ai.webp";

// Candidate objects remain private until an administrator explicitly approves them.
export function canServeAiCandidate(review) {
  return Boolean(review && review.image_kind === "candidate" && review.status === "approved" && review.r2_key && review.image_ref === "/media/" + review.r2_key);
}

export async function onRequestGet({ params, env }) {
  const noStorage = storageOrFail(env);
  if (noStorage) return noStorage;
  const key = String(params.key || "");
  if (!/^[A-Za-z0-9-]{30,40}\.webp$/.test(key)) return fail("Ảnh không hợp lệ.", 404);

  // Fail closed: pending, rejected, missing records, or DB errors cannot expose candidate files.
  if (key.endsWith(AI_CANDIDATE_SUFFIX)) {
    if (!env.DB) return fail("Không thể xác minh trạng thái duyệt ảnh.", 503);
    let review;
    try {
      review = await env.DB.prepare("SELECT image_kind,status,r2_key,image_ref FROM image_ai_reviews WHERE r2_key=? LIMIT 1").bind(key).first();
    } catch {
      return fail("Không thể xác minh trạng thái duyệt ảnh.", 503);
    }
    if (!canServeAiCandidate(review)) return fail("Ảnh chưa được duyệt công khai.", 404);
  }

  try {
    const object = await env.IMAGES.get(key);
    if (!object) return fail("Không tìm thấy ảnh.", 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "image/webp");
    // Candidate approval can be revoked; never cache these URLs in browsers/CDNs.
    headers.set("Cache-Control", key.endsWith(AI_CANDIDATE_SUFFIX) ? "private, no-store" : "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  } catch {
    return fail("Không thể đọc ảnh từ R2.", 503);
  }
}
