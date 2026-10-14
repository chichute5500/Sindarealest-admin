const CROCODILE_REAL_TERMS = [
  /\bda\s+c[aá]\s+s[aá]u\b/i, /\bgi[aà]y\s+c[aá]\s+s[aá]u\b/i, /\bc[aá]\s+s[aá]u\b/i,
  /鳄鱼皮/, /鳄鱼皮鞋/, /真鳄鱼/, /真皮鳄鱼/
];
const CROCODILE_FAKE_TERMS = [
  /(?:cá[ ]+sấu|giày[ ]+cá[ ]+sấu).{0,12}(?:giả|fake|imitation)/i,
  /c[aá]\s+s[aá]u.{0,20}(?:giả|fake|imitation|pu|synthetic)/i,
  /gi[aà]y.{0,24}(?:giả|fake|pu).{0,24}c[aá]\s+s[aá]u/i,
  /仿鳄鱼皮/, /鳄鱼纹/, /压鳄鱼纹/, /鳄鱼压纹/, /人造鳄鱼皮/, /合成革/, /PU皮/i,
  /giả\s+da\s+c[aá]\s+s[aá]u/i, /vân\s+c[aá]\s+s[aá]u/i, /da\s+nhân\s+tạo/i,
  /synthetic\s+leather/i, /faux\s+leather/i
];

export function normalizeImageRef(value) {
  return String(value || "").trim().replace(/^\/+/, "").replace(/^\.\//, "");
}

export function inventoryImages(products) {
  const references = [];
  const byImage = new Map();
  for (const product of products || []) {
    let images = [];
    try { images = Array.isArray(product.images) ? product.images : JSON.parse(product.images_json || "[]"); } catch {}
    if (!Array.isArray(images)) continue;
    for (const raw of images) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      const image = normalizeImageRef(raw);
      const item = { productId: String(product.id || ""), sku: String(product.sku || ""), title: String(product.title || ""), category: String(product.category || ""), image };
      references.push(item);
      if (!byImage.has(image)) byImage.set(image, []);
      byImage.get(image).push(item);
    }
  }
  const duplicates = [...byImage.entries()].filter(([, refs]) => refs.length > 1).map(([image, refs]) => ({ image, count: refs.length, products: refs }));
  return { productCount: (products || []).length, imageReferenceCount: references.length, uniqueImageCount: byImage.size, duplicateReferenceCount: references.length - byImage.size, duplicates, references };
}

export function assessCrocodileMaterial(text) {
  const value = String(text || "");
  if (CROCODILE_FAKE_TERMS.some(pattern => pattern.test(value))) return { status: "reject", reason: "Có dấu hiệu da giả, vân cá sấu hoặc vật liệu tổng hợp." };
  if (CROCODILE_REAL_TERMS.some(pattern => pattern.test(value))) return { status: "review", reason: "Có từ khóa da cá sấu nhưng cần bằng chứng xác nhận chất liệu thật." };
  return { status: "review", reason: "Chưa có đủ bằng chứng xác minh chất liệu da cá sấu thật." };
}

const CROCODILE_KEYWORDS = [/\bda\s+c[aá]\s+s[aá]u\b/i, /\bgi[aà]y\s+c[aá]\s+s[aá]u\b/i, /\bc[aá]\s+s[aá]u\b/i, /鳄鱼皮/, /鳄鱼皮鞋/, /真鳄鱼/, /真皮鳄鱼/, /鳄鱼/];
function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function evaluateSearchCandidate({ title = "", description = "", material = "", properties = "", similarityScore = null, comparisonMethod = "", calibrated = false } = {}) {
  const combined = [title, description, material, properties].filter(Boolean).join(" ");
  const normalized = normalizeSearchText(combined);
  const hasKeyword = CROCODILE_KEYWORDS.some(pattern => pattern.test(combined)) || /\b(?:da|giay)\s+ca\s+sau\b|\bca\s+sau\b/.test(normalized);
  const materialCheck = assessCrocodileMaterial(combined);
  const score = typeof similarityScore === "number" && Number.isFinite(similarityScore) && similarityScore >= 0 && similarityScore <= 100 ? similarityScore : null;
  const scoreIsVerified = comparisonMethod === "validated-visual-embedding-v1" && calibrated === true && score !== null;
  let reason;
  if (materialCheck.status === "reject") reason = materialCheck.reason;
  else if (!hasKeyword) reason = "Không có từ khóa bắt buộc về da cá sấu trong thông tin sản phẩm nguồn.";
  else if (!scoreIsVerified) reason = "Chưa có mô hình so khớp thị giác chuyên biệt được kiểm chứng và hiệu chuẩn; chưa thể xác nhận ngưỡng 90%.";
  else if (score < 90) reason = "Điểm tương đồng đã hiệu chuẩn thấp hơn ngưỡng bắt buộc 90%.";
  else reason = "Đạt ngưỡng so khớp đã hiệu chuẩn và từ khóa; chất liệu da thật vẫn cần người quản trị xác minh.";
  return { eligible: materialCheck.status !== "reject" && hasKeyword && scoreIsVerified && score >= 90, similarityScore: scoreIsVerified ? score : null, hasKeyword, materialCheck, reason };
}
