import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const start = html.indexOf("function renderFilters(){");
const end = html.indexOf("\nfunction foldSearch(", start);
assert.ok(start >= 0 && end > start, "Product-category filter implementation must exist");
const filterSource = html.slice(start, end);
const container = { innerHTML: "" };
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[ch]);
const context = {
  products: [
    { category: "sneakers", categoryLabel: "Giày thể thao" },
    { category: "tui-golf", categoryLabel: "Túi golf" },
    { category: "tui-golf", categoryLabel: "Túi golf" },
    { category: "clutch", categoryLabel: "Clutch" },
    { category: "vi-nam", categoryLabel: "Ví nam" },
    { category: "vi-cam-tay", categoryLabel: "Ví cầm tay" },
    { category: "bags-x", categoryLabel: '<img src=x onerror=alert(1)>' }
  ],
  categoryLabels: { all: "Tất cả", sneakers: "Sneaker" },
  categoryOrder: ["all", "sneakers", "loafers", "dress-shoes", "belts", "wallets", "sandals", "watch-straps", "phone-cases"],
  selectedCategory: "missing",
  escapeHtml,
  $: (selector) => selector === "#categoryFilters" ? container : null
};
runInNewContext(filterSource + "\nrenderFilters();", context, { timeout: 1000 });
assert.equal(context.selectedCategory, "all", "A replaced catalog must reset a stale selected category");
assert.match(container.innerHTML, /data-category="sneakers"/, "Existing category remains");
assert.match(container.innerHTML, /data-category="tui-golf"/, "New bag category appears");
assert.match(container.innerHTML, /data-category="clutch"/, "New clutch category appears");
assert.match(container.innerHTML, /data-category="vi-nam"/, "Wallet subcategory is kept distinct");
assert.match(container.innerHTML, /data-category="vi-cam-tay"/, "Handheld wallet category is kept distinct");
assert.match(container.innerHTML, /Túi golf · 2/, "New category count is accurate");
assert.equal((container.innerHTML.match(/class="filter-pill/g) || []).length, 7, "All and six distinct categories appear");
assert.ok(!container.innerHTML.includes('<img src=x'), "Untrusted database labels must be HTML-escaped");
assert.match(container.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/, "HTML escaped category is still readable");
context.selectedCategory = "tui-golf";
runInNewContext(filterSource + "\nrenderFilters();", context, { timeout: 1000 });
assert.match(container.innerHTML, /class="filter-pill tap-target active" data-category="tui-golf" aria-pressed="true"/, "New category remains selectable");

console.log("PASS: storefront preserves familiar categories while exposing new D1 categories safely.");
