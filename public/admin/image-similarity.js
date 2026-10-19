const COS16 = Array.from({ length: 8 }, (_, k) =>
  Array.from({ length: 16 }, (_, x) => Math.cos((Math.PI * (2 * x + 1) * k) / 32))
);
const POPCOUNT = Array.from({ length: 16 }, (_, value) => {
  let n = value, count = 0;
  while (n) { count += n & 1; n >>>= 1; }
  return count;
});

const PRODUCT_CATEGORIES = new Set(["sneaker","loafer","dress_shoe","boot","sandal","belt","wallet","watch_strap","watch","bag","other","unknown"]);

function parseFeatures(item) {
  if (item?.features && Array.isArray(item.features.shape) && Array.isArray(item.features.colors)) return item.features;
  try {
    const value = JSON.parse(item?.features_json || "{}");
    if (Array.isArray(value.shape) && Array.isArray(value.colors)) return value;
  } catch {}
  return null;
}

export function isCachedDescriptorValid(row, inventoryItem) {
  if (!row || !inventoryItem || String(row.image_key || "") !== String(inventoryItem.key || "")) return false;
  const features = parseFeatures(row);
  if (!features) return false;
  const category = String(features.category || "").toLowerCase();
  const status = String(features.categoryStatus || "").toLowerCase();
  const confidence = features.categoryConfidence;
  const validValues = (values, length) => Array.isArray(values) && values.length === length &&
    values.every(value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1);
  if (!/^[0-9a-f]{16}$/i.test(String(row.p_hash || "")) ||
      !validValues(features.shape, 64) ||
      !validValues(features.colors, 12) ||
      !/^[0-9a-f]{64}$/i.test(String(features.contentHash || "")) ||
      !PRODUCT_CATEGORIES.has(category) ||
      !Number.isInteger(confidence) || confidence < 0 || confidence > 100 ||
      !["classified", "needs_review"].includes(status) ||
      (status === "classified" && (category === "unknown" || confidence < 70)) ||
      !Number.isInteger(Number(row.width)) || Number(row.width) < 1 ||
      !Number.isInteger(Number(row.height)) || Number(row.height) < 1 ||
      !Number.isFinite(Number(inventoryItem.size)) ||
      Number(row.source_size) !== Number(inventoryItem.size) ||
      String(row.source_uploaded || "") !== String(inventoryItem.uploaded || "")) return false;
  return true;
}

export function categoryOf(item) {
  const features = parseFeatures(item);
  let rawFeatures = item?.features && typeof item.features === "object" ? item.features : null;
  if (!rawFeatures) {
    try { rawFeatures = JSON.parse(item?.features_json || "{}"); } catch { rawFeatures = null; }
  }
  const category = String(item?.category || features?.category || rawFeatures?.category || "unknown").toLowerCase();
  // Read safety metadata independently from shape/color validity: uncertain
  // classifications must never become confirmed just because descriptors are incomplete.
  const status = String(item?.categoryStatus || rawFeatures?.categoryStatus || "").toLowerCase();
  const confidenceValue = item?.categoryConfidence ?? rawFeatures?.categoryConfidence;
  const confidence = confidenceValue === undefined || confidenceValue === null || confidenceValue === ""
    ? null : Number(confidenceValue);
  if (status && status !== "classified") return "unknown";
  if (confidence !== null && (!Number.isFinite(confidence) || confidence < 70 || confidence > 100)) return "unknown";
  return PRODUCT_CATEGORIES.has(category) ? category : "unknown";
}

export function hashDistance(left, right) {
  const a = String(left || "").toLowerCase(), b = String(right || "").toLowerCase();
  if (!/^[0-9a-f]{16}$/.test(a) || !/^[0-9a-f]{16}$/.test(b)) return 64;
  let distance = 0;
  for (let i = 0; i < 16; i++) distance += POPCOUNT[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  return distance;
}

function shapeSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 64 || b.length !== 64) return 0;
  let delta = 0;
  for (let i = 0; i < 64; i++) delta += Math.abs(Number(a[i]) - Number(b[i]));
  return Math.max(0, Math.min(1, 1 - delta / 64));
}

function colorSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== 12 || b.length !== 12) return 0;
  let overlap = 0;
  for (let channel = 0; channel < 3; channel++) {
    let channelOverlap = 0;
    for (let bin = 0; bin < 4; bin++) {
      const i = channel * 4 + bin;
      channelOverlap += Math.min(Number(a[i]) || 0, Number(b[i]) || 0);
    }
    overlap += Math.max(0, Math.min(1, channelOverlap));
  }
  return overlap / 3;
}

