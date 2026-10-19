import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";
import { encodeAIIdentityRationale, parseAIIdentityRationale, stripAIIdentityRationale, verifyIdentityGroup, normalizeIdentityDescriptor, isIdentityDescriptorValid } from "../../_lib/image-identity.js";

const MAX_BODY = 2 * 1024 * 1024;
const KEY_MAX = 1024;
// Groups contain at most eight images so AI can issue a verdict for every unordered pair.
// Bound one transactional insert batch well below the D1 statement count ceiling.
const MAX_PROPOSAL_BATCH_STATEMENTS = 900;
const KEY_CONTROL = /[\u0000-\u001f\u007f]/;
const validKey = value => typeof value === "string" && value.length > 0 && value.length <= KEY_MAX && !KEY_CONTROL.test(value);
const safeError = error => String(error?.message || error || "Unknown image grouping error").replace(/[\r\n]+/g, " ").slice(0, 200);

const GROUPABLE_CATEGORIES = new Set(["sneaker","loafer","dress_shoe","boot","sandal","belt","wallet","watch_strap","watch","bag","other"]);
function parseGroupableFeatures(row) {
  let features;
  try { features = JSON.parse(row?.features_json || "{}"); } catch { return null; }
  if (!features || typeof features !== "object" || Array.isArray(features)) return null;
  const category = String(features.category || "").toLowerCase();
  const confidence = features.categoryConfidence;
  const identityDescriptor = normalizeIdentityDescriptor(features.identityDescriptor);
  const validVector = (value, length) => Array.isArray(value) && value.length === length &&
    value.every(number => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 1);
  if (!GROUPABLE_CATEGORIES.has(category) ||
      features.categoryStatus !== "classified" ||
      !Number.isInteger(confidence) || confidence < 70 || confidence > 100 ||
      !isIdentityDescriptorValid(identityDescriptor) ||
      !validVector(features.shape, 64) || !validVector(features.colors, 12) ||
      !/^[0-9a-f]{64}$/i.test(String(features.contentHash || "")) ||
      !/^[0-9a-f]{16}$/i.test(String(row?.p_hash || ""))) return null;
  return { ...features, identityDescriptor, category };
}
function compareIndexedRows(left, right) {
  const a = parseGroupableFeatures(left), b = parseGroupableFeatures(right);
  if (!a || !b || a.category !== b.category) return { match: false, score: 0, reason: "classification_gate" };
  if (a.contentHash.toLowerCase() === b.contentHash.toLowerCase()) return { match: false, score: 100, exactDuplicate: true, reason: "exact_duplicate" };
  const hashA = String(left.p_hash).toLowerCase(), hashB = String(right.p_hash).toLowerCase();
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    let bits = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    while (bits) { distance++; bits &= bits - 1; }
  }
  let shapeDelta = 0;
  for (let i = 0; i < 64; i++) shapeDelta += Math.abs(a.shape[i] - b.shape[i]);
  const shape = Math.max(0, Math.min(1, 1 - shapeDelta / 64));
  let colorOverlap = 0;
  for (let channel = 0; channel < 3; channel++) {
    let channelOverlap = 0;
    for (let bin = 0; bin < 4; bin++) {
      const index = channel * 4 + bin;
      channelOverlap += Math.min(a.colors[index], b.colors[index]);
    }
    colorOverlap += Math.max(0, Math.min(1, channelOverlap));
  }
  const color = colorOverlap / 3;
  const score = Math.round(((1 - distance / 64) * 0.30 + shape * 0.35 + color * 0.35) * 100);
  return { match: score >= 70 && shape >= 0.58 && color >= 0.58 && distance <= 24, score, shape, color, distance, exactDuplicate: false };
}
function validateClassifiedGroup(rows, keys) {
  if (!Array.isArray(rows) || rows.length !== keys.length || rows.length < 2) return { valid: false, reason: "missing_index" };
  const byKey = new Map(rows.map(row => [String(row.image_key), row]));
  const ordered = keys.map(key => byKey.get(key));
  const features = ordered.map(row => row && parseGroupableFeatures(row));
  if (features.some(item => !item)) return { valid: false, reason: "unconfirmed_classification" };
  const category = features[0].category;
  if (features.some(item => item.category !== category)) return { valid: false, reason: "mixed_categories" };
  return { valid: true, category, ordered };
}
function validateCandidateGroup(rows, keys) {
  const classified = validateClassifiedGroup(rows, keys);
  if (!classified.valid) return classified;
  let minimumScore = 100;
  const memberScores = classified.ordered.map(() => 100);
  for (let i = 0; i < classified.ordered.length; i++) {
    for (let j = i + 1; j < classified.ordered.length; j++) {
      const result = compareIndexedRows(classified.ordered[i], classified.ordered[j]);
      if (!result.match || result.score < 70) return { valid: false, reason: result.reason || "similarity_below_threshold" };
      minimumScore = Math.min(minimumScore, result.score);
      memberScores[i] = Math.min(memberScores[i], result.score);
      memberScores[j] = Math.min(memberScores[j], result.score);
    }
  }
  return { valid: true, category: classified.category, similarity: minimumScore, memberScores };
}


function validDescriptor(item) {
  if (!item || !validKey(item.key) || !/^[0-9a-f]{16}$/i.test(String(item.p_hash || ""))) return false;
  if (!Number.isInteger(Number(item.width)) || Number(item.width) < 1 || Number(item.width) > 100000) return false;
  if (!Number.isInteger(Number(item.height)) || Number(item.height) < 1 || Number(item.height) > 100000) return false;
  if (!Number.isFinite(Number(item.sourceSize)) || Number(item.sourceSize) < 0 || Number(item.sourceSize) > 100000000) return false;
  if (String(item.sourceUploaded || "").length > 48) return false;
  const shape = item.features?.shape, colors = item.features?.colors;
  const contentHash = String(item.features?.contentHash || "");
  return /^[0-9a-f]{64}$/i.test(contentHash) &&
    Array.isArray(shape) && shape.length === 64 &&
    shape.every(value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1) &&
    Array.isArray(colors) && colors.length === 12 &&
    colors.every(value => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1);
}

function referenceMatches(reference, key) {
  const value = String(reference || "").trim();
  if (value === key || value === "/media/" + key || value === "media/" + key || value.endsWith("/" + key)) return true;
  try {
    const pathname = decodeURIComponent(new URL(value, "https://inventory.invalid").pathname);
    return pathname === "/media/" + key || pathname.endsWith("/" + key);
  } catch { return false; }
}

