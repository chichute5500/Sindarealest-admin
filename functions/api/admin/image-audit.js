import { fail, json, requireAdmin, storageOrFail } from "../../_lib.js";
import { analyzeProductImage } from "../../_lib/workers-ai.js";
import { consumeWorkersAiRequest } from "../../_lib/ai-quota.js";

const MAX_BASE64 = 7_000_000;
const allowedMime = new Set(["image/webp", "image/jpeg", "image/png"]);

function safeReview(row) {
  let analysis = {};
  try { analysis = JSON.parse(row.analysis_json || "{}"); } catch {}
  return { id: row.id, productId: row.product_id, imageRef: row.image_ref, kind: row.image_kind, status: row.status, analysis, sourceUrl: row.source_url || "", createdAt: row.created_at, updatedAt: row.updated_at };
}
function parseDataImage(value) {
  const match = String(value || "").match(/^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match || !allowedMime.has(match[1].toLowerCase()) || match[2].length > MAX_BASE64) return null;
  return { mimeType: match[1].toLowerCase(), base64: match[2] };
}
async function getProduct(db, id) {
  return db.prepare("SELECT id,sku,title,category,images_json,published FROM products WHERE id=? LIMIT 1").bind(id).first();
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  try {
    const [products, reviews] = await Promise.all([
      context.env.DB.prepare("SELECT id,sku,title,category,images_json,published FROM products ORDER BY sort_order,sku LIMIT 2000").all(),
      context.env.DB.prepare("SELECT * FROM image_ai_reviews ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, updated_at DESC LIMIT 2000").all()
    ]);
    return json({ ok: true, products: products.results || [], reviews: (reviews.results || []).map(safeReview) });
  } catch {
    return fail("Không tải được hàng đợi AI. Hãy kiểm tra đã áp dụng migrations/0007_ai_image_reviews.sql và 0008_ai_image_source_url.sql trên môi trường này chưa.", 503);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return fail("Dữ liệu ảnh không hợp lệ."); }
  const action = String(body?.action || "");
  const db = context.env.DB;
  if (!["analyze", "uploadCandidate"].includes(action)) return fail("Thao tác AI không hợp lệ.");
  const productId = String(body?.productId || "").slice(0, 100);
  const product = await getProduct(db, productId).catch(() => null);
  if (!product) return fail("Không tìm thấy sản phẩm.", 404);

  if (action === "uploadCandidate") {
    const noStorage = storageOrFail(context.env);
    if (noStorage) return noStorage;
    const parsed = parseDataImage(body?.dataUrl);
    if (!parsed || parsed.mimeType !== "image/webp") return fail("Ảnh ứng viên phải là WebP hợp lệ.");
    const bytes = Uint8Array.from(atob(parsed.base64), c => c.charCodeAt(0));
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return fail("Ảnh phải nhỏ hơn hoặc bằng 5 MB.", 413);
    if (bytes.length < 12 || new TextDecoder().decode(bytes.slice(0,4)) !== "RIFF" || new TextDecoder().decode(bytes.slice(8,12)) !== "WEBP") return fail("Nội dung tệp không phải WebP.");
    const key = crypto.randomUUID() + "-ai.webp";
    const imageRef = "/media/" + key;
    const id = crypto.randomUUID();
    try {
      await context.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" }, customMetadata: { visibility: "pending-ai-review", reviewId: id } });
      await db.prepare("INSERT INTO image_ai_reviews(id,product_id,image_ref,image_kind,r2_key,status,analysis_json) VALUES(?,?,?,'candidate',?,'pending','{}')").bind(id, productId, imageRef, key).run();
      return json({ ok: true, review: { id, productId, imageRef, kind: "candidate", status: "pending", analysis: {} }, message: "Đã đưa ảnh vào hàng đợi kiểm duyệt. Ảnh chưa được thêm vào bộ ảnh công khai." }, 201);
    } catch {
      await context.env.IMAGES.delete(key).catch(() => {});
      return fail("Không lưu được ảnh chờ duyệt. Kiểm tra D1 và R2.", 503);
    }
  }

  const reviewId = String(body?.reviewId || "");
  const review = await db.prepare("SELECT * FROM image_ai_reviews WHERE id=? AND product_id=? LIMIT 1").bind(reviewId, productId).first().catch(() => null);
  const imageRef = String(body?.imageRef || review?.image_ref || "");
  const parsed = parseDataImage(body?.dataUrl);
  if (!parsed) return fail("Ảnh gửi Workers AI không hợp lệ.");
  if (review?.image_kind === "candidate" && review.status === "approved") return fail("Ảnh đã được duyệt; tạo lượt kiểm tra mới nếu cần.", 409);
  const quota = await consumeWorkersAiRequest(db);
  if (!quota.ok) return fail(quota.error, quota.status);
  const result = await analyzeProductImage({ ai: context.env.AI, imageBase64: parsed.base64, mimeType: parsed.mimeType, title: product.title, category: product.category, sku: product.sku });
  if (result.error) return json({ ok: false, error: result.error, code: result.code || "WORKERS_AI_ERROR" }, result.status || 503);
  const id = review?.id || crypto.randomUUID();
  const kind = review?.image_kind || "existing";
  const storedRef = kind === "candidate" ? review.image_ref : imageRef;
  if (!storedRef || storedRef.length > 300) return fail("Thiếu tham chiếu ảnh cần kiểm tra.");
  try {
    await db.prepare("INSERT INTO image_ai_reviews(id,product_id,image_ref,image_kind,r2_key,status,analysis_json) VALUES(?,?,?,?,?,'pending',?) ON CONFLICT(product_id,image_ref,image_kind) DO UPDATE SET id=excluded.id,status='pending',analysis_json=excluded.analysis_json,updated_at=datetime('now')").bind(id, productId, storedRef, kind, review?.r2_key || "", JSON.stringify(result.analysis)).run();
    return json({ ok: true, review: { id, productId, imageRef: storedRef, kind, status: "pending", analysis: result.analysis }, message: "Workers AI đã phân tích ảnh; kết quả đang chờ người quản trị duyệt." });
  } catch {
    return fail("Không lưu được kết quả AI. Hãy kiểm tra migration 0007.", 503);
  }
}

