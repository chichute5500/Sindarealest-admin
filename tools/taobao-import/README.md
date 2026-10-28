# SinDarealest × Taobao — Android image-import tool

**Active source:** `chichute5500/Sindarealest-admin`, branch `feat/product-options-shoes-belts-phone-2026-10-28`, PR #137 **DRAFT**, unmerged. No writes to `main` and no Production deployment approved.

**Status as of 28 Oct 2026:** Android Debug build and lint passed on GitHub CI; isolated Cloudflare Preview and end-to-end local D1/R2 tests passed; Chrome real IndexedDB reload tests passed. Cross-app Android Emulator image sharing must PASS and an owner-signed stable Release APK must be produced before distributing one installation to the owner. Do **not** distribute ephemeral CI Debug APK.

## Architecture and permissions

- Android main application ID `com.sindarealest.taobaoimport`, API 29+, Chrome Custom Tabs for `https://www.taobao.com/` and a trusted SinDarealest importer. It never captures Taobao credentials, cookies or HTML.
- Native Android Sharesheet accepts text links from domains `taobao.com`, `tmall.com`, `tb.cn`, or user-shared JPEG/PNG/WebP images. Image files from other apps are copied through scoped `ContentResolver` to `Pictures/SinDarealest Import`; no broad storage permissions.
- User selects and confirms images in `public/admin/taobao-import.html`. The page stores draft fields and queued images locally in IndexedDB; computes client-side SHA-256 to reject byte-identical images; optimizes public derivatives to WebP while retaining the original. Uploads use existing `/api/admin/upload` with Admin session, R2 `IMAGES` and separate private `ORIGINALS`.
- A **new dedicated** `/api/admin/import-draft` endpoint creates an unpublished D1 product using a single client-generated UUID and server-generated official SKU. Retry with the same UUID returns the original row, never inserts a duplicate, and rejects changed/published state. This does not change ordinary Admin products API.
- Preview Android Debug URL is `https://taobao-import-20261028.sindarealest-admin-preview.pages.dev/admin/taobao-import.html`. The Release variant points to `https://sindarealest2.pages.dev/admin/taobao-import.html`. **The Production path is not confirmed deployed; release is blocked until verified.** App uses web-hosted importer to reduce future APK reinstallations.
- No Taobao HTML scraping, login automation, bypass of anti-bot restrictions or guarantee of automatically collecting all Taobao product gallery photos. Use only photos which the owner is permitted to reuse.

## Automated verification

- `.github/workflows/taobao-import-isolated-preview-qa.yml` — project checks, mock API regressions, **real local** Miniflare D1/R2 tests with separate buckets, actual Chromium IndexedDB reload tests, read-only Preview-vs-Production binding check, deploy only independent Preview, HTTP page 200 and unauthenticated importer 401.
- `.github/workflows/taobao-import-android-qa.yml` — compile Android Debug, lint, validate the **Release variant** with disposable QA signing key (destroyed, never distributed), build an **independently packaged QA image sender**. Emulator installs target app and test sender, starts target, shares real content:// PNG across packages, checks image saved, trusted/fake Taobao share links, dark theme, and Java crash logs. The QA sender APK is never part of owner Release.
- `.github/workflows/taobao-import-owner-release.yml` — manual-only gate, requires owner-supplied *persistent* keystore in protected GitHub Secrets, verified Production importer and Admin auth, project/API/storage tests, signed APK and Emulator acceptance. Keeps only a single owner-signed artifact after all gates; no key material uploaded. This workflow is on the feature branch and requires appropriate GitHub Actions workflow availability before manual dispatch.
- Server checks `node tools/taobao-import/tests/import-draft.test.mjs`, `node tests/taobao-import-local-d1-r2.test.mjs`. Browser spec `tests/e2e/taobao-import-real-indexeddb.spec.js`.

## Release blockers and rules

1. Cross-app Emulator step must **PASS**, including real image saving. No temporary bypass, no claiming PASS solely from Gradle build.
2. Real Taobao account login and photo sharing can only be tested with the owner's explicit on-device interaction; don't claim it ran in CI.
3. Production page/API must be approved and deployed in due course without exposing Preview D1/R2 as Production. No unattended `main` merge or Production writes from this importer branch.
4. Stable, owner-controlled signing key must be securely provisioned; reusing **the same** key on every release is necessary for normal install-over updates. CI-generated disposable keys are for QA only and must never be handed out as release packages.
5. Publish **one** APK to owner only after all verifiable gates above have completed. Never ask them to repeatedly install Debug builds.
6. Image upload may leave unreferenced R2 images after interrupted operations; any cleanup must be explicitly scoped, audited and never delete real product assets without verification.

See `tools/taobao-import/tests/emulator-smoke.sh`, the two dedicated GitHub Actions workflows, and PR #137 for current QA results. Keep the existing Owner-PASS Storefront/Admin unaffected.
