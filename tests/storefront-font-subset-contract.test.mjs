import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/build-font-assets.py',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert.match(source,/from fontTools\.subset import Options, Subsetter/,'Use proper Unicode-aware FontTools subsetting');
for (const range of ['0x0020, 0x024F','0x0300, 0x036F','0x1E00, 0x1EFF','0x2000, 0x206F','0x20A0, 0x20CF']) {
  assert.ok(source.includes(range),'Missing Latin/Vietnamese/punctuation range '+range);
}
assert.match(source,/VIETNAMESE_SMOKE\.issubset\(original_cmap\)/,'Fail closed for missing glyphs');
assert.match(source,/missing = \(REQUIRED & original_cmap\) - retained_cmap/,'Compare glyph coverage');
assert.match(source,/original = BASE \/ \(family \+ "\.ttf"\)/,'Source TTF files remain untouched');
assert.match(source,/options\.layout_features = \["\*"\]/,'Retain OpenType shaping and kerning');
assert.match(html,/<h2 class="welcome-title">/);
console.log('PASS: font subsetting safety and semantic Welcome heading');


assert.match(source,/FIRST_PAINT_CODEPOINTS/,'Critical Serif uses original glyph coverage');
for(const family of ['NotoSerif-Regular','NotoSerif-Bold']){
 assert.ok(source.includes('"'+family+'"'),'Critical face must use the exact original TTF '+family);
}
assert.match(source,/output = BASE \/ \(family \+ "-FirstPaint\.woff2"\)/,
 'Build the two real critical font assets for Preview and Production');
assert.match(html,/NotoSerif-Regular-FirstPaint\.woff2" as="font"/);
assert.match(html,/NotoSerif-Bold-FirstPaint\.woff2" as="font"/);
