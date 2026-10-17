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
assert.deepEqual(validateWatermarkSettingUpdates({watermarkEnabled:false,watermarkPosition:'top-left',watermarkSize:24,watermarkOpacity:75}).updates,[
 ['watermark_enabled','0'],['watermark_position','top-left'],['watermark_size','24'],['watermark_opacity','75'],
]);
assert.match(validateWatermarkSettingUpdates({watermarkPosition:'outside'}).error,/vị trí/i);
assert.match(validateWatermarkSettingUpdates({watermarkSize:99}).error,/6 đến 35/i);
assert.match(validateWatermarkSettingUpdates({watermarkOpacity:0}).error,/10 đến 100/i);
assert.match(validateWatermarkSettingUpdates({watermarkLogoUrl:'/other.webp'}).error,/giữ nguyên/i);

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

const admin=readFileSync(new URL('../public/admin/index.html',import.meta.url),'utf8');
assert.ok(admin.includes('watermarkSettingsForm'));
assert.ok(admin.includes('saveWatermarkSettings'));
assert.ok(admin.includes('src="/watermark.webp"'));
assert.ok(admin.includes("body.append('original',file,file.name||'original')"));
assert.ok(!/watermarkApplied|ctx\.drawImage\(markBitmap/.test(admin));

const upload=readFileSync(new URL('../functions/api/admin/upload.js',import.meta.url),'utf8');
assert.ok(upload.includes('context.env.ORIGINALS.put'));
assert.ok(upload.includes('context.env.ORIGINALS.delete'));
assert.ok(upload.includes('context.env.IMAGES.put'));
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
