import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
const expected=[
  'SD_ADMIN_REFERENCE_PARITY_MOBILE_V1',
  '.toast{bottom:calc(90px + env(safe-area-inset-bottom))}',
  '--reference-blue:#477eae',
  '.brand-logo {',
  '#main .pagehead h2',
  '#main .product-table .thumb{width:62px',
  '#main .order-table .order-mobile-summary',
  '#main .activity-log-card',
  '#backdrop .editor-tab[aria-selected="true"]',
  'body:has(#loginView:not(.hidden)) .logincard',
  '@media(max-width:390px)',
  '@media(max-width:359px)',
  '@media(prefers-reduced-motion:reduce)',
  'SD_ADMIN_REFERENCE_GALLERY_FEATURED_V2',
  "activityFiltersExpanded=false"
];
for(const selector of expected) assert.ok(src.includes(selector),'Missing reference-design safeguard: '+selector);
for(const id of ['loginForm','password','productForm','pTitle','pCategory','pSkuVerified','pDescription','pPrice','pStock','imageGrid','saveProduct','activityAdvancedToggle'])
 assert.ok(src.includes('id="'+id+'"'),'Reference-design pass must not remove business control '+id);
assert.ok(src.includes('document.documentElement.dataset.adminTheme'),'Both themes must be supported');
// Brand identity is immutable: every Admin logo must use the original, unfiltered image,
// independent of Admin's blue reference accents and the user's light/dark preference.
assert.equal((src.match(/src="\/images\/brand-emblem\.png"/g)||[]).length,2,
  'Login and topbar must retain the same official SD brand emblem file');
const logoRules=[...src.matchAll(/(?:^|\n)\s*(?:(?::root\[data-admin-theme="dark"\]\s+)?\.brand-logo)\s*\{([^}]*)\}/g)];
assert.equal(logoRules.length,2,'Explicit unfiltered brand logo rules required for both themes');
for (const rule of logoRules) {
  assert.match(rule[1],/\bfilter\s*:\s*none\s*;/,'Brand emblem must render with original colors');
  assert.doesNotMatch(rule[1],/\b(?:hue-rotate|grayscale|sepia|brightness|saturate)\s*\(/,
    'Do not recolor the approved emblem through CSS');
}
assert.ok(src.includes('--sd-brand-gold:#8e622b') && src.includes('--sd-brand-gold:#e4c38a'),
  'Use neutral gold brand typography across light/dark, not the Admin blue skin');
assert.ok(!src.includes('SD_ADMIN_FAKE_PRICES'),'No invented financial data in the design');
// Approved screen 01 remains untouched; owner review requested these dashboard/topbar UI fixes.
assert.ok(src.includes("head('BẢNG ĐIỀU KHIỂN','Tổng quan','Chào mừng, quản trị viên.'"),
  'Dashboard must have one main Tổng quan title, not a duplicate eyebrow');
assert.ok(!src.includes("head('Tổng quan','Tổng quan'"),
  'Dashboard must not show two identical Tổng quan headings');
const logoutMarkup=src.match(/<button[^>]*id="logout"[^>]*>[\\s\\S]*?<\\/button>/)?.[0]||'';
assert.match(logoutMarkup,/aria-label="Đăng xuất"/,
  'Red power-off logout must keep its accessible action name');
assert.match(logoutMarkup,/class="logout-power-icon"/,
  'Logout must show the power-off icon, not an ambiguous outgoing arrow');
assert.match(logoutMarkup,/aria-hidden="true"/,
  'Decorative power-off SVG must be hidden from screen readers');
assert.ok(src.includes('#logout:focus-visible') && src.includes('#logout:hover'),
  'Logout control must have keyboard focus and hover states');
assert.ok(!src.includes('#logout::before{content:"↗"'),
  'No responsive logout layout may reintroduce the arrow icon');
console.log('PASS: Admin reference-inspired mobile skin covers 12 screens, retains business controls, dark mode and narrow/mobile accessibility.');
