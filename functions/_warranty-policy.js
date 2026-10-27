/**
 * Shop policy is applied to the confirmed order's full subtotal,
 * not the discounted bank-transfer amount.
 * Existing warranties are never overwritten or extended.
 */
export function shopWarrantyPolicy(total) {
  if (!Number.isSafeInteger(total) || total < 0) throw new RangeError("Giá trị đơn hàng chưa hợp lệ để cấp bảo hành.");
  const durationMonths = total < 2_000_000 ? 6 : 12;
  return { durationMonths, policyName: "Bảo hành SinDarealest " + durationMonths + " tháng" };
}

export function addWarrantyCalendarMonths(startsAt, months) {
  if (typeof startsAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(startsAt) || !Number.isInteger(months) || months < 1 || months > 120) throw new RangeError("Ngày hoặc thời hạn bảo hành không hợp lệ.");
  const date = new Date(startsAt + "T00:00:00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== startsAt) throw new RangeError("Ngày bắt đầu không hợp lệ.");
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}

/**
 * Public display code, not an authentication secret.
 * Crockford-style 32-symbol alphabet avoids 0/O and 1/I ambiguity:
 * 32^4 = 1,048,576 possible codes. Existing 24-character codes remain valid.
 */
const WARRANTY_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateShortWarrantyCode() {
  const random = crypto.getRandomValues(new Uint8Array(4));
  return "SDW-" + Array.from(random, byte => WARRANTY_CODE_ALPHABET[byte & 31]).join("");
}

export function isWarrantyCode(value) {
  return /^SDW-(?:[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}|[A-Z0-9]{24})$/i.test(String(value || ""));
}

export function isWarrantyCodeCollisionError(error) {
  const message = String(error?.message || error || "");
  return /(?:UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE|UNIQUE violation).*warranties\.warranty_code/i.test(message);
}
