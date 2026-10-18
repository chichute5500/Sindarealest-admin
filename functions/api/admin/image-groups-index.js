import { fail, json, readJsonBodyLimited, requireAdmin } from "../../_lib.js";

const MAX_BODY = 2 * 1024 * 1024;
const KEY_MAX = 1024;
const KEY_CONTROL = /[\u0000-\u001f\u007f]/;
const validKey = value => typeof value === "string" && value.length > 0 && value.length <= KEY_MAX && !KEY_CONTROL.test(value);
const safeError = error => String(error?.message || error || "Unknown image grouping error").replace(/[\r\n]+/g, " ").slice(0, 200);

function validDescriptor(item) {
  if (!item || !validKey(item.key) || !/^[0-9a-f]{16}$/i.test(String(item.p_hash || ""))) return false;
  if (!Number.isInteger(Number(item.width)) || Number(item.width) < 1 || Number(item.width) > 100000) return false;
  if (!Number.isInteger(Number(item.height)) || Number(item.height) < 1 || Number(item.height) > 100000) return false;
  if (!Number.isFinite(Number(item.sourceSize)) || Number(item.sourceSize) < 0 || Number(item.sourceSize) > 100000000) return false;
  if (String(item.sourceUploaded || "").length > 48) return false;
  const shape = item.features?.shape, colors = item.features?.colors;
  return Array.isArray(shape) && shape.length === 64 &&
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
      includeGroups ? env.DB.prepare("SELECT m.group_id,m.image_key,m.similarity FROM image_group_set_members m JOIN image_group_sets g ON g.id=m.group_id WHERE g.status='pending' AND g.id IN (SELECT id FROM image_group_sets WHERE status='pending' ORDER BY similarity DESC,created_at DESC LIMIT 300) ORDER BY m.group_id,m.image_key").all() : Promise.resolve({results:[]}),
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
      const statements = descriptors.map(item => env.DB.prepare(
        "INSERT INTO image_group_index(image_key,p_hash,features_json,width,height,source_size,source_uploaded,updated_at) VALUES(?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(image_key) DO UPDATE SET p_hash=excluded.p_hash,features_json=excluded.features_json,width=excluded.width,height=excluded.height,source_size=excluded.source_size,source_uploaded=excluded.source_uploaded,updated_at=datetime('now')"
      ).bind(
        item.key, String(item.p_hash).toLowerCase(), JSON.stringify({
          shape: item.features.shape.map(Number),
          colors: item.features.colors.map(Number)
        }), Number(item.width), Number(item.height), Number(item.sourceSize), String(item.sourceUploaded || "")
      ));
      await env.DB.batch(statements);
      return json({ ok: true, indexed: descriptors.length, message: "Đã lưu chỉ mục hình ảnh cho lô hiện tại." });
    } catch (error) {
      return fail("Không thể lưu chỉ mục hình ảnh: " + safeError(error), 503);
    }
  }

  if (action === "save-groups") {
    const groups = Array.isArray(body.groups) ? body.groups : [];
    if (!groups.length || groups.length > 25) return fail("Mỗi lượt lưu cần từ 1 đến 25 nhóm đề xuất.", 400);
    let saved = 0, skipped = 0;
    try {
      // Normalize older pending proposals first: one image may belong to only
      // one pending set. The oldest set keeps a shared image; later sets lose it.
      const oldPending = await env.DB.prepare(
        "SELECT g.id AS group_id,g.status,g.created_at,m.image_key FROM image_group_sets g JOIN image_group_set_members m ON m.group_id=g.id WHERE g.status IN ('approved','pending') ORDER BY CASE g.status WHEN 'approved' THEN 0 ELSE 1 END,g.created_at ASC,g.id ASC,m.image_key ASC"
      ).all();
      const claimed = new Set();
      const membersByGroup = new Map();
      for (const row of oldPending.results || []) {
        if (row.status === "pending" && !membersByGroup.has(row.group_id)) membersByGroup.set(row.group_id, []);
        if (claimed.has(row.image_key)) {
          // Preserve approved history; remove the duplicate only from pending proposals.
          if (row.status === "pending") {
            await env.DB.prepare("DELETE FROM image_group_set_members WHERE group_id=? AND image_key=?").bind(row.group_id, row.image_key).run();
          }
        } else {
          claimed.add(row.image_key);
          if (row.status === "pending") membersByGroup.get(row.group_id).push(row.image_key);
        }
      }
      for (const [groupId, remaining] of membersByGroup) {
        if (remaining.length < 2) {
          await env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending'").bind(groupId).run();
        }
      }

      for (const group of groups) {
        const rawKeys = Array.isArray(group?.imageKeys) ? group.imageKeys : [];
        if (rawKeys.length < 2 || rawKeys.length > 50 || rawKeys.some(key => !validKey(key)) ||
            new Set(rawKeys).size !== rawKeys.length) {
          return fail("Một nhóm có danh sách ảnh không hợp lệ (2–50 ảnh khác nhau).", 400);
        }
        const similarity = Number(group?.similarity);
        if (!Number.isInteger(similarity) || similarity < 0 || similarity > 100) {
          return fail("Điểm tương đồng của nhóm không hợp lệ.", 400);
        }
        // Keep only images not already claimed by another pending group or an
        // earlier group in this same request. A duplicate can never enter two sets.
        const uniqueKeys = rawKeys.filter(key => !claimed.has(key));
        if (uniqueKeys.length < 2) { skipped++; continue; }
        const placeholders = uniqueKeys.map(() => "?").join(",");
        const indexed = await env.DB.prepare("SELECT image_key FROM image_group_index WHERE image_key IN (" + placeholders + ")").bind(...uniqueKeys).all();
        const indexedKeys = new Set((indexed.results || []).map(row => row.image_key));
        if (uniqueKeys.some(key => !indexedKeys.has(key))) return fail("Có ảnh chưa được lập chỉ mục. Hãy hoàn tất quét toàn kho trước khi lưu nhóm.", 409);
        const groupFingerprint = await fingerprint(uniqueKeys);
        const existing = await env.DB.prepare("SELECT id,status FROM image_group_sets WHERE fingerprint=? LIMIT 1").bind(groupFingerprint).first();
        if (existing) {
          const priorMembers = await env.DB.prepare("SELECT image_key FROM image_group_set_members WHERE group_id=?").bind(existing.id).all();
          for (const row of priorMembers.results || []) claimed.add(row.image_key);
          skipped++;
          continue;
        }
        const id = crypto.randomUUID();
        const memberScores = new Map((Array.isArray(group.members) ? group.members : []).map(member => [member?.key, Number(member?.similarity)]));
        const statements = [
          env.DB.prepare("INSERT INTO image_group_sets(id,fingerprint,similarity,rationale,status,created_at) VALUES(?,?,?,?,'pending',datetime('now'))")
            .bind(id, groupFingerprint, similarity, String(group.rationale || "").slice(0, 700))
        ];
        for (const key of uniqueKeys) {
          const memberScore = memberScores.get(key);
          statements.push(env.DB.prepare("INSERT INTO image_group_set_members(group_id,image_key,similarity) VALUES(?,?,?)")
            .bind(id, key, Number.isInteger(memberScore) ? Math.max(0, Math.min(100, memberScore)) : similarity));
        }
        await env.DB.batch(statements);
        for (const key of uniqueKeys) claimed.add(key);
        saved++;
      }
      return json({ ok: true, saved, skipped, message: "Đã lưu " + saved + " nhóm tương đồng vào hàng chờ duyệt; không ảnh nào được công khai." }, 201);
    } catch (error) {
      return fail("Không thể lưu nhóm ảnh đề xuất: " + safeError(error), 503);
    }
  }

  if (action === "reject-group") {
    const id = String(body.groupId || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Mã nhóm không hợp lệ.", 400);
    try {
      const result = await env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending'").bind(id).run();
      if (!result.meta?.changes) return fail("Nhóm không tồn tại hoặc đã được xử lý.", 409);
      return json({ ok: true, message: "Đã loại nhóm đề xuất; không xóa ảnh gốc." });
    } catch (error) {
      return fail("Không thể cập nhật trạng thái nhóm: " + safeError(error), 503);
    }
  }

  if (action === "approve-group") {
    const id = String(body.groupId || ""), productId = String(body.productId || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !productId || productId.length > 120) return fail("Thiếu nhóm đề xuất hoặc sản phẩm đích.", 400);
    try {
      const group = await env.DB.prepare("SELECT * FROM image_group_sets WHERE id=? AND status='pending'").bind(id).first();
      if (!group) return fail("Nhóm không tồn tại hoặc đã được xử lý.", 409);
      const memberRows = await env.DB.prepare("SELECT image_key,similarity FROM image_group_set_members WHERE group_id=? ORDER BY image_key").bind(id).all();
      const keys = (memberRows.results || []).map(row => String(row.image_key || ""));
      if (keys.length < 2 || keys.length > 50) return fail("Nhóm không có số lượng ảnh hợp lệ.", 409);
      const [objects, product] = await Promise.all([
        Promise.all(keys.map(key => env.IMAGES.head ? env.IMAGES.head(key) : env.IMAGES.get(key))),
        env.DB.prepare("SELECT * FROM products WHERE id=? LIMIT 1").bind(productId).first()
      ]);
      if (objects.some(object => !object)) return fail("Một hoặc nhiều ảnh đã bị xóa khỏi R2. Quét lại kho trước khi duyệt.", 409);
      if (!product) return fail("Không tìm thấy sản phẩm đích.", 404);
      let images = [];
      try { images = JSON.parse(product.images_json || "[]"); } catch {}
      if (!Array.isArray(images)) images = [];
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
          cleanup.push(env.DB.prepare("DELETE FROM image_group_set_members WHERE group_id=? AND image_key=?")
            .bind(otherGroupId, key));
        }
        const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM image_group_set_members WHERE group_id=? AND image_key NOT IN (" + keys.map(() => "?").join(",") + ")")
          .bind(otherGroupId, ...keys).first();
        if (Number(countRow?.count || 0) < 2) {
          cleanup.push(env.DB.prepare("UPDATE image_group_sets SET status='rejected',reviewed_at=datetime('now') WHERE id=? AND status='pending'")
            .bind(otherGroupId));
        }
      }
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE products SET images_json=?,updated_at=datetime('now') WHERE id=?").bind(JSON.stringify(images), productId),
        env.DB.prepare("UPDATE image_group_sets SET status='approved',product_id=?,reviewed_at=datetime('now') WHERE id=? AND status='pending'").bind(productId, id),
        env.DB.prepare("INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,details_json) VALUES(?, 'admin', 'image_similarity_group_approved', 'product', ?, ?)")
          .bind(crypto.randomUUID(), productId, JSON.stringify({ groupId: id, keys, sku: product.sku, similarity: Number(group.similarity) || 0 })),
        ...cleanup
      ]);
      if (!results?.[0]?.meta?.changes || !results?.[1]?.meta?.changes) return fail("Không thể lưu bộ ảnh hoặc nhóm đã được xử lý.", 409);
      return json({ ok: true, message: "Đã thêm " + keys.length + " ảnh vào bộ ảnh sản phẩm.", sku: product.sku, imageCount: images.length });
    } catch (error) {
      return fail("Không thể duyệt nhóm ảnh: " + safeError(error), 503);
    }
  }

  return fail("Thao tác nhóm ảnh không được hỗ trợ.", 400);
}

export async function onRequestDelete() {
  return fail("Phương thức không được hỗ trợ.", 405);
}
