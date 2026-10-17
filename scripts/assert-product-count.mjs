import { readFileSync } from "node:fs";
import { parseCliJson } from "./cloudflare-utils.mjs";

const [filePath, expectedText] = process.argv.slice(2);
if (!filePath || !/^\d+$/.test(expectedText || "")) {
  throw new Error("Dùng: node scripts/assert-product-count.mjs <tệp-json-wrangler> <số-lượng-mong-đợi>");
}

const payload = parseCliJson(readFileSync(filePath, "utf8"), "số lượng sản phẩm D1");
const findCount = value => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCount(item);
      if (found !== null) return found;
    }
  } else if (value && typeof value === "object") {
    if (Object.hasOwn(value, "product_count")) {
      const count = Number(value.product_count);
      return Number.isSafeInteger(count) && count >= 0 ? count : null;
    }
    for (const item of Object.values(value)) {
      const found = findCount(item);
      if (found !== null) return found;
    }
  }
  return null;
};

const expected = Number(expectedText);
const count = findCount(payload);
if (count === null) throw new Error("Không xác minh được product_count; đã dừng để an toàn.");
if (count !== expected) {
  throw new Error(`Số sản phẩm D1 là ${count}; cần đúng ${expected}. Thao tác đã bị từ chối.`);
}
console.log(`PASS: product_count=${count}.`);
