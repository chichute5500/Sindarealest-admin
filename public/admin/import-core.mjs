// Local-only CSV/directory reconciliation. Never mutates D1 or R2.
export const MAX_IMAGES_PER_PRODUCT = 50;
export const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REQUIRED_COLUMNS = ["Ảnh kết quả", "Danh mục", "Mẫu"];

/** Folder-price is an unconfirmed hint, never a selling price. */
export function folderPriceHint(folderName) {
  const name=String(folderName||"");
  const matches=[...name.matchAll(/(?:^|[^a-z0-9])(\d{2,6})\s*[kK](?=$|[^a-z0-9])/g)];
  if(matches.length!==1)return null;
  const v=Number(matches[0][1])*1000;
  return Number.isSafeInteger(v)&&v<=2_000_000_000?v:null;
}
/** Explicit seller input in VND, no implicit use of M-code or folder hint. */
export function confirmedVndPrice(text) {
  const raw=String(text??"").trim();
  if(!raw)return null;
  if(!/^(?:0|[1-9]\d{0,9})$/.test(raw))throw Error("Giá phải là số nguyên VND, ví dụ 2200000.");
  const n=Number(raw);
  if(!Number.isSafeInteger(n)||n>2_000_000_000)throw Error("Giá VND vượt giới hạn được phép.");
  return n;
}
export function normalizeImageColor(value) {
  const name=String(value??"").normalize("NFC").trim().replace(/\s+/g," ");
  if(!name||name.length>40)throw Error("Tên màu phải có từ 1 đến 40 ký tự.");
  if(/[<>]/.test(name))throw Error("Tên màu chứa ký tự không hợp lệ.");
  return name;
}


/** Map legacy storefront groups to existing category slugs without merging distinct wallet types. */
const KNOWN_CATEGORY_API_NAMES = Object.freeze({
  "giày thể thao": "Sneaker",
  "giày lười": "Giày lười",
  "giày tây": "Giày tây",
  "thắt lưng": "Thắt lưng",
  "dép": "Dép",
  "dây đồng hồ": "Dây đồng hồ",
  "ốp": "Ốp điện thoại"
});
export function categoryForImport(name) {
  const display = String(name || "").trim().normalize("NFC");
  return { apiCategory: KNOWN_CATEGORY_API_NAMES[display.toLocaleLowerCase("vi")] || display,
    categoryLabel: display };
}


export function parseCsv(text) {
  if (typeof text !== "string") throw Error("Không đọc được CSV.");
  text = text.replace(/^\uFEFF/, "");
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') {
      if (cell) throw Error("CSV có dấu nháy sai vị trí.");
      quoted = true;
    } else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); if (row.some((x) => x.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("CSV có dấu nháy chưa đóng.");
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  if (!rows.length) throw Error("CSV trống.");
  const headers = rows.shift().map((h) => h.trim());
  for (const col of REQUIRED_COLUMNS) if (!headers.includes(col)) throw Error("Thiếu cột: " + col);
  return rows.map((values, i) => {
    if (values.length !== headers.length) throw Error("CSV sai số cột tại dòng " + (i + 2));
    return Object.fromEntries(headers.map((h, n) => [h, values[n].trim()]));
  });
}

export function normPath(value) {
  const parts = String(value || "").normalize("NFC").replace(/\\/g, "/").split("/");
  if (parts.some((x) => x === "..")) return "";
  return parts.filter((x) => x && x !== ".").join("/").toLocaleLowerCase("vi");
}
function fileRelative(file) {
  const raw = file?.webkitRelativePath || file?.relativePath || "";
  const parts = normPath(raw).split("/");
  // webkitdirectory prepends the chosen root folder name.
  return parts.length > 1 ? parts.slice(1).join("/") : parts.join("/");
}
export function buildImportPlan(rows, files) {
  if (!Array.isArray(rows) || !Array.isArray(files)) throw Error("Dữ liệu nhập không hợp lệ.");
  const available = new Map(), collisions = new Set();
  for (const file of files) {
    const path = fileRelative(file);
    if (!path) continue;
    if (available.has(path)) collisions.add(path);
    else available.set(path, file);
  }
  const grouped = new Map(), seenPaths = new Set(), usedFiles = new Set();
  let duplicates = 0;
  for (const row of rows) {
    const path = normPath(row["Ảnh kết quả"]);
    const parts = path.split("/");
    if (parts.length !== 4 || !parts[0] || !parts[1] || !parts[3]) {
      throw Error("Đường dẫn không đúng cấu trúc Danh mục/Mẫu/Màu/Ảnh: " + row["Ảnh kết quả"]);
    }
    const category = (row["Danh mục"] || "").trim();
    if (!category || normPath(category) !== parts[0]) throw Error("Danh mục CSV không khớp: " + row["Ảnh kết quả"]);
    const modelFolder = row["Ảnh kết quả"].replace(/\\/g, "/").split("/")[1];
    const key = parts[0] + "/" + parts[1];
    if (!grouped.has(key)) {
      const name = modelFolder.replace(/^M\d{3,6}\s*-\s*/i, "").trim();
      grouped.set(key, {
        key, category, modelFolder, modelId: /^M\d{3,6}/i.exec(modelFolder)?.[0] || "",
        title: name || (row["Mẫu"] || "").trim() || modelFolder,
        priceInput: "", priceHint: folderPriceHint(modelFolder),
        images: [], missing: [], warnings: [], status: "ready", selected: true
      });
    }
    const group = grouped.get(key);
    if (seenPaths.has(path)) { duplicates++; group.warnings.push("Trùng đường dẫn CSV: " + path); continue; }
    seenPaths.add(path);
    let file = available.get(path);
    if (!file) {
      const candidates = [...available.entries()].filter(([p]) => p.endsWith("/" + path) || path.endsWith("/" + p));
      if (candidates.length === 1) file = candidates[0][1];
    }
    if (!file || collisions.has(path)) { group.missing.push(row["Ảnh kết quả"]); continue; }
    if (!ACCEPTED_IMAGE_TYPES.has(file.type) || file.size < 1 || file.size > MAX_ORIGINAL_BYTES) {
      group.warnings.push("Ảnh sai định dạng hoặc vượt 20 MB: " + file.name);
      continue;
    }
    group.images.push({file, path, color: normalizeImageColor(row["Màu"] || "Chưa rõ"), csvColor: normalizeImageColor(row["Màu"] || "Chưa rõ"), review: row["Ghi chú"] || ""});
    usedFiles.add(file);
  }
  const groups = [...grouped.values()];
  for (const g of groups) {
    if (g.missing.length || g.warnings.length || g.images.length > MAX_IMAGES_PER_PRODUCT || !g.images.length) {
      g.status = "blocked"; g.selected = false;
    }
  }
  return {
    groups, rows: rows.length, files: files.length,
    matched: groups.reduce((a,g)=>a+g.images.length,0),
    missing: groups.reduce((a,g)=>a+g.missing.length,0),
    unlisted: files.filter(f=>ACCEPTED_IMAGE_TYPES.has(f.type)&&!usedFiles.has(f)).length,
    reviewRows: groups.reduce((a,g)=>a+g.images.filter(x=>x.review.trim()).length,0),
    blocked: groups.filter((g)=>g.status==="blocked").length,
    duplicates
  };
}