export async function onRequestPatch(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  let body;
  try { body = await context.request.json(); } catch { return fail("Yêu cầu duyệt ảnh không hợp lệ."); }
  const id = String(body?.reviewId || "");
  const decision = String(body?.decision || "");
  if (!id || !["approve", "reject", "recheck", "saveSource"].includes(decision)) return fail("Thiếu lựa chọn duyệt ảnh hợp lệ.");
  const db = context.env.DB;
  const review = await db.prepare("SELECT * FROM image_ai_reviews WHERE id=? LIMIT 1").bind(id).first().catch(() => null);
  if (!review) return fail("Không tìm thấy bản ghi kiểm duyệt.", 404);
  if (decision === "recheck") return json({ ok: true, review: safeReview(review), message: "Hãy chạy lại phân tích Workers AI từ giao diện quản trị." });
  if (decision === "saveSource") return fail("Chưa thể lưu URL như ảnh nguồn đã xác minh: chưa có mô hình so khớp thị giác chuyên biệt đã được kiểm chứng và hiệu chuẩn ngưỡng 90%. URL tìm kiếm không phải URL sản phẩm đã xác minh.", 422);
  if (decision === "reject") {
    if (review.image_kind === "candidate") {
      const product = await getProduct(db, review.product_id);
      if (product) {
        let images = [];
        try { images = JSON.parse(product.images_json || "[]"); } catch {}
        if (!Array.isArray(images)) images = [];
        const next = images.filter(ref => ref !== review.image_ref);
        await db.batch([
          db.prepare("UPDATE image_ai_reviews SET status='rejected',updated_at=datetime('now') WHERE id=?").bind(id),
          db.prepare("UPDATE products SET images_json=?,updated_at=datetime('now') WHERE id=?").bind(JSON.stringify(next), product.id)
        ]);
      } else {
        await db.prepare("UPDATE image_ai_reviews SET status='rejected',updated_at=datetime('now') WHERE id=?").bind(id).run();
      }
    } else {
      await db.prepare("UPDATE image_ai_reviews SET status='rejected',updated_at=datetime('now') WHERE id=?").bind(id).run();
    }
    return json({ ok: true, message: "Đã từ chối ảnh. Ảnh ứng viên bị gỡ khỏi bộ ảnh công khai nếu từng được duyệt." });
  }
  if (review.image_kind !== "candidate") {
    await db.prepare("UPDATE image_ai_reviews SET status='approved',updated_at=datetime('now') WHERE id=?").bind(id).run();
    return json({ ok: true, message: "Đã xác nhận kết quả kiểm tra. Ảnh gốc hiện hữu không bị thay đổi." });
  }
  if (review.status === "approved") return json({ ok: true, message: "Ảnh này đã được duyệt trước đó." });
  const product = await getProduct(db, review.product_id);
  if (!product) return fail("Sản phẩm không còn tồn tại.", 404);
  const noStorage = storageOrFail(context.env);
  if (noStorage) return noStorage;
  if (!review.r2_key || !review.r2_key.endsWith("-ai.webp") || review.image_ref !== "/media/" + review.r2_key) return fail("Tham chiếu ảnh ứng viên không hợp lệ.", 409);
  try {
    const candidate = await context.env.IMAGES.head(review.r2_key);
    if (!candidate) return fail("Không tìm thấy tệp ảnh trong R2; chưa thể duyệt.", 404);
  } catch {
    return fail("Không thể xác minh tệp ảnh trong R2.", 503);
  }
  let images = [];
  try { images = JSON.parse(product.images_json || "[]"); } catch {}
  if (!Array.isArray(images)) images = [];
  if (!images.includes(review.image_ref) && images.length >= 30) return fail("Sản phẩm đã có 30 ảnh; hãy chỉnh bộ ảnh trước khi duyệt.");
  const next = images.includes(review.image_ref) ? images : [...images, review.image_ref];
  try {
    await db.batch([
      db.prepare("UPDATE products SET images_json=?,updated_at=datetime('now') WHERE id=?").bind(JSON.stringify(next), product.id),
      db.prepare("UPDATE image_ai_reviews SET status='approved',updated_at=datetime('now') WHERE id=?").bind(id),
      db.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'ai_image_approved', 'product', ?, ?)").bind(crypto.randomUUID(), product.id, JSON.stringify({ reviewId: id, imageRef: review.image_ref }))
    ]);
    return json({ ok: true, message: "Đã duyệt ảnh và thêm vào bộ ảnh sản phẩm. Ảnh chỉ hiển thị công khai nếu sản phẩm đang được xuất bản." });
  } catch {
    return fail("Không thể duyệt ảnh. Kiểm tra D1 và R2.", 503);
  }
}
