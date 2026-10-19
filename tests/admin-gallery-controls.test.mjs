import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
const renderStart = html.indexOf("function renderGallery()");
const clickStart = html.indexOf("$('#imageGrid').addEventListener('click'", renderStart);
assert.ok(renderStart >= 0 && clickStart > renderStart, "The product editor must render a gallery and delegate gallery clicks.");
const renderer = html.slice(renderStart, clickStart);
assert.equal(renderer.split("<svg").length - 1, 3, "Each of the three image controls must render its own inline SVG.");
assert.ok(renderer.includes('viewBox="0 0 24 24"'), "Inline SVGs must have an explicit viewBox.");
assert.ok(renderer.includes('stroke="currentColor"'), "SVG icons must follow the button foreground color.");
for (const [action, label] of [["up", "Chuyển ảnh lên trước"], ["down", "Chuyển ảnh xuống sau"], ["remove", "Xóa ảnh"]]) {
  assert.ok(renderer.includes('type="button" data-gallery="' + action + '" data-index="${i}"'), action + " control must keep type, action, and gallery index.");
  assert.ok(renderer.includes('aria-label="' + label + '" title="' + label + '"'), action + " control must keep its accessible name and title.");
}
assert.ok(renderer.includes("${i===0?'disabled':''}"), "The first image's move-up button must be disabled.");
assert.ok(renderer.includes("${i===gallery.length-1?'disabled':''}"), "The final image's move-down button must be disabled.");
assert.ok(!renderer.includes(">↑</button>") && !renderer.includes(">↓</button>") && !renderer.includes(">×</button>"), "Gallery controls must not use Unicode glyphs as their main icons.");
assert.ok(html.includes(".imagebuttons button svg{") && html.includes("pointer-events:none"), "SVG must not intercept button clicks.");
assert.ok(html.includes("content:'Không tải được ảnh'"), "Failed image requests must show a visible error label.");
assert.ok(html.includes("if(busy)grid.querySelectorAll('[data-gallery]')"), "Gallery action buttons must be disabled while saving.");
assert.ok(html.includes("function addImageFiles(files){if(busy)return;"), "Adding files must be blocked during save/upload.");

assert.ok(html.includes("background:var(--paper);color:var(--ink)"), "Buttons must use theme-aware foreground and background colors.");
assert.ok(html.includes("@media(max-width:420px){.imagebuttons"), "Gallery controls must have a narrow-mobile layout rule.");
assert.ok(renderer.includes("const src=String(g.url||'')") && renderer.includes("const imageSrc="), "Preview rendering must normalize URLs.");
assert.ok(renderer.includes("blob:") && renderer.includes("data:") && renderer.includes("https?:"), "blob:, data:, and HTTPS preview URLs must be kept intact.");
assert.ok(renderer.includes("src.replace("), "Relative image paths must be normalized.");

const submitStart = html.indexOf("$('#productForm').addEventListener('submit'");
const deleteStart = html.indexOf("$('#deleteProduct').addEventListener('click'", submitStart);
assert.ok(submitStart >= 0 && deleteStart > submitStart, "The product submit handler must exist.");
const submit = html.slice(submitStart, deleteStart);
assert.ok(submit.includes('Tải ảnh "') && submit.includes(" thất bại: "), "Image-upload errors must be clearly labeled separately.");
assert.ok(submit.includes("Không lưu được sản phẩm vào D1:"), "D1/save failures must have a distinct label.");
assert.ok(submit.includes("Đã lưu sản phẩm nhưng chưa làm mới được danh sách"), "A refresh failure after successful save must not be reported as a save failure.");
assert.ok(submit.includes("URL.revokeObjectURL(previewUrl)"), "A replaced blob preview URL must be released after a successful upload.");
assert.ok(submit.includes("g.temporary=false;renderGallery()"), "The gallery must refresh after each successful upload.");
assert.ok(submit.includes("busy=true;$('#imageInput').disabled=true;renderGallery();"), "Existing gallery controls must lock immediately when save starts.");
assert.ok(submit.includes("classList.contains('hidden'))renderGallery()"), "Failed saves must redraw the gallery to restore controls.");

assert.ok(submit.includes("gallery.map(g=>g.url)"), "The save payload must preserve the current gallery order.");
assert.ok(submit.includes("không tự động xóa ảnh khỏi R2"), "A failed database save must not trigger R2 deletion.");
console.log("PASS: admin gallery SVG controls, mobile/dark CSS, preview URL handling and upload-vs-save error messaging.");
