#!/usr/bin/env bash
set -euo pipefail
test "$GITHUB_REPOSITORY" = 'chichute5500/Sindarealest-admin'
test "$GITHUB_HEAD_REF" = 'fix/storefront-mobile-critical-requests-20261104'
test -n "${CLOUDFLARE_ACCOUNT_ID:-}" && test -n "${CLOUDFLARE_API_TOKEN:-}"
test "$(git rev-parse HEAD)" = "$PERF_CANDIDATE_SHA"
git log -1 --format=%s | grep -F '[perf-mobile-qa-candidate]'
test -s docs/qa/PERF_MOBILE_20261104.trigger
npm install --no-fund
npm audit --audit-level=high
npm run check
npm test
node scripts/qa-resource-guard.mjs
python3 -m pip install --quiet --break-system-packages Pillow fonttools brotli
python3 scripts/build-material-thumbnails.py
python3 scripts/build-logo-asset.py
python3 scripts/build-font-assets.py
test -s public/images/brand-emblem-nav.webp
base="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects"
curl -fsS --max-time 25 -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" "$base/sindarealest-admin-preview" > "$RUNNER_TEMP/perf-preview.json"
curl -fsS --max-time 25 -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" "$base/sindarealest2" > "$RUNNER_TEMP/perf-production.json"
node scripts/admin-preview-binding-safety.mjs "$RUNNER_TEMP/perf-preview.json" "$RUNNER_TEMP/perf-production.json"
printf '%s\n' "$PERF_CANDIDATE_SHA" > public/perf-mobile-source-revision.txt
npx wrangler pages deploy public --project-name sindarealest-admin-preview --branch perf-mobile-20261104 --commit-hash "$PERF_CANDIDATE_SHA"
preview="https://perf-mobile-20261104.sindarealest-admin-preview.pages.dev"
verified=false
for attempt in 1 2 3 4 5 6; do
 actual="$(curl -fsS --max-time 20 -H 'Cache-Control: no-cache' "$preview/perf-mobile-source-revision.txt?sha=$PERF_CANDIDATE_SHA" || true)"
 if [ "$actual" = "$PERF_CANDIDATE_SHA" ]; then verified=true; break; fi
 sleep 4
done
test "$verified" = true
npm install --no-save --no-package-lock --no-audit --no-fund playwright@1.56.1 lighthouse@12
npx playwright install --with-deps chromium
node scripts/qa-storefront-perf-mobile-preview.mjs
mkdir -p artifacts/perf-mobile-20261104/lighthouse
for preset in mobile desktop; do
 args=()
 if [ "$preset" = desktop ]; then args+=(--preset=desktop); fi
 npx lighthouse "$preview/" "${args[@]}" --throttling-method=devtools --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="artifacts/perf-mobile-20261104/lighthouse/preview-$preset.json" --quiet
done
npx lighthouse "https://sindarealest2.pages.dev/" --throttling-method=devtools --chrome-flags="--headless --no-sandbox" --only-categories=performance --output=json --output-path=artifacts/perf-mobile-20261104/lighthouse/production-mobile.json --quiet
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dir='artifacts/perf-mobile-20261104/lighthouse/';
const get=n=>JSON.parse(readFileSync(dir+n+'.json','utf8'));
const prod=get('production-mobile'), mobile=get('preview-mobile'),desktop=get('preview-desktop');
const hasScore=(r,k='performance')=>typeof r.categories[k]?.score==='number';
const score=(r,k='performance')=>hasScore(r,k)?Math.round(r.categories[k].score*100):null;
const vitals=r=>Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(k=>[k,r.audits[k]?.displayValue||r.audits[k]?.errorMessage||null]));
console.log('Production mobile',score(prod),vitals(prod));
console.log('Preview mobile',score(mobile),vitals(mobile));
console.log('Preview desktop',score(desktop),vitals(desktop));
// GitHub runner can emit NO_LCP on both Production and Preview mobile.
// Mark both as INCONCLUSIVE, never convert missing scores to a fake zero.
// Browser-native PerformanceObserver must independently verify a real LCP.
const browser=JSON.parse(readFileSync('artifacts/perf-mobile-20261104/browser-qa.json','utf8'));
for(const s of browser.scenarios.filter(x=>x.name?.startsWith('mobile-'))){
 const nativeLcp=s.metrics.lcpMs??s.metrics.lcp?.at(-1)?.ms??null;
 assert.ok(nativeLcp>0,'Native mobile Chrome must observe LCP: '+s.name);
}
if(hasScore(mobile)){
 assert.ok(score(mobile)>=90,'Candidate mobile Performance below the requested 90-point target');
 if(hasScore(prod))assert.ok(score(mobile)>=score(prod)-5,'Mobile Performance regressed >5 points');
 else{
  assert.equal(prod.audits['largest-contentful-paint']?.errorMessage,'NO_LCP','Unexpected Production mobile baseline failure');
  console.log('INCONCLUSIVE baseline: Production LH mobile NO_LCP on CI runner; candidate has VALID mobile score and Chrome-native LCP.');
 }
}else{
 assert.equal(prod.audits['largest-contentful-paint']?.errorMessage,'NO_LCP','Candidate has no score and Production baseline is valid');
 assert.equal(mobile.audits['largest-contentful-paint']?.errorMessage,'NO_LCP','Unexpected candidate Lighthouse failure');
 throw Error('Both mobile Lighthouse scores missing: keep PR Draft, do not release.');
}
for(const r of [mobile,desktop]){
 for(const key of ['accessibility','best-practices'])
  assert.ok(score(r,key)>=95,'Preview '+key+' score regressed');
 // The isolated Preview intentionally sends x-robots-tag:noindex.
 const crawl=r.audits['is-crawlable'];
 assert.ok(crawl?.details?.items?.some(x=>/x-robots-tag:\s*noindex/i.test(x.source||'')),
  'Expected SEO crawl exclusion only on isolated Preview');
 for(const row of r.categories.seo.auditRefs){
  if(row.id==='is-crawlable')continue;
  const a=r.audits[row.id];
  assert.ok(a.score===null||a.score===1,'Unrelated SEO audit regressed: '+row.id);
 }
}
assert.ok(score(desktop)>=90,'Preview desktop performance below 90');
JS