export function compareDescriptors(left, right) {
  const leftFeatures = parseFeatures(left), rightFeatures = parseFeatures(right);
  const leftContentHash = String(leftFeatures?.contentHash || "").toLowerCase();
  const rightContentHash = String(rightFeatures?.contentHash || "").toLowerCase();
  const exactDuplicate = /^[0-9a-f]{64}$/.test(leftContentHash) && leftContentHash === rightContentHash;
  const phashDistance = hashDistance(left?.p_hash || left?.phash, right?.p_hash || right?.phash);
  const phashSimilarity = 1 - phashDistance / 64;
  // An exact byte hash proves identical files, not the identity of a physical
  // product/SKU. It is a strong duplicate signal for the admin review queue,
  // but public/product assignment still remains human-approved.
  if (exactDuplicate) {
    return { score: 100, phashDistance, shapeSimilarity: 100, colorSimilarity: 100, exactDuplicate: true, match: true };
  }
  const shape = shapeSimilarity(leftFeatures?.shape, rightFeatures?.shape);
  const color = colorSimilarity(leftFeatures?.colors, rightFeatures?.colors);
  // The score is a review-oriented visual similarity index, not a probability.
  const score = Math.round((phashSimilarity * 0.30 + shape * 0.35 + color * 0.35) * 100);
  // A perceptual-hash match alone is not evidence of the same product:
  // large white backgrounds make unrelated catalog photos look deceptively alike.
  // Require shape AND foreground-color agreement, with a stronger score gate.
  const match = score >= 70 && shape >= 0.58 && color >= 0.58 && phashDistance <= 24;
  return { score, phashDistance, shapeSimilarity: Math.round(shape * 100), colorSimilarity: Math.round(color * 100), exactDuplicate: false, match };
}

