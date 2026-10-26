import assert from "node:assert/strict";
import { validateProduct } from "../functions/_lib.js";
import { readFileSync } from "node:fs";
import { parseCsv, buildImportPlan, normPath, MAX_IMAGES_PER_PRODUCT, categoryForImport, folderPriceHint, confirmedVndPrice, normalizeImageColor } from "../public/admin/import-core.mjs";

const csv = "\uFEFFẢnh gốc,Ảnh kết quả,Danh mục,Mẫu,Màu,Ghi chú\r\n" +
 '"A,1","Clutch\\M0023 - Clutch Nap\\Nâu\\anh (1).webp",Clutch,"Clutch, Nắp",Nâu,Cần xem lại\r\n' +
 ',Clutch\\M0023 - Clutch Nap\\Đen\\anh (2).webp,Clutch,Clutch,Đen,\r\n';
const rows = parseCsv(csv);
assert.equal(rows.length, 2);
assert.equal(rows[0]["Ảnh gốc"], "A,1");
assert.equal(rows[0]["Mẫu"], "Clutch, Nắp");
assert.equal(rows[0]["Màu"], "Nâu");
assert.equal(normPath(rows[0]["Ảnh kết quả"]), "clutch/m0023 - clutch nap/nâu/anh (1).webp");
const files = [
  { name:"anh (1).webp", size:500, type:"image/webp",
    webkitRelativePath:"KET_QUA_NHOM_MAU/Clutch/M0023 - Clutch Nap/Nâu/anh (1).webp" },
  { name:"anh (2).webp", size:700, type:"image/webp",
    webkitRelativePath:"KET_QUA_NHOM_MAU/Clutch/M0023 - Clutch Nap/Đen/anh (2).webp" }
];
const plan=buildImportPlan(rows,files);
assert.equal(plan.groups.length,1);
assert.equal(plan.groups[0].images.length,2);
assert.equal(plan.groups[0].status,"ready");
assert.equal(plan.groups[0].selected,true);
assert.equal(plan.groups[0].title,"Clutch Nap");
assert.equal(plan.matched,2);
assert.equal(plan.missing,0);
assert.equal(plan.groups[0].modelId,"M0023","M-folder code is metadata, not a commercial SKU");
assert.equal(plan.groups[0].priceInput,"","No price is auto-assigned from folder name");
assert.equal(folderPriceHint("M0023 - Clutch Mau Den 2200K"),2200000,"Folder K amounts are unconfirmed hints");
assert.equal(confirmedVndPrice("2200000"),2200000);
assert.equal(confirmedVndPrice(""),null,"Unset selling prices remain null");
assert.throws(()=>confirmedVndPrice("2200K"),/số nguyên VND/);
assert.throws(()=>confirmedVndPrice("-1"),/số nguyên VND/);
assert.equal(normalizeImageColor("  Xanh dương  "),"Xanh dương");

assert.equal(plan.unlisted,0,"Every source image is accounted for");
assert.equal(plan.reviewRows,1,"CSV review markers remain visible");
const unlisted=buildImportPlan(rows,[...files,{name:"not-in-CSV.webp",size:500,type:"image/webp",webkitRelativePath:"KET_QUA_NHOM_MAU/Clutch/M0023 - Clutch Nap/Đen/not-in-CSV.webp"}]);
assert.equal(unlisted.unlisted,1,"An image missing from the CSV must be reported, not silently discarded");
assert.deepEqual(plan.groups[0].images.map(x=>x.color),["Nâu","Đen"]);

const noPhoto=buildImportPlan(rows,[]);
assert.equal(noPhoto.groups[0].status,"blocked");
assert.equal(noPhoto.missing,2);

const duplicated=buildImportPlan([...rows,rows[0]],files);
assert.equal(duplicated.duplicates,1);
assert.equal(duplicated.groups[0].status,"blocked");

