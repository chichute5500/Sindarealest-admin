#!/usr/bin/env bash
set -euo pipefail
test "$GITHUB_REPOSITORY" = 'chichute5500/Sindarealest-admin'
test "$GITHUB_HEAD_REF" = 'fix/storefront-mobile-critical-requests-20261104'
test -n "${CLOUDFLARE_ACCOUNT_ID:-}" && test -n "${CLOUDFLARE_API_TOKEN:-}"
test "$(git rev-parse HEAD)" = "$PERF_CANDIDATE_SHA"
git log -1 --format=%s | grep -F '[perf-mobile-qa-candidate]'
test -s docs/qa/PERF_MOBILE_20261104.trigger
npm ci --no-fund
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
 npx lighthouse "$preview/" "${args[@]}" --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="artifacts/perf-mobile-20261104/lighthouse/preview-$preset.json" --quiet
done
npx lighthouse "https://sindarealest2.pages.dev/" --chrome-flags="--headless --no-sandbox" --only-categories=performance --output=json --output-path=artifacts/perf-mobile-20261104/lighthouse/production-mobile.json --quiet
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dir='artifacts/perf-mobile-20261104/lighthouse/';
const get=n=>JSON.parse(readFileSync(dir+n+'.json','utf8'));
const prod=get('production-mobile'), mobile=get('preview-mobile'),desktop=get('preview-desktop');
const score=(r,k='performance')=>Math.round((r.categories[k]?.score||0)*100);
const vitals=r=>Object.fromEntries(['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(k=>[k,r.audits[k]?.displayValue||null]));
console.log('Production mobile',score(prod),vitals(prod));
console.log('Preview mobile',score(mobile),vitals(mobile));
console.log('Preview desktop',score(desktop),vitals(desktop));
assert.ok(score(mobile)>=score(prod)-5,'Mobile Performance regressed >5 points');
for(const key of ['accessibility','best-practices','seo']){
 assert.ok(score(mobile,key)>=95,'Mobile '+key+' regressed');
 assert.ok(score(desktop,key)>=95,'Desktop '+key+' regressed');
}
JS
