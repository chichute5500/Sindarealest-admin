# SinDarealest × Taobao — Android image-import tool

**Active source:** `chichute5500/Sindarealest-admin`, branch `feat/product-options-shoes-belts-phone-2026-10-28`, PR #137 **DRAFT**, unmerged. No writes to `main` and no Production deployment approved.

**Checkpoint 28 Oct 2026:** Android Debug build, lint, temporary-key Release signing, emulator install/launch, real cross-app Android image sharing into scoped MediaStore, approved-link and fake-link checks, system-dark UI and crash checks **PASS** (GitHub Actions run `40641190590`). Isolated Cloudflare Preview HTTP + Admin access checks, real local D1/R2, and Chromium IndexedDB reload/import acceptance also **PASS**. **No owner-distributable APK has been signed yet.** Never distribute ephemeral CI Debug APK or the disposable QA-signed Release.

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

1. Cross-app Emulator **PASS verified on AOSP API 35**; repeat the same acceptance on the final owner-signed APK before releasing. Real Taobao login on the owner's phone is still untested.
2. Real Taobao account login and photo sharing can only be tested with the owner's explicit on-device interaction; don't claim it ran in CI.
3. Production page/API must be approved and deployed in due course without exposing Preview D1/R2 as Production. No unattended `main` merge or Production writes from this importer branch.
4. Stable, owner-controlled signing key must be securely provisioned; reusing **the same** key on every release is necessary for normal install-over updates. CI-generated disposable keys are for QA only and must never be handed out as release packages.
5. Publish **one** APK to owner only after all verifiable gates above have completed. Never ask them to repeatedly install Debug builds.
6. Image upload may leave unreferenced R2 images after interrupted operations; any cleanup must be explicitly scoped, audited and never delete real product assets without verification.

Release workflow: `.github/workflows/taobao-import-owner-release.yml` accepts an explicit `taobao-android-owner-release-v*` tag on the approved tested commit; it is blocked if owner signing secrets or the exact Production importer HTML/API are absent. A stable signing key and monotonically increasing `SD_TAOBAO_RELEASE_VERSION_CODE` support install-over updates. The normal web importer remains independently updateable without a new APK.

See `tools/taobao-import/tests/emulator-smoke.sh`, GitHub Actions [Android verification run](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40641190590), and PR #137 for QA evidence. Keep Owner-PASS Storefront/Admin unaffected.

## Owner real Taobao share-link validation — 28 Oct 2026

Input from Owner:

`【淘宝】大促价保 https://e.tb.cn/h.j5Ma8gaXVlwPWsu?tk=DIRtTyxDQpc CZ193 「黑色全真鳄鱼皮鞋2025新款休闲板鞋男系带低帮鞋舒适时尚真皮男鞋」`

Latest isolated QA: [Actions run 40644101545](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40644101545).

- **PASS:** browser field takes entire Chinese share text, extracts the correct e.tb.cn HTTPS URL, stores source across reload, displays explicit messages for unsupported access. 5/5 actual Chromium tests PASS.
- **PASS:** simulated official TOP response, signed image downloads, Admin authentication, idempotent draft creation, local D1/R2, separate Cloudflare Preview (HTTP 200; unauthorized API 401).
- **REAL-LINK BLOCKER:** e.tb.cn returns HTTP **200** to a non-authenticated GitHub runner, not an HTTP 3xx redirect. The code cannot infer a real product ID from that response without a supported redirect or official API. Status `TAOBAO_SHORT_LINK_UNRESOLVED`. No real product image was downloaded or verified. Do not report this product as imported.
- Taobao official `taobao.item.detail.get` API requires a registered Open Platform AppKey/AppSecret; the docs list this method as requiring no merchant login permission, but actual API enrollment and exact image fields still require live verification. Browser login does not give server-side API credentials.
- **Do not distribute or call the importer fully automatic** until the given short link resolves, the authorized API returns its image gallery, and image import into Preview is demonstrated with the real images. Do not fake a successful result with mock images.
- No merge to main or Production change is authorized. PR #137 remains Draft.

## Experiment: personal-account WebView DOM image extraction — 28 Oct 2026

Branch-only Android implementation in `TaobaoBrowserActivity.java`. No Chrome cookie theft, no JS interface, no automated login, no Taobao API business credentials. The user opens the official Taobao product within the app's isolated WebView and *manually* taps `Tìm ảnh trang này`; the app evaluates DOM image URL attributes only on a validated Taobao/Tmall HTTPS hostname, restricts returned URLs to HTTPS Ali CDN, displays a choice dialog and requests rights confirmation before bounded downloads to scoped MediaStore.

**Verified** in GitHub Actions [run 40651856316](https://github.com/chichute5500/Sindarealest-admin/actions/runs/40651856316), Android Emulator API 35:
- APK install, share-link validation, cross-app image MediaStore import, OS dark mode, crash check: PASS.
- New on-device instrumentation **2/2 PASS**. Synthetic Taobao-hosted HTML fixture contained 2 valid Ali CDN image attributes plus bad HTTP/unapproved-host attributes; button press reported `Đã tìm được 2 liên kết ảnh`. This proves the real WebView DOM scan works *when compatible images are present in the rendered page*.
- Actual Owner product `https://item.taobao.com/item.htm?id=997261786690`, *unauthenticated emulator*: JS returned `{"host":"","title":"","imgCount":0}`. **No images retrieved**. Network or anti-bot/login restrictions cannot be distinguished from this result; do not assert the seller page is accessible or that photos were downloaded. No Taobao account login was performed.
- Test-only HTML injection is guarded by `BuildConfig.DEBUG`; Release APK cannot activate it. The test APK and temporary signing key are not for owner distribution.

**Still not validated:** Taobao personal-account login within Android WebView on a physical device, full gallery retrieval from that logged-in account, and actual import of those images to SinDarealest. No owner-signed Release APK created and no Production merge. Do not label personal login/photo extraction as PASS. If Taobao rejects WebView login, use Taobao's legitimate share/save-photo workflow.
