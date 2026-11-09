import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const html=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const start=html.indexOf("function displayProductName(value)");
const end=html.indexOf("\nfunction preferred(",start);
assert.ok(start>=0&&end>start,"Tier labels use the existing display-only title helper");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const hasConfirmedPublicPrice=product=>!!product&&product.sourcePriceConfirmed===true&&product.price!==null&&product.price!==undefined&&Number.isFinite(Number(product.price));
const render=runInNewContext(html.slice(start,end)+"\nproductTitleWithTier",{escapeHtml,hasConfirmedPublicPrice},{timeout:1200});
const product=price=>({price,sourcePriceConfirmed:true});

assert.equal(render("GIÀY THỂ THAO VIP DA CÁ SẤU MẪU #001",true,product(3499999)),'<span class="sd-tier-badge sd-tier-core" aria-label="CORE"><span class="sd-tier-label">CORE</span></span>GIÀY THỂ THAO DA CÁ SẤU MẪU #001');
assert.equal(render("Giày Thể Thao VIP Da Cá Sấu",true,product(3500000)),'<span class="sd-tier-badge sd-tier-vip" aria-label="VIP"><span class="sd-tier-label">VIP</span></span>Giày Thể Thao Da Cá Sấu');
assert.equal(render("Ví Cầm Tay VIP Da Cá Sấu",true,product(6999999)).includes('aria-label="VIP"'),true);
const vvip=render("Túi VIP Da Cá Sấu",true,product(7000000));
assert.match(vvip,/sd-tier-vvip/);
assert.match(vvip,/sd-vvip-sparkle-layer/);
assert.equal((vvip.match(/class="sd-vvip-sparkle sd-vvip-sparkle-\d+"/g)||[]).length,12);
assert.equal(render("ví VIP xịn",true,product(4500000)).endsWith("Ví Xịn"),true);
assert.equal(render("VIP VIP1 SUPERVIP Viper VVIP",true,product(4500000)).endsWith("VIP1 SUPERVIP Viper VVIP"),true);
assert.equal(render("VIP <img src=x onerror=alert(1)>",false,product(4500000)).endsWith(" &lt;img src=x onerror=alert(1)&gt;"),true);
assert.equal(render("VIP không có giá",true,{price:null,sourcePriceConfirmed:false}),"VIP Không Có Giá");
assert.equal(render("VIP 123",false,product(3500000)).endsWith("123"),true);
assert.equal(render("Một sản phẩm",false,product(1000000)).endsWith("Một sản phẩm"),true);
assert.doesNotMatch(render("<script>VIP</script>",false,product(4500000)),/<script>/,"Untrusted titles must remain escaped");

assert.match(html,/\.sd-tier-badge\s*\{/);
assert.match(html,/\.sd-tier-vip \.sd-tier-label[^}]*animation:sd-vip-text-flare/);
assert.match(html,/\.sd-tier-vvip \.sd-vvip-sparkle-layer/);
assert.match(html,/@keyframes sd-vvip-twinkle/);
assert.ok((html.match(/productTitleWithTier/g)||[]).length>=9,"Catalog, details, cart, favorites, checkout, and order history must render the tier helper");
assert.doesNotMatch(html,/productTitleWithVip|sd-vip-word/,"Legacy red VIP rendering must be removed");
assert.match(html,/document\.title=displayProductName/,"SEO title remains plain text");
assert.match(html,/img\.alt=displayProductName/,"Image alt text remains plain text");
console.log("PASS: CORE/VIP/VVIP price bands, title cleanup, VIP flare and full-badge VVIP sparkles.");