function nextFrame() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function findSimilarGroups(items, options = {}) {
  const threshold = Math.max(55, Math.min(95, Number(options.threshold) || 62));
  const valid = (Array.isArray(items) ? items : []).filter(item =>
    item && typeof item.key === "string" && /^[0-9a-f]{16}$/i.test(String(item.p_hash || item.phash || "")) &&
    parseFeatures(item)
  );
  const count = valid.length;
  const total = count * (count - 1) / 2;
  // Store only matching edges; this keeps memory proportional to actual matches.
  // Each image is compared against the complete inventory before groups are formed.
  const matchesByIndex = Array.from({ length: count }, () => []);
  const bestScore = new Uint8Array(count);
  let compared = 0, visited = 0, matches = 0;
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      visited++;
      // Tier 1: category classification. Unknown or different categories are
      // never compared in Tier 2; a weak category guess must fail closed.
      const categoryA = categoryOf(valid[i]), categoryB = categoryOf(valid[j]);
      if (categoryA === "unknown" || categoryB === "unknown" || categoryA !== categoryB) continue;
      const result = compareDescriptors(valid[i], valid[j]);
      compared++;
      if (result.match && result.score >= Math.max(70, threshold)) {
        matchesByIndex[i].push({ index: j, score: result.score });
        matchesByIndex[j].push({ index: i, score: result.score });
        bestScore[i] = Math.max(bestScore[i], result.score);
        bestScore[j] = Math.max(bestScore[j], result.score);
        matches++;
      }
      if (visited % 20000 === 0) {
        options.onProgress?.({ phase: "matching", done: visited, total, matches });
        await nextFrame();
      }
    }
  }
  options.onProgress?.({ phase: "matching", done: total, total, matches });

  // Conservative complete-link grouping: each candidate must match the anchor
  // AND every already selected member. A single strong edge cannot bridge two
  // incompatible products into one set. This deliberately prefers a smaller
  // review queue over an unsafe merge.
  const assigned = new Uint8Array(count);
  const groups = [];
  for (let anchor = 0; anchor < count; anchor++) {
    if (assigned[anchor]) continue;
    const indices = [anchor];
    const orderedEdges = [...matchesByIndex[anchor]].sort((a, b) =>
      b.score - a.score || valid[a.index].key.localeCompare(valid[b.index].key)
    );
    for (const edge of orderedEdges) {
      if (assigned[edge.index]) continue;
      const compatibleWithEveryMember = indices.every(memberIndex =>
        matchesByIndex[edge.index].some(otherEdge => otherEdge.index === memberIndex)
      );
      if (compatibleWithEveryMember) indices.push(edge.index);
    }
    if (indices.length < 2) continue;
    for (const index of indices) assigned[index] = 1;

    const members = indices.map(index => valid[index]);
    const category = categoryOf(members[0]);
    const assignedSkus = new Set(members.flatMap(item =>
      (item.assignedTo || []).map(owner => String(owner.sku || "")).filter(Boolean)
    ));
    const allAssigned = members.every(item => Array.isArray(item.assignedTo) && item.assignedTo.length > 0);
    // Existing SKU ownership is stronger than visual similarity. Never even
    // propose a cross-SKU group; approval should not be the first safety gate.
    if (assignedSkus.size > 1) continue;
    if (allAssigned && assignedSkus.size === 1) continue;

    const indexByKey = new Map(members.map((item, position) => [item.key, indices[position]]));
    const sorted = members.map(item => ({
      key: item.key,
      similarity: bestScore[indexByKey.get(item.key)] || 0
    })).sort((a, b) => b.similarity - a.similarity || a.key.localeCompare(b.key));
    const chunks = [];
    for (let offset = 0; offset < sorted.length; offset += 30) chunks.push(sorted.slice(offset, offset + 30));
    for (let part = 0; part < chunks.length; part++) {
      const chunk = chunks[part];
      const scores = chunk.map(item => item.similarity).filter(score => score > 0);
      const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
      groups.push({
        category,
        categoryLabel: ({sneaker:"Giày thể thao",loafer:"Giày lười",dress_shoe:"Giày tây",boot:"Bốt",sandal:"Dép / sandal",belt:"Thắt lưng",wallet:"Ví",watch_strap:"Dây đồng hồ",watch:"Đồng hồ",bag:"Túi",other:"Sản phẩm khác",unknown:"Chưa xác định"})[category],
        // Preserve the computed strongest-match-first order. Sorting by filename
        // here discards the ranking above and creates an arbitrary gallery order.
        imageKeys: chunk.map(item => item.key),
        members: [...chunk],
        similarity: average,
        rationale: (indices.length > 30
          ? "Bộ ảnh có " + indices.length + " ảnh đã được chia thành phần " + (part + 1) + "/" + chunks.length + " (tối đa 30 ảnh mỗi phần) để phù hợp giới hạn bộ ảnh. "
          : "") +
          "Tầng 1 đã phân loại ảnh vào nhóm “" + (({sneaker:"giày thể thao",loafer:"giày lười",dress_shoe:"giày tây",boot:"bốt",sandal:"dép / sandal",belt:"thắt lưng",wallet:"ví",watch_strap:"dây đồng hồ",watch:"đồng hồ",bag:"túi",other:"sản phẩm khác"})[category] || category) + "”. Tầng 2 so sánh trực tiếp các ảnh trong cùng loại; không dùng liên kết bắc cầu. Đây là đề xuất theo đặc trưng hình ảnh, cần người quản trị xác nhận cùng sản phẩm."
      });
    }
  }
  groups.sort((a, b) => b.similarity - a.similarity || a.imageKeys.join("|").localeCompare(b.imageKeys.join("|")));
  return { groups, compared, matches, validCount: count, skippedCount: (Array.isArray(items) ? items.length : 0) - count };
}

function averageCornerColor(data, width, height) {
  const samples = [];
  const points = [[2,2],[width-3,2],[2,height-3],[width-3,height-3]];
  for (const [cx, cy] of points) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const offset = ((cy + dy) * width + cx + dx) * 4;
      samples.push([data[offset], data[offset + 1], data[offset + 2]]);
    }
  }
  return [0,1,2].map(channel => {
    const sorted = samples.map(sample => sample[channel]).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 255;
  });
}

function foregroundPixel(r, g, b, background) {
  const delta = Math.abs(r - background[0]) + Math.abs(g - background[1]) + Math.abs(b - background[2]);
  // Do not automatically discard bright neutral pixels: white shoes on a white
  // background still need their subtle edges included in the silhouette mask.
  return delta > 36;
}

