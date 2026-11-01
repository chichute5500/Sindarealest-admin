import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
const stateStart = html.indexOf("function orderReceiptState(summary){");
const stateEnd = html.indexOf("\nfunction orderReceiptStateLabel", stateStart);
assert.ok(stateStart >= 0 && stateEnd > stateStart, "Four-state receipt calculation is present");
const receiptState = new Function(html.slice(stateStart, stateEnd) + "; return orderReceiptState;")();
assert.deepEqual([
  receiptState({ requiredAmount: 1_400_000, netReceivedAmount: 0 }),
  receiptState({ requiredAmount: 1_400_000, netReceivedAmount: 1_000_000 }),
  receiptState({ requiredAmount: 1_400_000, netReceivedAmount: 1_400_000 }),
  receiptState({ requiredAmount: 1_400_000, netReceivedAmount: 1_600_000 }),
  receiptState({ requiredAmount: null, netReceivedAmount: 0 })
], ["none", "short", "exact", "over", "unknown"]);
const start = html.indexOf("function updateOrderReceiptPreview(form){");
const end = html.indexOf("\nfunction sdOrderStepDate", start);
assert.ok(start >= 0 && end > start, "Admin receipt preview helper is present");
const update = new Function("money", html.slice(start, end) + "; return updateOrderReceiptPreview;")(
  amount => new Intl.NumberFormat("vi-VN").format(amount) + " đ"
);

function preview({ option = "deposit", required = 1_400_000, current = 0, codExpected = 3_100_000, input = "" } = {}) {
  const inputNode = { value: input };
  const title = { textContent: "" };
  const received = { textContent: "" };
  const shortfall = { textContent: "" };
  const cod = { textContent: "" };
  const over = { textContent: "", closest: () => surplusRow };
  const surplusRow = { hidden: true };
  const nodes = {
    "[data-receipt-preview]": { dataset: { option, required: String(required), current: String(current), codExpected: String(codExpected), state: "" }, querySelector: selector => ({
      "[data-preview-title]": title,
      "[data-preview-received]": received,
      "[data-preview-shortfall]": shortfall,
      "[data-preview-cod]": cod,
      "[data-preview-over]": over
    })[selector] },
    "[data-transaction-amount]": inputNode
  };
  update({ querySelector: selector => nodes[selector] });
  return { state: nodes["[data-receipt-preview]"].dataset.state, title: title.textContent,
    received: received.textContent, shortfall: shortfall.textContent, cod: cod.textContent,
    over: over.textContent, surplusHidden: surplusRow.hidden };
}

assert.deepEqual(preview(), { state: "waiting", title: "Chưa ghi nhận tiền chuyển", received: "0 đ", shortfall: "1.400.000 đ", cod: "3.100.000 đ", over: "0 đ", surplusHidden: true });
assert.deepEqual(preview({ input: "1000000" }), { state: "short", title: "Nhận thiếu · còn thiếu 400.000 đ", received: "1.000.000 đ", shortfall: "400.000 đ", cod: "3.100.000 đ", over: "0 đ", surplusHidden: true });
assert.deepEqual(preview({ current: 1_000_000, input: "400000" }), { state: "exact", title: "Nhận đủ tiền cần chuyển", received: "1.400.000 đ", shortfall: "0 đ", cod: "3.100.000 đ", over: "0 đ", surplusHidden: true });
assert.deepEqual(preview({ input: "1400000" }), { state: "exact", title: "Nhận đủ tiền cần chuyển", received: "1.400.000 đ", shortfall: "0 đ", cod: "3.100.000 đ", over: "0 đ", surplusHidden: true });
assert.deepEqual(preview({ input: "1600000" }), { state: "over", title: "Nhận dư 200.000 đ", received: "1.600.000 đ", shortfall: "0 đ", cod: "2.900.000 đ", over: "200.000 đ", surplusHidden: false });
assert.deepEqual(preview({ option: "full", required: 4_275_000, current: 3_000_000, codExpected: 0 }), { state: "short", title: "Nhận thiếu · còn thiếu 1.275.000 đ", received: "3.000.000 đ", shortfall: "1.275.000 đ", cod: "0 đ", over: "0 đ", surplusHidden: true });
assert.equal(preview({ option: "full", required: 4_275_000, current: 3_000_000, codExpected: 0, input: "1275000" }).state, "exact");
console.log("PASS: Admin live receipt preview covers no transfer, short, exact, excess, and discounted full payment.");
