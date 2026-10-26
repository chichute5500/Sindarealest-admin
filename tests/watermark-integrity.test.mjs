import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeWatermarkSettings, validateWatermarkSettingUpdates } from '../functions/_lib/watermark-settings.js';
import { onRequestGet as publicSettingsGet } from '../functions/api/settings.js';
import { onRequestGet as publicMediaGet } from '../functions/media/[key].js';

assert.deepEqual(normalizeWatermarkSettings({}), {
  watermarkEnabled: true,
  watermarkLogoUrl: '/watermark.webp',
  watermarkPosition: 'bottom-right',
  watermarkSize: 16,
  watermarkOpacity: 68,
});
assert.equal(normalizeWatermarkSettings({watermark_enabled:'0'}).watermarkEnabled,false);
assert.equal(normalizeWatermarkSettings({watermark_logo:'/other.webp'}).watermarkLogoUrl,'/watermark.webp');
assert.equal(normalizeWatermarkSettings({watermark_logo:'/media/01234567-89ab-cdef-0123-456789abcdef.webp'}).watermarkLogoUrl,'/media/01234567-89ab-cdef-0123-456789abcdef.webp');
assert.deepEqual(validateWatermarkSettingUpdates({watermarkEnabled:false,watermarkPosition:'top-left',watermarkSize:24,watermarkOpacity:75}).updates,[
 ['watermark_enabled','0'],['watermark_position','top-left'],['watermark_size','24'],['watermark_opacity','75'],
]);
assert.match(validateWatermarkSettingUpdates({watermarkPosition:'outside'}).error,/vị trí/i);
assert.match(validateWatermarkSettingUpdates({watermarkSize:99}).error,/6 đến 35/i);
assert.match(validateWatermarkSettingUpdates({watermarkOpacity:0}).error,/10 đến 100/i);
assert.match(validateWatermarkSettingUpdates({watermarkLogoUrl:'https://evil.example/logo.webp'}).error,/đường dẫn ảnh WebP nội bộ/i);
assert.deepEqual(validateWatermarkSettingUpdates({watermarkLogoUrl:'/media/01234567-89ab-cdef-0123-456789abcdef.webp'}).updates,[['watermark_logo','/media/01234567-89ab-cdef-0123-456789abcdef.webp']]);
assert.match(validateWatermarkSettingUpdates({watermarkLogoUrl:'//evil.example/logo.webp'}).error,/đường dẫn ảnh WebP nội bộ/i);
assert.match(validateWatermarkSettingUpdates({watermarkLogoUrl:'/media/not-a-uuid.webp'}).error,/đường dẫn ảnh WebP nội bộ/i);

const backupSource=readFileSync(new URL('../functions/api/admin/backup.js',import.meta.url),'utf8');
const restoreSource=readFileSync(new URL('../functions/api/admin/restore.js',import.meta.url),'utf8');
assert.ok(backupSource.includes('"watermark_logo"'), 'Backup must include the selected watermark logo setting');
assert.ok(backupSource.includes('watermarkLogoUrl: watermark.watermarkLogoUrl'), 'Backup JSON must preserve the selected watermark logo');
assert.ok(backupSource.includes('IN (?,?,?,?,?,?,?,?,?,?)'), 'Backup settings query must include all ten settings');
assert.ok(restoreSource.includes('Object.hasOwn(backup.settings, "watermarkLogoUrl")'), 'Restore must accept the logo field while remaining compatible with older v2 backups');
const adminSettingsSource=readFileSync(new URL('../functions/api/admin/settings.js',import.meta.url),'utf8');
assert.ok(adminSettingsSource.includes('context.env.IMAGES.head(key)'), 'Custom watermark logo must exist in R2 before settings can be saved');
assert.ok(adminSettingsSource.includes('Không tìm thấy ảnh logo trong kho ảnh'), 'Invalid watermark image paths must return actionable feedback');

const mockDB={prepare(){return{bind(){return this},async first(){return null}}}};
const response=await publicSettingsGet({env:{DB:mockDB}});
assert.equal(response.status,200);
const settings=await response.json();
assert.equal(settings.watermarkLogoUrl,'/watermark.webp');
assert.equal(settings.watermarkEnabled,true);
assert.equal(settings.watermarkPosition,'bottom-right');

const home=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const start=home.indexOf('<script id="sd-protection-script">');
const end=home.indexOf('</script>',start);
assert.ok(start>=0&&end>start);
const script=home.slice(start,end);
assert.ok(script.includes("document.querySelector('.detail-image-stage')"));
assert.ok(script.includes('window.__sdUpdateDetailWatermark'));
assert.ok(script.includes('function imageNeedsOverlay(src)'));
assert.ok(!script.includes("document.querySelectorAll('.product-photo"));
assert.ok(!script.includes('.detail-thumb'));
assert.ok(!home.includes('.product-photo .sd-viewer-watermark'));
assert.ok(!home.includes('.detail-thumb .sd-viewer-watermark'));
assert.ok(home.includes("window.__sdSettingsPromise||window.__sdPublicSettings"));
assert.ok(home.includes("mark.src=config.watermarkLogoUrl||'/watermark.webp'"), 'Detail viewer must use the configurable watermark logo');
assert.ok(home.includes("watermarkLogoUrl:typeof next.watermarkLogoUrl==='string'"), 'Public viewer must validate and apply the selected internal logo path');

const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.ok(admin.includes('watermarkSettingsForm'));
assert.ok(admin.includes('saveWatermarkSettings'));
assert.ok(admin.includes('id="watermarkLogoUrl"'));
assert.ok(admin.includes('watermarkLogoPreview'));
assert.ok(admin.includes("body.append('original',file,file.name||'original')"));
assert.ok(!/watermarkApplied|ctx\.drawImage\(markBitmap/.test(admin));

const upload=readFileSync(new URL('../functions/api/admin/upload.js',import.meta.url),'utf8');
assert.ok(upload.includes('putR2WithBackoff(context.env.ORIGINALS') && upload.includes('await binding.put(key, bytes, options)'), 'Private original must be stored in R2, with bounded retries');
assert.ok(upload.includes('context.env.ORIGINALS.delete'));
assert.ok(upload.includes('putR2WithBackoff(context.env.IMAGES') && upload.includes('await binding.put(key, bytes, options)'), 'Public derivative must be stored in R2, with bounded retries');
assert.ok(upload.includes('private-originals/'));
assert.ok(!upload.includes('watermarkApplied'));

const privateMedia=await publicMediaGet({
 params:{key:'private-originals/01234567-89ab-cdef-0123-456789abcdef.webp'},
 env:{IMAGES:{get(){throw new Error('private originals must not be read through public media route')}}},
});
assert.equal(privateMedia.status,404);

const deploy=readFileSync(new URL('../scripts/deploy-cloudflare.mjs',import.meta.url),'utf8');
const setup=readFileSync(new URL('../scripts/setup-cloudflare.mjs',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
assert.ok(deploy.includes("CLOUDFLARE_PAGES_ORIGINALS_READY !== 'true'"));
assert.ok(setup.includes('originalsBucket === bucket'));
assert.ok(workflow.includes('CLOUDFLARE_PAGES_ORIGINALS_READY'));
console.log('PASS: detail-only watermark, fixed logo, private originals, admin controls, and deploy readiness guard.');