function createDctHash(gray) {
  const rows = Array.from({ length: 16 }, () => new Float64Array(8));
  for (let y = 0; y < 16; y++) for (let kx = 0; kx < 8; kx++) {
    let sum = 0;
    for (let x = 0; x < 16; x++) sum += gray[y * 16 + x] * COS16[kx][x];
    rows[y][kx] = sum;
  }
  const coefficients = [];
  for (let ky = 0; ky < 8; ky++) for (let kx = 0; kx < 8; kx++) {
    let sum = 0;
    for (let y = 0; y < 16; y++) sum += rows[y][kx] * COS16[ky][y];
    coefficients.push(sum);
  }
  const sorted = coefficients.slice(1).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  let hash = "";
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit++) {
      const index = i + bit;
      nibble = (nibble << 1) | (index !== 0 && coefficients[index] > median ? 1 : 0);
    }
    hash += nibble.toString(16);
  }
  return hash;
}

export function findExactDuplicateGroups(items) {
  const byHash = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const features = parseFeatures(item);
    const hash = String(features?.contentHash || "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash) || typeof item?.key !== "string") continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({ key: item.key, category: categoryOf(item) });
  }
  return [...byHash.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([contentHash, members]) => ({
      contentHash,
      imageKeys: members.map(member => member.key).sort((a, b) => a.localeCompare(b)),
      categories: [...new Set(members.map(member => member.category))].sort(),
      categoryConflict: new Set(members.map(member => member.category)).size > 1
    }))
    .sort((a, b) => b.imageKeys.length - a.imageKeys.length || a.imageKeys[0].localeCompare(b.imageKeys[0]));
}

