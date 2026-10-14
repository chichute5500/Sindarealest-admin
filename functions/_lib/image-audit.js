const CROCODILE_REAL_TERMS = [
  /\bda\s+c[aá]\s+s[aá]u\b/i, /\bgi[aà]y\s+c[aá]\s+s[aá]u\b/i, /\bc[aá]\s+s[aá]u\b/i,
  /鳄鱼皮/, /鳄鱼皮鞋/, /真鳄鱼/, /真皮鳄鱼/
];
const CROCODILE_FAKE_TERMS = [
  /仿鳄鱼皮/, /鳄鱼纹/, /压鳄鱼纹/, /鳄鱼压纹/, /人造鳄鱼皮/, /合成革/, /PU皮/i,
  /giả\s+da\s+c[aá]\s+s[aá]u/i, /vân\s+c[aá]\s+s[aá]u/i, /da\s+nhân\s+tạo/i, /synthetic\s+leather/i, /faux\s+leather/i
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
  const fakeEvidence = CROCODILE_FAKE_TERMS.some((pattern) => pattern.test(value));
  const realEvidence = CROCODILE_REAL_TERMS.some((pattern) => pattern.test(value));
  if (fakeEvidence) return { status: "reject", reason: "Có dấu hiệu da giả, vân cá sấu hoặc vật liệu tổng hợp." };
  if (realEvidence) return { status: "review", reason: "Có từ khóa da cá sấu nhưng cần bằng chứng xác nhận chất liệu thật." };
  return { status: "review", reason: "Chưa có đủ bằng chứng xác minh chất liệu da cá sấu thật." };
}
