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
