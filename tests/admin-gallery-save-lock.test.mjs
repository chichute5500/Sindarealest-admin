import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
const formStart = html.indexOf("$('#productForm').addEventListener('submit',async e=>");
assert.notEqual(formStart, -1, "Admin product editor must have a save handler");
const formEnd = html.indexOf("$('#deleteProduct').addEventListener", formStart);
assert.ok(formEnd > formStart, "save handler must end before delete handler");
const saveHandler = html.slice(formStart, formEnd);

assert.ok(/e\.preventDefault\(\);\s*if\(busy\)return;\s*busy=true;/.test(saveHandler),
  "duplicate form submissions must be rejected synchronously before any await");
assert.ok(saveHandler.includes("$('#imageInput').disabled=true;"),
  "image selection must be disabled while product save/upload is running");
assert.ok(saveHandler.includes("await optimizeUpload(g.file)"),
  "new gallery images must upload before the product references their URLs");
assert.ok(saveHandler.includes("if(typeof uploadedUrl!=='string'||!/^\\/media\\/[A-Za-z0-9-]{30,40}\\.webp$/"),
  "uploaded media paths must be validated before they are persisted");
assert.ok(saveHandler.includes("images:gallery.map(g=>g.url)"),
  "the final ordered gallery must be sent to the product API");
assert.ok(saveHandler.includes("hasR2Images") && saveHandler.includes("không tự động xóa ảnh khỏi R2."),
  "save errors must disclose that already-uploaded R2 images may remain; no unsafe automatic cleanup is implied");
assert.ok(/finally\{\s*busy=false;[\s\S]*?\$\('#imageInput'\)\.disabled=false;[\s\S]*?b\.textContent='Lưu sản phẩm';/.test(saveHandler),
  "the save lock, image picker, and button label must be restored on every exit");
assert.ok(/function renderGallery\(\)[\s\S]*?if\(busy\)grid\.querySelectorAll\('\[data-gallery\]'\)/.test(html),
  "gallery reorder/remove controls must be disabled while saving");
assert.ok(html.includes("$('#imageGrid').addEventListener('click',e=>{if(busy)return;"),
  "gallery mutations must ignore clicks while saving");
assert.ok(html.includes("function addImageFiles(files){if(busy)return;"),
  "files dropped or selected during a save must be ignored");
assert.ok(html.includes("if(!busy&&e.dataTransfer.types.includes('text/x-sd-image-index'))"),
  "gallery reorder drag must be disabled while saving");

console.log("PASS: Admin gallery save lock blocks duplicate submissions and gallery mutations, validates uploads, and restores controls after success or failure.");
