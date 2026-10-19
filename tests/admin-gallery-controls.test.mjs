import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
const renderStart = html.indexOf("function renderGallery()");
const clickStart = html.indexOf("$('#imageGrid').addEventListener('click'", renderStart);
assert.ok(renderStart >= 0 && clickStart > renderStart, "The product editor must render a gallery and delegate gallery clicks.");
const renderer = html.slice(renderStart, clickStart);
assert.equal((renderer.match(/<svg\\b/g) || []).length, 3, "Each of the three image controls must render its own inline SVG.");
for (const [action, label] of [["up", "Chuyển ảnh lên trước"], ["down", "Chuyển ảnh xuống sau"], ["remove", "Xóa ảnh"]]) {
  assert.ok(renderer.includes('type="button" data-gallery="' + action + '" data-index="${i}"'), action + " control must keep its button type, action, and gallery index.");
  assert.ok(renderer.includes('aria-label="' + label + '" title="' + label + '"'), action + " control must keep its accessible name and title.");
  assert.ok(renderer.includes('data-gallery="' + action + '" data-index="${i}"'), action + " control must retain data-gallery and data-index.");
}
assert.ok(renderer.includes("${i===0?'disabled':''}"), "The first image's move-up button must be disabled.");
assert.ok(renderer.includes("${i===gallery.length-1?'disabled':''}"), "The final image's move-down button must be disabled.");
assert.match(html, /\\.imagebuttons button svg\\{[^}]*pointer-events:none/);
assert.match(html, /background:var\\(--paper\\);color:var\\(--ink\\)/, "Icons must inherit a light/dark-aware foreground color.");
assert.match(html, /stroke="currentColor"/);
assert.match(html, /@media\\(max-width:420px\\)\\{\\.imagebuttons/);
assert.match(renderer, /const imageSrc=\\/\\^\\(blob:\\|data:\\|https\?:\\\\\\/\\\\\\/\\)/i.test\\(src\\)\\?src/);

const submitStart = html.indexOf("$('#productForm').addEventListener('submit'");
const deleteStart = html.indexOf("$('#deleteProduct').addEventListener('click'", submitStart);
assert.ok(submitStart >= 0 && deleteStart > submitStart, "The product submit handler must exist.");
const submit = html.slice(submitStart, deleteStart);
assert.match(submit, /Tải ảnh .* thất bại/);
assert.match(submit, /Không lưu được sản phẩm vào D1:/);
assert.match(submit, /Đã lưu sản phẩm nhưng chưa làm mới được danh sách/);
assert.match(submit, /URL\\.revokeObjectURL\\(previewUrl\\)/, "Replaced blob preview URLs must be released after a successful upload.");
assert.match(submit, /gallery\\.map\\(g=>g\\.url\\)/);
assert.match(submit, /không tự động xóa ảnh khỏi R2/);
console.log("PASS: admin gallery SVG controls, mobile/dark CSS, preview URL handling and upload-vs-save error messaging.");
