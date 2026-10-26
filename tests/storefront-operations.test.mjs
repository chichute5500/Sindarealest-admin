import assert from 'node:assert/strict';
import { onRequest as seoMiddleware } from '../functions/_middleware.js';
import { onRequestPost as createOrder } from '../functions/api/orders.js';
import { onRequestPost as createWarrantyClaim } from '../functions/api/warranty-claims.js';
import { onRequestPost as lookupWarranty } from '../functions/api/warranty-lookup.js';
import { onRequestGet as sitemap } from '../functions/sitemap.xml.js';
import { onRequestGet as robots } from '../functions/robots.txt.js';
import { readFileSync } from 'node:fs';
const storefrontHtml = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const contactStart = storefrontHtml.indexOf('<div class="contact-grid">');
const contactSectionStart = storefrontHtml.lastIndexOf('<section class="footer-contacts"', contactStart);
const contactEnd = storefrontHtml.indexOf('</section>', contactSectionStart);
const contactMarkup = storefrontHtml.slice(contactStart, contactEnd);
const warrantyHelpStart = storefrontHtml.indexOf('<div class="warranty-help');
const footerBottomStart = storefrontHtml.indexOf('<div class="footer-bottom">');
assert.ok(contactEnd > contactStart && warrantyHelpStart > contactEnd && footerBottomStart > warrantyHelpStart, 'Warranty support must remain available but live outside the contact section.');
assert.match(storefrontHtml, /@media\(max-width:760px\)\{\s*\.footer-contacts \.contact-grid\{grid-template-columns:minmax\(0,1fr\)/, 'Mobile contact links must follow the one-column reference layout.');
assert.equal((contactMarkup.match(/class="contact-link/g) || []).length, 6, 'The contact area should use six reference-aligned rows, grouping Zalo and phone without duplicating the same number.');
assert.ok(storefrontHtml.includes('class="text-link tap-target" href="#about">Tìm hiểu thêm →</a>'), 'The craftsmanship tile must link to the existing about section.');
assert.ok(!storefrontHtml.includes('href="#craftsmanship"'), 'The storefront must not keep the missing #craftsmanship target.');
assert.ok(contactMarkup.includes('<strong>Zalo / Điện thoại</strong>'), 'Zalo and phone must share one contact row as in the reference.');
assert.ok(contactMarkup.includes('href="https://zalo.me/0827049192"') && contactMarkup.includes('href="tel:+84827049192"'), 'The combined contact row must keep both the Zalo and phone actions usable.');
assert.ok(contactMarkup.includes('Hẻm 48 Võ Trường Toàn, Đà Lạt, Lâm Đồng, Việt Nam'), 'The exact supplied street address must be shown in the contact area.');
const legacyProducts = JSON.parse(readFileSync(new URL('../data/legacy-products.json', import.meta.url), 'utf8'));
assert.equal(legacyProducts.length, 235, 'The read-only legacy product fixture should retain all 235 product records.');
assert.ok(legacyProducts.every(product => product.sku === null && product.skuVerified === false), 'Legacy fixture SKUs must be null when unverified; do not retain generated commercial SKU values.');
assert.ok(storefrontHtml.includes("function visibleSku(p){return p&&p.skuVerified!==false?String(p.sku||'').trim():''}"), 'Storefront must have one explicit helper that hides unverified fixture identifiers.');
assert.ok(storefrontHtml.includes('<input id="catalogSearch" type="search" aria-label="Tìm theo tên sản phẩm hoặc mã SKU"'), 'Catalog search input must have an explicit accessible name independent of its placeholder.');
assert.ok(storefrontHtml.includes('placeholder="Tìm sản phẩm hoặc mã SKU…"'), 'Catalog search placeholder must stay concise enough to remain legible on narrow mobile screens.');
assert.ok(storefrontHtml.includes("n===page?'aria-current=\"page\"':''"), "The currently selected catalog page must expose aria-current=\"page\" to assistive technology.");
assert.ok(storefrontHtml.includes("<nav class=\"pagination\" id=\"pagination\" aria-label=\"Phân trang sản phẩm\"></nav>"), "Product pagination must be a named navigation landmark.");
assert.ok(storefrontHtml.includes('id="categoryFilters" role="group" aria-label="Lọc theo danh mục"'), "Catalog category filters must be a named group in the accessibility tree.");
assert.ok(!storefrontHtml.includes('class="fulfillment-filter-row"') && !storefrontHtml.includes('id="fulfillmentFilters"') && !storefrontHtml.includes("selectedFulfillment") && !storefrontHtml.includes('data-fulfillment="'), "The unnecessary dedicated product-status filter panel and its interactive controls must be fully removed.");
assert.ok(storefrontHtml.includes('<style id="sd-catalog-liquid-glass-reference-2026-10-23">')
  && storefrontHtml.includes('--sd-catalog-glass-default:rgba(255,255,255,0.48)')
  && storefrontHtml.includes('--sd-catalog-glass-hover:rgba(255,255,255,0.72)')
  && storefrontHtml.includes('--sd-catalog-glass-selected:rgba(255,255,255,0.82)')
  && storefrontHtml.includes('--sd-catalog-ink:#183B5B')
  && storefrontHtml.includes('--sd-catalog-muted:#6C89A6')
  && storefrontHtml.includes('--sd-catalog-accent:#1684E8')
  && storefrontHtml.includes('--sd-catalog-edge:#B5D9F8'),
  'Catalog search and category pills must define the agreed icy-blue Liquid Glass tokens.');
assert.ok(storefrontHtml.includes('#products .filter-pill.active,')
  && storefrontHtml.includes('#products .filter-pill[aria-pressed="true"]')
  && storefrontHtml.includes('#products .filter-pill::after{')
  && storefrontHtml.includes('z-index:-1;')
  && storefrontHtml.includes('animation:sdCatalogSpecularSweep .46s cubic-bezier(.2,.8,.2,1) both;')
  && storefrontHtml.includes('15%{opacity:.70}')
  && storefrontHtml.includes('52%{opacity:.66;background-position:45% 0;')
  && storefrontHtml.includes('mix-blend-mode:normal;')
  && storefrontHtml.includes('rgba(22,132,232,.32) 40%')
  && storefrontHtml.includes('rgba(22,132,232,.28) 58%')
  && storefrontHtml.includes('html.dark #products .filter-pill::after{')
  && storefrontHtml.includes('mix-blend-mode:screen;')
  && storefrontHtml.includes('#products .filter-pill:active:not(:disabled)')
  && storefrontHtml.includes('#products .filter-pill:focus-visible'),
  'Persistent selected, physical pressed and keyboard-focus states must be implemented as distinct catalog-pill states.');
assert.ok(storefrontHtml.includes('@keyframes sdCatalogGlassActivate{')
  && storefrontHtml.includes('animation:sdCatalogGlassActivate .46s cubic-bezier(.2,.8,.2,1) both;')
  && storefrontHtml.includes('@keyframes sdCatalogGlassActivateDark{')
  && storefrontHtml.includes('#products .filter-pill[aria-pressed="true"]{animation:none!important}'),
  'Selecting a category must produce a visible glass-pop/glow animation in light and dark themes, while respecting reduced-motion preferences.');
assert.ok(storefrontHtml.includes('#products .filter-pill:active:not(:disabled):not(.active):not([aria-pressed="true"])')
  && storefrontHtml.includes('html.dark #products .filter-pill:active:not(:disabled):not(.active):not([aria-pressed="true"])'),
  'Pressed selectors must be at least as specific as unselected-chip hover selectors in both themes, so physical press overrides hover.');
assert.ok(storefrontHtml.includes('@media(hover:hover) and (pointer:fine)')
  && storefrontHtml.includes('@media(prefers-reduced-motion:reduce)')
  && storefrontHtml.includes('@supports not (backdrop-filter: blur(20px))'),
  'Catalog Liquid Glass must respect hover-capable devices, reduced-motion preferences and a no-backdrop-filter fallback.');
assert.ok(storefrontHtml.includes('flex:0 0 auto;\n  min-width:max-content;\n  max-width:100%;')
  && storefrontHtml.includes('white-space:nowrap;\n  overflow-wrap:normal;')
  && storefrontHtml.includes('flex-wrap:wrap;\n  align-content:flex-start;\n  overflow:visible;'),
  'Catalog pills must retain natural content width and wrap as complete chips rather than squeeze text vertically on mobile.');
assert.ok(storefrontHtml.includes('#products .catalog-tools .filter-pills{\n  min-width:0;\n  max-width:100%;\n  column-gap:18px;\n  row-gap:10px;')
  && storefrontHtml.includes('@media(min-width:1200px){\n  #products .catalog-tools{\n    width:calc(100% - 88px);\n    margin:0 auto 18px;\n  }\n}')
  && storefrontHtml.includes('@media(max-width:760px){\n  /* Mobile gets its own touch-first layout; desktop spacing never leaks into this breakpoint. */')
  && storefrontHtml.includes('font-size:16px;\n    line-height:1.35;')
  && storefrontHtml.includes('min-height:38px;\n    padding:6px 13px;\n    font-size:14px;')
  && storefrontHtml.includes('#products .filter-pill::before{')
  && storefrontHtml.includes('inset:-3px 0;')
  && storefrontHtml.includes('@media(max-width:390px){')
  && storefrontHtml.includes('@media(max-width:360px){')
  && storefrontHtml.includes('touch-action:manipulation;')
  && storefrontHtml.includes('#products .catalog-tools .filter-pills{gap:7px;column-gap:7px;row-gap:8px}'),
  'Desktop spacing and dedicated touch-first mobile sizing, tap targets, readable search text and compact 360px chip wrapping must all remain explicit.');
assert.ok(storefrontHtml.includes('0 0 0 2px rgba(157,211,250,0.62)')
  && storefrontHtml.includes('0 0 10px 2px rgba(83,169,255,0.23)')
  && storefrontHtml.includes('0 0 25px 6px rgba(87,174,255,.18)')
  && storefrontHtml.includes('26%{transform:scale(1.08) translateY(-2px);filter:brightness(1.08) saturate(1.12);')
  && storefrontHtml.includes('linear-gradient(180deg,rgba(255,255,255,.55) 0%,rgba(239,249,255,.38) 45%,rgba(183,222,255,.26) 100%)')
  && storefrontHtml.includes('border-color:rgba(255,255,255,.90)')
  && storefrontHtml.includes('radial-gradient(125% 160% at 18% 0%,rgba(255,255,255,.70) 0%,rgba(255,255,255,.22) 34%,rgba(255,255,255,0) 74%)')
  && storefrontHtml.includes('linear-gradient(108deg,rgba(255,255,255,0) 18%,rgba(255,255,255,.62) 46%,rgba(255,255,255,0) 72%)')
  && storefrontHtml.includes('background-size:190% 100%,230% 100%,100% 100%')
  && storefrontHtml.includes('backdrop-filter:blur(22px) saturate(175%);')
  && storefrontHtml.includes('font-size:15px;\n  font-weight:650;'),
  'The selected pill must use a layered translucent glass surface, pale reflective rim, soft diffuse blue halo, visible spring pop and readable label typography.');
assert.ok(storefrontHtml.includes('#products .search-field:hover:not(:focus-within)')
  && storefrontHtml.includes('#products .search-field:active')
  && storefrontHtml.includes('#products .search-field:active svg')
  && storefrontHtml.includes('background:linear-gradient(180deg,rgba(221,241,255,.90) 0%,rgba(244,251,255,.78) 48%,rgba(255,255,255,.76) 100%),var(--sd-catalog-glass-selected);\n  border-color:rgba(255,255,255,.94);\n  transform:translateY(1px) scale(.965);'),
  'Search and pill controls must provide separate hover/pressed feedback while preserving persistent selection.');

assert.ok(storefrontHtml.includes("selectedCategory===c?'active':'')")
  && storefrontHtml.includes("selectedCategory==='all'||p.category===selectedCategory")
  && storefrontHtml.includes("const q=foldSearch(($('#catalogSearch').value||'').trim())")
  && storefrontHtml.includes("visibleSku(p)")
  && storefrontHtml.includes("function fulfillmentBadge(p,detail=false)"),
  'Catalog must preserve dynamically counted category selection, search/category filtering, verified-SKU search and per-product status metadata.');

assert.ok(storefrontHtml.includes("#order .section-head .section-note{width:min(440px,48vw);max-width:100%;min-width:0;white-space:normal;overflow-wrap:break-word}"), "The order-section summary must wrap within the available heading width rather than clip at the right edge.");
assert.ok(storefrontHtml.includes("Mã SKU: ${escapeHtml(visibleSku(p)||'Chưa được cung cấp')}"), 'Storefront product cards must clearly disclose when no verified SKU is available.');
assert.ok(storefrontHtml.includes('mã SKU chưa được cung cấp') && storefrontHtml.includes('Chọn mẫu yêu thích và ghi lại tên mẫu'), 'Zalo/order guidance must use product names and disclose missing SKU rather than inventing one.');
assert.ok(!storefrontHtml.includes('ghi lại mã SKU để tư vấn nhanh'), 'Order guidance must not instruct customers to record unverified fixture SKUs.');
assert.ok(storefrontHtml.includes('id="accountFavoritesAction"') && storefrontHtml.includes('id="accountFavoritesView"') && storefrontHtml.includes('id="accountFavoritesList"'), 'Account must expose a functional favorites screen rather than a dead menu row.');
assert.ok(storefrontHtml.includes('id="detailFavorite"') && storefrontHtml.includes('aria-pressed="false"') && storefrontHtml.includes("const FAVORITES_STORAGE_KEY='sd-favorites'"), 'Product details must expose an accessible heart control backed by local favorites storage.');
assert.ok(!storefrontHtml.includes('tap-ripple') && !storefrontHtml.includes('ringRipple') && !storefrontHtml.includes('setupTapRing'), 'Interactive controls must not create expanding ripple effects.');
assert.ok(storefrontHtml.includes('.tap-target:active::before{opacity:1;transform:scale(1)}')
  && storefrontHtml.includes('.icon-btn:active,.mini-add:active,.detail-zoom-btn:active,.detail-gallery-arrow:active,.featured-arrow:active{transform:scale(.97)}')
  && storefrontHtml.includes('inset 0 2px 8px rgba(20,42,60,.14)')
  && storefrontHtml.includes('rgba(92,145,185,.16)')
  && storefrontHtml.includes('transition:opacity .14s cubic-bezier(.2,.7,.2,1),transform .14s cubic-bezier(.2,.7,.2,1)')
  && storefrontHtml.includes('.icon-btn:active svg,.mini-add:active svg,.detail-favorite-btn:not([aria-pressed="true"]):active svg'),
  'Pressed controls must use the 0.97 control scale, inset glass depth, accent tint and 140ms timing baseline.');
assert.ok(storefrontHtml.includes('background:rgba(255,255,255,.42);color:#142a3c;border:1px solid rgba(255,255,255,.72)')
  && storefrontHtml.includes('backdrop-filter:blur(16px) saturate(145%)')
  && storefrontHtml.includes('0 8px 24px rgba(20,42,60,.10),inset 0 1px 0 rgba(255,255,255,.80)'),
  'Light icon controls must follow the documented Liquid Glass surface, border, blur, shadow and inset highlight.');
assert.ok(storefrontHtml.includes('.detail-favorite-btn[aria-pressed="true"]{background:rgba(255,255,255,.42);border-color:rgba(255,255,255,.72);color:#E5484D}')
  && storefrontHtml.includes('.detail-favorite-btn[aria-pressed="true"] svg path{fill:currentColor;stroke:currentColor}')
  && storefrontHtml.includes('html.dark .icon-btn,html.dark .mini-add,html.dark .detail-favorite-btn'),
  'The favorite heart must be filled red only while selected, with an adaptive dark-mode glass surface.');

assert.ok(storefrontHtml.includes('id="sd-icon-state-specificity-fix-2026-10-22"')
  && storefrontHtml.includes('#productOverlay #detailFavorite[aria-pressed="true"]{')
  && storefrontHtml.includes('color:#E5484D!important')
  && storefrontHtml.includes('fill:#E5484D!important')
  && storefrontHtml.includes('stroke:#E5484D!important')
  && storefrontHtml.includes('#productOverlay #detailFavorite:not([aria-pressed="true"]):active{')
  && storefrontHtml.includes('background:rgba(234,243,251,.48)!important')
  && storefrontHtml.includes('transform:scale(.97)!important'),
  'Favorite states and pressed Liquid Glass feedback must override later contrast-pass !important rules.');

assert.ok(storefrontHtml.includes('#productOverlay #detailFavorite:not([aria-pressed="true"]):active svg')
  && storefrontHtml.includes('#productOverlay #detailFavorite[aria-pressed="true"] svg path{')
  && storefrontHtml.includes('fill:#E5484D!important')
  && storefrontHtml.includes('stroke:#E5484D!important'),
  'Accent-blue pressed tint must apply only while the heart is unselected; a favorited heart must remain red-filled.'); 

assert.ok(storefrontHtml.includes('html.dark #productOverlay #detailFavorite:not([aria-pressed="true"]):active')
  && storefrontHtml.includes('background:rgba(92,145,185,.20)!important')
  && storefrontHtml.includes('html.dark #productOverlay #detailFavorite[aria-pressed="true"]'),
  'Dark mode must retain a distinct pressed glass tint and red selected heart under cascade overrides.');


assert.ok(storefrontHtml.includes("function showToast(msg,link=null){const t=$('#toast');const panelOpen=['#cartDrawer','#checkoutDrawer','#accountDrawer'].some(selector=>$(selector)?.classList.contains('open'))"),
  'A successful detail add must show its success toast while the product overlay is open.');
assert.ok(storefrontHtml.includes('.toast{position:fixed;z-index:1400;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));')
  && storefrontHtml.includes('@media(max-width:760px){.toast{bottom:calc(84px + env(safe-area-inset-bottom));}}'),
  'Toast must be positioned above the mobile bottom navigation instead of being hidden beneath it.');
assert.ok(storefrontHtml.includes("function addToCart(id){const p=products.find(x=>(x.id||x.slug)===id)||products.find(x=>x.sku===id);if(!p)return false;const key=p.id||p.slug;if(!key)return false;cart[key]=(cart[key]||0)+1;saveCart();showToast(`Đã thêm ${visibleSku(p)||p.title||'sản phẩm'} vào giỏ chọn`);return true}"),
  'The one existing addToCart function must report invalid identities and only report success after the single cart mutation and badge save.');

assert.ok(storefrontHtml.includes('@media(prefers-reduced-motion:reduce)'),
  'Control feedback must remain covered by the storefront reduced-motion policy.');

assert.ok(storefrontHtml.includes('function selectedCartSourceImage(button)')
  && storefrontHtml.includes("if(button.id==='detailAdd')return $('#detailMainImage')")
  && storefrontHtml.includes('const selected=track?.children[index]')
  && storefrontHtml.includes("return productCard.querySelector('.product-photo img,.feature-single,.feature-slide')"),
  'The shared cart flight must use the currently displayed detail image, selected featured-carousel image, or actual product-card image.');
assert.ok(storefrontHtml.includes('function addToCartFromControl(id,button)')
  && storefrontHtml.includes("$('#detailAdd').addEventListener('click',e=>addToCartFromControl(e.currentTarget.dataset.add,e.currentTarget))")
  && storefrontHtml.includes('e.stopPropagation();addToCartFromControl(add.dataset.add,add);return'),
  'Every product add control must invoke one shared feedback wrapper while preserving the single existing addToCart business operation.');
assert.ok(storefrontHtml.includes("t.classList.toggle('toast-detail-context',Boolean($('#productOverlay')?.classList.contains('open')))")
  && storefrontHtml.includes('.toast.toast-detail-context{bottom:calc(156px + env(safe-area-inset-bottom))}')
  && storefrontHtml.includes("t.classList.remove('show','toast-detail-context')"),
  'A successful detail toast must clear the fixed add-to-cart action instead of covering the button on mobile; card toasts keep their normal placement.');
assert.ok(storefrontHtml.includes('function flyProductCardToCart(sourceElement,productId)')
  && storefrontHtml.includes("clone.dataset.sourceType=sourceElement.classList.contains('product-card')?'product-card':'detail-image'")
  && storefrontHtml.includes("clone.dataset.cartTargetId=target.id")
  && storefrontHtml.includes("clone.dataset.durationMs='900'")
  && storefrontHtml.includes("clone.dataset.productId=String(productId||'')")
  && storefrontHtml.includes("clone.className='sd-fly-to-cart-clone'")
  && storefrontHtml.includes('function activeCartFlightTarget()')
  && storefrontHtml.includes('opacity=raw<.76?1:1-.63*((raw-.76)/.24)'),
  'Successful add flies the full actual clicked product tile in 900ms to the visible desktop/mobile cart with a reduced-motion-safe fallback.');
assert.ok(storefrontHtml.includes('if(cartMotionReduced()||!sourceElement||!sourceElement.isConnected)return false')
  && storefrontHtml.includes('function confirmCartTargets()')
  && storefrontHtml.includes('#cartOpen.sd-cart-bump svg,#mobileCartNav.sd-cart-bump svg{animation:sdCartIconShake 1s')
  && storefrontHtml.includes('#cartOpen.sd-cart-confirmed,#mobileCartNav.sd-cart-confirmed')
  && storefrontHtml.includes('@media(prefers-reduced-motion:reduce){#cartOpen.sd-cart-bump svg,#mobileCartNav.sd-cart-bump svg{animation:none!important;transform:none!important}'),
  'Missing source geometry must never block cart mutation; both cart controls keep successful-add acknowledgement and reduced-motion behavior.');

assert.ok(storefrontHtml.includes('localStorage.setItem(FAVORITES_STORAGE_KEY,JSON.stringify(favorites))') && storefrontHtml.includes('data-favorite-remove') && storefrontHtml.includes('data-favorite-open'), 'Favorites must persist locally and support opening or removing saved products.');
assert.ok(storefrontHtml.includes('id="accountAddressAction"') && storefrontHtml.includes('id="accountAddressView"') && storefrontHtml.includes('id="accountAddressForm"'), 'Account must expose an editable shipping-address book.');
assert.ok(storefrontHtml.includes('#accountAddressView[hidden]{display:none!important}'), 'The editable address panel must remain hidden until the user selects it; a display:grid rule must not override the hidden state.');
assert.ok(storefrontHtml.includes("const LOCAL_ADDRESS_KEY='sd-shipping-address'") && storefrontHtml.includes("localStorage.setItem(LOCAL_ADDRESS_KEY,JSON.stringify(next))"), 'Shipping address is saved only after explicit user submit and remains on the current device.');
assert.ok(storefrontHtml.includes('Thông tin bạn lưu dưới đây chỉ nằm trong bộ nhớ trình duyệt trên thiết bị hiện tại'), 'The local-only shipping address behavior must be disclosed clearly.');
assert.ok(storefrontHtml.includes('prefillCheckoutFromLocalAddress()') && storefrontHtml.includes('accountAddressProvince') && storefrontHtml.includes('accountAddressWard'), 'Saved local address should prefill checkout fields while keeping them editable.');
assert.ok(storefrontHtml.includes('id="accountOrdersAction"') && storefrontHtml.includes('id="accountOrdersView"') && storefrontHtml.includes('id="accountOrdersList"'), 'Account must expose a history view for accepted order requests from the current device.');
assert.ok(storefrontHtml.includes("const LOCAL_ORDER_HISTORY_KEY='sd-local-order-history'") && storefrontHtml.includes('rememberOrderRequest(result,items)'), 'Only a successful server acceptance should enter the local order-request history.');
const orderHistoryFunctionStart = storefrontHtml.indexOf('function rememberOrderRequest(');
const orderHistoryFunctionEnd = storefrontHtml.indexOf('function hasPublicPrice(', orderHistoryFunctionStart);
const orderHistoryFunction = storefrontHtml.slice(orderHistoryFunctionStart, orderHistoryFunctionEnd);
assert.ok(storefrontHtml.includes('không phải lịch sử tài khoản đồng bộ')
  && orderHistoryFunctionStart >= 0
  && orderHistoryFunctionEnd > orderHistoryFunctionStart
  && !orderHistoryFunction.includes('fullName')
  && !orderHistoryFunction.includes('phone')
  && !orderHistoryFunction.includes('email')
  && !orderHistoryFunction.includes('address'),
'Order history must disclose its local-only scope and not persist checkout contact details.');



assert.ok(storefrontHtml.includes('id="warrantyLookupForm"') && storefrontHtml.includes('/api/warranty-lookup') && !storefrontHtml.includes('warrantyOtpStep') && !storefrontHtml.includes('/api/warranty-verification'), 'Warranty lookup must work without OTP');
assert.ok(storefrontHtml.includes('Sequential welcome reveal') && storefrontHtml.includes('welcome-content>.welcome-logo') && storefrontHtml.includes('welcome-content>.welcome-skip'), 'Welcome should reveal the logo and brand intro sequentially before the entry button');
assert.ok(storefrontHtml.includes('<span class="brand-copy"><span class="brand-name">SinDarealest</span><small class="brand-tagline">Thời Trang Da Cá Sấu</small></span>'), 'The primary brand lockup must include its Vietnamese descriptor.');
assert.match(storefrontHtml, /@media\(max-width:760px\)\{\s*\.nav-actions #contactJump,\.nav-actions #themeToggle\{display:none!important\}/, 'Mobile header should match the reference with compact search/cart actions; contact and theme remain in their dedicated account/footer destinations.');
assert.match(storefrontHtml, /\.nav-actions #searchJump,\.nav-actions #cartOpen\{display:grid\}/, 'Search and cart must remain visible in the compact mobile header.');
assert.match(storefrontHtml, /\.brand-tagline\{display:block;margin-top:2px;color:var\(--nav-muted\);font-size:8px/, 'The brand descriptor must remain small, legible and aligned to the wordmark.');
assert.match(storefrontHtml, /\.nav-wrap \.nav \.brand-tagline\{margin-top:2px;font-size:7px/, 'The brand descriptor must fit the mobile reference header without widening the navigation.');
assert.ok(storefrontHtml.includes('html.theme-transitioning body:after') && storefrontHtml.includes('html.theme-transitioning .theme-bg') && storefrontHtml.includes('transition-duration:.25s!important;transition-timing-function:ease!important'), 'Theme-related transitions must be capped at 250 ms when switching themes');
assert.ok(!storefrontHtml.includes('CRAFTED WITH<br>CHARACTER') && !storefrontHtml.includes('hero-stamp-image-spacer') && !storefrontHtml.includes('.hero-stamp{'), 'Entire unwanted hero stamp and glass styling must be removed while preserving the sneaker hero');
assert.ok(!storefrontHtml.includes('id="heroDarkShoe"') && !storefrontHtml.includes('id="heroLightShoe"') && !storefrontHtml.includes('hero-art'), 'Hero product images must be removed from the storefront intro');
const heroMarkup = storefrontHtml.match(/<section class="sd-code-hero wrap" id="home"[\s\S]*?<\/section>/)?.[0] || '';
assert.ok(heroMarkup.includes('Sự tinh tế trong từng đường nét, khẳng định giá trị thẩm mỹ của bạn.')
 && heroMarkup.includes('Khám phá ngay') && heroMarkup.includes('từ da cá sấu'),
 'Code-only Hero must keep the established concise Vietnamese copy and one CTA.');
assert.ok(!/<(?:img|picture|canvas|video)\b/.test(heroMarkup) && !heroMarkup.includes('heroProductImage'),
 'Code-only Hero must not load presentation photography or leave an empty image frame.');
const heroCss = readFileSync(new URL('../public/code-hero.css', import.meta.url), 'utf8');
assert.ok(heroCss.includes('height:420px') && heroCss.includes('height:clamp(236px,66vw,270px)')
 && heroCss.includes('html.dark .sd-code-hero') && !heroCss.includes('!important'),
 'Compact responsive Liquid Glass Hero must be isolated and render in light/dark without override stacks.');
assert.ok(storefrontHtml.includes('.theme-bg{position:fixed;inset:0') && storefrontHtml.includes('transform:none;will-change:opacity'), 'Background artwork should not scale or drift while scrolling');
const themeCacheHeaders = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
assert.ok(storefrontHtml.includes('theme-croc-dark.webp?v='), 'Dark crocodile background URL must be versioned to invalidate old immutable cache entries');
assert.ok(storefrontHtml.includes('theme-croc-albino.webp?v='), 'Light crocodile background URL must be versioned to invalidate old immutable cache entries');
assert.ok(!/theme-croc-dark\.webp(?!\?v=)/.test(storefrontHtml), 'Every dark theme image reference must include a cache-busting version');
assert.ok(!/theme-croc-albino\.webp(?!\?v=)/.test(storefrontHtml), 'Every light theme image reference must include a cache-busting version');

assert.ok(storefrontHtml.includes(".theme-bg--dark{background-color:#061522;background-image:url('images/liquid-glass-dark.svg?v=20261022-3')"),
  'Dark ambient mode must use the current navy-satin crease SVG asset.');
assert.ok(storefrontHtml.includes(".theme-bg--light{background-color:#eaf3fb;background-image:url('images/liquid-glass-light.svg?v=20261022-3')"),
  'Light ambient mode must use the current pearl-blue satin crease SVG asset.');
assert.ok(storefrontHtml.includes(".theme-bg--light{background-color:#eaf3fb;background-image:url('images/liquid-glass-light.svg?v=20261022-3');background-repeat:no-repeat;background-position:center;background-size:cover;filter:none}"),
  'The final light ambient rule must keep the reference blue hue without the old color-cast filter.');
assert.match(storefrontHtml, /\.mobile-bottom-nav\{background:rgba\(244,250,255,\.78\)\}/,
  'Mobile bottom navigation must balance visible Liquid Glass translucency with label readability.');
assert.match(storefrontHtml, /\.mobile-tab\.is-active\{color:var\(--nav-ink\);border-color:var\(--line\);background:rgba\(226,241,252,\.96\)/,
  'The selected mobile tab must remain visually distinct and opaque enough to keep its label readable.');
assert.match(storefrontHtml, /html\.dark \.mobile-tab\.is-active\{background:rgba\(13,39,58,\.97\)\}/,
  'The selected mobile tab must retain a clear navy glass state in dark mode.');
assert.match(storefrontHtml, /html\.dark \.mobile-bottom-nav\{background:rgba\(5,22,38,\.82\);border-color:rgba\(174,207,231,\.34\)\}/,
  'Mobile bottom navigation must retain a readable translucent navy glass surface in dark mode.');
assert.match(storefrontHtml, /@media\(max-width:380px\)\{#order\{padding-bottom:calc\(88px \+ env\(safe-area-inset-bottom\)\)!important\}\}/,
  'Narrow mobile order details must reserve space below the assurance/CTA area so the fixed bottom navigation cannot cover it.');
assert.ok(storefrontHtml.includes('linear-gradient(118deg,rgba(225,241,255,.72),rgba(211,231,249,.68) 52%,rgba(237,247,255,.74))'),
  'The final light glaze must leave medium crocodile-texture visibility instead of washing the background flat.');
assert.match(storefrontHtml, /\.theme-bg--light::after\{[^}]*rgba\(239,247,255,\.68\)/,
  'Light background must soften the high-contrast texture without removing the crocodile material.');
assert.match(storefrontHtml, /\.theme-bg--dark::after\{[^}]*rgba\(3,20,36,\.62\)/,
  'Dark background must receive a deep-navy glaze rather than remain nearly black.');
assert.ok(storefrontHtml.includes('.theme-watermark{opacity:.035}') &&
  storefrontHtml.includes('html.dark .theme-watermark{opacity:.045}'),
  'The background brand watermark must stay subtle and not compete with content.');
assert.match(storefrontHtml, /@media\(max-width:850px\) and \(min-width:761px\)\{\s*\.navlinks\{display:none\}/,
  'Compact tablet navigation must prevent the full desktop navbar from clipping at 768 CSS pixels.');
assert.ok(storefrontHtml.includes(".welcome-texture--dark{background-image:url('images/liquid-glass-dark.svg?v=20261022-3');filter:none}"),
  'The dark welcome screen must share the current cache-versioned sapphire satin artwork.');
assert.ok(storefrontHtml.includes(".welcome-texture--light{background-image:url('images/liquid-glass-light.svg?v=20261022-3');filter:none}"),
  'The light welcome screen must share the curated pearl wave artwork.');
assert.match(storefrontHtml, /class="mosaic-photo material-photo material-photo--dark" src="images\/theme-croc-dark\.webp\?v=20261017-1"/,
  'The editorial material sample image must keep its black-material identity.');
assert.match(storefrontHtml, /class="mosaic-photo material-photo material-photo--light" src="images\/theme-croc-albino\.webp\?v=20261017-1"/,
  'The editorial material sample image must keep its albino-material identity.');

const adminThemeHtml = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
assert.ok(adminThemeHtml.includes('theme-croc-dark.webp?v='), 'Admin dark theme background URL must also be cache-busted');
assert.ok(!/theme-croc-dark\.webp(?!\?v=)/.test(adminThemeHtml), 'Admin theme background must not retain an unversioned dark asset reference');
assert.ok(themeCacheHeaders.includes('/images/theme-croc-dark.webp\n  ! Cache-Control\n  Cache-Control: public, max-age=0, must-revalidate'), 'Dark theme asset must detach inherited immutable caching and revalidate when its stable path is requested');
assert.ok(themeCacheHeaders.includes('/images/theme-croc-albino.webp\n  ! Cache-Control\n  Cache-Control: public, max-age=0, must-revalidate'), 'Light theme asset must detach inherited immutable caching and revalidate when its stable path is requested');
assert.ok(!storefrontHtml.includes('sd-admin-shortcut') && !storefrontHtml.includes('href="/admin/"'), 'The public storefront must not expose a management link while admin remains at its separate route');
assert.ok(storefrontHtml.includes('sdMenuItemIn') && storefrontHtml.includes('mobile-nav.open .navlink:nth-child(6)'), 'Mobile glass menu items should animate in a staggered sequence');
assert.ok(!storefrontHtml.includes("(mod&&['u','s','c'].includes(k))") && storefrontHtml.includes("e.target.closest('img, picture')"), 'Text selection and copy must remain available outside protected images');
assert.ok(storefrontHtml.includes('id="checkoutProvince"') && storefrontHtml.includes('id="checkoutWard"') && storefrontHtml.includes('streetAddress'), 'Checkout must collect province, ward, and detailed street address');
const warrantyClaimSource = readFileSync(new URL('../functions/api/warranty-claims.js', import.meta.url), 'utf8');
const backupSource = readFileSync(new URL('../functions/api/admin/backup.js', import.meta.url), 'utf8');
const restoreSource = readFileSync(new URL('../functions/api/admin/restore.js', import.meta.url), 'utf8');
for (const table of ['customer_address_details','order_shipping_addresses','order_item_details','warranty_claim_attachments']) {
  assert.ok(backupSource.includes('boundedTableQuery(db, "' + table + '"'), 'Backup must include bounded query for ' + table);
  assert.ok(restoreSource.includes('INSERT INTO ' + table), 'Restore must reinsert ' + table);
}
assert.ok(restoreSource.includes('DELETE FROM warranty_claim_uploads') && restoreSource.includes("DELETE FROM settings WHERE key LIKE 'warranty_upload:%'") && restoreSource.includes("DELETE FROM settings WHERE key LIKE 'warranty_lookup:%'") && !restoreSource.includes('DELETE FROM warranty_verifications'), 'Restore must clear temporary upload and lookup tokens without requiring OTP tables');
const uploadSource = readFileSync(new URL('../functions/api/warranty-claim-uploads.js', import.meta.url), 'utf8');
assert.ok(uploadSource.includes('INSERT INTO settings(key,value,updated_at)') && uploadSource.includes('warranty_upload:'), 'New uploads must store short-lived tokens in the existing settings table');
assert.ok(warrantyClaimSource.includes('warranty_upload:') && warrantyClaimSource.includes('DELETE FROM settings WHERE key=?'), 'Claim submission must validate and consume the upload token');
assert.ok(restoreSource.includes('operations.warrantyClaimAttachments'), 'Restore must preserve claim attachment metadata');
assert.ok(!warrantyClaimSource.includes('warranty_verifications') && warrantyClaimSource.includes('isWarrantyEligibleOnDate'), 'Warranty claims must not require OTP and must validate the warranty using the shared Vietnam-local date check');
assert.ok(warrantyClaimSource.includes('w.starts_at'), 'Warranty claim validation must fetch the warranty start date');
assert.ok(uploadSource.includes('w.starts_at'), 'Warranty photo upload validation must fetch the warranty start date');
const warrantyLookupSource = readFileSync(new URL('../functions/api/warranty-lookup.js', import.meta.url), 'utf8');
assert.ok(warrantyLookupSource.includes('maskedWarrantyCode') && warrantyLookupSource.includes('claimToken') && !warrantyLookupSource.includes('warrantyCode: code') && warrantyLookupSource.includes('maskedPhone') && warrantyLookupSource.includes('maskedAddress'), 'Public warranty lookup must return masked data and a short-lived action token');
const adminWarrantiesSource = readFileSync(new URL('../functions/api/admin/warranties.js', import.meta.url), 'utf8');
const sharedLibSource = readFileSync(new URL('../functions/_lib.js', import.meta.url), 'utf8');
const adminHtmlSource = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
assert.ok(warrantyLookupSource.includes("warrantyStatusOnDate(row.status, row.starts_at, row.ends_at, today)"), 'Customer lookup must use start and end dates for its visible status');
assert.ok(adminWarrantiesSource.includes('warrantyStatusOnDate(warranty.status, warranty.startsAt, warranty.endsAt, today)'), 'Admin warranty list must use start and end dates for its visible status');
assert.ok(storefrontHtml.includes("w.status==='pending'?'Chưa đến ngày bắt đầu'"), 'Customer warranty UI must explain a future-start warranty');
assert.ok(adminHtmlSource.includes("status==='pending'?'Chưa đến ngày bắt đầu'"), 'Admin warranty UI must localize a future-start warranty');
assert.ok(storefrontHtml.includes("w.status==='invalid'?'Cần kiểm tra thông tin bảo hành'"), 'Customer UI must not label malformed warranty dates active');
assert.ok(adminHtmlSource.includes("status==='invalid'?'Cần kiểm tra thông tin bảo hành'"), 'Admin UI must flag malformed warranty dates for review');
assert.ok(sharedLibSource.includes('timeZone: "Asia/Ho_Chi_Minh"') && sharedLibSource.includes('export function isWarrantyEligibleOnDate'), 'Warranty expiry must use shared Vietnam-local calendar date logic');
for (const [fileName, source] of [
  ['warranty lookup', warrantyLookupSource],
  ['warranty claim submission', warrantyClaimSource],
  ['warranty photo upload', uploadSource],
  ['admin warranty list', adminWarrantiesSource],
]) {
  assert.ok(source.includes('getCurrentDateInVietnam') || source.includes('warrantyStatusOnDate'), fileName + ' must use shared Vietnam-local expiry logic');
  assert.ok(!source.includes("new Date().toISOString().slice(0,10)") && !source.includes("date('now')"), fileName + ' must not compare warranty expiry using UTC');
}
assert.ok(uploadSource.includes('form.get("claimToken")') && warrantyClaimSource.includes('body?.claimToken'), 'Warranty photo upload and claim submission must resolve tokens server-side');
assert.ok(!storefrontHtml.includes('OTP') && !storefrontHtml.includes('otp') && !warrantyClaimSource.includes('ticketId'), 'Customer warranty flows must not include OTP or session tickets');
const adminOrdersSource = readFileSync(new URL('../functions/api/admin/orders.js', import.meta.url), 'utf8');
assert.ok(adminOrdersSource.includes('COALESCE(sa.full_address,c.address)') && adminOrdersSource.includes('LEFT JOIN order_shipping_addresses'), 'Admin orders must show the shipping address captured for that order');
assert.ok(storefrontHtml.includes('id="claimIssueType"') && storefrontHtml.includes('id="claimContactPhone"'), 'Warranty claim form must capture issue type and contact details');

const html = '<!doctype html><html><head><meta name="description" content="Home"><meta property="og:title" content="Home"><meta property="og:image" content="/og-sindarealest.jpg"><meta name="twitter:image" content="/og-sindarealest.jpg"><link rel="canonical" href="/"><title>Home</title></head><body></body></html>';
const homepageContext = { request: new Request('https://shop.example/'), env: {}, next: async () => new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}) };
let response = await seoMiddleware(homepageContext);
let text = await response.text();
assert.equal(response.status,200);
assert.match(text,/og:url" content="https:\/\/shop\.example\//);
assert.match(text,/og:image" content="https:\/\/shop\.example\/og-sindarealest\.jpg/);
assert.match(text,/canonical" href="https:\/\/shop\.example\//);

const seoDB = {
  prepare(sql) {
    return {
      bind(...values) {
        return {
          async first() {
            assert.match(sql, /lower\(slug\)=\?/);
            assert.deepEqual(values, [new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase(),new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase(),new URL('https://shop.example/san-pham/'+values[0]).pathname.split('/').pop().toLowerCase()]);
            return { id: 'product-id-123', slug: 'test-sneaker', sku: 'SD-SN001', sku_verified: 1, title: 'Giày thử', description: 'Mô tả giày', images_json: '["images/example.webp"]', category: 'sneakers', category_label: 'Sneaker', published: 1 };
          }
        };
      }
    };
  }
};
const legacyResponse = await seoMiddleware({ request:new Request('https://shop.example/san-pham/test-sneaker'), env:{DB:seoDB}, next:async () => new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}) });
assert.equal(legacyResponse.status,301,'Legacy slug routes must redirect to the SKU URL');
assert.equal(legacyResponse.headers.get('Location'),'https://shop.example/sanpham/sneaker/SD-SN001');
response = await seoMiddleware({ request:new Request('https://shop.example/sanpham/sneaker/SD-SN001'), env:{DB:seoDB}, next:async (request)=>{assert.equal(new URL(request.url).pathname,'/index.html');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})} });
text = await response.text();
assert.equal(response.status,200);
assert.ok(text.includes('<title>Giày thử | SinDarealest</title>'));
assert.ok(text.includes('og:title" content="Giày thử | SinDarealest'));
assert.ok(text.includes('og:url" content="https://shop.example/sanpham/sneaker/SD-SN001'));
assert.ok(text.includes('og:image" content="https://shop.example/images/example.webp'));
assert.ok(text.includes('og:description" content="Mô tả giày · SKU: SD-SN001'), 'Product social preview should include the explicitly verified SKU even when descriptions are long');
assert.match(text,/application\/ld\+json/);

response = await createOrder({request:new Request('https://shop.example/api/orders',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin order submission is rejected');
response = await createWarrantyClaim({request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:{}});
assert.equal(response.status,403,'cross-origin warranty submission is rejected');
const sitemapResponse = await sitemap({ request:new Request('https://shop.example/sitemap.xml'), env:{DB:{prepare(sql){assert.match(sql,/SELECT id,slug,sku,sku_verified,category,category_label,updated_at/);return {async all(){return {results:[{id:'test-product-id',slug:'test-sneaker',sku:'SD-SN001',sku_verified:1,category:'sneakers',category_label:'Sneaker',updated_at:'2026-01-01 00:00:00'}]}}}}}} });
const sitemapText = await sitemapResponse.text();
assert.equal(sitemapResponse.status,200);
assert.match(sitemapText,/https:\/\/shop\.example\/sanpham\/sneaker\/SD-SN001/);
const robotsText = await (await robots({request:new Request('https://shop.example/robots.txt')})).text();
// Admin is crawlable so crawlers can see its document-level meta robots noindex directive.
assert.doesNotMatch(robotsText,/Disallow: \/admin\//);
assert.match(robotsText,/Disallow: \/api\//);
assert.match(robotsText,/Sitemap: https:\/\/shop\.example\/sitemap\.xml/);

const demoWarrantyCode = 'SDW-' + 'A'.repeat(24);
const demoWarrantyRow = {
  id:'warranty-id-1', warrantyId:'warranty-id-1', order_id:'order-id-1', customer_id:'customer-id-1',
  warranty_code: demoWarrantyCode, duration_months: 12, starts_at: '2026-01-01', ends_at: '2027-01-01', status: 'active',
  sku: 'SD-SN001', skuVerified: 0, title: 'Giày thử', size: '42', purchasedAt: '2026-02-01 12:00:00', orderNumber: 'SD-ABC-123456',
  fullName: 'Nguyễn Văn An', customerPhone: '0901234567', purchaseAddress: '123 Đường thử, Phường thử, Lâm Đồng',
  imagesJson: '["images/example.webp"]'
};
function warrantyDB() {
  const settings = new Map();
  const query = (sql, values=[]) => ({
    sql,
    async run() {
      if (sql.includes('INSERT INTO settings')) settings.set(values[0],{value:values[1],updated_at:new Date().toISOString().replace('T',' ').replace('Z','')});
      if (sql.includes('DELETE FROM settings WHERE key=?')) settings.delete(values[0]);
      return { meta: { changes: 1 } };
    },
    async first() {
      if (sql.includes('SELECT attempts FROM public_rate_limits')) return { attempts: 1 };
      if (sql.includes('FROM settings WHERE key=?')) return settings.get(values[0]) || null;
      if (sql.includes('FROM warranties w') && sql.includes('upper(w.warranty_code)=?')) return demoWarrantyRow;
      return null;
    },
    async all() {
      if (sql.includes('FROM warranties w') && sql.includes('substr(')) return { results: [demoWarrantyRow] };
      return { results: [] };
    }
  });
  return {
    prepare(sql) { return { ...query(sql), bind(...values) { return query(sql,values); } }; },
    async batch(statements) {
      for (const statement of statements) await statement.run();
      if (statements[0]?.sql.includes('INSERT INTO warranty_claims')) {
        return statements.map((_, index) => ({ meta: { changes: 1 } }));
      }
      if (statements[0]?.sql.includes('INSERT INTO public_rate_limits')) {
        return [{ success: true }, { success: true, results: [{ attempts: 1 }] }];
      }
      return statements.map(() => ({ meta: { changes: 1 } }));
    }
  };
}
const warrantyDBInstance = warrantyDB();
const codeLookup = await lookupWarranty({
  request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.11'},body:JSON.stringify({lookup:demoWarrantyCode})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(codeLookup.status,200,'Warranty-code lookup should work without OTP');
let lookupPayload = await codeLookup.json();
assert.equal(lookupPayload.warranty.maskedWarrantyCode,'••••AAAA');
assert.equal(lookupPayload.warranty.maskedPhone,'090••••67');
assert.equal(lookupPayload.warranty.maskedAddress,'••••, Phường thử, Lâm Đồng');
assert.equal(lookupPayload.warranty.maskedName,'N••• V••• A•••');
assert.equal(lookupPayload.warranty.title,'Giày thử');
assert.equal(lookupPayload.warranty.sku,'','Warranty lookup must not expose an unverified internal SKU');
assert.equal(lookupPayload.warranty.size,'42');
assert.equal(lookupPayload.warranty.purchasedAt,'2026-02-01');
assert.equal(lookupPayload.warranty.eligible,true);
assert.ok(!JSON.stringify(lookupPayload).includes('123 Đường thử'),'Raw street address must not be returned');
assert.ok(!JSON.stringify(lookupPayload).includes(demoWarrantyCode),'Raw warranty code must not be returned');
const codeActionToken = lookupPayload.warranty.claimToken;
assert.match(codeActionToken,/^[0-9a-f]{32}$/);
assert.ok(!JSON.stringify(lookupPayload).includes('Nguyễn Văn An'),'Full customer name must not be returned');
const phoneLookup = await lookupWarranty({
  request:new Request('https://shop.example/api/warranty-lookup',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.12'},body:JSON.stringify({lookup:'090 123 4567'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(phoneLookup.status,200,'Phone lookup should return warranty records without OTP');
lookupPayload = await phoneLookup.json();
assert.equal(lookupPayload.warranties.length,1);
assert.equal(lookupPayload.warranties[0].maskedWarrantyCode,'••••AAAA');
assert.ok(!JSON.stringify(lookupPayload).includes(demoWarrantyCode),'Phone lookup must not expose the raw warranty code');
assert.ok(!JSON.stringify(lookupPayload).includes('0901234567'),'Raw customer phone must not be returned');


const codeOnlyClaimResponse = await createWarrantyClaim({
  request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.15'},body:JSON.stringify({warrantyCode:demoWarrantyCode,issueType:'other',message:'Thử gửi thẳng bằng mã'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(codeOnlyClaimResponse.status,403,'Warranty claim must require a short-lived token from a successful lookup');

const claimResponse = await createWarrantyClaim({
  request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.13'},body:JSON.stringify({claimToken:codeActionToken,issueType:'other',contactPhone:'0901234567',message:'Lỗi bề mặt cần kiểm tra'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(claimResponse.status,201,'Temporary lookup token should authorize a warranty claim without exposing the raw code');
const reusedTokenResponse = await createWarrantyClaim({
  request:new Request('https://shop.example/api/warranty-claims',{method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json','CF-Connecting-IP':'198.51.100.14'},body:JSON.stringify({claimToken:codeActionToken,issueType:'other',message:'Một lần gửi lại để thử token'})}),
  env:{DB:warrantyDBInstance}
});
assert.equal(reusedTokenResponse.status,400,'A consumed lookup token must not authorize a second claim');

console.log('PASS: SKU SEO URLs, masked warranty lookups, expiring claim tokens, sitemap/robots, and cross-origin request rejection.');
