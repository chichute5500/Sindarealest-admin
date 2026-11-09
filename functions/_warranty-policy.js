/**
 * Shop policy is applied to each confirmed product's unit price,
 * not the total order value or the discounted bank-transfer amount.
 * Existing warranties are never overwritten or extended.
 */
export function shopWarrantyPolicy(total) {
  if (!Number.isSafeInteger(total) || total < 0) throw new RangeError("Giá trị đơn hàng chưa hợp lệ để cấp bảo hành.");
  const durationMonths = total <= 3_000_000 ? 6 : 12;
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
  return "SDW" + Array.from(random, byte => WARRANTY_CODE_ALPHABET[byte & 31]).join("");
}

export function isWarrantyCode(value) {
  return /^(?:SDW[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}|SDW-(?:[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}|[A-Z0-9]{24}))$/i.test(String(value || "")) || /^SDW-[A-Z0-9]{24}$/i.test(String(value || ""));
}

export function isWarrantyCodeCollisionError(error) {
  const message = String(error?.message || error || "");
  return /(?:UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE|UNIQUE violation).*(?:manual_)?warranties\.warranty_code/i.test(message);
}

/** Contract text fixed at issuance. Future changes require a NEW version. */
export const WARRANTY_POLICY_VERSION="SD-WARRANTY-2026-11-05-V1";
export const WARRANTY_POLICY_COPY=Object.freeze({
 coverage:"Bảo hành các lỗi phát sinh từ quá trình sản xuất và hoàn thiện sản phẩm.",
 exclusions:"Không áp dụng với hư hỏng do va đập, sử dụng không đúng cách hoặc tác động bên ngoài.",
 materialAuthenticity:"Da cá sấu thật 100%.",
 materialRemedy:"Phát hiện da giả, đền bù gấp 10 lần giá trị sản phẩm.",
 priceBasis:"Đơn giá xác nhận của từng sản phẩm trước ưu đãi hoặc giảm giá.",
 standardDurationRule:"Đến 3.000.000đ: bảo hành 6 tháng; trên 3.000.000đ: bảo hành 12 tháng."
});
export function createWarrantyPolicySnapshot({unitPrice,durationMonths,startsAt,endsAt,policyName}){
 if(!Number.isSafeInteger(unitPrice)||unitPrice<0||unitPrice>2_000_000_000)throw new RangeError("Chưa có giá sản phẩm đã xác nhận.");
 if(!Number.isInteger(durationMonths)||durationMonths<1||durationMonths>120||
   addWarrantyCalendarMonths(startsAt,durationMonths)!==endsAt)throw new RangeError("Thời hạn bảo hành không hợp lệ.");
 if(typeof policyName!=="string"||policyName.trim().length<3||policyName.length>160)throw new RangeError("Tên chính sách không hợp lệ.");
 const standardMonths=shopWarrantyPolicy(unitPrice).durationMonths;
 return JSON.stringify({version:WARRANTY_POLICY_VERSION,issuedAt:new Date().toISOString(),
  policyName,durationMonths,startsAt,endsAt,unitPriceVnd:unitPrice,...WARRANTY_POLICY_COPY,
  durationNote:durationMonths===standardMonths
    ?"Thời hạn theo chính sách chuẩn tại thời điểm cấp phiếu."
    :"Thời hạn riêng được ghi nhận khi cấp phiếu, ưu tiên thời hạn hiển thị trên phiếu."});
}
/** Never return private reference price or buyer data to public lookup. */
export function readWarrantyPolicySnapshot(raw){
 if(typeof raw!=="string"||!raw||raw.length>6000)return null;
 let v;try{v=JSON.parse(raw)}catch{return null}
 if(!v||typeof v!=="object"||Array.isArray(v))return null;
 const keys=["version","issuedAt","policyName","startsAt","endsAt","coverage","exclusions",
   "materialAuthenticity","materialRemedy","priceBasis","standardDurationRule","durationNote"];
 if(keys.some(k=>typeof v[k]!=="string"||!v[k]||v[k].length>1000)||
  !/^[A-Z0-9-]{5,80}$/.test(v.version)||!Number.isSafeInteger(v.unitPriceVnd)||
  v.unitPriceVnd<0||!Number.isInteger(v.durationMonths)||v.durationMonths<1||v.durationMonths>120)return null;
 try{if(addWarrantyCalendarMonths(v.startsAt,v.durationMonths)!==v.endsAt)return null}catch{return null}
 return Object.fromEntries([...keys,"durationMonths"].map(k=>[k,v[k]]));
}
