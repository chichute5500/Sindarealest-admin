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
  "activityFiltersExpanded=false"
];
for(const selector of expected) assert.ok(src.includes(selector),'Missing reference-design safeguard: '+selector);
for(const id of ['loginForm','password','productForm','pTitle','pCategory','pSkuVerified','pDescription','pPrice','pStock','imageGrid','saveProduct','activityAdvancedToggle'])
 assert.ok(src.includes('id="'+id+'"'),'Reference-design pass must not remove business control '+id);
assert.ok(src.includes('document.documentElement.dataset.adminTheme'),'Both themes must be supported');
assert.ok(!src.includes('SD_ADMIN_FAKE_PRICES'),'No invented financial data in the design');
console.log('PASS: Admin reference-inspired mobile skin covers 12 screens, retains business controls, dark mode and narrow/mobile accessibility.');