function groupedPhotos(n){
  const largeRows=Array.from({length:n},(_,i)=>({
    "Ảnh kết quả":"Cặp-tab-laptop\\M0062 - Tui Hop 4000K\\Chưa rõ\\anh-"+i+".webp",
    "Danh mục":"Cặp-tab-laptop","Mẫu":"Tui Hop 4000K",
  }));
  const largeFiles=largeRows.map((r,i)=>({
    name:"anh-"+i+".webp", size:100, type:"image/webp",
    webkitRelativePath:"KET_QUA_NHOM_MAU/"+r["Ảnh kết quả"].replace(/\\/g,"/")
  }));
  return buildImportPlan(largeRows,largeFiles);
}
const fortyFour=groupedPhotos(44);
assert.equal(fortyFour.groups[0].images.length,44);
assert.equal(fortyFour.groups[0].status,"ready", "All 44 photos must stay on one product");
const over=groupedPhotos(MAX_IMAGES_PER_PRODUCT+1);
assert.equal(over.groups[0].status,"blocked", "Never silently drop photos above ceiling");


assert.deepEqual(categoryForImport("Giày thể thao"),{apiCategory:"Sneaker",categoryLabel:"Giày thể thao"});
assert.deepEqual(categoryForImport("Ốp"),{apiCategory:"Ốp điện thoại",categoryLabel:"Ốp"});
assert.deepEqual(categoryForImport("ví cầm tay"),{apiCategory:"ví cầm tay",categoryLabel:"ví cầm tay"});
const sampleImages=Array.from({length:44},(_,i)=>"images/sample"+i+".webp");
const colorValues=sampleImages.map((_,i)=>i<20?"Đen":i<35?"Nâu":"Xanh");
const accepted=validateProduct({title:"Một mẫu 44 ảnh",sku:"SD-CL001",category:"Clutch",published:false,price:2200000,images:sampleImages,imageColors:colorValues});
assert.equal(accepted.error,undefined,"Server must accept full 44 images within one model");
assert.equal(accepted.value.images.length,44);
assert.deepEqual(accepted.value.imageColors,colorValues);
assert.equal(accepted.value.price,2200000,"Seller-confirmed price persisted");
assert.equal(accepted.value.published,0,"Imported 44-image model remains unpublished");
const rejected=validateProduct({title:"Quá số ảnh",sku:"TEST-051",category:"Clutch",published:false,
  images:[...sampleImages,...Array.from({length:7},(_,i)=>"images/extra"+i+".webp")]});
assert.match(rejected.error,/Bộ ảnh không hợp lệ/,"Server blocks >50 images without dropping pictures");
const invalidColors=validateProduct({title:"Màu không khớp",sku:"SD-CL003",category:"Clutch",published:false,images:sampleImages,imageColors:["Nâu"]});
assert.match(invalidColors.error,/Số nhãn màu/);

assert.throws(()=>parseCsv("a,b\n1"),/Thiếu cột/);
assert.throws(()=>parseCsv("Ảnh kết quả,Danh mục,Mẫu\n\"unfinished"),/nháy chưa đóng/);
assert.throws(()=>buildImportPlan([{...rows[0],"Ảnh kết quả":"Clutch\\..\\a.webp"}],files),/Đường dẫn/);

const importer=readFileSync(new URL("../public/admin/import.html",import.meta.url),"utf8");
assert.match(importer,/webkitdirectory/);
assert.match(importer,/published:false/, "Only draft products may be created");
assert.match(importer,/\/api\/admin\/upload/, "Existing authenticated private-original upload must be reused");
assert.match(importer,/\/api\/admin\/products/, "Existing authenticated product API must be reused");
assert.doesNotMatch(importer,/method\s*:\s*["']DELETE["']/i, "Importer must never erase live catalog");
const admin=readFileSync(new URL("../public/admin/index.html",import.meta.url),"utf8");
assert.match(admin,/href="\/admin\/import\.html"/);
console.log("PASS: folder/CSV reconciliation, missing/duplicate/51-photo blocking and 44-photo preservation, safe draft-only import entry.");
