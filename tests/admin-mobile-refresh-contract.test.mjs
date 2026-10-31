import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
assert.equal((html.match(/<\/style>/g) || []).length, 1, 'Preserve Owner-approved single stylesheet');
assert.match(html, /id="adminPullRefresh"/, 'Accessible refresh status indicator exists');
assert.match(html, /@media\(min-width:821px\)\{#adminPullRefresh\{display:none\}\}/, 'Pull indicator mobile-only');
assert.match(html, /touchstart'[\s\S]*?passive:true/, 'Track mobile one-finger gesture');
assert.match(html, /touchmove'[\s\S]*?passive:false/, 'Cancel native overscroll only during deliberate pull');
assert.match(html, /pullDistance>=90/, 'Require a deliberate release to refresh');
assert.match(html, /pullCanStart\(e\.target\)/, 'Pull must pass scroll/editor safety guards');
assert.match(html, /window\.scrollY>1/, 'Pull must start at top of page');
assert.match(html, /\.image-rail,\.tablewrap/, 'Keep gallery and horizontal lists untouched');
assert.match(html, /adminSyncSafe\(\)/, 'Background refresh must protect in-progress edits');
assert.match(html, /setInterval\(\(\)=>\{if\(adminSyncSafe\(\)\)void syncAdminData\(\)\.catch\(\(\)=>\{\}\)\},10000\)/, 'Incremental sync must poll every 10 seconds');
assert.match(html, /lastAdminFullSync>=45000/, 'Full background refresh must be less frequent than orders');
assert.match(html, /document\.addEventListener\('visibilitychange'/, 'Refresh after returning to foreground');
assert.match(html, /window\.addEventListener\('online'/, 'Recover after network resumes');
assert.match(html, /if\(adminSyncPromise\)\{if\(!full\)return adminSyncPromise/, 'Pull-to-refresh must not settle for an incomplete active polling cycle');
assert.match(html, /Promise\.allSettled\(names\.map\(name=>api\(name==='products'&&productsRevision!==null/, 'Poll changes without re-reading unchanged catalog');
assert.match(html, /data\.unchanged===true&&data\.revision===productsRevision/, 'An unchanged product revision must leave rendered data intact');
assert.match(html, /productsRevision=typeof d\.revision==='string'\?d\.revision:null/, 'Initial product load must retain the revision token');
assert.match(html, /if\(navigator\.userAgent\.includes\('SinDarealestAdminAndroid\/2'\)\)return/, 'Keep existing APK-only inactivity exception');
assert.ok(!html.includes('auditLogPolling'), 'Do not duplicate the older polling loop');

for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1], {filename:'public/admin/index.html'});
}
console.log('PASS: Android Admin pull-to-refresh, safe incremental sync, original CSS and login policy.');
