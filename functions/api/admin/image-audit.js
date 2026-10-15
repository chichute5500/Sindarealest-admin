import { fail, json, requireAdmin, storageOrFail } from "../../_lib.js";
import { analyzeProductImage, compareProductImages } from "../../_lib/workers-ai.js";
import { isAllowedSourceImageUrl, isAllowedSourceProductUrl, normalizeImageRef } from "../../_lib/image-audit.js";
import { consumeWorkersAiRequest } from "../../_lib/ai-quota.js";
import { inspectAiReviewSchema } from "../../_lib/ai-review-schema.js";

const MAX_BASE64 = 7_000_000;
const allowedMime = new Set(["image/webp", "image/jpeg", "image/png"]);

function safeReview(row) {
  let analysis = {};
  try { analysis = JSON.parse(row.analysis_json || "{}"); } catch {}
  return { id: row.id, productId: row.product_id, imageRef: row.image_ref, kind: row.image_kind, status: row.status, analysis, sourceUrl: row.source_url || "", sourceImageUrl: row.source_image_url || "", referenceImageRef: row.reference_image_ref || "", createdAt: row.created_at, updatedAt: row.updated_at };
}
function parseDataImage(value) {
  const match = String(value || "").match(/^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match || !allowedMime.has(match[1].toLowerCase()) || match[2].length > MAX_BASE64) return null;
  const mimeType = match[1].toLowerCase();
  const base64 = match[2];
  let binary;
  try { binary = atob(base64); } catch { return null; }
  if (!binary.length) return null;
  if (binary.length > 5 * 1024 * 1024) return { error: "Ảnh phải nhỏ hơn hoặc bằng 5 MB.", status: 413 };
  const isJpeg = mimeType === "image/jpeg" && binary.length >= 3 &&
    binary.charCodeAt(0) === 0xff && binary.charCodeAt(1) === 0xd8 && binary.charCodeAt(2) === 0xff;
  const isPng = mimeType === "image/png" && binary.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => binary.charCodeAt(i) === byte);
  const isWebp = mimeType === "image/webp" && binary.length >= 12 &&
    binary.slice(0, 4) === "RIFF" && binary.slice(8, 12) === "WEBP";
  if (!isJpeg && !isPng && !isWebp) return null;
  return { mimeType, base64 };
}
async function getProduct(db, id) {
  return db.prepare("SELECT id,sku,title,category,images_json,published FROM products WHERE id=? LIMIT 1").bind(id).first();
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const schemaReadiness = await inspectAiReviewSchema(context.env.DB);
  if (!schemaReadiness.reviewSchemaInspectable) {
    return json({ ok: false, code: "AI_REVIEW_SCHEMA_UNREADABLE", error: "Không thể đọc schema hàng chờ ảnh AI trong D1." }, 503);
  }
  if (!schemaReadiness.reviewSchemaConfigured || !schemaReadiness.quotaTableConfigured) {
    return json({
      ok: false,
      code: !schemaReadiness.quotaTableConfigured ? "AI_QUOTA_SCHEMA_MISSING" : "AI_REVIEW_SCHEMA_INCOMPLETE",
      error: !schemaReadiness.quotaTableConfigured
        ? "Thiếu bảng giới hạn AI D1."
        : "Schema hàng chờ ảnh AI thiếu cột: " + schemaReadiness.missingReviewColumns.join(", ") + ".",
      missingColumns: schemaReadiness.missingReviewColumns
    }, 503);
  }
  try {
    const [products, reviews] = await Promise.all([
      context.env.DB.prepare("SELECT id,sku,title,category,images_json,published FROM products ORDER BY sort_order,sku LIMIT 2000").all(),
      context.env.DB.prepare("SELECT * FROM image_ai_reviews ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, updated_at DESC LIMIT 2000").all()
    ]);
    return json({ ok: true, products: products.results || [], reviews: (reviews.results || []).map(safeReview) });
  } catch {
    return fail("Không tải được hàng đợi AI. Hãy kiểm tra migration 0007, cột source_url, migration 0009 và các cột bổ sung source_image_url/reference_image_ref (được đồng bộ bởi scripts/apply-ai-image-migrations.mjs) trên đúng D1 của môi trường này.", 503);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  // Keep all writes/model calls disabled until every required D1 column and
  // the quota table can be verified by a read-only preflight.
  const schemaReadiness = await inspectAiReviewSchema(context.env.DB);
  if (!schemaReadiness.reviewSchemaInspectable) {
    return json({ ok: false, code: "AI_REVIEW_SCHEMA_UNREADABLE", error: "Không thể đọc schema hàng chờ ảnh AI trong D1. Đã chặn thao tác." }, 503);
  }
  if (!schemaReadiness.reviewSchemaConfigured || !schemaReadiness.quotaTableConfigured) {
    return json({
      ok: false,
      code: !schemaReadiness.quotaTableConfigured ? "AI_QUOTA_SCHEMA_MISSING" : "AI_REVIEW_SCHEMA_INCOMPLETE",
      error: !schemaReadiness.quotaTableConfigured
        ? "Thiếu bảng giới hạn AI D1. Đã chặn thao tác."
        : "Schema hàng chờ ảnh AI thiếu cột: " + schemaReadiness.missingReviewColumns.join(", ") + ". Đã chặn thao tác.",
      missingColumns: schemaReadiness.missingReviewColumns
    }, 503);
  }
  let body;
  try { body = await context.request.json(); } catch { return fail("Dữ liệu ảnh không hợp lệ."); }
  const action = String(body?.action || "");
  const db = context.env.DB;
  if (!["analyze", "uploadCandidate", "compareCandidate"].includes(action)) return fail("Thao tác AI không hợp lệ.");
  const productId = String(body?.productId || "").slice(0, 100);
  const product = await getProduct(db, productId).catch(() => null);
  if (!product) return fail("Không tìm thấy sản phẩm.", 404);

  if (action === "uploadCandidate") {
    const noStorage = storageOrFail(context.env);
    if (noStorage) return noStorage;
    const sourceUrl = String(body?.sourceUrl || "").trim();
    const sourceImageUrl = String(body?.sourceImageUrl || "").trim();
    const referenceImageRef = normalizeImageRef(body?.referenceImageRef || "");
    if (sourceUrl && !isAllowedSourceProductUrl(sourceUrl)) return fail("URL sản phẩm nguồn phải là đường dẫn HTTPS hợp lệ của Taobao, Tmall hoặc 1688.", 400);
    if (sourceImageUrl && !isAllowedSourceImageUrl(sourceImageUrl)) return fail("URL ảnh nguồn phải trỏ tới CDN ảnh HTTPS được phép.", 400);
    if (Boolean(sourceUrl) !== Boolean(sourceImageUrl)) return fail("Cần lưu cả trang sản phẩm nguồn và URL ảnh gốc, hoặc để trống cả hai khi tải ảnh thủ công.", 400);
    let originalImages = [];
    try { originalImages = JSON.parse(product.images_json || "[]"); } catch {}
    if (referenceImageRef && (!Array.isArray(originalImages) || !originalImages.some(ref => normalizeImageRef(ref) === referenceImageRef))) {
      return fail("Ảnh gốc tham chiếu không thuộc sản phẩm đã chọn.", 422);
    }
    if (sourceUrl && !referenceImageRef) return fail("Thiếu ảnh gốc được dùng để tìm ứng viên.", 422);
    const parsed = parseDataImage(body?.dataUrl);
    if (parsed?.error) return fail(parsed.error, parsed.status);
    if (!parsed || parsed.mimeType !== "image/webp") return fail("Ảnh ứng viên phải là WebP hợp lệ.");
    let bytes;
    try { bytes = Uint8Array.from(atob(parsed.base64), c => c.charCodeAt(0)); }
    catch { return fail("Nội dung base64 của ảnh không hợp lệ.", 400); }
    if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) return fail("Ảnh phải nhỏ hơn hoặc bằng 5 MB.", 413);
    if (bytes.length < 12 || new TextDecoder().decode(bytes.slice(0,4)) !== "RIFF" || new TextDecoder().decode(bytes.slice(8,12)) !== "WEBP") return fail("Nội dung tệp không phải WebP.");
    const key = crypto.randomUUID() + "-ai.webp";
    const imageRef = "/media/" + key;
    const id = crypto.randomUUID();
    try {
      await context.env.IMAGES.put(key, bytes, { httpMetadata: { contentType: "image/webp", cacheControl: "private, no-store" }, customMetadata: { visibility: "pending-ai-review", reviewId: id } });
      await db.prepare("INSERT INTO image_ai_reviews(id,product_id,image_ref,image_kind,r2_key,status,analysis_json,source_url,source_image_url,reference_image_ref) VALUES(?,?,?,'candidate',?,'pending','{}',?,?,?)").bind(id, productId, imageRef, key, sourceUrl, sourceImageUrl, referenceImageRef).run();
      return json({ ok: true, review: { id, productId, imageRef, kind: "candidate", status: "pending", analysis: {}, sourceUrl, sourceImageUrl, referenceImageRef }, message: "Đã tải tệp ảnh thật vào hàng chờ. Ảnh chưa được thêm vào bộ ảnh công khai." }, 201);
    } catch {
      await context.env.IMAGES.delete(key).catch(() => {});
      return fail("Không lưu được ảnh chờ duyệt. Kiểm tra D1 và R2.", 503);
    }
  }

  if (action === "compareCandidate") {
    const reviewId = String(body?.reviewId || "");
    const review = await db.prepare("SELECT * FROM image_ai_reviews WHERE id=? AND product_id=? LIMIT 1").bind(reviewId, productId).first().catch(() => null);
    if (!review || review.image_kind !== "candidate") return fail("Ảnh ứng viên không thuộc sản phẩm đã chọn.", 404);
    if (review.status !== "pending") return fail("Chỉ được đối chiếu ảnh đang chờ duyệt.", 409);
    const referenceImageRef = normalizeImageRef(body?.referenceImageRef || review.reference_image_ref || "");
    const storedReference = normalizeImageRef(review.reference_image_ref || "");
    let originalImages = [];
    try { originalImages = JSON.parse(product.images_json || "[]"); } catch {}
    if (!referenceImageRef || (storedReference && storedReference !== referenceImageRef) ||
        !Array.isArray(originalImages) || !originalImages.some(ref => normalizeImageRef(ref) === referenceImageRef)) {
      return fail("Ảnh gốc đối chiếu không khớp ảnh tham chiếu đã lưu hoặc không thuộc sản phẩm này.", 422);
    }
    const parsed = parseDataImage(body?.dataUrl);
    if (parsed?.error) return fail(parsed.error, parsed.status);
    if (!parsed || parsed.mimeType !== "image/webp") return fail("Ảnh ghép đối chiếu phải là WebP hợp lệ.", 400);
    if (!context.env.AI || typeof context.env.AI.run !== "function") {
      return json({ ok: false, error: "Chưa cấu hình binding Workers AI có tên AI cho môi trường này. Không tiêu hao quota khi thiếu binding.", code: "WORKERS_AI_BINDING_MISSING" }, 503);
    }
    const quota = await consumeWorkersAiRequest(db);
    if (!quota.ok) return fail(quota.error, quota.status);
    const result = await compareProductImages({ ai: context.env.AI, imageBase64: parsed.base64, mimeType: parsed.mimeType, title: product.title, sku: product.sku });
    if (result.error) return json({ ok: false, error: result.error, code: result.code || "WORKERS_AI_ERROR" }, result.status || 503);
    let priorAnalysis = {};
    try { priorAnalysis = JSON.parse(review.analysis_json || "{}"); } catch {}
    const nextAnalysis = { ...priorAnalysis, comparison: {
      verdict: result.verdict, similarities: result.similarities, differences: result.differences,
      confidence: result.confidence, summary: result.summary, needsHumanReview: true,
      calibrated: false, method: result.comparisonMethod, model: result.model
    } };
    try {
      await db.prepare("UPDATE image_ai_reviews SET analysis_json=?,updated_at=datetime('now') WHERE id=? AND product_id=? AND image_kind='candidate' AND status='pending'").bind(JSON.stringify(nextAnalysis), reviewId, productId).run();
      return json({ ok: true, comparison: nextAnalysis.comparison, message: "AI đã đối chiếu định tính hai ảnh. Kết quả không phải điểm tương đồng đã hiệu chuẩn và không tự duyệt ảnh." });
    } catch {
      return fail("Không lưu được kết quả đối chiếu AI.", 503);
    }
  }

  const reviewId = String(body?.reviewId || "");
  const review = await db.prepare("SELECT * FROM image_ai_reviews WHERE id=? AND product_id=? LIMIT 1").bind(reviewId, productId).first().catch(() => null);
  const imageRef = String(body?.imageRef || review?.image_ref || "");
  const parsed = parseDataImage(body?.dataUrl);
  if (parsed?.error) return fail(parsed.error, parsed.status);
  if (!parsed) return fail("Ảnh gửi Workers AI không hợp lệ.");

  // Validate ownership and review state before spending any AI quota or sending image bytes upstream.
  const kind = review?.image_kind || "existing";
  const storedRef = kind === "candidate" ? String(review?.image_ref || "") : imageRef;
  if (!storedRef || storedRef.length > 300) return fail("Thiếu tham chiếu ảnh cần kiểm tra.");
  if (kind === "candidate" && review?.status !== "pending") {
    return fail("Chỉ được phân tích ảnh ứng viên đang chờ duyệt. Ảnh đã duyệt/từ chối cần tạo ứng viên mới nếu muốn kiểm tra lại.", 409);
  }
  if (kind === "existing") {
    let ownedImages = [];
    try { ownedImages = JSON.parse(product.images_json || "[]"); } catch {}
    if (!Array.isArray(ownedImages) || !ownedImages.some(ref => normalizeImageRef(ref) === normalizeImageRef(storedRef))) {
      return fail("Ảnh cần phân tích không thuộc bộ ảnh của sản phẩm đã chọn.", 422);
    }
  }

  if (!context.env.AI || typeof context.env.AI.run !== "function") {
    return json({ ok: false, error: "Chưa cấu hình binding Workers AI có tên AI cho môi trường này. Không tiêu hao quota khi thiếu binding.", code: "WORKERS_AI_BINDING_MISSING" }, 503);
  }
  const quota = await consumeWorkersAiRequest(db);
  if (!quota.ok) return fail(quota.error, quota.status);
  const result = await analyzeProductImage({ ai: context.env.AI, imageBase64: parsed.base64, mimeType: parsed.mimeType, title: product.title, category: product.category, sku: product.sku });
  if (result.error) return json({ ok: false, error: result.error, code: result.code || "WORKERS_AI_ERROR" }, result.status || 503);
  const id = review?.id || crypto.randomUUID();
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
  // Approval/rejection writes must also fail closed when the queue schema is partial.
  const schemaReadiness = await inspectAiReviewSchema(context.env.DB);
  if (!schemaReadiness.reviewSchemaInspectable) {
    return json({ ok: false, code: "AI_REVIEW_SCHEMA_UNREADABLE", error: "Không thể đọc schema hàng chờ ảnh AI trong D1. Đã chặn thao tác duyệt." }, 503);
  }
  if (!schemaReadiness.reviewSchemaConfigured || !schemaReadiness.quotaTableConfigured) {
    return json({
      ok: false,
      code: !schemaReadiness.quotaTableConfigured ? "AI_QUOTA_SCHEMA_MISSING" : "AI_REVIEW_SCHEMA_INCOMPLETE",
      error: !schemaReadiness.quotaTableConfigured
        ? "Thiếu bảng giới hạn AI D1. Đã chặn thao tác duyệt."
        : "Schema hàng chờ ảnh AI thiếu cột: " + schemaReadiness.missingReviewColumns.join(", ") + ". Đã chặn thao tác duyệt.",
      missingColumns: schemaReadiness.missingReviewColumns
    }, 503);
  }
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
        const statements = [db.prepare("UPDATE image_ai_reviews SET status='rejected',updated_at=datetime('now') WHERE id=?").bind(id)];
        if (next.length !== images.length) statements.push(db.prepare("UPDATE products SET images_json=?,updated_at=datetime('now') WHERE id=?").bind(JSON.stringify(next), product.id));
        await db.batch(statements);
      } else {
        await db.prepare("UPDATE image_ai_reviews SET status='rejected',updated_at=datetime('now') WHERE id=?").bind(id).run();
      }
      if (review.r2_key && review.r2_key.endsWith("-ai.webp") && review.image_ref === "/media/" + review.r2_key) {
        await context.env.IMAGES?.delete(review.r2_key).catch(() => {});
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
  if (review.status === "rejected") return fail("Ảnh đã bị từ chối; hãy tải lại như một ứng viên mới nếu muốn xem xét lại.", 409);
  let candidateAnalysis = {};
  try { candidateAnalysis = JSON.parse(review.analysis_json || "{}"); } catch {}
  if (!candidateAnalysis.comparison || candidateAnalysis.comparison.needsHumanReview !== true) {
    return fail("Cần chạy đối chiếu hai ảnh trước khi duyệt. Đối chiếu hiện vẫn là định tính, chưa chứng minh ngưỡng tương đồng 90%; hãy kiểm tra trực tiếp ảnh, SKU và URL nguồn.", 422);
  }
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
