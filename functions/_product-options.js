// Product-option rules are catalog-category based, never inferred from a title
// or trusted from a customer-controlled category in the checkout payload.
export const SHOE_CATEGORIES = Object.freeze(["sneakers", "loafers", "dress-shoes", "sandals"]);
export const CUSTOM_SIZE_CATEGORIES = Object.freeze(["vi-nam-nu", "cap-tab-laptop", "tui-thoi-trang-golf", "tui-xach"]);
export function supportsProductSpecificSize(category) { return CUSTOM_SIZE_CATEGORIES.includes(String(category ?? "").trim().toLowerCase()); }
// Dép use the same mandatory 38–44 size selection and order-item size storage.

export function productOptionKind(category) {
  const key = String(category ?? "").trim().toLowerCase();
  // New Admin-created shoe categories also need sizes without another deploy.
  // Normalize Vietnamese names/slugs; sandals/dép share shoe sizing.
  const slug = key.replace(/đ/gu, "d").normalize("NFD").replace(/[\u0300-\u036f]/gu, "").replace(/[\s_]+/gu, "-");
  if (SHOE_CATEGORIES.includes(key) || /^(?:giay|shoe|shoes|boot|boots|dep|sandal|sandals)(?:-|$)/u.test(slug) || ["oxford", "oxfords", "derby", "derbies"].includes(slug)) return "shoe";
  if (key === "belts") return "belt";
  if (key === "phone-cases") return "phone";
  if (key === "watch-straps") return "watch";
  return "";
}

// Returns null for an invalid or omitted required selection. Return "" for
// unrelated product categories, which must not accept an invented option.
export function normalizeProductOption(category, value) {
  const kind = productOptionKind(category);
  if (!kind) return value == null || value === "" ? "" : null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  const option = String(value).trim().replace(/\s+/gu, " ");
  if (kind === "shoe") return /^(38|39|40|41|42|43|44)$/.test(option) ? option : null;
  if (kind === "belt") return ["3.5", "4.0"].includes(option) ? option : null;
  if (kind === "watch") return /^\d{2}-\d{2}$/.test(option) ? option : null;
  // A phone model must be specified; reject control characters, markup and
  // excessively long input. Unicode model names remain supported.
  if (option.length < 2 || option.length > 80 || /[<>\x00-\x1f\x7f]/u.test(option)) return null;
  return option;
}

export function productOptionLabel(category, option) {
  const kind = productOptionKind(category);
  if (kind === "shoe") return "Size " + option;
  if (kind === "belt") return "Bản dây " + option + " cm";
  if (kind === "phone") return "Dòng điện thoại: " + option;
  if (kind === "watch") return "Kích thước dây: " + option + " mm";
  return "";
}

export function normalizeProductSize(sizeOptions, value, category) { const values=Array.isArray(sizeOptions)?sizeOptions:[]; if(category!==undefined&&!supportsProductSpecificSize(category))return values.length?null:(value==null||value===""?"":null); if(!values.length)return value==null||value===""?"":null; if(values.length===1)return value==null||value===""||value===values[0]?values[0]:null; return typeof value==="string"&&values.includes(value)?value:null; }
export function normalizeProductImageVariant(imageVariants, value) { const values=Array.isArray(imageVariants)?imageVariants:[]; if(!values.length)return value==null||value===""?"":null; if(values.length===1)return value==null||value===""||value===values[0]?.image?values[0].image:null; return typeof value==="string"&&values.some(item=>item?.image===value)?value:null; }