async function fingerprint(keys) {
  const canonical = "visual-similarity-v1\n" + [...keys].sort().join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin({ request, env });
  if (auth.response) return auth.response;
  if (!env?.DB || !env?.IMAGES) return fail("Thiếu binding D1 DB hoặc R2 IMAGES.", 503);
  const url = new URL(request.url);
  const rawOffset = Number(url.searchParams.get("offset") || 0);
  const rawLimit = Number(url.searchParams.get("limit") || 500);
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? Math.min(rawOffset, 1000000) : 0;
  const limit = Number.isInteger(rawLimit) ? Math.max(100, Math.min(500, rawLimit)) : 500;
  const includeGroups = url.searchParams.get("includeGroups") !== "false";
  try {
    const [indexed, count, groupsResult, memberResult, reviews] = await Promise.all([
      env.DB.prepare("SELECT image_key,p_hash,features_json,width,height,source_size,source_uploaded FROM image_group_index ORDER BY image_key LIMIT ? OFFSET ?").bind(limit, offset).all(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM image_group_index").first(),
      includeGroups ? env.DB.prepare("SELECT id,fingerprint,similarity,rationale,status,product_id,created_at FROM image_group_sets WHERE status='pending' ORDER BY similarity DESC,created_at DESC LIMIT 300").all() : Promise.resolve({results:[]}),
      includeGroups ? env.DB.prepare("SELECT m.group_id,m.image_key,m.similarity FROM image_group_set_members m JOIN image_group_sets g ON g.id=m.group_id WHERE g.status='pending' AND g.id IN (SELECT id FROM image_group_sets WHERE status='pending' ORDER BY similarity DESC,created_at DESC LIMIT 300) ORDER BY m.group_id,m.similarity DESC,m.image_key").all() : Promise.resolve({results:[]}),
      includeGroups ? env.DB.prepare("SELECT id,image_a,image_b,same_product,confidence,rationale,status,product_id,created_at FROM image_group_reviews WHERE status='pending' ORDER BY created_at DESC LIMIT 100").all() : Promise.resolve({results:[]})
    ]);
    const memberMap = new Map();
    for (const member of memberResult.results || []) {
      if (!memberMap.has(member.group_id)) memberMap.set(member.group_id, []);
      memberMap.get(member.group_id).push({ key: member.image_key, similarity: Number(member.similarity) || 0 });
    }
    const groups = (groupsResult.results || []).map(group => ({
      ...group,
      similarity: Number(group.similarity) || 0,
      members: memberMap.get(group.id) || []
    }));
    return json({
      indexedImages: indexed.results || [],
      indexOffset: offset,
      indexLimit: limit,
      indexedCount: Number(count?.count || 0),
      nextIndexOffset: offset + (indexed.results || []).length < Number(count?.count || 0) ? offset + (indexed.results || []).length : null,
      groups,
      reviews: reviews.results || []
    });
  } catch (error) {
    return fail("Không thể đọc chỉ mục hoặc hàng chờ nhóm ảnh. Kiểm tra migration 0011_image_similarity_index.sql. Chi tiết: " + safeError(error), 503);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (auth.response) return auth.response;
  const env = context.env || {};
  if (!env.DB || !env.IMAGES) return fail("Thiếu binding D1 DB hoặc R2 IMAGES.", 503);
  const parsed = await readJsonBodyLimited(context.request, MAX_BODY);
  if (parsed.error === "too_large") return fail("Dữ liệu vượt giới hạn 2 MB.", 413);
  if (parsed.error || !parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) return fail("Yêu cầu không hợp lệ.", 400);
  const body = parsed.value, action = String(body.action || "");

  if (action === "invalidate-index") {
    const keys = Array.isArray(body.keys) ? body.keys : [];
    if (!keys.length || keys.length > 100 || keys.some(key => !validKey(key)) || new Set(keys).size !== keys.length) {
      return fail("Danh sách ảnh cần làm mới chỉ mục không hợp lệ (tối đa 100 mã mỗi lô).", 400);
    }
    try {
      const placeholders = keys.map(() => "?").join(",");
      const result = await env.DB.prepare("DELETE FROM image_group_index WHERE image_key IN (" + placeholders + ")").bind(...keys).run();
      return json({ ok: true, invalidated: Number(result.meta?.changes || 0), message: "Đã loại chỉ mục cũ để ảnh lỗi được thử đọc lại ở lần quét tiếp theo." });
    } catch (error) {
      return fail("Không thể loại chỉ mục ảnh lỗi: " + safeError(error), 503);
    }
  }

  if (action === "index") {
    const descriptors = Array.isArray(body.images) ? body.images : [];
    if (!descriptors.length || descriptors.length > 100 || descriptors.some(item => !validDescriptor(item))) {
      return fail("Lô chỉ mục không hợp lệ: mỗi ảnh cần hash 16 ký tự, 64 đặc trưng hình dạng và 12 giá trị màu hợp lệ (tối đa 100 ảnh/lô).", 400);
    }
    if (new Set(descriptors.map(item => item.key)).size !== descriptors.length) return fail("Lô có mã ảnh trùng nhau.", 400);
    try {
      if (typeof env.IMAGES.head === "function") {
        const present = await Promise.all(descriptors.map(item => env.IMAGES.head(item.key)));
        if (present.some(item => !item)) return fail("Có ảnh đã biến mất khỏi R2 trong khi lập chỉ mục. Hãy quét lại kho.", 409);
      }
      const statements = descriptors.map(item => {
        const rawCategory = String(item.features.category || "").toLowerCase();
        const category = GROUPABLE_CATEGORIES.has(rawCategory) || rawCategory === "unknown" ? rawCategory : "unknown";
        const rawConfidence = Number(item.features.categoryConfidence);
        const categoryConfidence = Number.isInteger(rawConfidence) && rawConfidence >= 0 && rawConfidence <= 100 ? rawConfidence : 0;
        // The server, not the browser, decides whether this indexed image is
        // eligible for grouping. Missing/weak confidence or an explicit review
        // status must never be silently upgraded to "classified".
        const identityDescriptor = normalizeIdentityDescriptor(item.features.identityDescriptor);
        const categoryStatus = GROUPABLE_CATEGORIES.has(category) &&
          item.features.categoryStatus === "classified" &&
          categoryConfidence >= 70 && isIdentityDescriptorValid(identityDescriptor) ? "classified" : "needs_review";
        return env.DB.prepare(
          "INSERT INTO image_group_index(image_key,p_hash,features_json,width,height,source_size,source_uploaded,updated_at) VALUES(?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(image_key) DO UPDATE SET p_hash=excluded.p_hash,features_json=excluded.features_json,width=excluded.width,height=excluded.height,source_size=excluded.source_size,source_uploaded=excluded.source_uploaded,updated_at=datetime('now')"
        ).bind(
          item.key, String(item.p_hash).toLowerCase(), JSON.stringify({
            shape: item.features.shape.map(Number),
            colors: item.features.colors.map(Number),
            contentHash: String(item.features.contentHash).toLowerCase(),
            identityDescriptor,
            category,
            categoryConfidence,
            categoryStatus
          }), Number(item.width), Number(item.height), Number(item.sourceSize), String(item.sourceUploaded || "")
        );
      });
      await env.DB.batch(statements);
      return json({ ok: true, indexed: descriptors.length, message: "Đã lưu chỉ mục hình ảnh cho lô hiện tại." });
    } catch (error) {
      return fail("Không thể lưu chỉ mục hình ảnh: " + safeError(error), 503);
    }
  }

  if (action === "save-groups") {
    const groups = Array.isArray(body.groups) ? body.groups : [];
    if (!groups.length || groups.length > 25) return fail("Mỗi lượt lưu cần từ 1 đến 25 nhóm đề xuất.", 400);
    let saved = 0, skipped = 0, aiVerified = 0, aiNeedsReview = 0, aiUnverified = 0;
    let aiDailyQuotaBlocked = false;
    const proposalStatements = [];
    try {
      // Normalize older pending proposals first: one image may belong to only
      // one pending set. The oldest set keeps a shared image; later sets lose it.
      const oldPending = await env.DB.prepare(
        "SELECT g.id AS group_id,g.status,g.created_at,g.rationale,m.image_key FROM image_group_sets g JOIN image_group_set_members m ON m.group_id=g.id WHERE g.status IN ('approved','pending') ORDER BY CASE g.status WHEN 'approved' THEN 0 ELSE 1 END,g.created_at ASC,g.id ASC,m.image_key ASC"
      ).all();
      const claimed = new Set();
      const membersByGroup = new Map();
      const legacyRejected = new Set();
      for (const row of oldPending.results || []) {
        // Proposals generated before category-first grouping have no trustworthy
        // Tier-1 label. Retire those pending proposals instead of showing mixed sets.
        if (row.status === "pending" && !String(row.rationale || "").includes("Tầng 1 đã phân loại ảnh vào nhóm")) {
          if (!legacyRejected.has(row.group_id)) {
            await env.DB.batch([
              env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending'").bind(row.group_id),
              env.DB.prepare("DELETE FROM image_group_image_claims WHERE group_id=? AND status='pending'").bind(row.group_id)
            ]);
            legacyRejected.add(row.group_id);
          }
          continue;
        }
        if (row.status === "pending" && !membersByGroup.has(row.group_id)) membersByGroup.set(row.group_id, []);
        if (claimed.has(row.image_key)) {
          // Preserve approved history; remove the duplicate only from pending proposals.
          if (row.status === "pending") {
            await env.DB.batch([
              env.DB.prepare("DELETE FROM image_group_set_members WHERE group_id=? AND image_key=?").bind(row.group_id, row.image_key),
              env.DB.prepare("DELETE FROM image_group_image_claims WHERE group_id=? AND image_key=? AND status='pending'").bind(row.group_id, row.image_key)
            ]);
          }
        } else {
          claimed.add(row.image_key);
          if (row.status === "pending") membersByGroup.get(row.group_id).push(row.image_key);
        }
      }
      for (const [groupId, remaining] of membersByGroup) {
        if (remaining.length < 2) {
          await env.DB.batch([
            env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending'").bind(groupId),
            env.DB.prepare("DELETE FROM image_group_image_claims WHERE group_id=? AND status='pending'").bind(groupId)
          ]);
        }
      }

      // Enforce existing product ownership on the server. Client filtering is not a security boundary.
      const submittedKeys = new Set(groups.flatMap(group => Array.isArray(group?.imageKeys) ? group.imageKeys.filter(validKey) : []));
      const ownershipByKey = new Map();
      const productRows = await env.DB.prepare("SELECT id,sku,images_json FROM products").all();
      for (const product of productRows.results || []) {
        let refs = [];
        try { refs = JSON.parse(product.images_json || "[]"); } catch {}
        for (const reference of Array.isArray(refs) ? refs : []) {
          for (const key of submittedKeys) {
            if (!referenceMatches(reference, key)) continue;
            if (!ownershipByKey.has(key)) ownershipByKey.set(key, new Map());
            ownershipByKey.get(key).set(String(product.id), String(product.sku || product.id));
          }
        }
      }

      for (const group of groups) {
        const rawKeys = Array.isArray(group?.imageKeys) ? group.imageKeys : [];
        if (rawKeys.length < 2 || rawKeys.length > 8 || rawKeys.some(key => !validKey(key)) ||
            new Set(rawKeys).size !== rawKeys.length) {
          return fail("Mỗi nhóm AI cần từ 2 đến 8 ảnh khác nhau để đối chiếu đủ mọi cặp.", 400);
        }
        const similarity = Number(group?.similarity);
        if (!Number.isInteger(similarity) || similarity < 70 || similarity > 100) {
          return fail("Nhóm chỉ được đưa vào bước xác minh AI khi điểm lọc thị giác đạt ít nhất 70/100.", 400);
        }
        // Keep only images not already claimed by another pending group or an
        // earlier group in this same request. A duplicate can never enter two sets.
        const uniqueKeys = rawKeys.filter(key => !claimed.has(key));
        if (uniqueKeys.length < 2) { skipped++; continue; }
        const groupOwners = new Set(uniqueKeys.flatMap(key => [...(ownershipByKey.get(key)?.keys() || [])]));
        if (groupOwners.size > 1) { skipped++; continue; }
        if (groupOwners.size === 1 && uniqueKeys.every(key => ownershipByKey.has(key))) { skipped++; continue; }
        const placeholders = uniqueKeys.map(() => "?").join(",");
        const indexed = await env.DB.prepare("SELECT image_key,p_hash,features_json FROM image_group_index WHERE image_key IN (" + placeholders + ")").bind(...uniqueKeys).all();
        const indexedRows = indexed.results || [];
        const indexedKeys = new Set(indexedRows.map(row => row.image_key));
        if (uniqueKeys.some(key => !indexedKeys.has(key))) return fail("Có ảnh chưa được lập chỉ mục. Hãy hoàn tất quét toàn kho trước khi lưu nhóm.", 409);
        // Recompute all pair scores from persisted descriptors. Never trust the
        // browser's submitted score/category labels as proof of a 91/100 match.
        const verification = validateCandidateGroup(indexedRows, uniqueKeys);
        if (!verification.valid) {
          const message = verification.reason === "unconfirmed_classification"
            ? "Nhóm có ảnh chưa được phân loại chắc chắn. Ảnh thiếu đặc trưng, độ tin cậy thấp hoặc cần xem xét phải ở hàng chờ thủ công."
            : verification.reason === "similarity_below_threshold"
              ? "Nhóm có ít nhất một cặp ảnh chưa đạt ngưỡng lọc thị giác 70/100 khi kiểm tra lại phía máy chủ."
              : "Không thể xác minh danh mục hoặc chỉ mục của toàn bộ ảnh trong nhóm.";
          return fail(message, 409);
        }
        // The persisted score is the weakest pair in the group; this is more
        // conservative than trusting the browser's average/best-member score.
        const verifiedSimilarity = verification.similarity;
        const groupFingerprint = await fingerprint(uniqueKeys);
        const existing = await env.DB.prepare("SELECT id,status FROM image_group_sets WHERE fingerprint=? LIMIT 1").bind(groupFingerprint).first();
        if (existing) {
          const priorMembers = await env.DB.prepare("SELECT image_key FROM image_group_set_members WHERE group_id=?").bind(existing.id).all();
          for (const row of priorMembers.results || []) claimed.add(row.image_key);
          skipped++;
          continue;
        }
        const aiResult = aiDailyQuotaBlocked
          ? { status: "unverified", confidence: null, reason: "Workers AI đã hết hạn mức neuron trong lượt quét này. Nhóm được giữ để xem xét thủ công; hãy kiểm tra lại khi quota được cấp lại.", httpStatus: 429 }
          : await verifyIdentityGroup(env, indexedRows, uniqueKeys);
        if (aiResult.httpStatus === 429) aiDailyQuotaBlocked = true;
        if (aiResult.status === "verified" && Number(aiResult.confidence) >= 91) aiVerified++;
        else if (aiResult.status === "review_required") aiNeedsReview++;
        else aiUnverified++;
        const id = crypto.randomUUID();
        const verifiedMemberScores = new Map(uniqueKeys.map((key, index) => [key, verification.memberScores[index]]));
        const statements = [
          env.DB.prepare("INSERT INTO image_group_sets(id,fingerprint,similarity,rationale,status,created_at) VALUES(?,?,?,?,'pending',datetime('now'))")
            .bind(id, groupFingerprint, verifiedSimilarity, encodeAIIdentityRationale(aiResult, String(group.rationale || "")))
        ];
        for (const key of uniqueKeys) {
          const memberScore = verifiedMemberScores.get(key);
          // The primary key on image_key is a database-level lock against
          // simultaneous scans creating overlapping active groups.
          statements.push(env.DB.prepare("INSERT INTO image_group_image_claims(image_key,group_id,status) VALUES(?,?,'pending')")
            .bind(key, id));
          statements.push(env.DB.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) VALUES(?,?,?)")
            .bind(id, key, Number.isInteger(memberScore) ? Math.max(0, Math.min(100, memberScore)) : similarity));
        }
        if (proposalStatements.length + statements.length > MAX_PROPOSAL_BATCH_STATEMENTS) {
          return fail("Lượt lưu có quá nhiều thành viên cho một giao dịch nguyên tử. Hãy gửi ít nhóm hơn trong mỗi lượt.", 413);
        }
        proposalStatements.push(...statements);
        for (const key of uniqueKeys) claimed.add(key);
        saved++;
      }
      // Validate every submitted proposal before writing any of the new groups.
      // A single D1 batch makes group rows, membership rows, and image claims
      // commit together; a concurrent claim conflict rolls the entire request back.
      if (proposalStatements.length) {
        const results = await env.DB.batch(proposalStatements);
        if (!Array.isArray(results) || results.length !== proposalStatements.length ||
            results.some(result => Number(result?.meta?.changes) !== 1)) {
          throw new Error("D1 proposal transaction did not confirm every inserted row");
        }
      }
      return json({ ok: true, saved, skipped, aiVerified, aiNeedsReview, aiUnverified, message: "Đã lưu " + saved + " nhóm chờ duyệt. AI xác nhận: " + aiVerified + "; cần xem thủ công: " + aiNeedsReview + "; chưa xác minh do lỗi/quota/định dạng: " + aiUnverified + ". Chưa ảnh nào được công khai." }, 201);
    } catch (error) {
      const detail = safeError(error);
      if (/unique|constraint/i.test(detail)) return fail("Ảnh vừa được giữ bởi một nhóm khác trong lượt quét đồng thời. Hãy tải lại kho và quét lại.", 409);
      return fail("Không thể lưu nhóm ảnh đề xuất: " + detail, 503);
    }
  }

  if (action === "recheck-group") {
    const id = String(body.groupId || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Mã nhóm không hợp lệ.", 400);
    try {
      const group = await env.DB.prepare("SELECT * FROM image_group_sets WHERE id=? AND status='pending'").bind(id).first();
      if (!group) return fail("Nhóm không tồn tại hoặc đã được xử lý.", 409);
      const memberRows = await env.DB.prepare("SELECT image_key,similarity FROM image_group_set_members WHERE group_id=? ORDER BY similarity DESC,image_key ASC").bind(id).all();
      const keys = (memberRows.results || []).map(row => String(row.image_key || ""));
      if (keys.length < 2 || keys.length > 8 || new Set(keys).size !== keys.length) return fail("Nhóm cần từ 2 đến 8 ảnh hợp lệ để xác minh AI.", 409);
      const indexed = await env.DB.prepare("SELECT image_key,p_hash,features_json FROM image_group_index WHERE image_key IN (" + keys.map(() => "?").join(",") + ")").bind(...keys).all();
      const candidate = validateCandidateGroup(indexed.results || [], keys);
      if (!candidate.valid) return fail("Không thể xác minh nhóm vì danh mục, mô tả nhận diện hoặc điểm lọc thị giác không còn hợp lệ.", 409);
      const aiResult = await verifyIdentityGroup(env, indexed.results || [], keys);
      if (aiResult.httpStatus !== 200) return fail(aiResult.reason, aiResult.httpStatus);
      const rationale = encodeAIIdentityRationale(aiResult, stripAIIdentityRationale(group.rationale));
      const updated = await env.DB.prepare("UPDATE image_group_sets SET rationale=? WHERE id=? AND status='pending' AND fingerprint=?")
        .bind(rationale, id, String(group.fingerprint || "")).run();
      if (!Number(updated.meta?.changes || 0)) return fail("Nhóm đã thay đổi đồng thời. Hãy tải lại và xác minh lại.", 409);
      return json({ ok: true, status: aiResult.status, confidence: aiResult.confidence, reason: aiResult.reason, message: aiResult.status === "verified" ? "AI đã xác minh nhóm với mọi cặp đạt ngưỡng 91/100." : "AI chưa thể xác nhận cùng sản phẩm; nhóm vẫn chờ bạn xem xét thủ công." });
    } catch (error) {
      return fail("Không thể xác minh lại nhóm ảnh: " + safeError(error), 503);
    }
  }

  if (action === "reject-group") {
    const id = String(body.groupId || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Mã nhóm không hợp lệ.", 400);
    try {
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending'").bind(id),
        env.DB.prepare("DELETE FROM image_group_image_claims WHERE group_id=? AND status='pending' AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='rejected')").bind(id, id)
      ]);
      if (!results?.[0]?.meta?.changes) return fail("Nhóm không tồn tại hoặc đã được xử lý.", 409);
      return json({ ok: true, message: "Đã loại nhóm đề xuất; ảnh gốc không bị xóa." });
    } catch (error) {
      return fail("Không thể cập nhật trạng thái nhóm: " + safeError(error), 503);
    }
  }


  if (action === "split-group" || action === "merge-groups" || action === "move-image") {
    const validId = value => /^[0-9a-f-]{36}$/i.test(String(value || ""));
    const getPendingGroup = async id => {
      const group = await env.DB.prepare("SELECT * FROM image_group_sets WHERE id=? AND status='pending'").bind(id).first();
      if (!group) return null;
      const members = await env.DB.prepare("SELECT image_key,similarity FROM image_group_set_members WHERE group_id=? ORDER BY similarity DESC,image_key ASC").bind(id).all();
      return { ...group, members: (members.results || []).map(row => ({ key: String(row.image_key), similarity: Number(row.similarity) || 0 })) };
    };
    const average = members => Math.round(members.reduce((sum, member) => sum + member.similarity, 0) / Math.max(1, members.length));
    const categoryFor = async keys => {
      if (!keys.length) return null;
      const rows = await env.DB.prepare("SELECT image_key,p_hash,features_json FROM image_group_index WHERE image_key IN (" + keys.map(() => "?").join(",") + ")").bind(...keys).all();
      if ((rows.results || []).length !== keys.length) return null;
      const categories = [];
      for (const row of rows.results || []) {
        const features = parseGroupableFeatures(row);
        if (!features) return null;
        categories.push(features.category);
      }
      return categories.every(category => category === categories[0]) ? categories[0] : null;
    };
    const fingerprintConflict = async (value, excludedIds) => {
      const found = await env.DB.prepare("SELECT id,status FROM image_group_sets WHERE fingerprint=? LIMIT 1").bind(value).first();
      return found && !excludedIds.includes(String(found.id)) ? found : null;
    };
    // Membership rows and claims are two parts of one logical relationship.
    // Fail before any write if legacy/manual data drift has left a missing or
    // wrong claim; checking only group fingerprints after DB.batch() is too late
    // because a guarded UPDATE may change zero rows without aborting the batch.
    const claimsAreConsistent = async (groups) => {
      const expected = groups.flatMap(group =>
        group.members.map(member => ({ imageKey: member.key, groupId: String(group.id) }))
      );
      if (!expected.length || new Set(expected.map(item => item.imageKey)).size !== expected.length) return false;
      const keys = expected.map(item => item.imageKey);
      const result = await env.DB.prepare(
        "SELECT image_key,group_id,status FROM image_group_image_claims WHERE image_key IN (" + keys.map(() => "?").join(",") + ")"
      ).bind(...keys).all();
      const claims = result.results || [];
      if (claims.length !== expected.length) return false;
      const byKey = new Map(claims.map(claim => [String(claim.image_key), claim]));
      return expected.every(item => {
        const claim = byKey.get(item.imageKey);
        return claim && String(claim.group_id) === item.groupId && String(claim.status) === "pending";
      });
    };
    try {
      if (action === "split-group") {
        const groupId = String(body.groupId || "");
        const selected = Array.isArray(body.selectedKeys) ? body.selectedKeys.map(String) : [];
        if (!validId(groupId) || selected.length < 2 || selected.length > 48 || new Set(selected).size !== selected.length || selected.some(key => !validKey(key))) {
          return fail("Tách bộ cần chọn từ 2 đến 48 ảnh hợp lệ, không trùng.", 400);
        }
        const group = await getPendingGroup(groupId);
        if (!group) return fail("Nhóm không tồn tại hoặc đã được xử lý.", 409);
        if (!await claimsAreConsistent([group])) return fail("Dữ liệu claim không khớp với thành viên nhóm. Đã dừng tách và không thay đổi dữ liệu; cần kiểm tra lại chỉ mục.", 409);
        const byKey = new Map(group.members.map(member => [member.key, member]));
        if (selected.some(key => !byKey.has(key))) return fail("Có ảnh được chọn không còn nằm trong nhóm nguồn.", 409);
        const chosen = selected.map(key => byKey.get(key));
        const remaining = group.members.filter(member => !selected.includes(member.key));
        if (chosen.length < 2 || remaining.length < 2) return fail("Mỗi nhóm sau khi tách phải còn ít nhất 2 ảnh. Để tách nhóm 4 ảnh, hãy chọn 2 ảnh.", 400);
        if (group.members.length > 50) return fail("Nhóm nguồn vượt giới hạn an toàn.", 409);
        const category = await categoryFor(group.members.map(member => member.key));
        if (!category || await categoryFor(chosen.map(member => member.key)) !== category || await categoryFor(remaining.map(member => member.key)) !== category) {
          return fail("Danh mục của ảnh trong nhóm không nhất quán hoặc còn chưa xác định; không tách tự động.", 409);
        }
        const oldFingerprint = String(group.fingerprint || "");
        const remainingFingerprint = await fingerprint(remaining.map(member => member.key));
        const chosenFingerprint = await fingerprint(chosen.map(member => member.key));
        if (await fingerprintConflict(remainingFingerprint, [groupId]) || await fingerprintConflict(chosenFingerprint, [groupId])) {
          return fail("Một trong hai bộ ảnh sau khi tách đã tồn tại trong lịch sử nhóm. Không thay đổi dữ liệu.", 409);
        }
        const newId = crypto.randomUUID();
        const rationaleSource = stripAIIdentityRationale(group.rationale).slice(0, 400);
        const remainingRationale = (rationaleSource + " Đã tách thủ công; nhóm còn lại giữ trạng thái chờ duyệt.").slice(0, 700);
        const chosenRationale = ("Được tách thủ công từ nhóm " + groupId + ". Danh mục: " + category + ". Chờ người quản trị duyệt.").slice(0, 700);
        const statements = [
          env.DB.prepare("DELETE FROM image_group_set_members WHERE group_id=? AND image_key IN (" + selected.map(() => "?").join(",") + ") AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(groupId, ...selected, groupId, oldFingerprint),
          env.DB.prepare("INSERT INTO image_group_sets(id,fingerprint,similarity,rationale,status,created_at) SELECT ?,?,?,?,'pending',datetime('now') WHERE EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(newId, chosenFingerprint, average(chosen), chosenRationale, groupId, oldFingerprint)
        ];
        for (const member of chosen) {
          statements.push(env.DB.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(newId, member.key, member.similarity, groupId, oldFingerprint));
          statements.push(env.DB.prepare("UPDATE image_group_image_claims SET group_id=?,status='pending' WHERE image_key=? AND group_id=? AND status='pending' AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(newId, member.key, groupId, groupId, oldFingerprint));
        }
        statements.push(
          env.DB.prepare("UPDATE image_group_sets SET fingerprint=?,similarity=?,rationale=? WHERE id=? AND status='pending' AND fingerprint=?")
            .bind(remainingFingerprint, average(remaining), remainingRationale, groupId, oldFingerprint),
          env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'image_group_split', 'image_group_set', ?, ? WHERE EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?) AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending')")
            .bind(crypto.randomUUID(), groupId, JSON.stringify({ newGroupId: newId, selectedKeys: selected, remainingKeys: remaining.map(member => member.key), category }), groupId, remainingFingerprint, newId)
        );
        const results = await env.DB.batch(statements);
        if (!results?.[1]?.meta?.changes || !results?.[results.length - 2]?.meta?.changes) return fail("Nhóm đã thay đổi trong lúc thao tác. Tải lại danh sách; không xác nhận tách.", 409);
        return json({ ok: true, groupId, newGroupId: newId, moved: selected.length, remaining: remaining.length, message: "Đã tách thành hai nhóm chờ duyệt; ảnh gốc và SKU không bị thay đổi." });
      }

      if (action === "merge-groups") {
        const rawIds = Array.isArray(body.groupIds) ? body.groupIds.map(String) : [];
        const groupIds = [...new Set(rawIds)];
        const targetId = String(body.targetGroupId || groupIds[0] || "");
        if (groupIds.length < 2 || groupIds.length > 5 || rawIds.length !== groupIds.length || groupIds.some(id => !validId(id)) || !groupIds.includes(targetId)) {
          return fail("Gộp cần chọn 2–5 nhóm chờ duyệt khác nhau và một nhóm đích hợp lệ.", 400);
        }
        const groups = await Promise.all(groupIds.map(getPendingGroup));
        if (groups.some(group => !group)) return fail("Một nhóm đã được duyệt, loại bỏ hoặc thay đổi. Tải lại danh sách.", 409);
        const target = groups[groupIds.indexOf(targetId)];
        const allMembers = groups.flatMap(group => group.members);
        const allKeys = allMembers.map(member => member.key);
        if (allKeys.length > 50) return fail("Nhóm sau khi gộp vượt giới hạn 50 ảnh.", 409);
        if (new Set(allKeys).size !== allKeys.length) return fail("Các nhóm có ảnh trùng lặp. Hãy xử lý xung đột trước khi gộp.", 409);
        if (!await claimsAreConsistent(groups)) return fail("Dữ liệu claim không khớp với thành viên một hoặc nhiều nhóm. Đã dừng gộp và không thay đổi dữ liệu; cần kiểm tra lại chỉ mục.", 409);
        const category = await categoryFor(allKeys);
        if (!category) return fail("Không thể gộp các nhóm có danh mục khác nhau hoặc chưa xác định.", 409);
        const combinedFingerprint = await fingerprint(allKeys);
        if (await fingerprintConflict(combinedFingerprint, groupIds)) return fail("Bộ ảnh tổng hợp đã tồn tại trong lịch sử. Không thay đổi dữ liệu.", 409);
        const memberByKey = new Map(allMembers.map(member => [member.key, member]));
        const orderedMembers = allKeys.map(key => memberByKey.get(key)).sort((a,b) => b.similarity-a.similarity || a.key.localeCompare(b.key));
        const guardSql = groupIds.map(() => "EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)").join(" AND ");
        const guardArgs = groups.flatMap(group => [group.id, String(group.fingerprint || "")]);
        const newRationale = ("Đã gộp thủ công " + groups.length + " nhóm của danh mục " + category + ". Cần người quản trị xác nhận cùng sản phẩm.").slice(0, 700);
        const statements = [];
        for (const group of groups.filter(item => item.id !== targetId)) {
          for (const member of group.members) {
            statements.push(env.DB.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) SELECT ?,?,? WHERE " + guardSql)
              .bind(targetId, member.key, member.similarity, ...guardArgs));
            statements.push(env.DB.prepare("UPDATE image_group_image_claims SET group_id=? WHERE image_key=? AND group_id=? AND status='pending' AND " + guardSql)
              .bind(targetId, member.key, group.id, ...guardArgs));
          }
        }
        statements.push(
          env.DB.prepare("UPDATE image_group_sets SET fingerprint=?,similarity=?,rationale=? WHERE id=? AND status='pending' AND fingerprint=? AND " + guardSql)
            .bind(combinedFingerprint, average(orderedMembers), newRationale, targetId, String(target.fingerprint || ""), ...guardArgs)
        );
        for (const group of groups.filter(item => item.id !== targetId)) {
          statements.push(env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending' AND fingerprint=? AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(group.id, String(group.fingerprint || ""), targetId, combinedFingerprint));
        }
        statements.push(env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'image_group_merge', 'image_group_set', ?, ? WHERE EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
          .bind(crypto.randomUUID(), targetId, JSON.stringify({ mergedGroupIds: groupIds, retiredGroupIds: groupIds.filter(id => id !== targetId), imageKeys: allKeys, category }), targetId, combinedFingerprint));
        const results = await env.DB.batch(statements);
        const targetUpdateIndex = groups.filter(item => item.id !== targetId).reduce((sum, group) => sum + group.members.length * 2, 0);
        if (!results?.[targetUpdateIndex]?.meta?.changes) return fail("Các nhóm đã thay đổi đồng thời. Tải lại danh sách; không xác nhận gộp.", 409);
        return json({ ok: true, groupId: targetId, mergedGroups: groupIds.length, imageCount: allKeys.length, message: "Đã gộp các đề xuất thành một nhóm chờ duyệt; không sửa ảnh gốc hoặc sản phẩm công khai." });
      }

      if (action === "move-image") {
        const sourceId = String(body.sourceGroupId || ""), targetId = String(body.targetGroupId || ""), imageKey = String(body.imageKey || "");
        if (!validId(sourceId) || !validId(targetId) || sourceId === targetId || !validKey(imageKey)) return fail("Nhóm nguồn, nhóm đích hoặc mã ảnh không hợp lệ.", 400);
        const [source, target] = await Promise.all([getPendingGroup(sourceId), getPendingGroup(targetId)]);
        if (!source || !target) return fail("Cả nhóm nguồn và nhóm đích phải đang chờ duyệt.", 409);
        const moving = source.members.find(member => member.key === imageKey);
        if (!moving) return fail("Ảnh không nằm trong nhóm nguồn.", 409);
        if (target.members.some(member => member.key === imageKey)) return fail("Ảnh đã nằm trong nhóm đích.", 409);
        if (source.members.length <= 2) return fail("Chuyển ảnh sẽ khiến nhóm nguồn còn dưới 2 ảnh; hãy loại/tách nhóm thủ công theo cách khác.", 409);
        if (target.members.length >= 50) return fail("Nhóm đích đã đạt giới hạn 50 ảnh.", 409);
        if (!await claimsAreConsistent([source, target])) return fail("Dữ liệu claim không khớp với thành viên nhóm nguồn hoặc đích. Đã dừng chuyển ảnh và không thay đổi dữ liệu; cần kiểm tra lại chỉ mục.", 409);
        const allKeys = [...source.members, ...target.members].map(member => member.key);
        const category = await categoryFor(allKeys);
        if (!category) return fail("Không thể chuyển ảnh giữa các nhóm khác danh mục hoặc chưa xác định.", 409);
        const sourceMembers = source.members.filter(member => member.key !== imageKey);
        const targetMembers = [...target.members, moving].sort((a,b)=>b.similarity-a.similarity||a.key.localeCompare(b.key));
        const sourceFingerprint = await fingerprint(sourceMembers.map(member => member.key));
        const targetFingerprint = await fingerprint(targetMembers.map(member => member.key));
        if (await fingerprintConflict(sourceFingerprint, [sourceId, targetId]) || await fingerprintConflict(targetFingerprint, [sourceId, targetId])) {
          return fail("Một bộ ảnh sau khi chuyển đã tồn tại trong lịch sử. Không thay đổi dữ liệu.", 409);
        }
        const sourceOld = String(source.fingerprint || ""), targetOld = String(target.fingerprint || "");
        const deleteGate = "EXISTS (SELECT 1 FROM image_group_sets s JOIN image_group_sets t ON t.id=? WHERE s.id=? AND s.status='pending' AND s.fingerprint=? AND t.status='pending' AND t.fingerprint=?)";
        const insertGate = "EXISTS (SELECT 1 FROM image_group_sets s JOIN image_group_sets t ON t.id=? WHERE s.id=? AND s.status='pending' AND s.fingerprint=? AND t.status='pending' AND t.fingerprint=?)";
        const statements = [
          env.DB.prepare("DELETE FROM image_group_set_members WHERE group_id=? AND image_key=? AND " + deleteGate)
            .bind(sourceId, imageKey, targetId, sourceId, sourceOld, targetOld),
          env.DB.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) SELECT ?,?,? WHERE " + insertGate)
            .bind(targetId, imageKey, moving.similarity, targetId, sourceId, sourceOld, targetOld),
          env.DB.prepare("UPDATE image_group_image_claims SET group_id=? WHERE image_key=? AND group_id=? AND status='pending' AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?) AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(targetId, imageKey, sourceId, sourceId, sourceOld, targetId, targetOld),
          env.DB.prepare("UPDATE image_group_sets SET fingerprint=?,similarity=?,rationale=? WHERE id=? AND status='pending' AND fingerprint=? AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(sourceFingerprint, average(sourceMembers), (stripAIIdentityRationale(source.rationale) + " Đã chuyển một ảnh sang nhóm " + targetId + ".").slice(0,700), sourceId, sourceOld, targetId, targetOld),
          env.DB.prepare("UPDATE image_group_sets SET fingerprint=?,similarity=?,rationale=? WHERE id=? AND status='pending' AND fingerprint=? AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(targetFingerprint, average(targetMembers), (stripAIIdentityRationale(target.rationale) + " Đã nhận ảnh chuyển từ nhóm " + sourceId + ".").slice(0,700), targetId, targetOld, sourceId, sourceFingerprint),
          env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'image_group_move', 'image_group_set', ?, ? WHERE EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?) AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?)")
            .bind(crypto.randomUUID(), sourceId, JSON.stringify({ sourceGroupId: sourceId, targetGroupId: targetId, imageKey, category }), sourceId, sourceFingerprint, targetId, targetFingerprint)
        ];
        const results = await env.DB.batch(statements);
        if (!results?.[3]?.meta?.changes || !results?.[4]?.meta?.changes) return fail("Nhóm đã thay đổi đồng thời. Tải lại danh sách; không xác nhận chuyển ảnh.", 409);
        return json({ ok: true, imageKey, sourceGroupId: sourceId, targetGroupId: targetId, message: "Đã chuyển ảnh giữa hai đề xuất cùng danh mục; hai nhóm vẫn chờ duyệt." });
      }
    } catch (error) {
      return fail("Không thể thay đổi nhóm ảnh: " + safeError(error), 503);
    }
  }

  if (action === "approve-group") {
    const id = String(body.groupId || ""), productId = String(body.productId || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !productId || productId.length > 120) return fail("Thiếu nhóm đề xuất hoặc sản phẩm đích.", 400);
    try {
      const group = await env.DB.prepare("SELECT * FROM image_group_sets WHERE id=? AND status='pending'").bind(id).first();
      if (!group) return fail("Nhóm không tồn tại hoặc đã được xử lý.", 409);
      const memberRows = await env.DB.prepare("SELECT image_key,similarity FROM image_group_set_members WHERE group_id=? ORDER BY similarity DESC,image_key ASC").bind(id).all();
      const keys = (memberRows.results || []).map(row => String(row.image_key || ""));
      if (keys.length < 2 || keys.length > 8 || new Set(keys).size !== keys.length) return fail("Nhóm không có số lượng ảnh hợp lệ hoặc chứa mã ảnh trùng.", 409);
      if (!Number.isInteger(Number(group.similarity)) || Number(group.similarity) < 70 || Number(group.similarity) > 100) {
        return fail("Nhóm phải đạt điểm lọc thị giác tối thiểu 70/100 trước khi xác minh danh tính.", 409);
      }
      const identityMeta = parseAIIdentityRationale(group.rationale);
      const aiVerified = identityMeta?.status === "verified" && Number(identityMeta.confidence) >= 91;
      const manualOverride = !aiVerified && body.manualOverride === true;
      if (!aiVerified && !manualOverride) return fail("AI chưa xác nhận mọi cặp cùng một mẫu ở ngưỡng 91/100. Chỉ tiếp tục sau khi người quản trị xem ảnh và gửi xác nhận duyệt thủ công.", 409);
      const indexed = await env.DB.prepare("SELECT image_key,p_hash,features_json FROM image_group_index WHERE image_key IN (" + keys.map(() => "?").join(",") + ")").bind(...keys).all();
      const classified = validateClassifiedGroup(indexed.results || [], keys);
      if (!classified.valid) return fail("Nhóm không còn đủ điều kiện an toàn để duyệt: phân loại, đặc trưng hoặc danh mục chưa được xác minh.", 409);
      // Original AI proposals must still pass the 91/100 pairwise gate at
      // approval time. Deliberate administrator edits (split/merge/move) are
      // the manual-review path: they may override visual similarity, but never
      // the confirmed-category, descriptor-integrity or group-score safeguards.
      const manualAudit = await env.DB.prepare(
        "SELECT action,entity_id,details_json FROM audit_logs WHERE entity_type='image_group_set' AND action IN ('image_group_split','image_group_merge','image_group_move') ORDER BY created_at DESC LIMIT 200"
      ).all();
      const manuallyAdjusted = (manualAudit.results || []).some(row => {
        if (String(row.entity_id || "") === id) return true;
        let details = {};
        try { details = JSON.parse(row.details_json || "{}"); } catch {}
        return String(details.newGroupId || "") === id ||
          String(details.sourceGroupId || "") === id ||
          String(details.targetGroupId || "") === id ||
          (Array.isArray(details.mergedGroupIds) && details.mergedGroupIds.map(String).includes(id));
      });
      if (!manuallyAdjusted) {
        const verification = validateCandidateGroup(indexed.results || [], keys);
        if (!verification.valid) return fail("Nhóm không còn đạt điểm lọc thị giác tối thiểu 70/100 hoặc thiếu đặc trưng nhận diện hợp lệ. Hãy quét lại.", 409);
      }
      const [objects, product] = await Promise.all([
        Promise.all(keys.map(key => env.IMAGES.head ? env.IMAGES.head(key) : env.IMAGES.get(key))),
        env.DB.prepare("SELECT * FROM products WHERE id=? LIMIT 1").bind(productId).first()
      ]);
      if (objects.some(object => !object)) return fail("Một hoặc nhiều ảnh đã bị xóa khỏi R2. Quét lại kho trước khi duyệt.", 409);
      if (!product) return fail("Không tìm thấy sản phẩm đích.", 404);
      const previousImagesJson = String(product.images_json ?? "[]");
      let images;
      try { images = JSON.parse(previousImagesJson); } catch {
        return fail("Dữ liệu ảnh của sản phẩm hiện tại không hợp lệ. Không ghi đè để tránh mất dữ liệu.", 409);
      }
      if (!Array.isArray(images) || images.some(value => typeof value !== "string")) {
        return fail("Danh sách ảnh sản phẩm không hợp lệ. Không ghi đè dữ liệu cũ.", 409);
      }
      const others = await env.DB.prepare("SELECT id,sku,images_json FROM products WHERE id<>?").bind(productId).all();
      const owners = new Map();
      for (const row of others.results || []) {
        let refs = [];
        try { refs = JSON.parse(row.images_json || "[]"); } catch {}
        for (const key of keys) {
          if ((Array.isArray(refs) ? refs : []).some(reference => referenceMatches(reference, key))) owners.set(key, row.sku);
        }
      }
      if (keys.some(key => owners.has(key))) {
        const conflicted = keys.filter(key => owners.has(key));
        return fail("Một hoặc nhiều ảnh đã gắn với SKU khác (" + conflicted.slice(0, 4).map(key => owners.get(key)).join(", ") + "). Hãy kiểm tra liên kết cũ để tránh ghép nhầm.", 409);
      }
      const known = new Set(images.map(reference => String(reference)));
      for (const key of keys) {
        const url = "/media/" + key.split("/").map(segment => encodeURIComponent(segment)).join("/");
        if (!known.has(url) && !known.has(url.slice(1)) && !known.has(key)) images.push(url);
      }
      if (images.length > 30) return fail("Bộ ảnh sản phẩm sẽ vượt giới hạn 30 ảnh. Hãy chia nhóm nhỏ hơn.", 409);
      const nextImagesJson = JSON.stringify(images);
      const claimsResult = await env.DB.prepare("SELECT image_key,group_id,status FROM image_group_image_claims WHERE image_key IN (" + keys.map(() => "?").join(",") + ")").bind(...keys).all();
      const claims = new Map((claimsResult.results || []).map(row => [String(row.image_key), row]));
      if (keys.some(key => claims.get(key)?.group_id !== id || claims.get(key)?.status !== "pending")) {
        return fail("Lượt giữ ảnh đã thay đổi hoặc thiếu claim an toàn. Hãy quét lại nhóm trước khi duyệt.", 409);
      }
      // Once approved, these images are exclusively owned by this set.
      // Remove them from every other pending proposal so the same image cannot
      // appear in two groups in the review queue either.
      const overlapping = await env.DB.prepare(
        "SELECT g.id AS group_id,m.image_key FROM image_group_sets g JOIN image_group_set_members m ON m.group_id=g.id WHERE g.status='pending' AND g.id<>? AND m.image_key IN (" + keys.map(() => "?").join(",") + ")"
      ).bind(id, ...keys).all();
      const overlappingByGroup = new Map();
      for (const row of overlapping.results || []) {
        if (!overlappingByGroup.has(row.group_id)) overlappingByGroup.set(row.group_id, new Set());
        overlappingByGroup.get(row.group_id).add(row.image_key);
      }
      const cleanup = [];
      for (const [otherGroupId, overlapKeys] of overlappingByGroup) {
        for (const key of overlapKeys) {
          cleanup.push(env.DB.prepare("DELETE FROM image_group_set_members WHERE group_id=? AND image_key=? AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='approved' AND product_id=?)")
            .bind(otherGroupId, key, id, productId),
            env.DB.prepare("DELETE FROM image_group_image_claims WHERE group_id=? AND image_key=? AND status='pending' AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='approved' AND product_id=?)")
              .bind(otherGroupId, key, id, productId));
        }
        const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM image_group_set_members WHERE group_id=? AND image_key NOT IN (" + keys.map(() => "?").join(",") + ")")
          .bind(otherGroupId, ...keys).first();
        if (Number(countRow?.count || 0) < 2) {
          cleanup.push(env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending' AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='approved' AND product_id=?)")
            .bind(otherGroupId, id, productId),
            env.DB.prepare("DELETE FROM image_group_image_claims WHERE group_id=? AND status='pending' AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='approved' AND product_id=?)")
              .bind(otherGroupId, id, productId));
        }
      }
      const oldFingerprint = String(group.fingerprint || "");
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE products SET images_json=?,updated_at=datetime('now') WHERE id=? AND COALESCE(images_json,'[]')=? AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND fingerprint=?) AND (SELECT COUNT(*) FROM image_group_image_claims WHERE group_id=? AND status='pending')=? AND (SELECT COUNT(*) FROM image_group_image_claims WHERE group_id=? AND status='pending' AND image_key IN (" + keys.map(() => "?").join(",") + "))=?")
          .bind(nextImagesJson, productId, previousImagesJson, id, oldFingerprint, id, keys.length, id, ...keys, keys.length),
        env.DB.prepare("UPDATE image_group_sets SET status='approved',product_id=?,reviewed_at=datetime('now') WHERE id=? AND status='pending' AND fingerprint=? AND changes()=1")
          .bind(productId, id, oldFingerprint),
        env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'image_similarity_group_approved', 'product', ?, ? WHERE changes()=1 AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='approved' AND product_id=?)")
          .bind(crypto.randomUUID(), productId, JSON.stringify({ groupId: id, keys, sku: product.sku, similarity: Number(group.similarity) || 0, aiIdentityStatus: identityMeta?.status || "unverified", aiIdentityConfidence: identityMeta?.confidence ?? null, manualOverride: Boolean(manualOverride), previousImagesJson, nextImagesJson }), id, productId),
        env.DB.prepare("UPDATE image_group_image_claims SET status='approved' WHERE group_id=? AND status='pending' AND image_key IN (" + keys.map(() => "?").join(",") + ") AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='approved' AND product_id=?)")
          .bind(id, ...keys, id, productId),
        ...cleanup
      ]);
      if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes) return fail("Nhóm hoặc danh sách ảnh sản phẩm đã thay đổi đồng thời. Không ghi đè dữ liệu; hãy tải lại và kiểm tra.", 409);
      if (Number(results[3]?.meta?.changes || 0) !== keys.length) return fail("Thiếu claim ảnh sau thao tác duyệt. Hãy dừng và kiểm tra hàng chờ; không thử duyệt lại.", 409);
      return json({ ok: true, message: "Đã thêm " + keys.length + " ảnh vào bộ ảnh sản phẩm; có thể hoàn tác nếu danh sách chưa bị chỉnh sửa tiếp.", sku: product.sku, imageCount: images.length });
    } catch (error) {
      return fail("Không thể duyệt nhóm ảnh: " + safeError(error), 503);
    }
  }


  if (action === "undo-approval") {
    const auditId = String(body.auditId || "");
    if (!/^[0-9a-f-]{36}$/i.test(auditId)) return fail("Mã nhật ký duyệt không hợp lệ.", 400);
    try {
      const alreadyUndone = await env.DB.prepare("SELECT id FROM audit_logs WHERE action='image_similarity_group_approval_undone' AND details_json LIKE ? LIMIT 1")
        .bind("%" + auditId + "%").first();
      if (alreadyUndone) return fail("Lượt duyệt này đã được hoàn tác.", 409);
      const original = await env.DB.prepare("SELECT id,entity_id,details_json FROM audit_logs WHERE id=? AND action='image_similarity_group_approved' LIMIT 1").bind(auditId).first();
      if (!original) return fail("Không tìm thấy nhật ký duyệt ảnh.", 404);
      let details = {};
      try { details = JSON.parse(original.details_json || "{}"); } catch {}
      const groupId = String(details.groupId || "");
      const keys = Array.isArray(details.keys) ? details.keys.map(String) : [];
      const previousImagesJson = typeof details.previousImagesJson === "string" ? details.previousImagesJson : null;
      const nextImagesJson = typeof details.nextImagesJson === "string" ? details.nextImagesJson : null;
      const productId = String(original.entity_id || "");
      if (!/^[0-9a-f-]{36}$/i.test(groupId) || !productId || !keys.length || previousImagesJson === null || nextImagesJson === null) {
        return fail("Nhật ký duyệt cũ không có snapshot cần thiết; không thể hoàn tác an toàn.", 409);
      }
      const product = await env.DB.prepare("SELECT id,images_json FROM products WHERE id=? LIMIT 1").bind(productId).first();
      if (!product || String(product.images_json ?? "[]") !== nextImagesJson) {
        return fail("Danh sách ảnh sản phẩm đã được chỉnh sửa sau khi duyệt. Không hoàn tác vì có thể ghi đè thay đổi mới.", 409);
      }
      const group = await env.DB.prepare("SELECT id,status,product_id FROM image_group_sets WHERE id=? LIMIT 1").bind(groupId).first();
      if (!group || group.status !== "approved" || group.product_id !== productId) {
        return fail("Trạng thái nhóm đã thay đổi; không thể hoàn tác lượt duyệt này.", 409);
      }
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE products SET images_json=?,updated_at=datetime('now') WHERE id=? AND images_json=? AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='approved' AND product_id=?) AND (SELECT COUNT(*) FROM image_group_image_claims WHERE group_id=? AND status='approved')=? AND (SELECT COUNT(*) FROM image_group_image_claims WHERE group_id=? AND status='approved' AND image_key IN (" + keys.map(() => "?").join(",") + "))=?")
          .bind(previousImagesJson, productId, nextImagesJson, groupId, productId, groupId, keys.length, groupId, ...keys, keys.length),
        env.DB.prepare("UPDATE image_group_sets SET status='pending',product_id=NULL,reviewed_at=NULL WHERE id=? AND status='approved' AND product_id=? AND changes()=1")
          .bind(groupId, productId),
        env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) SELECT ?, 'admin', 'image_similarity_group_approval_undone', 'product', ?, ? WHERE changes()=1 AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND product_id IS NULL)")
          .bind(crypto.randomUUID(), productId, JSON.stringify({ approvalAuditId: auditId, groupId, keys, restoredImagesJson: previousImagesJson, revertedImagesJson: nextImagesJson }), groupId),
        env.DB.prepare("UPDATE image_group_image_claims SET status='pending' WHERE group_id=? AND status='approved' AND image_key IN (" + keys.map(() => "?").join(",") + ") AND EXISTS (SELECT 1 FROM image_group_sets WHERE id=? AND status='pending' AND product_id IS NULL)")
          .bind(groupId, ...keys, groupId)
      ]);
      if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes) {
        return fail("Sản phẩm hoặc nhóm vừa thay đổi đồng thời; không hoàn tác. Hãy tải lại và kiểm tra.", 409);
      }
      if (Number(results[3]?.meta?.changes || 0) !== keys.length) return fail("Không khôi phục đủ claim ảnh; dừng để kiểm tra dữ liệu trước khi thao tác tiếp.", 409);
      return json({ ok: true, message: "Đã khôi phục danh sách ảnh trước lượt duyệt. Nhóm trở lại chờ duyệt; ảnh gốc R2 không bị thay đổi." });
    } catch (error) {
      return fail("Không thể hoàn tác lượt duyệt ảnh: " + safeError(error), 503);
    }
  }

  return fail("Thao tác nhóm ảnh không được hỗ trợ.", 400);
}

export async function onRequestDelete() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
