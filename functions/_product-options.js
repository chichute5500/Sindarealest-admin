// Product-option rules are catalog-category based, never inferred from a title
// or trusted from a customer-controlled category in the checkout payload.
export const SHOE_CATEGORIES = Object.freeze(["sneakers", "loafers", "dress-shoes"]);

export function productOptionKind(category) {
  const key = String(category ?? "").trim().toLowerCase();
  if (SHOE_CATEGORIES.includes(key)) return "shoe";
  if (key === "belts") return "belt";
  if (key === "phone-cases") return "phone";
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
  return "";
}
