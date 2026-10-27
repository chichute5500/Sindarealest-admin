import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const start=html.indexOf("function displayProductName(value)");
const end=html.indexOf("\nfunction preferred(",start);
assert.ok(start>=0&&end>start,"Use the existing title-case helper for display only");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const emphasize=runInNewContext(html.slice(start,end)+"\nproductTitleWithVip",{escapeHtml},{timeout:1200});

assert.equal(emphasize("GIÀY TÂY VIP DA CÁ SẤU"),'Giày Tây <span class="sd-vip-word">VIP</span> Da Cá Sấu');
assert.equal(emphasize("ví vip xịn"),'Ví <span class="sd-vip-word">VIP</span> Xịn');
assert.equal(emphasize("VIP VIP").match(/class="sd-vip-word"/g)?.length,2);
assert.equal(emphasize("Đế Viper VVIP VIP1 SUPERVIP"),"Đế Viper Vvip Vip1 Supervip","Do not mark VIP embedded inside another word");
assert.equal(emphasize("VIP <img src=x onerror=alert(1)>"),'<span class="sd-vip-word">VIP</span> &lt;Img Src=X Onerror=Alert(1)&gt;');
assert.equal(emphasize("vip 123",false),'<span class="sd-vip-word">VIP</span> 123');
assert.equal(emphasize("Một sản phẩm",false),"Một sản phẩm");
assert.ok(!emphasize('<script>vip</script>').includes("<script>"),"Untrusted titles must remain escaped");

const css=html.match(/<style id="sd-vip-product-title-2026-10-27">([\s\S]*?)<\/style>/)?.[1];
assert.ok(css,"Dedicated scoped VIP style must exist");
assert.match(css,/\.sd-vip-word\s*\{[^}]*color:#cf2034/);
assert.match(css,/html\.dark \.sd-vip-word\s*\{[^}]*color:#ff4859/);
assert.match(css,/font-weight:900/);
assert.match(css,/font-family:"SD Sans"/,"VIP must use the existing Noto Sans web font");
assert.match(css,/font-style:normal/,"VIP must not be italic");
assert.doesNotMatch(css,/font-style:italic/);
assert.match(html,/<h3 class="product-title">\$\{productTitleWithVip/,"Catalog must highlight VIP");
assert.match(html,/<button class="featured-title product-title"[^>]*>\$\{productTitleWithVip/,"Featured VIP styling must match");
assert.match(html,/\$\('#detailTitle'\)\.innerHTML=productTitleWithVip/,"Product detail must highlight VIP safely");
assert.match(html,/<div class="cart-row-copy"><strong>\$\{productTitleWithVip/,"Cart product names must highlight VIP");
assert.match(html,/name\.innerHTML=productTitleWithVip/,"Checkout product names must highlight VIP");
assert.match(html,/productTitleWithVip\(p\.title\|\|'Sản phẩm tuyển chọn'\)/,"Favorites must keep VIP");
assert.match(html,/productTitleWithVip\(item\.title\|\|'Sản phẩm',false\)/,"Order history must keep VIP");
assert.match(html,/document\.title=displayProductName/,"SEO title must remain plain text");
assert.match(html,/img\.alt=displayProductName/,"Image alt text must remain plain text");
console.log("PASS: display-only red VIP highlight in product title, detail, cart, favorites, checkout; secure text and light/dark CSS preserved.");