export async function computeImageDescriptor(url, metadata = {}) {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    throw new Error("Trình duyệt không hỗ trợ đọc ảnh bằng canvas.");
  }
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Không tải được ảnh (HTTP " + response.status + ").");
  const blob = await response.blob();
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  const contentHash = [...digest].map(byte => byte.toString(16).padStart(2, "0")).join("");
  let bitmap;
  try { bitmap = await createImageBitmap(blob); }
  catch { throw new Error("Tệp không giải mã được thành ảnh: " + (metadata.key || "không rõ mã ảnh")); }
  try {
    const width = Number(bitmap.width), height = Number(bitmap.height);
    if (!width || !height || width * height > 80000000) throw new Error("Kích thước ảnh không hợp lệ hoặc vượt 80 megapixel.");
    const side = 160, base = document.createElement("canvas");
    base.width = side; base.height = side;
    const baseContext = base.getContext("2d", { willReadFrequently: true });
    if (!baseContext) throw new Error("Không tạo được canvas đọc ảnh.");
    baseContext.fillStyle = "#fff";
    baseContext.fillRect(0, 0, side, side);
    const scale = Math.min(side / width, side / height);
    const drawWidth = Math.max(1, Math.round(width * scale)), drawHeight = Math.max(1, Math.round(height * scale));
    baseContext.drawImage(bitmap, Math.round((side - drawWidth) / 2), Math.round((side - drawHeight) / 2), drawWidth, drawHeight);
    const original = baseContext.getImageData(0, 0, side, side);
    const background = averageCornerColor(original.data, side, side);
    const maskData = new Uint8ClampedArray(side * side * 4);
    let minX = side, minY = side, maxX = -1, maxY = -1, foregroundCount = 0;
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const index = (y * side + x) * 4;
      const foreground = foregroundPixel(original.data[index], original.data[index + 1], original.data[index + 2], background);
      const value = foreground ? 255 : 0;
      maskData[index] = value; maskData[index + 1] = value; maskData[index + 2] = value; maskData[index + 3] = 255;
      if (foreground) {
        foregroundCount++;
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    const bboxWidth = maxX - minX + 1, bboxHeight = maxY - minY + 1;
    const useMask = foregroundCount >= side * side * 0.025 && bboxWidth >= 8 && bboxHeight >= 8 && bboxWidth < side * 0.99 && bboxHeight < side * 0.99;
    const cropX = useMask ? minX : 0, cropY = useMask ? minY : 0;
    const cropW = useMask ? bboxWidth : side, cropH = useMask ? bboxHeight : side;
    const padding = useMask ? Math.max(2, Math.round(Math.max(cropW, cropH) * 0.08)) : 0;
    const squareSide = Math.max(cropW, cropH) + padding * 2;
    const sourceX = Math.max(0, Math.floor((side - squareSide) / 2));
    const normalized = document.createElement("canvas");
    normalized.width = 128; normalized.height = 128;
    const normalizedContext = normalized.getContext("2d", { willReadFrequently: true });
    normalizedContext.fillStyle = "#fff";
    normalizedContext.fillRect(0, 0, 128, 128);
    const targetInset = useMask ? 4 : 0;
    const targetSide = 128 - targetInset * 2;
    const actualSquare = useMask ? squareSide : side;
    const sx = useMask ? Math.max(0, Math.floor((cropX + cropW / 2) - actualSquare / 2)) : 0;
    const sy = useMask ? Math.max(0, Math.floor((cropY + cropH / 2) - actualSquare / 2)) : 0;
    const sw = Math.min(side - sx, actualSquare), sh = Math.min(side - sy, actualSquare);
    normalizedContext.drawImage(base, sx, sy, sw, sh, targetInset, targetInset, targetSide, targetSide);
    const shapeSource = document.createElement("canvas");
    shapeSource.width = side; shapeSource.height = side;
    const shapeSourceContext = shapeSource.getContext("2d", { willReadFrequently: true });
    const maskImage = shapeSourceContext.createImageData(side, side);
    maskImage.data.set(maskData);
    shapeSourceContext.putImageData(maskImage, 0, 0);
    const shapeCanvas = document.createElement("canvas");
    shapeCanvas.width = 128; shapeCanvas.height = 128;
    const shapeContext = shapeCanvas.getContext("2d", { willReadFrequently: true });
    shapeContext.fillStyle = "#000"; shapeContext.fillRect(0, 0, 128, 128);
    shapeContext.drawImage(shapeSource, sx, sy, sw, sh, targetInset, targetInset, targetSide, targetSide);
    const shapePixels = shapeContext.getImageData(0, 0, 128, 128).data;
    const shape = [];
    for (let gy = 0; gy < 8; gy++) for (let gx = 0; gx < 8; gx++) {
      let count = 0;
      for (let y = gy * 16; y < (gy + 1) * 16; y++) for (let x = gx * 16; x < (gx + 1) * 16; x++) {
        const i = (y * 128 + x) * 4;
        if (shapePixels[i] > 120) count++;
      }
      shape.push(Math.round((count / 256) * 1000) / 1000);
    }
    const colorPixels = normalizedContext.getImageData(0, 0, 128, 128).data;
    const colorCounts = new Array(12).fill(0);
    let colorSamples = 0;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4, maskIndex = (y * 128 + x) * 4;
      if (shapePixels[maskIndex] <= 120) continue;
      colorCounts[Math.min(3, colorPixels[i] >> 6)]++;
      colorCounts[4 + Math.min(3, colorPixels[i + 1] >> 6)]++;
      colorCounts[8 + Math.min(3, colorPixels[i + 2] >> 6)]++;
      colorSamples++;
    }
    if (colorSamples < 20) {
      colorCounts.fill(0); colorSamples = 128 * 128;
      for (let i = 0; i < colorPixels.length; i += 4) {
        colorCounts[Math.min(3, colorPixels[i] >> 6)]++;
        colorCounts[4 + Math.min(3, colorPixels[i + 1] >> 6)]++;
        colorCounts[8 + Math.min(3, colorPixels[i + 2] >> 6)]++;
      }
    }
    for (let channel = 0; channel < 3; channel++) {
      const start = channel * 4;
      const total = colorCounts.slice(start, start + 4).reduce((sum, value) => sum + value, 0) || 1;
      for (let bin = 0; bin < 4; bin++) colorCounts[start + bin] = Math.round((colorCounts[start + bin] / total) * 1000) / 1000;
    }
    const small = document.createElement("canvas");
    small.width = 16; small.height = 16;
    const smallContext = small.getContext("2d", { willReadFrequently: true });
    smallContext.drawImage(normalized, 0, 0, 16, 16);
    const smallPixels = smallContext.getImageData(0, 0, 16, 16).data;
    const gray = [];
    for (let i = 0; i < smallPixels.length; i += 4) gray.push(0.299 * smallPixels[i] + 0.587 * smallPixels[i + 1] + 0.114 * smallPixels[i + 2]);
    return {
      key: String(metadata.key || ""),
      p_hash: createDctHash(gray),
      features: { shape, colors: colorCounts, contentHash },
      width, height,
      sourceSize: Number(metadata.size || blob.size || 0),
      sourceUploaded: String(metadata.uploaded || ""),
      previewDataUrl: base.toDataURL("image/jpeg", 0.68)
    };
  } finally {
    bitmap.close?.();
  }
}
