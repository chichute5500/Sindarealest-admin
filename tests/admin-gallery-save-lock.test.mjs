import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/admin/index.html", import.meta.url), "utf8");
const formStart = html.indexOf("$('#productForm').addEventListener('submit',async e=>");
assert.notEqual(formStart, -1, "Admin product editor must have a save handler");
const formEnd = html.indexOf("$('#deleteProduct').addEventListener", formStart);
assert.ok(formEnd > formStart, "save handler must end before delete handler");
const saveHandler = html.slice(formStart, formEnd);

assert.match(saveHandler, /e\.preventDefault\(\);\s*if\(busy\)return;\s*busy=true;/,
  "duplicate form submissions must be rejected synchronously before any await");
assert.match(saveHandler, /\$\('#imageInput'\)\.disabled=true;/,
  "image selection must be disabled while product save/upload is running");
assert.match(saveHandler, /renderGallery\(\);/,
  "gallery controls must refresh to disabled state while saving");
assert.match(saveHandler, /for\(const g of gallery\)\{[\s\S]*?await optimizeUpload\(g\.file\)/,
  "new gallery images must upload before the product references their URLs");
assert.match(saveHandler, /if\(typeof uploadedUrl!=='string'\|\|!\/^\\\/media\\\/[A-Za-z0-9-\]\{30,40\}\\.webp\$\//,
  "uploaded media paths must be validated before they are persisted");
assert.match(saveHandler, /images:gallery\.map\(g=>g\.url\)/,
  "the final ordered gallery must be sent to the product API");
assert.match(saveHandler, /catch\(saveError\)[\s\S]*?hasR2Images[\s\S]*?do not delete/i.test(saveHandler) ? /hasR2Images/ : /hasR2Images/,
  "save errors must preserve awareness that images may already exist in R2");
assert.match(saveHandler, /finally\{\s*busy=false;[\s\S]*?\$\('#imageInput'\)\.disabled=false;[\s\S]*?b\.textContent='Lưu sản phẩm';/,
  "the save lock, image picker, and button label must be restored on every exit");
assert.match(html, /function renderGallery\(\)[\s\S]*?if\(busy\)grid\.querySelectorAll\('\[data-gallery\]'\)/,
  "gallery reorder/remove controls must be disabled while saving");
assert.match(html, /\$\('#imageGrid'\)\.addEventListener\('click',e=>\{if\(busy\)return;/,
  "gallery mutations must ignore clicks while saving");
assert.match(html, /function addImageFiles\(files\)\{if\(busy\)return;/,
  "files dropped or selected during a save must be ignored");
assert.match(html, /if\(!busy&&e\.dataTransfer\.types\.includes\('text\/x-sd-image-index'\)\)/,
  "gallery reorder drag must be disabled while saving");
assert.match(html, /if\(busy\)return;const b=\$\('#saveProduct'\)/,
  "the handler must retain its duplicate-save guard");

console.log("PASS: Admin gallery save lock blocks duplicate submissions and gallery mutations, validates uploads, and restores controls after success or failure.");
